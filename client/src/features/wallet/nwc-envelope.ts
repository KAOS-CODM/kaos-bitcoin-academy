/**
 * NIP-47 request/response adapter.
 *
 * The installed `@getalby/sdk` resolves only `response.result` from a wallet reply, so the
 * response `result_type` is never read and can never be validated through the high-level
 * `payInvoice` / `makeInvoice` / `lookupInvoice` methods. This adapter performs the NIP-47
 * lifecycle itself using only the public members of `NWCClient`:
 *
 *   relayUrls, walletPubkey, encryptionType, encrypt, decrypt, signEvent, pool
 *
 * It stops at the parsed response envelope, so `result_type` is available for strict
 * validation before any result is accepted.
 *
 * Nothing here reaches into private SDK state, and no relay or wallet is contacted by the
 * module itself.
 */

export const NIP47_REQUEST_KIND = 23194
export const NIP47_RESPONSE_KIND = 23195
export const NIP47_INFO_KIND = 13194

/**
 * The NIP-47 methods this adapter may send.
 *
 * `get_info`, `get_balance`, and `list_transactions` are read-only account methods. They are
 * only ever sent from an explicit user action; the adapter itself never schedules a request.
 */
export type Nip47EnvelopeMethod =
  | 'get_info'
  | 'get_balance'
  | 'list_transactions'
  | 'pay_invoice'
  | 'make_invoice'
  | 'lookup_invoice'

export interface Nip47EventTemplate {
  kind: number
  created_at: number
  tags: string[][]
  content: string
}

export interface Nip47Event {
  id: string
  content: string
  kind?: number
  pubkey?: string
  sig?: string
  tags?: string[][]
  created_at?: number
}

export interface Nip47Filter {
  kinds?: number[]
  authors?: string[]
  limit?: number
  '#e'?: string[]
}

export interface Nip47Subscription {
  close(reason?: string): void
}

export interface Nip47SubscriptionParams {
  onevent?: (event: Nip47Event) => void
  onconnect?: (url: string) => void
  ondisconnect?: (url: string, reason: string) => void
}

export interface Nip47PoolLike {
  subscribe(
    relays: string[],
    filter: Nip47Filter,
    params: Nip47SubscriptionParams,
  ): Nip47Subscription
  publish(relays: string[], event: Nip47Event): Promise<string>[]
  close?(relays: string[]): void
}

/** The public `NWCClient` surface this adapter depends on. */
export interface Nip47Transport {
  relayUrls: string[]
  walletPubkey: string
  readonly encryptionType: string
  encrypt(pubkey: string, content: string): Promise<unknown>
  decrypt(pubkey: string, content: string): Promise<string>
  signEvent(template: Nip47EventTemplate): Promise<Nip47Event>
  pool: Nip47PoolLike
}

export type Nip47FailureKind =
  /** Envelope missing, malformed, `result_type` mismatched, or method shape invalid. */
  | 'invalid-envelope'
  /** The wallet returned a protocol error object. */
  | 'wallet-error'
  /** No approved relay accepted the request event. */
  | 'not-submitted'
  /** No reply arrived before the reply timeout. */
  | 'timeout'
  /** The session was disconnected or superseded before the reply arrived. */
  | 'stale'
  /** The transport targets a relay that is not on the approved list. */
  | 'relay-not-approved'
  /** The transport has not completed encryption negotiation. */
  | 'encryption-unavailable'

export type Nip47RequestResult =
  | { status: 'ok'; result: unknown }
  | { status: 'failed'; kind: Nip47FailureKind; code?: string }

const HEX64 = /^[0-9a-f]{64}$/i

export const NIP47_LOOKUP_STATES = [
  'pending',
  'settled',
  'accepted',
  'expired',
  'failed',
] as const

export type Nip47LookupState = (typeof NIP47_LOOKUP_STATES)[number]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && HEX64.test(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/**
 * Validate a `pay_invoice` result. NIP-47 requires `preimage`; `fees_paid` is optional.
 */
export function isValidPayInvoiceResult(result: unknown): boolean {
  if (!isPlainObject(result)) return false
  if (!isHex64(result.preimage)) return false
  if (result.fees_paid !== undefined && !isNonNegativeInteger(result.fees_paid)) return false
  return true
}

/**
 * Validate a `make_invoice` result. NIP-47 marks `invoice` and `preimage` optional; the
 * payment hash and amount are not, and both are required by the receive flow.
 */
export function isValidMakeInvoiceResult(result: unknown): boolean {
  if (!isPlainObject(result)) return false
  if (!isHex64(result.payment_hash)) return false
  if (!isPositiveInteger(result.amount)) return false
  if (result.invoice !== undefined && typeof result.invoice !== 'string') return false
  if (result.description !== undefined && typeof result.description !== 'string') return false
  if (result.fees_paid !== undefined && !isNonNegativeInteger(result.fees_paid)) return false
  return true
}

/**
 * Validate a `lookup_invoice` result. NIP-47 marks `invoice` optional and `state` optional;
 * a missing `invoice` field is inconclusive, never proof of failure.
 */
export function isValidLookupInvoiceResult(result: unknown): boolean {
  if (!isPlainObject(result)) return false
  if (result.state !== undefined && !NIP47_LOOKUP_STATES.includes(result.state as Nip47LookupState)) {
    return false
  }
  if (result.payment_hash !== undefined && !isHex64(result.payment_hash)) return false
  if (result.amount !== undefined && !isPositiveInteger(result.amount)) return false
  if (result.invoice !== undefined && typeof result.invoice !== 'string') return false
  if (result.type !== undefined && result.type !== 'incoming' && result.type !== 'outgoing') {
    return false
  }
  return true
}

/**
 * Validate a `get_info` result. NIP-47 requires the `methods` capability list, and the
 * installed SDK validates the same field.
 */
export function isValidGetInfoResult(result: unknown): boolean {
  if (!isPlainObject(result)) return false
  if (!Array.isArray(result.methods)) return false
  return result.methods.every((entry) => typeof entry === 'string')
}

/**
 * Validate a `get_balance` result. NIP-47 requires `balance`, expressed in millisatoshis.
 */
export function isValidGetBalanceResult(result: unknown): boolean {
  if (!isPlainObject(result)) return false
  return isNonNegativeInteger(result.balance)
}

/**
 * Validate a `list_transactions` result. NIP-47 requires a `transactions` array; every entry
 * must be an object. Individual fields are sanitised later, never rendered raw.
 */
export function isValidListTransactionsResult(result: unknown): boolean {
  if (!isPlainObject(result)) return false
  if (!Array.isArray(result.transactions)) return false
  return result.transactions.every((entry) => isPlainObject(entry))
}

export function isValidMethodResult(method: Nip47EnvelopeMethod, result: unknown): boolean {
  switch (method) {
    case 'get_info':
      return isValidGetInfoResult(result)
    case 'get_balance':
      return isValidGetBalanceResult(result)
    case 'list_transactions':
      return isValidListTransactionsResult(result)
    case 'pay_invoice':
      return isValidPayInvoiceResult(result)
    case 'make_invoice':
      return isValidMakeInvoiceResult(result)
    case 'lookup_invoice':
      return isValidLookupInvoiceResult(result)
    default:
      return false
  }
}

export interface Nip47AdapterOptions {
  transport: Nip47Transport
  /** Relays the adapter is permitted to contact. Must contain the transport relays. */
  allowedRelays: readonly string[]
  /** Reply timeout in milliseconds. */
  replyTimeoutMs?: number
  /** Returns true when the session has been disconnected or superseded. */
  isStale?: () => boolean
  now?: () => number
}

const DEFAULT_REPLY_TIMEOUT_MS = 60_000

/**
 * Sends one NIP-47 request and validates the response envelope.
 *
 * Every terminal path closes the subscription, clears the reply timer, and settles the
 * returned promise exactly once.
 */
export class Nip47EnvelopeAdapter {
  private readonly transport: Nip47Transport
  private readonly allowedRelays: readonly string[]
  private readonly replyTimeoutMs: number
  private readonly isStale: () => boolean
  private readonly now: () => number

  constructor(options: Nip47AdapterOptions) {
    this.transport = options.transport
    this.allowedRelays = options.allowedRelays
    this.replyTimeoutMs = options.replyTimeoutMs ?? DEFAULT_REPLY_TIMEOUT_MS
    this.isStale = options.isStale ?? (() => false)
    this.now = options.now ?? (() => Date.now())
  }

  private relayTargets(): string[] {
    return this.transport.relayUrls.filter((url) => this.allowedRelays.includes(url))
  }

  private relaysApproved(): boolean {
    const relays = this.transport.relayUrls
    if (relays.length === 0) return false
    return relays.every((url) => this.allowedRelays.includes(url))
  }

  /**
   * Build the kind-23194 request template. The `v` tag mirrors the SDK's own interop
   * behaviour for wallet services that predate the 2025-06-01 encryption change.
   */
  buildRequestTemplate(method: Nip47EnvelopeMethod, params: unknown): Nip47EventTemplate {
    const encryptionType = this.transport.encryptionType
    return {
      kind: NIP47_REQUEST_KIND,
      created_at: Math.floor(this.now() / 1000),
      tags: [
        ['p', this.transport.walletPubkey],
        ['v', encryptionType === 'nip44_v2' ? '1.0' : '0.0'],
        ['encryption', encryptionType],
      ],
      content: JSON.stringify({ method, params }),
    }
  }

  async request(
    method: Nip47EnvelopeMethod,
    params: unknown,
  ): Promise<Nip47RequestResult> {
    if (!this.relaysApproved()) {
      return { status: 'failed', kind: 'relay-not-approved' }
    }

    let encryptionType: string
    try {
      encryptionType = this.transport.encryptionType
    } catch {
      return { status: 'failed', kind: 'encryption-unavailable' }
    }
    if (!encryptionType) {
      return { status: 'failed', kind: 'encryption-unavailable' }
    }

    let encrypted: unknown
    let signed: Nip47Event
    try {
      encrypted = await this.transport.encrypt(
        this.transport.walletPubkey,
        JSON.stringify({ method, params }),
      )
      signed = await this.transport.signEvent({
        kind: NIP47_REQUEST_KIND,
        created_at: Math.floor(this.now() / 1000),
        tags: [
          ['p', this.transport.walletPubkey],
          ['v', encryptionType === 'nip44_v2' ? '1.0' : '0.0'],
          ['encryption', encryptionType],
        ],
        content: String(encrypted),
      })
    } catch {
      return { status: 'failed', kind: 'not-submitted' }
    }

    if (!signed || typeof signed.id !== 'string' || signed.id === '') {
      return { status: 'failed', kind: 'not-submitted' }
    }

    const relays = this.relayTargets()

    return new Promise<Nip47RequestResult>((resolve) => {
      let settled = false
      let timer: ReturnType<typeof setTimeout> | undefined
      let subscription: Nip47Subscription | undefined

      const finish = (outcome: Nip47RequestResult): void => {
        if (settled) return
        settled = true
        if (timer !== undefined) clearTimeout(timer)
        try {
          subscription?.close()
        } catch {
          // A failed close must not change the reported outcome.
        }
        resolve(outcome)
      }

      const handleEvent = async (event: Nip47Event): Promise<void> => {
        try {
          // A reply that arrives after the session was disconnected or superseded is
          // discarded rather than applied.
          if (this.isStale()) {
            finish({ status: 'failed', kind: 'stale' })
            return
          }

          const plaintext = await this.transport.decrypt(this.transport.walletPubkey, event.content)
          const envelope: unknown = JSON.parse(plaintext)
          if (!isPlainObject(envelope)) {
            finish({ status: 'failed', kind: 'invalid-envelope' })
            return
          }

          // Strict: the envelope must name the method it is answering.
          if (envelope.result_type !== method) {
            finish({ status: 'failed', kind: 'invalid-envelope' })
            return
          }

          const hasError = envelope.error !== undefined && envelope.error !== null
          const hasResult = envelope.result !== undefined && envelope.result !== null

          // A reply that carries both an error and a result is malformed.
          if (hasError && hasResult) {
            finish({ status: 'failed', kind: 'invalid-envelope' })
            return
          }

          if (hasError) {
            const error = envelope.error
            const code =
              isPlainObject(error) && typeof error.code === 'string' ? error.code : 'INTERNAL'
            finish({ status: 'failed', kind: 'wallet-error', code })
            return
          }

          if (!hasResult) {
            finish({ status: 'failed', kind: 'invalid-envelope' })
            return
          }

          if (!isValidMethodResult(method, envelope.result)) {
            finish({ status: 'failed', kind: 'invalid-envelope' })
            return
          }

          finish({ status: 'ok', result: envelope.result })
        } catch {
          // A decryption or JSON failure is unverified, never a payment failure.
          finish({ status: 'failed', kind: 'invalid-envelope' })
        }
      }

      try {
        // Subscribe before publishing so the reply cannot be missed.
        subscription = this.transport.pool.subscribe(
          relays,
          {
            kinds: [NIP47_RESPONSE_KIND],
            authors: [this.transport.walletPubkey],
            '#e': [signed.id],
          },
          {
            onevent: (event) => {
              void handleEvent(event)
            },
          },
        )
      } catch {
        finish({ status: 'failed', kind: 'not-submitted' })
        return
      }

      timer = setTimeout(() => {
        if (this.isStale()) {
          finish({ status: 'failed', kind: 'stale' })
          return
        }
        finish({ status: 'failed', kind: 'timeout' })
      }, this.replyTimeoutMs)

      try {
        const published = this.transport.pool.publish(relays, signed)
        void Promise.all(published.map((promise) => promise.catch(() => undefined))).then(
          (results) => {
            if (settled) return
            const accepted = results.some((result) => typeof result === 'string')
            if (!accepted) {
              finish({ status: 'failed', kind: 'not-submitted' })
            }
          },
        )
      } catch {
        // A transport that throws synchronously must not leave the request unsettled.
        finish({ status: 'failed', kind: 'not-submitted' })
      }
    })
  }
}
