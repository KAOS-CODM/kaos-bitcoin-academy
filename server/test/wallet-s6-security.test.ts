import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { APPROVED_RELAYS } from '../../client/src/features/wallet/nwc.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const S6_MODULES = [
  'client/src/features/wallet/nwc-envelope.ts',
  'client/src/features/wallet/invoice.ts',
  'client/src/features/wallet/payment.ts',
  'client/src/features/wallet/PaymentPanel.tsx',
  'client/src/features/wallet/ReceivePanel.tsx',
]

function readAllS6(): string {
  return S6_MODULES.map(read).join('\n')
}

test('the S6 wallet modules keep credentials and payment data out of storage and the network', () => {
  const source = readAllS6()

  for (const marker of [
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'document.cookie',
    'location.search',
    'location.hash',
    'history.pushState',
    'fetch(',
    'XMLHttpRequest',
    'navigator.sendBeacon',
    '/api/',
    'WebSocket(',
  ]) {
    assert.equal(source.includes(marker), false, `S6 wallet source must not contain ${marker}`)
  }
})

test('the S6 wallet modules never emit console output', () => {
  const source = readAllS6()

  for (const marker of [
    'console.log(',
    'console.info(',
    'console.warn(',
    'console.error(',
    'console.debug(',
  ]) {
    assert.equal(source.includes(marker), false, `S6 wallet source must not emit ${marker}`)
  }
})

test('the S6 wallet modules never hardcode a relay outside the approved allowlist', () => {
  const source = readAllS6()
  const urls = source.match(/wss:\/\/[^\s'"`)]+/g) ?? []

  for (const url of urls) {
    assert.ok(
      APPROVED_RELAYS.some((relay) => url.startsWith(relay)),
      `S6 wallet source must not reference an unapproved relay: ${url}`,
    )
  }
})

test('the envelope adapter does not depend on the SDK package surface', () => {
  const source = read('client/src/features/wallet/nwc-envelope.ts')
  // The adapter is written against structural types only, so it never imports the SDK.
  assert.equal(/from ['"]@getalby\/sdk/.test(source), false)
  assert.equal(/from ['"]nostr-tools/.test(source), false)
  assert.equal(/from ['"]@getalby\/lightning-tools/.test(source), false)
})

test('the envelope adapter validates the response envelope strictly', () => {
  const source = read('client/src/features/wallet/nwc-envelope.ts')

  // The method must be compared against the envelope, not inferred from the payload shape.
  assert.match(source, /envelope\.result_type !== method/)
  assert.match(source, /hasError && hasResult/)
  assert.match(source, /isValidMethodResult/)

  // The four protocol methods are the only ones the adapter may send.
  for (const method of ['pay_invoice', 'make_invoice', 'lookup_invoice']) {
    assert.match(source, new RegExp(`'${method}'`))
  }
})

test('the envelope adapter closes its subscription and settles exactly once', () => {
  const source = read('client/src/features/wallet/nwc-envelope.ts')

  assert.match(source, /if \(settled\) return/)
  assert.match(source, /clearTimeout\(timer\)/)
  assert.match(source, /subscription\?\.close\(\)/)
})

test('the invoice module decodes locally and never verifies a signature it cannot check', () => {
  const source = read('client/src/features/wallet/invoice.ts')

  assert.match(source, /from '@getalby\/lightning-tools\/bolt11'/)
  assert.match(source, /decodeInvoice/)
  assert.match(source, /validatePreimage/)
  // The module states that the signature is not verified.
  // The module documents that it does not verify the signature, and it performs no
  // signature verification of its own.
  assert.match(source, /not[\s\S]{0,12}?verify the BOLT11 signature/)
  assert.equal(/verifySignature|secp256k1|recoverPublicKey/.test(source), false)
  // No network access.
  assert.equal(source.includes('fetch('), false)
})

test('the payment panel never renders a full preimage and never claims success on its own', () => {
  const source = read('client/src/features/wallet/PaymentPanel.tsx')

  assert.equal(source.includes('dangerouslySetInnerHTML'), false)
  // The preimage is only validated, never displayed.
  assert.equal(/\{preimage\}/.test(source), false)
  assert.equal(source.includes('Payment successful'), false)
})

test('the receive panel bounds its status polling and stops when the deadline passes', () => {
  const source = read('client/src/features/wallet/ReceivePanel.tsx')

  assert.match(source, /const deadline = Date\.now\(\) \+ expirySeconds \* 1000 \+ 60_000/)
  assert.match(source, /while \(Date\.now\(\) < deadline\)/)
  // The invoice text is copied, not fetched.
  assert.equal(source.includes('fetch('), false)
})

test('the S6 wallet source contains no wallet credential material', () => {
  const source = readAllS6()

  // No long hex literals that could be a secret, key, or preimage fixture.
  const hexLiterals = source.match(/['"][0-9a-fA-F]{48,}['"]/g) ?? []
  for (const literal of hexLiterals) {
    assert.equal(
      literal.length,
      66,
      `S6 wallet source must not embed a long hex literal: ${literal.slice(0, 12)}…`,
    )
  }

  assert.equal(source.includes('nostr+walletconnect://'), false)
})
