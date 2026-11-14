/**
 * BOLT11 invoice inspection and validation.
 *
 * Uses the approved direct dependency `@getalby/lightning-tools@9.0.2` for decoding and
 * preimage verification. The decoder validates the bech32 structure and checksum; it does not
 * verify the BOLT11 signature, so a decoded invoice is well-formed, not proven authentic.
 * The wallet remains the final authority for payment.
 */

import { decodeInvoice, validatePreimage } from '@getalby/lightning-tools/bolt11'

export const MAX_INVOICE_LENGTH = 8192
export const DEFAULT_EXPIRY_SECONDS = 3600

const HEX64 = /^[0-9a-f]{64}$/i

/** Control characters are never valid in a payment request. */
function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}


export type InvoiceNetwork = 'mainnet' | 'testnet' | 'signet' | 'regtest'

export interface DecodedInvoice {
  /** Lowercase 64-character payment hash. */
  paymentHash: string
  /** Exact amount in millisatoshis. */
  amountMsat: number
  /** Amount in satoshis; fractional when the invoice is not a whole number of satoshis. */
  amountSats: number
  /** True when the invoice amount is not a whole number of satoshis. */
  hasFractionalSat: boolean
  /** Invoice creation time as a Unix timestamp in seconds. */
  timestamp: number
  /** Expiry duration in seconds applied to `timestamp`. */
  expirySeconds: number
  /** Expiry as a Unix timestamp in seconds. */
  expiresAt: number
  /** Expiry as a JavaScript timestamp in milliseconds. */
  expiresAtMs: number
  /** Creator-supplied description. Untrusted. */
  description?: string
  network: InvoiceNetwork
  prefix: string
  /** The normalized BOLT11 string. */
  raw: string
}

export type InvoiceInspection =
  | { status: 'valid'; invoice: DecodedInvoice }
  | { status: 'invalid'; reason: string }

export interface InvoiceValidationOptions {
  /** Maximum payable amount in millisatoshis. */
  maxAmountMsat: number
  /** Networks that may be inspected. Defaults to mainnet only. */
  allowedNetworks?: readonly InvoiceNetwork[]
  /** Current time in milliseconds; injectable for tests. */
  now?: () => number
}

const NETWORK_PREFIXES: ReadonlyArray<[string, InvoiceNetwork]> = [
  ['lnbcrt', 'regtest'],
  ['lntbs', 'signet'],
  ['lntb', 'testnet'],
  ['lnbc', 'mainnet'],
]

/** Strip an optional `lightning:` URI wrapper and surrounding whitespace. */
export function normalizeInvoiceInput(raw: unknown): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'The invoice is not text.' }
  }

  let value = raw.trim()
  if (value === '') {
    return { ok: false, reason: 'Paste a Lightning invoice to continue.' }
  }

  if (value.length > MAX_INVOICE_LENGTH) {
    return { ok: false, reason: 'The invoice is too long to be a Lightning payment request.' }
  }

  if (hasControlCharacters(value)) {
    return { ok: false, reason: 'The invoice contains characters that are not allowed.' }
  }

  if (/\s/.test(value)) {
    return { ok: false, reason: 'The invoice contains whitespace. Copy it again without spaces.' }
  }

  if (/^lightning:/i.test(value)) {
    value = value.slice('lightning:'.length)
  }

  if (value === '') {
    return { ok: false, reason: 'The invoice is empty after removing the lightning: prefix.' }
  }

  return { ok: true, value }
}

function detectNetwork(prefix: string): InvoiceNetwork | undefined {
  const lowered = prefix.toLowerCase()
  for (const [candidate, network] of NETWORK_PREFIXES) {
    if (lowered.startsWith(candidate)) return network
  }
  return undefined
}

/**
 * Inspect and validate a pasted BOLT11 invoice.
 *
 * Nothing here contacts a wallet or a relay.
 */
export function inspectInvoice(
  raw: unknown,
  options: InvoiceValidationOptions,
): InvoiceInspection {
  const normalized = normalizeInvoiceInput(raw)
  if (!normalized.ok) {
    return { status: 'invalid', reason: normalized.reason }
  }

  const value = normalized.value
  const lower = value.toLowerCase()

  const prefix = NETWORK_PREFIXES.find(([candidate]) => lower.startsWith(candidate))?.[0]
  if (!prefix) {
    return {
      status: 'invalid',
      reason: 'This does not look like a Lightning invoice. Invoices begin with "lnbc".',
    }
  }

  const network = detectNetwork(prefix)
  if (!network) {
    return { status: 'invalid', reason: 'The invoice uses an unrecognised network prefix.' }
  }

  const allowed = options.allowedNetworks ?? (['mainnet'] as const)
  if (!allowed.includes(network)) {
    return {
      status: 'invalid',
      reason: `This invoice is for ${network}. Only ${allowed.join(', ')} invoices are accepted here.`,
    }
  }

  const decoded = decodeInvoice(value)
  if (!decoded) {
    return {
      status: 'invalid',
      reason: 'The invoice could not be decoded. It may be incomplete or have been altered.',
    }
  }

  const paymentHash = decoded.paymentHash.toLowerCase()
  if (!HEX64.test(paymentHash)) {
    return { status: 'invalid', reason: 'The invoice does not contain a valid payment hash.' }
  }

  const amountMsat = decoded.millisatoshi
  if (!Number.isSafeInteger(amountMsat) || amountMsat <= 0) {
    return {
      status: 'invalid',
      reason:
        'This invoice does not request an amount. Paste an invoice that states the amount to pay.',
    }
  }

  if (amountMsat > options.maxAmountMsat) {
    return {
      status: 'invalid',
      reason: `This invoice requests more than the ${Math.floor(
        options.maxAmountMsat / 1000,
      )} sat limit for this practice.`,
    }
  }

  const timestamp = decoded.timestamp
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    return { status: 'invalid', reason: 'The invoice does not contain a valid timestamp.' }
  }

  const expirySeconds = decoded.expiry ?? DEFAULT_EXPIRY_SECONDS
  if (!Number.isSafeInteger(expirySeconds) || expirySeconds < 0) {
    return { status: 'invalid', reason: 'The invoice does not contain a valid expiry.' }
  }

  const now = (options.now ?? Date.now)()
  const expiresAt = timestamp + expirySeconds
  const expiresAtMs = expiresAt * 1000

  if (expiresAtMs <= now) {
    return { status: 'invalid', reason: 'This invoice has expired. Ask for a fresh one.' }
  }

  const description = decoded.description?.trim()

  return {
    status: 'valid',
    invoice: {
      paymentHash,
      amountMsat,
      amountSats: amountMsat / 1000,
      hasFractionalSat: amountMsat % 1000 !== 0,
      timestamp,
      expirySeconds,
      expiresAt,
      expiresAtMs,
      description: description && description.length > 0 ? description.slice(0, 280) : undefined,
      network,
      prefix,
      raw: value,
    },
  }
}

/**
 * Verify a preimage against an expected payment hash.
 *
 * SHA-256(preimage) must equal the payment hash. This is payer-side evidence only; it is not
 * independent receiver confirmation.
 */
export function verifyPreimage(preimage: unknown, paymentHash: string): boolean {
  if (typeof preimage !== 'string') return false
  if (!HEX64.test(paymentHash)) return false
  return validatePreimage(preimage, paymentHash)
}
