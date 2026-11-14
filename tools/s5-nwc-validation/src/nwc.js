export const APPROVED_RELAY = 'wss://relay.coinos.io'

const APPROVED_RELAY_HREF = 'wss://relay.coinos.io/'
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
}
const ARRAY_FIELDS = {
  methods: 64,
  extensions: 64,
}

export class NwcHarnessError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NwcHarnessError'
  }
}

function fail(message) {
  throw new NwcHarnessError(message)
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (text === '') return undefined
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function validateApprovedRelay(value) {
  if (value !== APPROVED_RELAY && value !== APPROVED_RELAY_HREF) {
    fail('Only wss://relay.coinos.io is accepted.')
  }

  let relay
  try {
    relay = new URL(value)
  } catch {
    fail('The relay in the connection URI is not a valid URL.')
  }

  if (relay.protocol !== 'wss:') {
    fail('Only secure WebSocket (wss://) relays are accepted.')
  }
  if (relay.hostname !== 'relay.coinos.io') {
    fail('Only the approved Coinos relay is accepted.')
  }
  if (relay.port !== '') {
    fail('The approved relay must not use a custom port.')
  }
  if (relay.username !== '' || relay.password !== '') {
    fail('The relay must not contain credentials.')
  }
  if (relay.pathname !== '/' || relay.search !== '' || relay.hash !== '') {
    fail('The approved relay must not contain a path, query, or fragment.')
  }
  if (relay.href !== APPROVED_RELAY_HREF) {
    fail('Only wss://relay.coinos.io is accepted.')
  }

  return APPROVED_RELAY
}

/**
 * Parse and validate a NWC URI locally. The returned object contains only the
 * fields the harness needs; the caller must pass them to the SDK and then drop
 * its references as soon as practical.
 */
export function parseNwcUri(raw) {
  if (typeof raw !== 'string') {
    fail('The connection URI is not text.')
  }

  const input = raw.trim()
  if (input === '') {
    fail('Enter a fresh Coinos NWC connection URI.')
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
  if (
    authority.includes('/') ||
    authority.includes('@') ||
    authority.includes(':')
  ) {
    fail('The wallet public key in the connection URI is invalid.')
  }

  const walletPubkey = authority.toLowerCase()
  if (!HEX64.test(walletPubkey)) {
    fail('The wallet public key in the connection URI is invalid.')
  }

  let params
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
 * Keep only the fields this harness displays from a NIP-47 get_info response.
 * Unknown fields, including anything that is not part of the allow-list, are
 * discarded rather than rendered.
 */
export function sanitizeGetInfoResponse(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('The wallet response was not an object.')
  }

  const result = {}

  for (const [key, maxLength] of Object.entries(STRING_FIELDS)) {
    const text = cleanString(value[key], maxLength)
    if (text !== undefined) result[key] = text
  }

  if (Number.isInteger(value.block_height) && value.block_height >= 0) {
    result.block_height = value.block_height
  }

  for (const [key, maxItems] of Object.entries(ARRAY_FIELDS)) {
    if (value[key] === undefined) continue
    if (!Array.isArray(value[key])) {
      fail(`The wallet response contains an invalid ${key} field.`)
    }
    result[key] = value[key]
      .map((item) => cleanString(item, 64))
      .filter((item) => item !== undefined)
      .slice(0, maxItems)
  }

  if (!Array.isArray(result.methods)) {
    fail('The wallet response did not include a valid methods list.')
  }

  return result
}
