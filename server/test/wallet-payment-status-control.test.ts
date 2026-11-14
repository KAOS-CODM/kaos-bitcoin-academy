import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  PaymentAttemptGuard,
  PaymentStatusLookup,
  describePaymentStatus,
  PAYMENT_STATUS_UNVERIFIED_MESSAGE,
  type PaymentStatusOutcome,
} from '../../client/src/features/wallet/payment.ts'
import { PaymentStatusControl } from '../../client/src/features/wallet/PaymentPanel.tsx'
import type { DecodedInvoice } from '../../client/src/features/wallet/invoice.ts'
import type {
  Nip47EnvelopeMethod,
  Nip47RequestResult,
} from '../../client/src/features/wallet/nwc-envelope.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const React = requireFromClient('react')
const { renderToStaticMarkup } = requireFromClient('react-dom/server')
;(globalThis as { React?: unknown }).React = React

const PAYMENT_HASH = 'a'.repeat(64)
const AMOUNT_MSAT = 21_000

const INVOICE: DecodedInvoice = {
  paymentHash: PAYMENT_HASH,
  amountMsat: AMOUNT_MSAT,
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

const EXPECTATION = { paymentHash: PAYMENT_HASH, amountMsat: AMOUNT_MSAT }

interface RecordedCall {
  method: Nip47EnvelopeMethod
  params: unknown
}

/** A fake requester that records every call and returns a scripted result. */
function createRequester(result: Nip47RequestResult) {
  const calls: RecordedCall[] = []
  return {
    calls,
    async requestEnvelope(method: Nip47EnvelopeMethod, params: unknown) {
      calls.push({ method, params })
      return result
    },
  }
}

function settledResult(overrides: Record<string, unknown> = {}): Nip47RequestResult {
  return {
    status: 'ok',
    result: {
      type: 'outgoing',
      state: 'settled',
      payment_hash: PAYMENT_HASH,
      amount: AMOUNT_MSAT,
      ...overrides,
    },
  }
}

function renderControl(props: {
  outcome?: PaymentStatusOutcome | null
  busy?: boolean
  available?: boolean
  invoice?: DecodedInvoice | undefined
}): string {
  return renderToStaticMarkup(
    React.createElement(PaymentStatusControl as never, {
      invoice: props.invoice === undefined ? INVOICE : props.invoice,
      outcome: props.outcome ?? null,
      busy: props.busy ?? false,
      available: props.available ?? true,
      onCheck: () => {},
    } as never),
  )
}

test('the control appears only for an unverified payment outcome', () => {
  const available = renderControl({ available: true })
  assert.match(available, /Check payment status/)
  assert.match(available, /This does not make another payment/)

  const unavailable = renderControl({ available: false })
  assert.equal(unavailable.includes('Check payment status'), false)
})

test('no lookup happens automatically when the control renders', () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  // Rendering the presentational control must not issue a request.
  renderControl({ available: true })

  assert.equal(requester.calls.length, 0)
  assert.equal(lookup.hasRun, false)
})

test('one activation initiates exactly one lookup_invoice', async () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  const outcome = await lookup.run(requester, EXPECTATION)

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'lookup_invoice')
  assert.equal(outcome.kind, 'settled')
})

test('the request contains only the original payment hash', async () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  await lookup.run(requester, EXPECTATION)

  const params = requester.calls[0].params as Record<string, unknown>
  assert.deepEqual(Object.keys(params), ['payment_hash'])
  assert.equal(params.payment_hash, PAYMENT_HASH)
  assert.equal('invoice' in params, false)
})

test('rapid repeated activations do not create duplicate concurrent requests', async () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  const [first, second] = await Promise.all([
    lookup.run(requester, EXPECTATION),
    lookup.run(requester, EXPECTATION),
  ])

  assert.equal(requester.calls.length, 1)
  assert.equal(first.kind, 'settled')
  assert.equal(second.kind, 'settled')
})

test('a second activation after completion issues no further request', async () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  await lookup.run(requester, EXPECTATION)
  const again = await lookup.run(requester, EXPECTATION)

  assert.equal(requester.calls.length, 1)
  assert.equal(again.kind, 'settled')
  assert.equal(lookup.hasRun, true)
})

test('the loading state disables the control', () => {
  const busy = renderControl({ busy: true })
  assert.match(busy, /disabled/)
  assert.match(busy, /Checking payment status/)
})

test('a settled result is displayed as wallet-reported settlement', () => {
  const outcome = describePaymentStatus(settledResult(), EXPECTATION)
  assert.equal(outcome.kind, 'settled')
  assert.equal(outcome.settledReported, true)
  assert.match(outcome.message, /Your wallet reports that this invoice was settled\./)

  const html = renderControl({ outcome })
  assert.match(html, /Your wallet reports that this invoice was settled\./)
})

test('a pending result does not claim settlement', () => {
  const outcome = describePaymentStatus(
    settledResult({ state: 'pending' }),
    EXPECTATION,
  )
  assert.equal(outcome.kind, 'pending')
  assert.equal(outcome.settledReported, false)
  assert.match(outcome.message, /pending payment state/)
  assert.doesNotMatch(outcome.message, /settled/i)
})

test('an accepted result does not claim settlement', () => {
  const outcome = describePaymentStatus(
    settledResult({ state: 'accepted' }),
    EXPECTATION,
  )
  assert.equal(outcome.kind, 'accepted')
  assert.equal(outcome.settledReported, false)
  assert.match(outcome.message, /settlement is not confirmed/i)
})

test('an expired result does not claim that the earlier payment never settled', () => {
  const outcome = describePaymentStatus(
    settledResult({ state: 'expired' }),
    EXPECTATION,
  )
  assert.equal(outcome.kind, 'expired')
  assert.equal(outcome.settledReported, false)
  assert.match(outcome.message, /earlier settlement status remains unverified/i)
  assert.doesNotMatch(outcome.message, /never (was |settled|paid)/i)
})

test('a failed result does not claim independently verified non-payment', () => {
  const outcome = describePaymentStatus(settledResult({ state: 'failed' }), EXPECTATION)
  assert.equal(outcome.kind, 'failed')
  assert.equal(outcome.settledReported, false)
  assert.match(outcome.message, /Check your wallet activity/)
  assert.doesNotMatch(outcome.message, /nothing was paid|was not paid/i)
})

test('a timeout or malformed response leaves settlement unverified', () => {
  const timeout = describePaymentStatus(
    { status: 'failed', kind: 'timeout' },
    EXPECTATION,
  )
  assert.equal(timeout.kind, 'unverified')
  assert.equal(timeout.settledReported, false)

  const malformed = describePaymentStatus(
    { status: 'failed', kind: 'invalid-envelope' },
    EXPECTATION,
  )
  assert.equal(malformed.kind, 'unverified')
  assert.equal(malformed.settledReported, false)

  const error = describePaymentStatus(
    { status: 'failed', kind: 'wallet-error', code: 'INTERNAL' },
    EXPECTATION,
  )
  assert.equal(error.kind, 'unverified')
  assert.equal(error.settledReported, false)
  assert.equal(error.message, PAYMENT_STATUS_UNVERIFIED_MESSAGE)
})

test('a settled result whose hash or amount does not match is unverified', () => {
  const wrongHash = describePaymentStatus(
    settledResult({ payment_hash: 'b'.repeat(64) }),
    EXPECTATION,
  )
  assert.equal(wrongHash.kind, 'unverified')
  assert.equal(wrongHash.settledReported, false)

  const wrongAmount = describePaymentStatus(
    settledResult({ amount: 999 }),
    EXPECTATION,
  )
  assert.equal(wrongAmount.kind, 'unverified')
  assert.equal(wrongAmount.settledReported, false)

  const missingHash = describePaymentStatus(
    { status: 'ok', result: { state: 'settled', amount: AMOUNT_MSAT } },
    EXPECTATION,
  )
  assert.equal(missingHash.kind, 'unverified')
  assert.equal(missingHash.settledReported, false)

  // A settled response that does not report the amount cannot confirm the payment, so the
  // frozen "hash/amount match" rule is not satisfied.
  const missingAmount = describePaymentStatus(
    { status: 'ok', result: { state: 'settled', payment_hash: PAYMENT_HASH } },
    EXPECTATION,
  )
  assert.equal(missingAmount.kind, 'unverified')
  assert.equal(missingAmount.settledReported, false)
})

test('a settled response that reports neither hash nor amount is unverified', () => {
  const outcome = describePaymentStatus(
    { status: 'ok', result: { state: 'settled' } },
    EXPECTATION,
  )
  assert.equal(outcome.kind, 'unverified')
  assert.equal(outcome.settledReported, false)
})

test('an unrecognised lookup state is not accepted as settlement evidence', () => {
  const outcome = describePaymentStatus(settledResult({ state: 'unpaid' }), EXPECTATION)
  assert.equal(outcome.kind, 'unverified')
  assert.equal(outcome.settledReported, false)
})

test('no error result triggers an automatic retry', async () => {
  const requester = createRequester({ status: 'failed', kind: 'timeout' })
  const lookup = new PaymentStatusLookup()

  const outcome = await lookup.run(requester, EXPECTATION)
  assert.equal(outcome.kind, 'unverified')

  // Give any accidental timer a chance to fire.
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.equal(requester.calls.length, 1)
})

test('no lookup result invokes pay_invoice', async () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  await lookup.run(requester, EXPECTATION)

  for (const call of requester.calls) {
    assert.equal(call.method, 'lookup_invoice')
    assert.notEqual(call.method, 'pay_invoice')
    assert.notEqual(call.method, 'make_invoice')
    assert.notEqual(call.method, 'get_info')
    assert.notEqual(call.method, 'get_balance')
    assert.notEqual(call.method, 'list_transactions')
  }
})

test('no lookup result produces receiver confirmation', async () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  const outcome = await lookup.run(requester, EXPECTATION)
  assert.equal(outcome.settledReported, true)

  // The only evidence level a lookup may raise is wallet-reported settlement.
  assert.equal(outcome.kind, 'settled')
  assert.notEqual(outcome.kind, 'receiver-confirmed')
  assert.doesNotMatch(outcome.message, /receiving side confirmed|receiver confirmed/i)
})

test('the existing preimage-verification and receipt requirements remain intact', () => {
  const fs = requireFromClient('node:fs') as {
    readFileSync(path: string, encoding: string): string
  }
  const panelSource = fs.readFileSync(
    path.join(ROOT, 'client/src/features/wallet/PaymentPanel.tsx'),
    'utf8',
  )
  const paymentSource = fs.readFileSync(
    path.join(ROOT, 'client/src/features/wallet/payment.ts'),
    'utf8',
  )

  // Preimage evidence still requires a verified preimage.
  assert.match(panelSource, /verifyPreimage\(preimage, invoice\.paymentHash\)/)

  // Receipts still render only for the evidence-bearing phases.
  assert.match(panelSource, /state\.phase === 'preimage-verified' \? \(/)
  assert.match(panelSource, /state\.phase === 'wallet-settled' \? \(/)

  // The lookup request carries only the payment hash.
  assert.match(
    paymentSource,
    /requestEnvelope\('lookup_invoice', \{\s*payment_hash: expectation\.paymentHash,\s*\}\)/,
  )
})

test('the payment success path applies the same hash and amount match rule', () => {
  const fs = requireFromClient('node:fs') as {
    readFileSync(path: string, encoding: string): string
  }
  const panelSource = fs.readFileSync(
    path.join(ROOT, 'client/src/features/wallet/PaymentPanel.tsx'),
    'utf8',
  )

  // The success path must not promote to wallet-settled on a bare `state === 'settled'`.
  assert.equal(panelSource.includes("transaction.state === 'settled'"), false)
  assert.match(
    panelSource,
    /describePaymentStatus\(lookup, \{\s*paymentHash: invoice\.paymentHash,\s*amountMsat: invoice\.amountMsat,\s*\}\)/,
  )
})

test('the existing duplicate-payment guard remains intact', () => {
  const guard = new PaymentAttemptGuard()
  assert.equal(guard.claim(PAYMENT_HASH), true)
  assert.equal(guard.claim(PAYMENT_HASH), false)
  assert.equal(guard.claim('b'.repeat(64)), true)
})

test('the control never exposes a payment hash, invoice, or preimage', () => {
  const requester = createRequester(settledResult())
  const lookup = new PaymentStatusLookup()

  const html = renderControl({ available: true })
  assert.equal(html.includes(PAYMENT_HASH), false)
  assert.equal(html.includes('lnbcfixture'), false)

  void lookup.run(requester, EXPECTATION)
})
