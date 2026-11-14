/**
 * Wallet account dashboard logic.
 *
 * Pure functions and types only. Nothing in this module runs a request at import time, keeps
 * state between calls, stores anything, or contacts a relay on its own. Every request helper
 * performs exactly one NIP-47 request when it is called and returns the wallet's own answer,
 * sanitised for display.
 *
 * A failed request never produces a value. That is what keeps a failed balance check from
 * being shown as a zero balance, and an empty history from being shown as invented activity.
 */

import {
  SAFE_WALLET_CODES,
  sanitizeGetInfoResponse,
  type SanitizedGetInfoResponse,
} from './nwc'
import type {
  Nip47EnvelopeMethod,
  Nip47FailureKind,
  Nip47RequestResult,
} from './nwc-envelope'

/**
 * The number of transactions the dashboard asks for.
 *
 * The bound keeps the request small and the rendered list readable. It is a limit the user
 * can change later; it is never raised automatically.
 */
export const ACCOUNT_TRANSACTION_LIMIT = 20

/** The connection state shown in the dashboard's connection overview. */
export type AccountConnectionState = 'connected' | 'disconnected' | 'error'

/**
 * The narrow surface the account dashboard needs from a wallet session.
 *
 * A real session and a test double both satisfy it, so the dashboard never touches the
 * wallet client directly.
 */
export interface AccountRequester {
  requestEnvelope(
    method: Nip47EnvelopeMethod,
    params: unknown,
    options?: { replyTimeoutMs?: number },
  ): Promise<Nip47RequestResult>
}

/**
 * How a failed wallet request is classified.
 *
 * The categories are kept apart on purpose: a permission problem, an unsupported operation,
 * an insufficient balance, an expired session, and a transport failure all mean different
 * things and must never be shown as the same problem.
 */
export type AccountFailureCategory =
  | 'permission-missing'
  | 'unsupported-operation'
  | 'insufficient-balance'
  | 'session-expired'
  | 'transport-failure'
  | 'wallet-error'
  | 'invalid-response'

export interface AccountFailure {
  category: AccountFailureCategory
  /** A short label for the problem. */
  title: string
  /** A plain-language explanation. Never contains wallet-supplied text. */
  message: string
  /** True when repeating the same manual request is a sensible next step. */
  retryable: boolean
}

/** Codes that mean the connection is not authorized for the requested operation. */
const PERMISSION_CODES = new Set(['UNAUTHORIZED', 'RESTRICTED', 'QUOTA_EXCEEDED'])

/** Codes that mean the wallet service does not implement the requested operation. */
const UNSUPPORTED_CODES = new Set(['NOT_IMPLEMENTED', 'UNSUPPORTED_ENCRYPTION'])

/** The transaction states NIP-47 defines. */
const TRANSACTION_STATES = ['settled', 'pending', 'failed', 'accepted'] as const

const HEX64 = /^[0-9a-f]{64}$/i

const INVALID_RESPONSE_FAILURE: AccountFailure = {
  category: 'invalid-response',
  title: 'Unreadable wallet response',
  message:
    "The wallet's reply did not contain the information the academy requires, so nothing is shown. The academy never displays a value it did not receive from the wallet.",
  retryable: true,
}

/**
 * Turn an adapter failure into a safe, classified explanation.
 *
 * Only codes from the fixed safe list are echoed back. Any other wallet-supplied code is
 * dropped, because an unrecognised code is arbitrary wallet text.
 */
export function classifyAccountFailure(
  kind: Nip47FailureKind,
  code?: string,
): AccountFailure {
  const normalized = typeof code === 'string' ? code.toUpperCase() : ''
  const safeCode = SAFE_WALLET_CODES.has(normalized) ? normalized : ''

  if (kind === 'stale') {
    return {
      category: 'session-expired',
      title: 'Session expired or disconnected',
      message:
        'The wallet connection closed before the reply arrived, so nothing was returned. Reconnect the wallet and ask again.',
      retryable: true,
    }
  }

  if (kind === 'wallet-error') {
    if (normalized === 'INSUFFICIENT_BALANCE') {
      return {
        category: 'insufficient-balance',
        title: 'The wallet reports an insufficient balance',
        message:
          'The wallet explicitly reported that the available balance is not enough for this request. The academy never estimates a balance; only your wallet reports one.',
        retryable: false,
      }
    }

    if (PERMISSION_CODES.has(normalized)) {
      return {
        category: 'permission-missing',
        title: 'Required permission missing',
        message:
          'The wallet refused this request because the connection is not authorized for it. Nothing was changed. Check the permissions for this connection in your wallet.',
        retryable: false,
      }
    }

    if (UNSUPPORTED_CODES.has(normalized)) {
      return {
        category: 'unsupported-operation',
        title: 'Operation not supported by this wallet',
        message:
          'The wallet reported that it does not support this operation on this connection.',
        retryable: false,
      }
    }

    return {
      category: 'wallet-error',
      title: 'The wallet reported an error',
      message: safeCode
        ? `The wallet returned the error code ${safeCode}. No sensitive details are displayed.`
        : 'The wallet reported an error without a usable reason. No sensitive details are displayed.',
      retryable: true,
    }
  }

  if (kind === 'not-submitted' || kind === 'relay-not-approved' || kind === 'encryption-unavailable') {
    return {
      category: 'transport-failure',
      title: 'Temporary relay or transport failure',
      message:
        'The request did not reach the wallet service through the approved relay. This says nothing about your wallet or your balance. Check the connection and try again.',
      retryable: true,
    }
  }

  if (kind === 'timeout') {
    return {
      category: 'transport-failure',
      title: 'Temporary relay or transport failure',
      message:
        'The wallet did not answer in time. This is a timeout, not a statement about your wallet. Check your wallet activity and try again.',
      retryable: true,
    }
  }

  // 'invalid-envelope' and anything the adapter does not recognise.
  return INVALID_RESPONSE_FAILURE
}

/** The result of one manual account request. */
export type AccountOutcome<T> =
  | { status: 'ok'; value: T; receivedAt: number }
  | { status: 'failed'; failure: AccountFailure; receivedAt: number }

export interface AccountRequestOptions {
  /** Clock injection for deterministic tests. */
  now?: () => number
}

function readClock(options: AccountRequestOptions): () => number {
  return options.now ?? (() => Date.now())
}

/**
 * Ask the wallet for its own information.
 *
 * This is a manual action only: the caller decides when to run it.
 */
export async function requestAccountInfo(
  requester: AccountRequester,
  options: AccountRequestOptions = {},
): Promise<AccountOutcome<SanitizedGetInfoResponse>> {
  const now = readClock(options)
  const result = await requester.requestEnvelope('get_info', {})
  const receivedAt = now()

  if (result.status !== 'ok') {
    return {
      status: 'failed',
      failure: classifyAccountFailure(result.kind, result.code),
      receivedAt,
    }
  }

  try {
    return { status: 'ok', value: sanitizeGetInfoResponse(result.result), receivedAt }
  } catch {
    return { status: 'failed', failure: INVALID_RESPONSE_FAILURE, receivedAt }
  }
}

/** A balance exactly as the wallet reported it. */
export interface WalletBalance {
  /** The balance in millisatoshis, unchanged from the wallet's answer. */
  balanceMsat: number
  /** The same value expressed in satoshis. */
  balanceSats: number
}

/**
 * Keep only the balance field of a `get_balance` result.
 *
 * Returns null when the wallet did not report a usable balance, so a missing balance can
 * never be turned into a zero balance.
 */
export function sanitizeBalanceResponse(value: unknown): WalletBalance | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  const source = value as Record<string, unknown>
  const balance = source.balance
  if (typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0) return null

  return { balanceMsat: balance, balanceSats: balance / 1000 }
}

/**
 * Ask the wallet for its balance.
 *
 * The request carries no parameters, exactly as NIP-47 defines `get_balance`.
 */
export async function requestAccountBalance(
  requester: AccountRequester,
  options: AccountRequestOptions = {},
): Promise<AccountOutcome<WalletBalance>> {
  const now = readClock(options)
  const result = await requester.requestEnvelope('get_balance', {})
  const receivedAt = now()

  if (result.status !== 'ok') {
    return {
      status: 'failed',
      failure: classifyAccountFailure(result.kind, result.code),
      receivedAt,
    }
  }

  const balance = sanitizeBalanceResponse(result.result)
  if (!balance) {
    return { status: 'failed', failure: INVALID_RESPONSE_FAILURE, receivedAt }
  }

  return { status: 'ok', value: balance, receivedAt }
}

/** A transaction record reduced to the fields the dashboard may display. */
export interface WalletTransaction {
  type: 'incoming' | 'outgoing'
  amountMsat: number
  amountSats: number
  state?: (typeof TRANSACTION_STATES)[number]
  /** Unix seconds, as reported by the wallet. */
  createdAt?: number
  /** Unix seconds, as reported by the wallet. */
  settledAt?: number
  /** A short, truncated payment hash reference. The full hash is never displayed. */
  paymentHashRef?: string
  /** A short description supplied by the wallet. */
  description?: string
}

/**
 * Reduce a `list_transactions` result to the records the dashboard may show.
 *
 * The invoice text and the preimage are deliberately never read: they are secrets or
 * payment credentials and must not reach the interface. A record that does not report a
 * usable type and amount is dropped rather than displayed as an empty row.
 */
export function sanitizeTransactionList(value: unknown): WalletTransaction[] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  const source = value as Record<string, unknown>
  if (!Array.isArray(source.transactions)) return null

  const transactions: WalletTransaction[] = []

  for (const entry of source.transactions) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>

    const type = record.type
    if (type !== 'incoming' && type !== 'outgoing') continue

    const amount = record.amount
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0) continue

    const transaction: WalletTransaction = {
      type,
      amountMsat: amount,
      amountSats: amount / 1000,
    }

    const state = record.state
    if (
      typeof state === 'string' &&
      (TRANSACTION_STATES as readonly string[]).includes(state)
    ) {
      transaction.state = state as WalletTransaction['state']
    }

    const createdAt = record.created_at
    if (typeof createdAt === 'number' && Number.isSafeInteger(createdAt) && createdAt > 0) {
      transaction.createdAt = createdAt
    }

    const settledAt = record.settled_at
    if (typeof settledAt === 'number' && Number.isSafeInteger(settledAt) && settledAt > 0) {
      transaction.settledAt = settledAt
    }

    const paymentHash = record.payment_hash
    if (typeof paymentHash === 'string' && HEX64.test(paymentHash)) {
      transaction.paymentHashRef = `${paymentHash.slice(0, 16)}…`
    }

    const description = record.description
    if (typeof description === 'string') {
      const trimmed = description.trim()
      if (trimmed !== '') transaction.description = trimmed.slice(0, 120)
    }

    transactions.push(transaction)
  }

  return transactions
}

/**
 * Ask the wallet for its transaction history.
 *
 * The request carries a bounded limit so the reply stays small and readable.
 */
export async function requestAccountTransactions(
  requester: AccountRequester,
  options: AccountRequestOptions = {},
): Promise<AccountOutcome<WalletTransaction[]>> {
  const now = readClock(options)
  const result = await requester.requestEnvelope('list_transactions', {
    limit: ACCOUNT_TRANSACTION_LIMIT,
  })
  const receivedAt = now()

  if (result.status !== 'ok') {
    return {
      status: 'failed',
      failure: classifyAccountFailure(result.kind, result.code),
      receivedAt,
    }
  }

  const transactions = sanitizeTransactionList(result.result)
  if (!transactions) {
    return { status: 'failed', failure: INVALID_RESPONSE_FAILURE, receivedAt }
  }

  return { status: 'ok', value: transactions, receivedAt }
}

/** The methods the academy knows how to talk about. */
export const ACCOUNT_KNOWN_METHODS = [
  'get_info',
  'get_balance',
  'list_transactions',
  'pay_invoice',
  'make_invoice',
  'lookup_invoice',
] as const

export type AccountCapabilityState =
  | 'reported-and-verified'
  | 'reported-but-unavailable'
  | 'reported'
  | 'not-reported'

export interface AccountCapability {
  method: string
  state: AccountCapabilityState
  label: string
  detail: string
}

/**
 * Describe what the wallet reports, what has actually been tested, and what is unavailable.
 *
 * A method that appears in the wallet's capability list is not assumed to work: only a
 * request that actually succeeded counts as tested.
 */
export function describeCapabilities(input: {
  reported: readonly string[]
  verified: readonly string[]
  failures: Readonly<Record<string, string>>
}): AccountCapability[] {
  const reported = new Set(input.reported)
  const verified = new Set(input.verified)

  const names: string[] = [...ACCOUNT_KNOWN_METHODS]
  for (const method of input.reported) {
    if (!names.includes(method)) names.push(method)
  }

  return names.map((method) => {
    if (reported.has(method) && verified.has(method)) {
      return {
        method,
        state: 'reported-and-verified',
        label: 'Reported and tested',
        detail:
          'The wallet reports this method, and a request for it succeeded in this session.',
      }
    }

    const failure = input.failures[method]
    if (reported.has(method) && failure) {
      return {
        method,
        state: 'reported-but-unavailable',
        label: 'Reported but unavailable',
        detail: `The wallet reports this method, but the request did not succeed: ${failure}`,
      }
    }

    if (reported.has(method)) {
      return {
        method,
        state: 'reported',
        label: 'Reported, not tested',
        detail:
          'The wallet reports this method. The academy has not called it in this session, so it is not confirmed to work.',
      }
    }

    return {
      method,
      state: 'not-reported',
      label: 'Not reported',
      detail:
        'The wallet did not report this method, so it is unavailable to this connection.',
    }
  })
}

export type AccountDiagnosticKind =
  | AccountFailureCategory
  | 'no-connection'
  | 'connection-error'
  | 'connected-responding'
  | 'connected-unverified'
  | 'balance-unavailable'

export interface AccountDiagnostic {
  kind: AccountDiagnosticKind
  title: string
  message: string
}

/**
 * The order in which problems are reported.
 *
 * A session that has expired explains every other symptom, so it wins. A missing permission
 * or an unsupported operation is a property of the connection and is more useful to report
 * than a transient transport failure.
 */
const FAILURE_PRIORITY: Record<AccountFailureCategory, number> = {
  'session-expired': 1,
  'permission-missing': 2,
  'unsupported-operation': 3,
  'insufficient-balance': 4,
  'transport-failure': 5,
  'wallet-error': 6,
  'invalid-response': 7,
}

/**
 * Summarise the account state from the evidence that actually exists.
 *
 * The summary never guesses: a connected wallet with no completed request is reported as
 * unverified rather than as responding.
 */
export function deriveAccountDiagnostic(input: {
  connection: AccountConnectionState
  infoAvailable: boolean
  balanceAvailable: boolean
  failures: readonly (AccountFailure | null)[]
}): AccountDiagnostic {
  if (input.connection === 'error') {
    return {
      kind: 'connection-error',
      title: 'Connection error',
      message:
        'The wallet connection failed, so no wallet request was completed. Check the connection details and the approved relays, then try again.',
    }
  }

  if (input.connection !== 'connected') {
    return {
      kind: 'no-connection',
      title: 'No wallet connected',
      message:
        'There is no wallet connection in this page, so the academy cannot report an account. Connect a wallet above to inspect one.',
    }
  }

  const failures = input.failures.filter(
    (failure): failure is AccountFailure => failure !== null,
  )

  if (failures.length > 0) {
    let dominant = failures[0]
    for (const failure of failures) {
      if (FAILURE_PRIORITY[failure.category] < FAILURE_PRIORITY[dominant.category]) {
        dominant = failure
      }
    }

    return { kind: dominant.category, title: dominant.title, message: dominant.message }
  }

  if (input.infoAvailable || input.balanceAvailable) {
    return {
      kind: 'connected-responding',
      title: 'Connected and responding',
      message:
        'Your wallet answered the requests you started. Every value shown here is the wallet’s own report, not a statement from the academy.',
    }
  }

  return {
    kind: 'connected-unverified',
    title: 'Connected, not yet verified',
    message:
      'The wallet connection is open, but no request has completed in this session yet, so the academy cannot confirm that the wallet is responding.',
  }
}

/** Group the integer part of a number for readability. */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Format a satoshi amount for display, including fractional satoshis when present. */
export function formatSats(sats: number): string {
  if (!Number.isFinite(sats)) return '—'

  const negative = sats < 0
  const absolute = Math.abs(sats)
  const whole = Math.floor(absolute)
  const fraction = absolute - whole
  const sign = negative ? '-' : ''

  if (fraction === 0) return `${sign}${groupThousands(String(whole))}`

  // `toFixed` keeps eight fractional digits, so the leading "0." is dropped and any
  // trailing zeros are removed. A fraction that rounds away leaves the whole number.
  const digits = fraction.toFixed(8).slice(2).replace(/0+$/, '')
  if (digits === '') return `${sign}${groupThousands(String(whole))}`

  return `${sign}${groupThousands(String(whole))}.${digits}`
}

/** Format the same amount in bitcoin, the unit a Lightning balance is usually shown in. */
export function formatBtc(sats: number): string {
  if (!Number.isFinite(sats)) return '—'
  return (sats / 100_000_000).toFixed(8)
}

/** The full account state the dashboard renders. */
export interface WalletAccountSnapshot {
  connection: AccountConnectionState
  /** The methods the wallet reported in its most recent `get_info`. */
  reportedMethods: readonly string[]
  /** The methods that actually completed successfully in this session. */
  verifiedMethods: readonly string[]
  /** A short explanation per method whose request failed. */
  methodFailures: Readonly<Record<string, string>>
  info: SanitizedGetInfoResponse | null
  /** When the wallet information was last refreshed successfully. */
  infoRefreshedAt: number | null
  infoFailure: AccountFailure | null
  balance: WalletBalance | null
  /** When the balance was last read successfully. */
  balanceCheckedAt: number | null
  balanceFailure: AccountFailure | null
  transactions: readonly WalletTransaction[] | null
  /** When the transaction history was last read successfully. */
  historyRequestedAt: number | null
  historyFailure: AccountFailure | null
  busy: {
    info: boolean
    balance: boolean
    history: boolean
  }
}
