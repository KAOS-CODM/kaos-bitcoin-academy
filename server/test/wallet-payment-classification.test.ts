import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  PaymentAttemptGuard,
  canSubmit,
  createSendState,
  describeNip47Failure,
  transitionSend,
  type SendState,
} from '../../client/src/features/wallet/payment.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const REFUSAL_CODES = [
  'UNAUTHORIZED',
  'RESTRICTED',
  'QUOTA_EXCEEDED',
  'INSUFFICIENT_BALANCE',
  'NOT_IMPLEMENTED',
  'RATE_LIMITED',
  'UNSUPPORTED_ENCRYPTION',
]

const INDETERMINATE_CODES: Array<[string, string | undefined]> = [
  ['INTERNAL', 'INTERNAL'],
  ['OTHER', 'OTHER'],
  ['an unrecognised code', 'SOMETHING_ELSE'],
  ['a missing code', undefined],
]

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

test('each of the seven refusal codes is classified as a rejection', () => {
  for (const code of REFUSAL_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    assert.equal(outcome.phase, 'rejected', code)
    assert.match(outcome.message, new RegExp(code))
    assert.match(outcome.message, /Nothing was paid\./, code)
  }
})

test('an INTERNAL wallet error is classified as unknown, not as a rejection', () => {
  const outcome = describeNip47Failure('wallet-error', 'INTERNAL')

  assert.equal(outcome.phase, 'unknown')
  assert.notEqual(outcome.phase, 'rejected')
  assert.notEqual(outcome.phase, 'failed')
})

test('OTHER, an unrecognised code, and a missing code are classified as unknown', () => {
  for (const [label, code] of INDETERMINATE_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    assert.equal(outcome.phase, 'unknown', label)
  }
})

test('PAYMENT_FAILED keeps its existing failed behaviour and wording', () => {
  const outcome = describeNip47Failure('wallet-error', 'PAYMENT_FAILED')

  assert.equal(outcome.phase, 'failed')
  assert.match(outcome.message, /reported that the payment failed/)
  assert.match(outcome.message, /Check your wallet before paying any other invoice\./)
})

test('an unknown outcome never claims that nothing was paid', () => {
  for (const [label, code] of INDETERMINATE_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    assert.doesNotMatch(outcome.message, /Nothing was paid/, label)
  }
})

test('an unknown outcome never claims that the payment succeeded or definitely failed', () => {
  for (const [label, code] of INDETERMINATE_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    assert.doesNotMatch(outcome.message, /payment (successful|succeeded|complete)/i, label)
    assert.doesNotMatch(outcome.message, /the payment failed/i, label)
    assert.doesNotMatch(outcome.message, /was paid\b/i, label)
  }
})

test('an unknown outcome never encourages another payment attempt', () => {
  for (const [label, code] of INDETERMINATE_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    assert.match(outcome.message, /Do not pay this invoice again/, label)
    assert.match(outcome.message, /check your wallet activity/i, label)
    assert.doesNotMatch(outcome.message, /try (again|paying another)/i, label)
  }
})

test('an unknown outcome preserves empty payment evidence', () => {
  for (const [label, code] of INDETERMINATE_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    const state: SendState = transitionSend(createSendState(), {
      type: 'unknown',
      reason: outcome.message,
    })

    assert.equal(state.phase, 'unknown', label)
    assert.equal(state.evidence, 'none', label)
  }
})

test('an unknown outcome cannot be advanced to a paid receipt', () => {
  const source = read('client/src/features/wallet/PaymentPanel.tsx')

  // A receipt is rendered only for the evidence-bearing phases.
  assert.match(source, /state\.phase === 'preimage-verified' \? \(/)
  assert.match(source, /state\.phase === 'wallet-settled' \? \(/)

  // The failure branch returns before the preimage branch can ever run.
  const failureBranch = source.indexOf("if (result.status === 'failed')")
  const failureReturn = source.indexOf('return', failureBranch)
  const preimageTransition = source.indexOf("type: 'preimage-verified'")

  assert.ok(failureBranch >= 0, 'the failure branch must exist')
  assert.ok(failureReturn > failureBranch, 'the failure branch must return')
  assert.ok(
    failureReturn < preimageTransition,
    'the failure branch must return before any preimage evidence is recorded',
  )

  for (const [label, code] of INDETERMINATE_CODES) {
    const outcome = describeNip47Failure('wallet-error', code)
    const state = transitionSend(createSendState(), {
      type: 'unknown',
      reason: outcome.message,
    })

    assert.equal(state.phase, 'unknown', label)
    assert.equal(state.evidence, 'none', label)
    assert.notEqual(state.phase, 'preimage-verified', label)
    assert.notEqual(state.phase, 'wallet-settled', label)
  }
})

test('a failed or ambiguous payment cannot be resubmitted from its terminal phase', () => {
  const terminalPhases = [
    describeNip47Failure('wallet-error', 'INTERNAL').phase,
    describeNip47Failure('wallet-error', 'PAYMENT_FAILED').phase,
    describeNip47Failure('wallet-error', 'UNAUTHORIZED').phase,
    describeNip47Failure('timeout').phase,
    describeNip47Failure('invalid-envelope').phase,
  ] as const

  for (const phase of terminalPhases) {
    const state = transitionSend(createSendState(), {
      type: phase === 'failed' ? 'failed' : phase === 'rejected' ? 'rejected' : 'unknown',
      reason: 'terminal',
    })

    assert.equal(state.phase, phase)
    assert.equal(canSubmit(state), false, phase)

    // A submit event from a terminal phase must not start a new payment.
    const afterSubmit = transitionSend(state, { type: 'submit' })
    assert.notEqual(afterSubmit.phase, 'submitting', phase)
    assert.equal(afterSubmit.phase, phase, phase)
  }
})

test('the duplicate-hash guard still refuses a second attempt on the same payment hash', () => {
  const guard = new PaymentAttemptGuard()
  const hash = 'a'.repeat(64)

  assert.equal(guard.claim(hash), true)
  assert.equal(guard.claim(hash), false)
  assert.equal(guard.claim(hash.toUpperCase()), false)
  assert.equal(guard.claim('b'.repeat(64)), true)
})

test('the payment panel issues exactly one pay_invoice request and no automatic retry', () => {
  const source = read('client/src/features/wallet/PaymentPanel.tsx')

  const calls = source.match(/requestEnvelope\('pay_invoice'/g) ?? []
  assert.equal(calls.length, 1, 'pay_invoice must be requested exactly once per confirmation')

  // No timer, interval, or loop can drive a repeated payment request.
  assert.equal(source.includes('setInterval'), false)
  assert.equal(source.includes('retry'), false)
  assert.equal(/for\s*\([^)]*\)\s*\{[^}]*requestEnvelope\('pay_invoice'/.test(source), false)
  assert.equal(/while\s*\([^)]*\)\s*\{[^}]*requestEnvelope\('pay_invoice'/.test(source), false)
})

test('the payment panel claims the payment hash before the request is issued', () => {
  const source = read('client/src/features/wallet/PaymentPanel.tsx')

  const claimIndex = source.indexOf('guard.current.claim(')
  const requestIndex = source.indexOf("requestEnvelope('pay_invoice'")

  assert.ok(claimIndex >= 0, 'the guard must be claimed')
  assert.ok(requestIndex >= 0, 'the request must be issued')
  assert.ok(
    claimIndex < requestIndex,
    'the payment hash must be claimed before the request is published',
  )
})

test('the strict envelope validation in the adapter is unchanged', () => {
  const source = read('client/src/features/wallet/nwc-envelope.ts')

  // result_type must still be compared with the requested method.
  assert.match(source, /envelope\.result_type !== method/)

  // An envelope carrying both an error and a result must still be rejected.
  assert.match(source, /if \(hasError && hasResult\)/)

  // An error envelope is only accepted as a wallet error when it carries no result.
  assert.match(source, /kind: 'wallet-error'/)

  // A missing error code still falls back to a wallet error, never to a malformed envelope.
  assert.match(source, /error\.code : 'INTERNAL'/)
})

test('the preimage verification requirement is unchanged', () => {
  const source = read('client/src/features/wallet/PaymentPanel.tsx')

  assert.match(source, /verifyPreimage\(preimage, invoice\.paymentHash\)/)
  assert.match(source, /if \(!verifyPreimage\(preimage, invoice\.paymentHash\)\)/)
})

test('the payment limits and invoice validation are unchanged', () => {
  const source = read('client/src/features/wallet/invoice.ts')

  assert.match(source, /amountMsat > options\.maxAmountMsat/)
  assert.match(source, /export const DEFAULT_EXPIRY_SECONDS = 3600/)
  assert.match(source, /millisatoshi/)
})
