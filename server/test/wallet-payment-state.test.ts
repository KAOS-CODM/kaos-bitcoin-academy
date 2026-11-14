import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PaymentAttemptGuard,
  canSubmit,
  createReceiveState,
  createSendState,
  describeEvidence,
  describeNip47Failure,
  isTerminalSendPhase,
  transitionReceive,
  transitionSend,
  type SendState,
} from '../../client/src/features/wallet/payment.ts'
import type { DecodedInvoice } from '../../client/src/features/wallet/invoice.ts'

const INVOICE: DecodedInvoice = {
  paymentHash: 'a'.repeat(64),
  amountMsat: 21_000,
  amountSats: 21,
  hasFractionalSat: false,
  timestamp: 1_700_000_000,
  expirySeconds: 3600,
  expiresAt: 1_700_003_600,
  expiresAtMs: 1_700_003_600_000,
  network: 'mainnet',
  prefix: 'lnbc',
  raw: 'lnbcfixture',
}

function readyState(): SendState {
  return transitionSend(createSendState(), { type: 'inspected', invoice: INVOICE })
}

test('the send flow starts idle and reaches ready only through an inspection', () => {
  const state = createSendState()
  assert.equal(state.phase, 'idle')
  assert.equal(state.evidence, 'none')

  const inspecting = transitionSend(state, { type: 'inspect' })
  assert.equal(inspecting.phase, 'inspecting')

  const ready = transitionSend(inspecting, { type: 'inspected', invoice: INVOICE })
  assert.equal(ready.phase, 'ready')
  assert.equal(ready.invoice, INVOICE)
})

test('an invalid inspection blocks the flow with a reason', () => {
  const state = transitionSend(createSendState(), {
    type: 'inspected-invalid',
    reason: 'This invoice has expired.',
  })
  assert.equal(state.phase, 'blocked')
  assert.match(state.message ?? '', /expired/)
})

test('a payment is only submitted from the explicit confirmation state', () => {
  const ready = readyState()
  assert.equal(canSubmit(ready), false)

  const submitting = transitionSend(ready, { type: 'submit' })
  assert.equal(submitting.phase, 'ready', 'a ready invoice must not be submitted directly')

  const confirming = transitionSend(ready, { type: 'confirm' })
  assert.equal(confirming.phase, 'confirming')
  assert.equal(canSubmit(confirming), true)

  const submitted = transitionSend(confirming, { type: 'submit' })
  assert.equal(submitted.phase, 'submitting')
})

test('confirmation is required before a submission', () => {
  let state = readyState()
  state = transitionSend(state, { type: 'submit' })
  assert.equal(state.phase, 'ready')
  assert.notEqual(state.phase, 'submitting')
})

test('the four evidence levels stay distinct', () => {
  let state = transitionSend(readyState(), { type: 'confirm' })
  state = transitionSend(state, { type: 'submit' })

  const returned = transitionSend(state, { type: 'response-returned' })
  assert.equal(returned.phase, 'request-returned')
  assert.equal(returned.evidence, 'request-returned')

  const preimage = transitionSend(returned, { type: 'preimage-verified' })
  assert.equal(preimage.phase, 'preimage-verified')
  assert.equal(preimage.evidence, 'preimage-verified')

  const settled = transitionSend(preimage, { type: 'wallet-settled' })
  assert.equal(settled.phase, 'wallet-settled')
  assert.equal(settled.evidence, 'wallet-settled')

  const confirmed = transitionSend(settled, { type: 'receiver-confirmed' })
  assert.equal(confirmed.phase, 'receiver-confirmed')
  assert.equal(confirmed.evidence, 'receiver-confirmed')

  // Each level must describe itself differently.
  const descriptions = new Set(
    [returned, preimage, settled, confirmed].map((entry) => describeEvidence(entry.evidence)),
  )
  assert.equal(descriptions.size, 4, 'the four evidence levels must not share one description')
})

test('the evidence levels never collapse into a generic success state', () => {
  const returned = transitionSend(
    transitionSend(readyState(), { type: 'confirm' }),
    { type: 'submit' },
  )
  const evidence = transitionSend(returned, { type: 'response-returned' }).evidence
  assert.notEqual(evidence, 'none')
  assert.match(describeEvidence(evidence), /has not been verified/i)
})

test('an unknown outcome never becomes a failure on its own', () => {
  const unknown = transitionSend(readyState(), {
    type: 'unknown',
    reason: 'The wallet did not confirm.',
  })
  assert.equal(unknown.phase, 'unknown')
  assert.equal(isTerminalSendPhase(unknown.phase), true)

  // No further transition may turn it into a success or a different failure.
  const afterWait = transitionSend(unknown, { type: 'response-returned' })
  assert.equal(afterWait.phase, 'request-returned')
})

test('a rejected request keeps its reason and stays distinct from a failure', () => {
  const rejected = transitionSend(readyState(), {
    type: 'rejected',
    reason: 'Your wallet refused the request (UNAUTHORIZED). Nothing was paid.',
  })
  assert.equal(rejected.phase, 'rejected')
  assert.match(rejected.message ?? '', /UNAUTHORIZED/)
  assert.notEqual(rejected.phase, 'failed')
})

test('a failed request keeps its reason', () => {
  const failed = transitionSend(readyState(), {
    type: 'failed',
    reason: 'Your wallet reported that the payment failed.',
  })
  assert.equal(failed.phase, 'failed')
  assert.match(failed.message ?? '', /failed/)
})

test('resetting returns the send flow to its initial state', () => {
  const state = transitionSend(readyState(), { type: 'reset' })
  assert.equal(state.phase, 'idle')
  assert.equal(state.evidence, 'none')
  assert.equal(state.invoice, undefined)
})

test('the attempt guard refuses a second attempt for the same payment hash', () => {
  const guard = new PaymentAttemptGuard()
  assert.equal(guard.claim(INVOICE.paymentHash), true)
  assert.equal(guard.has(INVOICE.paymentHash), true)
  assert.equal(guard.claim(INVOICE.paymentHash), false)
  assert.equal(guard.claim(INVOICE.paymentHash.toUpperCase()), false)

  assert.equal(guard.claim('b'.repeat(64)), true)
})

test('the attempt guard is session-only and can be cleared', () => {
  const guard = new PaymentAttemptGuard()
  guard.claim(INVOICE.paymentHash)
  guard.clear()
  assert.equal(guard.has(INVOICE.paymentHash), false)
  assert.equal(guard.claim(INVOICE.paymentHash), true)
})

test('every adapter failure maps to a safe phase and message', () => {
  const cases: Array<[Parameters<typeof describeNip47Failure>[0], string, string]> = [
    ['wallet-error', 'PAYMENT_FAILED', 'failed'],
    ['wallet-error', 'UNAUTHORIZED', 'rejected'],
    ['not-submitted', undefined, 'unknown'],
    ['timeout', undefined, 'unknown'],
    ['invalid-envelope', undefined, 'unknown'],
    ['stale', undefined, 'unknown'],
    ['relay-not-approved', undefined, 'blocked'],
    ['encryption-unavailable', undefined, 'blocked'],
  ]

  for (const [kind, code, expectedPhase] of cases) {
    const outcome = describeNip47Failure(kind, code)
    assert.equal(outcome.phase, expectedPhase, `${kind}/${code}`)
    assert.ok(outcome.message.length > 0, `${kind}/${code} must explain itself`)
    assert.doesNotMatch(outcome.message, /preimage|payment hash|secret/i, `${kind} must not leak payloads`)
  }
})

test('an ambiguous failure is never reported as a payment failure', () => {
  for (const kind of ['not-submitted', 'timeout', 'invalid-envelope', 'stale'] as const) {
    const outcome = describeNip47Failure(kind)
    assert.notEqual(outcome.phase, 'failed', kind)
    assert.notEqual(outcome.phase, 'preimage-verified', kind)
    assert.match(
      outcome.message,
      /Do not pay the same invoice again|Check your wallet|Check your connection/i,
      kind,
    )
    assert.doesNotMatch(outcome.message, /paid|completed|settled/i, kind)
  }
})

test('the receive flow distinguishes created, waiting, settled, and unavailable', () => {
  let state = createReceiveState()
  assert.equal(state.phase, 'idle')

  state = transitionReceive(state, { type: 'create' })
  assert.equal(state.phase, 'creating')

  state = transitionReceive(state, { type: 'created', invoice: INVOICE })
  assert.equal(state.phase, 'invoice-ready')
  assert.equal(state.evidence, 'none', 'a created invoice is not payment evidence')
  assert.match(state.message ?? '', /Waiting for a payer/)

  state = transitionReceive(state, { type: 'waiting' })
  assert.equal(state.phase, 'waiting')

  const settled = transitionReceive(state, { type: 'settled' })
  assert.equal(settled.phase, 'settled')
  assert.equal(settled.evidence, 'wallet-settled')

  const unavailable = transitionReceive(state, {
    type: 'status-unavailable',
    reason: 'The wallet did not return a usable status.',
  })
  assert.equal(unavailable.phase, 'status-unavailable')
  assert.notEqual(unavailable.phase, 'failed', 'an unavailable status is not a failure')
})

test('an expired receive invoice is distinct from a failed one', () => {
  let state = transitionReceive(createReceiveState(), { type: 'created', invoice: INVOICE })
  state = transitionReceive(state, { type: 'expired' })
  assert.equal(state.phase, 'expired')
  assert.notEqual(state.phase, 'failed')
})
