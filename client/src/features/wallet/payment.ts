/**
 * Payment state model for the guided Lightning flows.
 *
 * Pure functions and types only: no wallet calls, no relay calls, no storage. The UI renders
 * these states, and the tests drive them directly.
 *
 * Four evidence levels are kept distinct and are never collapsed into a single "payment
 * successful" state:
 *
 *   1. request-returned   the wallet returned a response
 *   2. preimage-verified  the returned preimage hashes to the expected payment hash
 *   3. wallet-settled     a valid lookup response reports "settled"
 *   4. receiver-confirmed independent evidence confirms the receiving side received it
 */

import type { DecodedInvoice } from './invoice'
import type {
  Nip47EnvelopeMethod,
  Nip47FailureKind,
  Nip47RequestResult,
} from './nwc-envelope'

/**
 * Provisional practice limits. These are product defaults for the guided exercise, not a
 * security boundary: client-side checks can be bypassed, and the wallet's own spending
 * limits, permissions, and authorization remain the primary controls.
 */
export const PRACTICE_DEFAULT_AMOUNT_SATS = 21
export const PRACTICE_MAX_AMOUNT_SATS = 100
export const PRACTICE_INVOICE_EXPIRY_SECONDS = 600

/**
 * NIP-47 error codes that are pre-payment refusals.
 *
 * The wallet service verifies the connection's authorization before it sends any payment, so
 * for these codes the payment was never sent and "nothing was paid" is accurate.
 *
 * Any other wallet error is indeterminate: the wallet reported a problem, but the response
 * does not establish whether a payment was attempted or completed.
 */
const PAYMENT_REFUSAL_CODES: ReadonlySet<string> = new Set([
  'UNAUTHORIZED',
  'RESTRICTED',
  'QUOTA_EXCEEDED',
  'INSUFFICIENT_BALANCE',
  'NOT_IMPLEMENTED',
  'RATE_LIMITED',
  'UNSUPPORTED_ENCRYPTION',
])

export type PaymentEvidence =
  | 'none'
  | 'request-returned'
  | 'preimage-verified'
  | 'wallet-settled'
  | 'receiver-confirmed'

export type SendPhase =
  | 'idle'
  | 'inspecting'
  | 'blocked'
  | 'ready'
  | 'confirming'
  | 'submitting'
  | 'request-returned'
  | 'preimage-verified'
  | 'wallet-settled'
  | 'receiver-confirmed'
  | 'rejected'
  | 'failed'
  | 'expired'
  | 'unknown'

export type ReceivePhase =
  | 'idle'
  | 'creating'
  | 'invoice-ready'
  | 'waiting'
  | 'settled'
  | 'expired'
  | 'status-unavailable'
  | 'failed'

export interface SendState {
  phase: SendPhase
  evidence: PaymentEvidence
  /** Plain-language explanation for the current phase. */
  message?: string
  /** The invoice currently under consideration, when one has been inspected. */
  invoice?: DecodedInvoice
}

export interface ReceiveState {
  phase: ReceivePhase
  evidence: PaymentEvidence
  message?: string
  invoice?: DecodedInvoice
}

export type SendEvent =
  | { type: 'inspect' }
  | { type: 'inspected'; invoice: DecodedInvoice }
  | { type: 'inspected-invalid'; reason: string }
  | { type: 'confirm' }
  | { type: 'submit' }
  | { type: 'response-returned' }
  | { type: 'preimage-verified' }
  | { type: 'wallet-settled' }
  | { type: 'receiver-confirmed' }
  | { type: 'rejected'; reason: string }
  | { type: 'failed'; reason: string }
  | { type: 'expired' }
  | { type: 'unknown'; reason: string }
  | { type: 'reset' }

/** Phases from which no further payment submission may be started. */
export const TERMINAL_SEND_PHASES: readonly SendPhase[] = [
  'request-returned',
  'preimage-verified',
  'wallet-settled',
  'receiver-confirmed',
  'rejected',
  'failed',
  'expired',
  'unknown',
]

export function canSubmit(state: SendState): boolean {
  return state.phase === 'confirming'
}

export function isTerminalSendPhase(phase: SendPhase): boolean {
  return TERMINAL_SEND_PHASES.includes(phase)
}

export function createSendState(): SendState {
  return { phase: 'idle', evidence: 'none' }
}

export function transitionSend(state: SendState, event: SendEvent): SendState {
  switch (event.type) {
    case 'reset':
      return createSendState()

    case 'inspect':
      return { phase: 'inspecting', evidence: 'none' }

    case 'inspected':
      return { phase: 'ready', evidence: 'none', invoice: event.invoice }

    case 'inspected-invalid':
      return {
        phase: 'blocked',
        evidence: 'none',
        message: event.reason,
        invoice: state.invoice,
      }

    case 'confirm':
      if (state.phase !== 'ready') return state
      return { phase: 'confirming', evidence: 'none', invoice: state.invoice }

    case 'submit':
      // A payment is only ever submitted from the explicit confirmation state.
      if (!canSubmit(state)) return state
      return { phase: 'submitting', evidence: 'none', invoice: state.invoice }

    case 'response-returned':
      return {
        phase: 'request-returned',
        evidence: 'request-returned',
        invoice: state.invoice,
      }

    case 'preimage-verified':
      return {
        phase: 'preimage-verified',
        evidence: 'preimage-verified',
        invoice: state.invoice,
      }

    case 'wallet-settled':
      return {
        phase: 'wallet-settled',
        evidence: 'wallet-settled',
        invoice: state.invoice,
      }

    case 'receiver-confirmed':
      return {
        phase: 'receiver-confirmed',
        evidence: 'receiver-confirmed',
        invoice: state.invoice,
      }

    case 'rejected':
      return {
        phase: 'rejected',
        evidence: state.evidence,
        message: event.reason,
        invoice: state.invoice,
      }

    case 'failed':
      return {
        phase: 'failed',
        evidence: state.evidence,
        message: event.reason,
        invoice: state.invoice,
      }

    case 'expired':
      return { phase: 'expired', evidence: state.evidence, invoice: state.invoice }

    case 'unknown':
      return {
        phase: 'unknown',
        evidence: state.evidence,
        message: event.reason,
        invoice: state.invoice,
      }

    default:
      return state
  }
}

export type ReceiveEvent =
  | { type: 'create' }
  | { type: 'created'; invoice: DecodedInvoice }
  | { type: 'create-failed'; reason: string }
  | { type: 'waiting' }
  | { type: 'settled' }
  | { type: 'expired' }
  | { type: 'status-unavailable'; reason: string }
  | { type: 'failed'; reason: string }
  | { type: 'reset' }

export function createReceiveState(): ReceiveState {
  return { phase: 'idle', evidence: 'none' }
}

export function transitionReceive(state: ReceiveState, event: ReceiveEvent): ReceiveState {
  switch (event.type) {
    case 'reset':
      return createReceiveState()

    case 'create':
      return { phase: 'creating', evidence: 'none' }

    case 'created':
      return {
        phase: 'invoice-ready',
        evidence: 'none',
        invoice: event.invoice,
        message: 'Invoice created. Waiting for a payer.',
      }

    case 'create-failed':
      return { phase: 'failed', evidence: 'none', message: event.reason }

    case 'waiting':
      if (state.phase !== 'invoice-ready' && state.phase !== 'waiting') return state
      return { ...state, phase: 'waiting', message: 'Waiting for a payer.' }

    case 'settled':
      return {
        phase: 'settled',
        evidence: 'wallet-settled',
        invoice: state.invoice,
        message: 'The wallet reports the invoice settled.',
      }

    case 'expired':
      return {
        phase: 'expired',
        evidence: state.evidence,
        invoice: state.invoice,
        message: 'The invoice expired and can no longer be paid.',
      }

    case 'status-unavailable':
      return {
        phase: 'status-unavailable',
        evidence: state.evidence,
        invoice: state.invoice,
        message: event.reason,
      }

    case 'failed':
      return {
        phase: 'failed',
        evidence: state.evidence,
        invoice: state.invoice,
        message: event.reason,
      }

    default:
      return state
  }
}

/**
 * Best-effort, at-most-once guard for the current page session.
 *
 * A payment hash is claimed before the request is published, so the same invoice cannot be
 * submitted twice in one session. A reload clears the guard; the wallet remains the durable
 * source of truth.
 */
export class PaymentAttemptGuard {
  private readonly attempted = new Set<string>()

  /** Returns false when the hash was already attempted in this session. */
  claim(paymentHash: string): boolean {
    const key = paymentHash.toLowerCase()
    if (this.attempted.has(key)) return false
    this.attempted.add(key)
    return true
  }

  has(paymentHash: string): boolean {
    return this.attempted.has(paymentHash.toLowerCase())
  }

  clear(): void {
    this.attempted.clear()
  }
}

/**
 * Map an adapter failure onto a send phase and a safe, non-technical message.
 *
 * A timeout, a malformed envelope, or an ambiguous outcome is never reported as a payment
 * failure and never as a payment success.
 */
export function describeNip47Failure(
  kind: Nip47FailureKind,
  code?: string,
): { phase: SendPhase; message: string } {
  switch (kind) {
    case 'wallet-error': {
      if (code === 'PAYMENT_FAILED') {
        return {
          phase: 'failed',
          message:
            'Your wallet reported that the payment failed. Check your wallet before paying any other invoice.',
        }
      }

      const normalized = typeof code === 'string' ? code.toUpperCase() : ''

      // Only the codes that refuse the operation before any payment is sent are reported as a
      // refusal. Every other wallet error stays indeterminate.
      if (PAYMENT_REFUSAL_CODES.has(normalized)) {
        return {
          phase: 'rejected',
          message: `Your wallet refused the request (${normalized}). Nothing was paid.`,
        }
      }

      // The wallet reported a problem that does not establish whether a payment was
      // attempted or completed. The code is not echoed, because an unrecognised code is
      // arbitrary wallet-supplied text.
      return {
        phase: 'unknown',
        message:
          normalized === 'INTERNAL'
            ? 'The wallet reported an internal error. It is not possible to confirm whether a payment was attempted. Do not pay this invoice again; check your wallet activity.'
            : 'The wallet reported an error without a usable reason. It is not possible to confirm whether a payment was attempted. Do not pay this invoice again; check your wallet activity.',
      }
    }

    case 'not-submitted':
      return {
        phase: 'unknown',
        message:
          'The request was not accepted by the approved relay, so the wallet did not receive it. Check your connection before trying again.',
      }

    case 'timeout':
      return {
        phase: 'unknown',
        message:
          'The wallet did not answer in time. Do not pay the same invoice again. Check your wallet activity.',
      }

    case 'invalid-envelope':
      return {
        phase: 'unknown',
        message:
          'The wallet reply could not be verified, so this payment is unverified. Do not pay the same invoice again. Check your wallet activity.',
      }

    case 'stale':
      return {
        phase: 'unknown',
        message:
          'The wallet connection closed before the reply arrived. Check your wallet activity before paying anything else.',
      }

    case 'relay-not-approved':
      return {
        phase: 'blocked',
        message:
          'The wallet connection does not use an approved relay, so no request was sent.',
      }

    case 'encryption-unavailable':
      return {
        phase: 'blocked',
        message:
          'The wallet connection is not ready yet. Reconnect the wallet before sending a payment.',
      }

    default:
      return {
        phase: 'unknown',
        message:
          'The wallet request did not complete. Do not pay the same invoice again. Check your wallet activity.',
      }
  }
}

/** Human-readable evidence label used by the receipt and the status line. */
export function describeEvidence(evidence: PaymentEvidence): string {
  switch (evidence) {
    case 'request-returned':
      return 'The wallet returned a response. It has not been verified yet.'
    case 'preimage-verified':
      return 'The preimage matches the invoice payment hash. This is payer-side evidence.'
    case 'wallet-settled':
      return 'The wallet reports the payment settled.'
    case 'receiver-confirmed':
      return 'The receiving side confirmed the payment.'
    default:
      return 'No payment evidence yet.'
  }
}

/**
 * One-shot payment status lookup.
 *
 * The user may ask the wallet once whether an attempted payment settled. The lookup is
 * read-only: it issues a single `lookup_invoice` request for the payment hash and never
 * creates, publishes, or pays an invoice.
 */

export interface PaymentStatusRequester {
  requestEnvelope(
    method: Nip47EnvelopeMethod,
    params: unknown,
    options?: { replyTimeoutMs?: number },
  ): Promise<Nip47RequestResult>
}

export type PaymentStatusKind =
  | 'idle'
  | 'loading'
  | 'settled'
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'failed'
  | 'unverified'

export interface PaymentStatusOutcome {
  kind: PaymentStatusKind
  message: string
  /** True only when the wallet reported the invoice as settled and the data matched. */
  settledReported: boolean
}

/** The invoice facts a lookup response is checked against. */
export interface PaymentStatusExpectation {
  paymentHash: string
  amountMsat: number
}

export const PAYMENT_STATUS_UNVERIFIED_MESSAGE =
  'Payment status could not be verified. Check your wallet activity.'

export const PAYMENT_STATUS_MESSAGES: Readonly<Record<Exclude<PaymentStatusKind, 'idle' | 'loading'>, string>> =
  {
    settled: 'Your wallet reports that this invoice was settled.',
    pending: 'Your wallet reports a pending payment state. Settlement is not confirmed.',
    accepted:
      'Your wallet accepted the payment request, but settlement is not confirmed.',
    expired:
      'Your wallet reports that this invoice has expired. Its earlier settlement status remains unverified.',
    failed:
      'Your wallet reports a failed payment. Check your wallet activity before taking further action.',
    unverified: PAYMENT_STATUS_UNVERIFIED_MESSAGE,
  }

function samePaymentHash(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

/**
 * Interpret a `lookup_invoice` response conservatively.
 *
 * Only a `settled` state whose payment hash matches the requested hash, and whose amount
 * matches when the wallet reports one, can establish wallet-reported settlement. Every other
 * outcome leaves settlement unverified and must not be presented as proof that the earlier
 * payment never settled.
 */
export function describePaymentStatus(
  result: Nip47RequestResult,
  expectation: PaymentStatusExpectation,
): PaymentStatusOutcome {
  if (result.status !== 'ok') {
    return { kind: 'unverified', message: PAYMENT_STATUS_UNVERIFIED_MESSAGE, settledReported: false }
  }

  const payload = (result.result ?? {}) as {
    state?: unknown
    payment_hash?: unknown
    amount?: unknown
  }

  const reportedHash = typeof payload.payment_hash === 'string' ? payload.payment_hash : undefined
  const reportedAmount = typeof payload.amount === 'number' ? payload.amount : undefined

  // Inconsistent payment data is never settlement evidence.
  if (reportedHash !== undefined && !samePaymentHash(reportedHash, expectation.paymentHash)) {
    return { kind: 'unverified', message: PAYMENT_STATUS_UNVERIFIED_MESSAGE, settledReported: false }
  }
  if (reportedAmount !== undefined && reportedAmount !== expectation.amountMsat) {
    return { kind: 'unverified', message: PAYMENT_STATUS_UNVERIFIED_MESSAGE, settledReported: false }
  }

  switch (payload.state) {
    case 'settled': {
      // NIP-47 requires both the payment hash and the amount in a lookup_invoice response, and
      // the frozen plan allows wallet-settled evidence only when the hash/amount still match.
      // A response that does not report both cannot confirm the payment, so it stays
      // unverified rather than becoming settlement evidence.
      if (reportedHash === undefined || reportedAmount === undefined) {
        return {
          kind: 'unverified',
          message: PAYMENT_STATUS_UNVERIFIED_MESSAGE,
          settledReported: false,
        }
      }
      return {
        kind: 'settled',
        message: PAYMENT_STATUS_MESSAGES.settled,
        settledReported: true,
      }
    }
    case 'pending':
      return { kind: 'pending', message: PAYMENT_STATUS_MESSAGES.pending, settledReported: false }
    case 'accepted':
      return { kind: 'accepted', message: PAYMENT_STATUS_MESSAGES.accepted, settledReported: false }
    case 'expired':
      return { kind: 'expired', message: PAYMENT_STATUS_MESSAGES.expired, settledReported: false }
    case 'failed':
      return { kind: 'failed', message: PAYMENT_STATUS_MESSAGES.failed, settledReported: false }
    default:
      // Any state the strict adapter does not recognise is not settlement evidence.
      return { kind: 'unverified', message: PAYMENT_STATUS_UNVERIFIED_MESSAGE, settledReported: false }
  }
}

/**
 * Guards a single `lookup_invoice` request per explicit control activation.
 *
 * At most one request is ever issued. There is no retry, no polling, and no repeat after a
 * timeout or an error; a second activation returns the first outcome unchanged.
 */
export class PaymentStatusLookup {
  private started = false
  private outcome: PaymentStatusOutcome | null = null
  private inFlight: Promise<PaymentStatusOutcome> | null = null

  /** True once the control has been activated. */
  get hasRun(): boolean {
    return this.started
  }

  /** The outcome of the single request, once it has completed. */
  get result(): PaymentStatusOutcome | null {
    return this.outcome
  }

  run(
    requester: PaymentStatusRequester,
    expectation: PaymentStatusExpectation,
  ): Promise<PaymentStatusOutcome> {
    // A second activation while the request is in flight joins it instead of issuing another.
    if (this.inFlight) return this.inFlight
    // A second activation after completion returns the first outcome unchanged.
    if (this.outcome) return Promise.resolve(this.outcome)

    this.started = true
    const request = this.perform(requester, expectation)
    this.inFlight = request
    return request
  }

  private async perform(
    requester: PaymentStatusRequester,
    expectation: PaymentStatusExpectation,
  ): Promise<PaymentStatusOutcome> {
    try {
      const result = await requester.requestEnvelope('lookup_invoice', {
        payment_hash: expectation.paymentHash,
      })
      const outcome = describePaymentStatus(result, expectation)
      this.outcome = outcome
      return outcome
    } catch {
      const outcome: PaymentStatusOutcome = {
        kind: 'unverified',
        message: PAYMENT_STATUS_UNVERIFIED_MESSAGE,
        settledReported: false,
      }
      this.outcome = outcome
      return outcome
    } finally {
      this.inFlight = null
    }
  }
}
