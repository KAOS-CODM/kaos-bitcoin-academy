export const COINOS_RELAY = 'wss://relay.coinos.io'
export const ALBY_RELAY = 'wss://relay.getalby.com/v1'
export const APPROVED_RELAYS = [COINOS_RELAY, ALBY_RELAY] as const

export type ApprovedRelay = (typeof APPROVED_RELAYS)[number]

const APPROVED_RELAY_ALIASES = new Map<string, ApprovedRelay>([
  [COINOS_RELAY, COINOS_RELAY],
  [`${COINOS_RELAY}/`, COINOS_RELAY],
  [ALBY_RELAY, ALBY_RELAY],
])
const NWC_PREFIX = 'nostr+walletconnect://'
const HEX64 = /^[0-9a-f]{64}$/
const MAX_URI_LENGTH = 4096
const ALLOWED_QUERY_PARAMS = new Set(['relay', 'secret', 'lud16'])
const STRING_FIELDS = {
  alias: 120,
  color: 32,
  pubkey: 128,
  network: 32,
  block_hash: 128,
} as const
const ARRAY_FIELDS = {
  methods: 64,
  extensions: 64,
} as const

/**
 * NIP-47 error codes that may be shown to a learner.
 *
 * A wallet error code is wallet-supplied text. Only the codes in this fixed list are ever
 * echoed back into the interface, so an unexpected code can never smuggle arbitrary content
 * into the page.
 */
export const SAFE_WALLET_CODES = new Set([
  'UNAUTHORIZED',
  'NOT_IMPLEMENTED',
  'INSUFFICIENT_BALANCE',
  'QUOTA_EXCEEDED',
  'RATE_LIMITED',
  'RESTRICTED',
  'INTERNAL',
  'OTHER',
  'UNSUPPORTED_ENCRYPTION',
  'PAYMENT_FAILED',
  'NOT_FOUND',
])

import {
  Nip47EnvelopeAdapter,
  type Nip47EnvelopeMethod,
  type Nip47RequestResult,
  type Nip47Transport,
} from './nwc-envelope'

export class WalletError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WalletError'
  }
}

export interface NwcConnection {
  walletPubkey: string
  secret: string
  relay: ApprovedRelay
}

export interface SanitizedGetInfoResponse {
  alias?: string
  color?: string
  pubkey?: string
  network?: string
  block_height?: number
  block_hash?: string
  methods: string[]
  extensions?: string[]
}

export interface NwcClientLike {
  getInfo(): Promise<unknown>
  close(): void
}

export type WalletConnectResult =
  | { status: 'connected'; info: SanitizedGetInfoResponse }
  | { status: 'stale' }

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'
type ConsoleTarget = Record<ConsoleMethod, (...args: unknown[]) => void>

const CONSOLE_METHODS: ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug']

function fail(message: string): never {
  throw new WalletError(message)
}

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (text === '') return undefined
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function cleanStringArray(value: unknown, maxItems: number, field: string): string[] {
  if (!Array.isArray(value)) {
    fail(`The wallet response contains an invalid ${field} field.`)
  }

  const result = value
    .map((item) => cleanString(item, 64))
    .filter((item): item is string => item !== undefined)
    .slice(0, maxItems)

  return result.filter((item, index) => result.indexOf(item) === index)
}

function validateApprovedRelay(value: string): ApprovedRelay {
  let relay: URL
  try {
    relay = new URL(value)
  } catch {
    fail('The relay in the connection URI is not a valid URL.')
  }

  if (relay.protocol !== 'wss:') {
    fail('Only secure WebSocket (wss://) relays are accepted.')
  }
  if (relay.port !== '') {
    fail('The approved relay must not use a custom port.')
  }
  if (relay.username !== '' || relay.password !== '') {
    fail('The relay must not contain credentials.')
  }
  if (relay.search !== '' || relay.hash !== '') {
    fail('The approved relay must not contain a query string or fragment.')
  }

  const approved = APPROVED_RELAY_ALIASES.get(value)
  if (approved) return approved

  if (relay.hostname === 'relay.getalby.com') {
    fail('The Alby relay must use the exact /v1 path.')
  }
  if (relay.hostname === 'relay.coinos.io') {
    fail('The Coinos relay must use only the approved origin.')
  }

  fail('Only wss://relay.coinos.io or wss://relay.getalby.com/v1 is accepted.')
}

/**
 * Parse and validate an NWC URI locally. The returned object contains only the
 * values needed to construct the SDK client. The caller should discard the
 * secret as soon as the client has been created.
 */
export function parseNwcUri(raw: unknown): NwcConnection {
  if (typeof raw !== 'string') {
    fail('The connection URI is not text.')
  }

  const input = raw.trim()
  if (input === '') {
    fail('Enter a fresh NWC connection URI.')
  }
  if (input.length > MAX_URI_LENGTH) {
    fail('The connection URI is too long.')
  }
  if (/\s/.test(input)) {
    fail('The connection URI contains whitespace.')
  }
  if (!input.startsWith(NWC_PREFIX)) {
    fail('The value is not a nostr+walletconnect connection URI.')
  }
  if (input.includes('#')) {
    fail('The connection URI contains a fragment, which is not accepted.')
  }

  const rest = input.slice(NWC_PREFIX.length)
  const queryStart = rest.indexOf('?')
  if (queryStart < 1) {
    fail('The connection URI is missing its wallet public key or parameters.')
  }

  const authority = rest.slice(0, queryStart)
  const query = rest.slice(queryStart + 1)
  if (authority.includes('/') || authority.includes('@') || authority.includes(':')) {
    fail('The wallet public key in the connection URI is invalid.')
  }

  const walletPubkey = authority.toLowerCase()
  if (!HEX64.test(walletPubkey)) {
    fail('The wallet public key in the connection URI is invalid.')
  }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(query)
  } catch {
    fail('The connection URI parameters are not valid.')
  }

  for (const key of params.keys()) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      fail('The connection URI contains an unsupported parameter.')
    }
  }

  const relays = params.getAll('relay')
  const secrets = params.getAll('secret')
  const lud16s = params.getAll('lud16')

  if (relays.length !== 1) {
    fail('The connection URI must contain exactly one relay.')
  }
  if (secrets.length !== 1) {
    fail('The connection URI must contain exactly one secret.')
  }
  if (lud16s.length > 1) {
    fail('The connection URI contains duplicate lud16 parameters.')
  }

  const relay = validateApprovedRelay(relays[0])
  const secret = secrets[0].toLowerCase()
  if (!HEX64.test(secret)) {
    fail('The secret in the connection URI is invalid.')
  }

  return { walletPubkey, secret, relay }
}

/**
 * Keep only the fields this page displays from a NIP-47 get_info response.
 * Unknown fields are discarded rather than rendered.
 */
export function sanitizeGetInfoResponse(value: unknown): SanitizedGetInfoResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('The wallet response was not an object.')
  }

  const source = value as Record<string, unknown>
  const result: SanitizedGetInfoResponse = { methods: [] }

  for (const [key, maxLength] of Object.entries(STRING_FIELDS)) {
    const text = cleanString(source[key], maxLength)
    if (text !== undefined) result[key as keyof typeof STRING_FIELDS] = text
  }

  if (Number.isSafeInteger(source.block_height) && (source.block_height as number) >= 0) {
    result.block_height = source.block_height as number
  }

  const methods =
    source.methods === undefined || source.methods === null ? [] : source.methods
  result.methods = cleanStringArray(methods, ARRAY_FIELDS.methods, 'methods')

  if (source.extensions !== undefined) {
    result.extensions = cleanStringArray(
      source.extensions,
      ARRAY_FIELDS.extensions,
      'extensions',
    )
  }

  return result
}

/**
 * Fixed, safe descriptions for the SDK's NIP-47 error classes.
 *
 * Every message here is a static string. None of them includes the SDK's own error
 * message, which can contain relay URLs, event identifiers, or a stringified wallet
 * response.
 */
const SDK_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  Nip47NetworkError:
    'The approved relay could not be reached. Check the connection and try again. No sensitive details are displayed.',
  Nip47PublishError:
    'The approved relay did not accept the request. Check the connection and try again. No sensitive details are displayed.',
  Nip47PublishTimeoutError:
    'The approved relay did not accept the request in time. Check the connection and try again. No sensitive details are displayed.',
  Nip47ReplyTimeoutError:
    'The wallet did not answer in time. Check your wallet activity before trying again. No sensitive details are displayed.',
  Nip47ResponseDecodingError:
    "The wallet's reply could not be decrypted, so it was not accepted. No sensitive details are displayed.",
  Nip47ResponseValidationError:
    "The wallet's reply was not a valid get_info response, so it was not accepted. No sensitive details are displayed.",
  Nip47UnsupportedEncryptionError:
    'The wallet does not support a compatible encryption mode. No sensitive details are displayed.',
}

/**
 * The SDK's NIP-47 errors all extend `Error` and none of them sets `name`, so every
 * instance reports `name === 'Error'`. The constructor name is the only reliable
 * discriminator between a wallet-reported error and a local relay, transport, or protocol
 * failure.
 */
function sdkErrorClassName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  const name = (error as { constructor?: { name?: unknown } }).constructor?.name
  return typeof name === 'string' ? name : ''
}

export function describeWalletError(error: unknown): string {
  if (error instanceof WalletError) {
    return error.message
  }

  const code =
    typeof (error as { code?: unknown } | null)?.code === 'string'
      ? (error as { code: string }).code.toUpperCase()
      : ''

  const sdkClass = sdkErrorClassName(error)

  // Only a genuine wallet error may be reported as "the wallet returned <code>".
  if (sdkClass === 'Nip47WalletError') {
    if (SAFE_WALLET_CODES.has(code)) {
      return `The wallet returned ${code}. No sensitive details are displayed.`
    }
    return 'The wallet reported an error. No sensitive details are displayed.'
  }

  const sdkMessage = SDK_ERROR_MESSAGES[sdkClass]
  if (sdkMessage) {
    return sdkMessage
  }

  // Any other SDK-side NIP-47 failure is local to the request, not a wallet answer.
  if (sdkClass.startsWith('Nip47')) {
    return 'The wallet request did not complete. No sensitive details are displayed. Check the connection and try again.'
  }

  if (SAFE_WALLET_CODES.has(code)) {
    return `The wallet returned ${code}. No sensitive details are displayed.`
  }

  const name =
    typeof (error as { name?: unknown } | null)?.name === 'string'
      ? (error as { name: string }).name
      : ''

  if (/timeout/i.test(name)) {
    return 'No get_info response arrived before the wallet timeout. No sensitive details are displayed.'
  }

  return 'The wallet connection failed. The app did not log your connection URI or secret. Check the fresh connection and the approved relays, then try again.'
}

/**
 * Run a wallet call with console output suppressed.
 *
 * The SDK's failure paths call console.error with the caught error, and a validation error
 * can contain a stringified response. Suppressing console methods for the duration of the
 * call keeps connection details and wallet payloads out of DevTools.
 */
export async function withSuppressedConsole<T>(
  run: () => Promise<T>,
  target: ConsoleTarget = console as unknown as ConsoleTarget,
): Promise<T> {
  const originals = new Map<ConsoleMethod, (...args: unknown[]) => void>()

  for (const method of CONSOLE_METHODS) {
    originals.set(method, target[method])
    target[method] = () => {}
  }

  try {
    return await run()
  } finally {
    for (const method of CONSOLE_METHODS) {
      const original = originals.get(method)
      if (original) target[method] = original
    }
  }
}

/**
 * The SDK's getInfo() failure path calls console.error with the caught error.
 * Suppress console methods only for the duration of the request so an SDK
 * failure cannot print connection details into DevTools.
 */
export async function requestGetInfo(
  client: Pick<NwcClientLike, 'getInfo'>,
  target: ConsoleTarget = console as unknown as ConsoleTarget,
): Promise<unknown> {
  return withSuppressedConsole(() => client.getInfo(), target)
}

/**
 * Check at runtime that the connected client exposes the public members the NIP-47 adapter
 * needs. This is a structural check of public API only; nothing private is inspected.
 */
function hasTransportMembers(client: unknown): client is Nip47Transport {
  if (typeof client !== 'object' || client === null) return false
  const candidate = client as Partial<Nip47Transport>
  return (
    Array.isArray(candidate.relayUrls) &&
    typeof candidate.walletPubkey === 'string' &&
    typeof candidate.encrypt === 'function' &&
    typeof candidate.decrypt === 'function' &&
    typeof candidate.signEvent === 'function' &&
    typeof candidate.pool === 'object' &&
    candidate.pool !== null &&
    typeof candidate.pool.subscribe === 'function' &&
    typeof candidate.pool.publish === 'function'
  )
}

/**
 * Owns the single SDK client and a monotonically increasing attempt token.
 * Disconnecting or starting another request makes older responses stale.
 */
export class WalletClientSession {
  private client: NwcClientLike | null = null
  private attempt = 0

  constructor(
    private readonly createClient: (connection: NwcConnection) => NwcClientLike,
  ) {}
  get active(): boolean {
    return this.client !== null
  }

  async connect(raw: string): Promise<WalletConnectResult> {
    this.closeClient()
    const attempt = ++this.attempt
    let parsed: NwcConnection | null = parseNwcUri(raw)
    let client: NwcClientLike | null = null

    try {
      client = this.createClient(parsed)
      parsed.secret = ''
      parsed = null
      this.client = client

      const response = await requestGetInfo(client)
      if (attempt !== this.attempt) return { status: 'stale' }

      const info = sanitizeGetInfoResponse(response)
      if (attempt !== this.attempt) return { status: 'stale' }

      return { status: 'connected', info }
    } catch (error) {
      if (attempt !== this.attempt) return { status: 'stale' }
      this.closeClient()
      throw error
    } finally {
      if (parsed) parsed.secret = ''
      client = null
    }
  }

  /**
   * Send one NIP-47 request through the strict envelope adapter.
   *
   * The adapter validates `result_type`, error/result consistency, and the method-specific
   * response shape before any result is accepted. Only the approved relay list is used.
   */
  async requestEnvelope(
    method: Nip47EnvelopeMethod,
    params: unknown,
    options: { replyTimeoutMs?: number } = {},
  ): Promise<Nip47RequestResult> {
    const client = this.client
    if (!client) {
      return { status: 'failed', kind: 'stale' }
    }

    if (!hasTransportMembers(client)) {
      return { status: 'failed', kind: 'encryption-unavailable' }
    }

    const attempt = this.attempt
    const adapter = new Nip47EnvelopeAdapter({
      transport: client,
      allowedRelays: APPROVED_RELAYS,
      replyTimeoutMs: options.replyTimeoutMs,
      isStale: () => attempt !== this.attempt,
    })

    return withSuppressedConsole(() => adapter.request(method, params))
  }

  disconnect(): void {
    this.attempt += 1
    this.closeClient()
  }

  private closeClient(): void {
    const client = this.client
    this.client = null
    if (!client) return

    try {
      client.close()
    } catch {
      // The client reference is discarded regardless.
    }
  }
}
