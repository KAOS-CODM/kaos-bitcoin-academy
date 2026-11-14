import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  COINOS_RELAY,
  APPROVED_RELAYS,
} from '../../client/src/features/wallet/nwc.ts'
import {
  Nip47EnvelopeAdapter,
  type Nip47RequestResult,
  type Nip47Transport,
} from '../../client/src/features/wallet/nwc-envelope.ts'
import {
  FakeNip47Pool,
  type FakeIdentity,
  type FakeRecordedSubscription,
  type FakeResponder,
} from './fixtures/nip47-fake-relay.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const { NWCClient } = requireFromClient('@getalby/sdk/nwc') as {
  NWCClient: new (options: Record<string, unknown>) => Record<string, unknown>
}
const nostrTools = requireFromClient('nostr-tools') as {
  utils: { hexToBytes(hex: string): Uint8Array; bytesToHex(bytes: Uint8Array): string }
  getPublicKey(secret: Uint8Array): string
}

const CLIENT_SECRET = '11'.repeat(32)
const WALLET_SECRET = '22'.repeat(32)

function buildIdentity(): FakeIdentity {
  const clientSecret = CLIENT_SECRET
  const walletSecret = WALLET_SECRET
  return {
    clientSecret,
    walletSecret,
    walletPubkey: nostrTools.getPublicKey(nostrTools.utils.hexToBytes(walletSecret)),
    clientPubkey: nostrTools.getPublicKey(nostrTools.utils.hexToBytes(clientSecret)),
  }
}

/**
 * Build a real NWCClient whose relay transport is the in-memory fake. The SDK is unmodified:
 * only the public `pool` property is replaced, so the SDK still performs real NIP-44
 * encryption, real signing, and real envelope parsing.
 */
function buildRealClient(identity: FakeIdentity, pool: FakeNip47Pool): Record<string, unknown> {
  const client = new NWCClient({
    walletPubkey: identity.walletPubkey,
    relayUrls: [COINOS_RELAY],
    secret: identity.clientSecret,
    requireSecret: true,
  })
  ;(client as { pool: unknown }).pool = pool
  return client as unknown as Record<string, unknown>
}

function transportOf(client: Record<string, unknown>): Nip47Transport {
  return client as unknown as Nip47Transport
}

const PAYMENT_HASH = 'a'.repeat(64)
const PREIMAGE = 'b'.repeat(64)

function payInvoiceEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    result_type: 'pay_invoice',
    result: { preimage: PREIMAGE, fees_paid: 21 },
    ...overrides,
  }
}

/**
 * The SDK's own `get_info` handshake also opens a kind-23195 subscription, so the adapter's
 * subscription is identified by the request event id it correlates to.
 */
function subscriptionForRequest(
  pool: FakeNip47Pool,
  requestEventId: string,
): FakeRecordedSubscription | undefined {
  return pool.subscriptions.find(
    (entry) =>
      entry.filter.kinds?.includes(23195) &&
      entry.filter['#e']?.includes(requestEventId) === true,
  )
}

async function runAdapter(
  identity: FakeIdentity,
  responder: FakeResponder,
  options: { replyTimeoutMs?: number; isStale?: () => boolean } = {},
): Promise<{
  result: Nip47RequestResult
  pool: FakeNip47Pool
  client: Record<string, unknown>
}> {
  const pool = new FakeNip47Pool({ identity, responder })
  const client = buildRealClient(identity, pool)

  // The real SDK handshake negotiates encryption through the fake transport.
  const info = await (client.getInfo as () => Promise<unknown>)()
  assert.ok(info, 'the real SDK handshake should complete against the fake transport')

  const adapter = new Nip47EnvelopeAdapter({
    transport: transportOf(client),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: options.replyTimeoutMs ?? 2000,
    isStale: options.isStale,
  })

  const result = await adapter.request('pay_invoice', { invoice: 'lnbc1fake' })
  return { result, pool, client }
}

test('the real SDK negotiates encryption against the in-memory transport without a network', async () => {
  const identity = buildIdentity()
  const pool = new FakeNip47Pool({ identity })
  const client = buildRealClient(identity, pool)

  await (client.getInfo as () => Promise<unknown>)()

  const transport = transportOf(client)
  assert.equal(transport.encryptionType, 'nip44_v2')

  // The request the SDK published decrypts with the real conversation key.
  assert.equal(pool.requests.length, 1)
  assert.equal(pool.requests[0].method, 'get_info')
  assert.match(pool.requests[0].plaintext, /"method":"get_info"/)
})

test('a well-formed pay_invoice response is accepted and the preimage is readable', async () => {
  const identity = buildIdentity()
  const { result, pool } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: payInvoiceEnvelope(),
  }))

  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return
  const value = result.result as { preimage: string; fees_paid: number }
  assert.equal(value.preimage, PREIMAGE)
  assert.equal(value.fees_paid, 21)

  // The adapter subscribed and published only to the approved relay.
  const adapterRequest = pool.requests.find((entry) => entry.method === 'pay_invoice')
  assert.ok(adapterRequest)
  assert.deepEqual(adapterRequest.relays, [COINOS_RELAY])

  const adapterSubscription = subscriptionForRequest(pool, adapterRequest.eventId)
  assert.ok(adapterSubscription)
  assert.deepEqual(adapterSubscription.relays, [COINOS_RELAY])
})

test('a mismatched result_type is rejected as an invalid envelope', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: payInvoiceEnvelope({ result_type: 'lookup_invoice' }),
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('a missing result_type is rejected as an invalid envelope', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: { result: { preimage: PREIMAGE } },
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('a malformed JSON payload is rejected as an invalid envelope', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'plaintext',
    plaintext: 'this-is-not-json',
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('a response carrying both error and result is rejected as an invalid envelope', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: {
      result_type: 'pay_invoice',
      error: { code: 'PAYMENT_FAILED', message: 'no route' },
      result: { preimage: PREIMAGE },
    },
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('a malformed method response is rejected as an invalid envelope', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: payInvoiceEnvelope({ result: { preimage: 'not-hex' } }),
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('an invalid fees_paid value is rejected as an invalid envelope', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: payInvoiceEnvelope({ result: { preimage: PREIMAGE, fees_paid: -1 } }),
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('a wallet error envelope is reported as a wallet error with its code', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: {
      result_type: 'pay_invoice',
      error: { code: 'PAYMENT_FAILED', message: 'no route' },
    },
  }))

  assert.deepEqual(result, { status: 'failed', kind: 'wallet-error', code: 'PAYMENT_FAILED' })
})

test('an error envelope without a code stays a wallet error, not a transport failure', async () => {
  const identity = buildIdentity()
  const { result } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: {
      result_type: 'pay_invoice',
      error: { message: 'something went wrong' },
    },
  }))

  // The envelope was well formed and named the method, so it is a wallet error.
  assert.deepEqual(result, { status: 'failed', kind: 'wallet-error', code: 'INTERNAL' })

  // It must remain distinguishable from every transport-level failure.
  assert.notEqual(result.kind, 'not-submitted')
  assert.notEqual(result.kind, 'timeout')
  assert.notEqual(result.kind, 'invalid-envelope')
  assert.notEqual(result.kind, 'stale')
})

test('a reply that never arrives times out and closes the subscription', async () => {
  const identity = buildIdentity()
  const { result, pool } = await runAdapter(identity, () => ({ kind: 'none' }), {
    replyTimeoutMs: 40,
  })

  assert.deepEqual(result, { status: 'failed', kind: 'timeout' })

  const payRequest = pool.requests.find((entry) => entry.method === 'pay_invoice')
  assert.ok(payRequest)
  const adapterSubscription = subscriptionForRequest(pool, payRequest.eventId)
  assert.ok(adapterSubscription)
  assert.equal(adapterSubscription.closed, true)
  assert.equal(adapterSubscription.closeCount, 1)
})

test('a late response after a timeout settles the promise exactly once', async () => {
  const identity = buildIdentity()
  const { result, pool } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: payInvoiceEnvelope(),
    delayMs: 80,
  }), { replyTimeoutMs: 20 })

  assert.deepEqual(result, { status: 'failed', kind: 'timeout' })

  // Let the delayed response arrive after the timeout settled the request.
  await new Promise((resolve) => setTimeout(resolve, 120))

  const payRequest = pool.requests.find((entry) => entry.method === 'pay_invoice')
  assert.ok(payRequest)
  const adapterSubscription = subscriptionForRequest(pool, payRequest.eventId)
  assert.ok(adapterSubscription)
  assert.equal(adapterSubscription.closeCount, 1, 'the subscription must not be closed twice')
})

test('a subscription is closed after a successful response', async () => {
  const identity = buildIdentity()
  const { result, pool } = await runAdapter(identity, () => ({
    kind: 'envelope',
    envelope: payInvoiceEnvelope(),
  }))

  assert.equal(result.status, 'ok')
  const payRequest = pool.requests.find((entry) => entry.method === 'pay_invoice')
  assert.ok(payRequest)
  const adapterSubscription = subscriptionForRequest(pool, payRequest.eventId)
  assert.ok(adapterSubscription)
  assert.equal(adapterSubscription.closed, true)
  assert.equal(adapterSubscription.closeCount, 1)
})

test('a transport pointing at a relay outside the allowlist is refused', async () => {
  const identity = buildIdentity()
  const pool = new FakeNip47Pool({ identity })
  const client = buildRealClient(identity, pool)
  await (client.getInfo as () => Promise<unknown>)()

  ;(client as { relayUrls: string[] }).relayUrls = ['wss://rogue.example']

  const adapter = new Nip47EnvelopeAdapter({
    transport: transportOf(client),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: 500,
  })

  const result = await adapter.request('pay_invoice', { invoice: 'lnbc1fake' })
  assert.deepEqual(result, { status: 'failed', kind: 'relay-not-approved' })

  // Nothing was published or subscribed for the rogue relay.
  assert.equal(pool.requests.filter((entry) => entry.method === 'pay_invoice').length, 0)
})

test('a stale session discards the response instead of applying it', async () => {
  const identity = buildIdentity()
  let stale = false
  const { result } = await runAdapter(
    identity,
    () => ({ kind: 'envelope', envelope: payInvoiceEnvelope() }),
    { isStale: () => stale },
  )
  // First run is not stale; confirm the control path separately below.
  assert.equal(result.status, 'ok')

  stale = true
  const second = await runAdapter(
    identity,
    () => ({ kind: 'envelope', envelope: payInvoiceEnvelope() }),
    { isStale: () => stale },
  )
  assert.deepEqual(second.result, { status: 'failed', kind: 'stale' })
})

test('the adapter refuses to send before encryption negotiation has completed', async () => {
  const identity = buildIdentity()
  const pool = new FakeNip47Pool({ identity })
  const client = buildRealClient(identity, pool)

  // No getInfo() call, so the SDK has not negotiated encryption yet.
  const adapter = new Nip47EnvelopeAdapter({
    transport: transportOf(client),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: 200,
  })

  const result = await adapter.request('pay_invoice', { invoice: 'lnbc1fake' })
  assert.deepEqual(result, { status: 'failed', kind: 'encryption-unavailable' })
  assert.equal(pool.requests.length, 0)
})

test('the adapter correlates the reply to the request through the #e filter', async () => {
  const identity = buildIdentity()
  const pool = new FakeNip47Pool({ identity })
  const client = buildRealClient(identity, pool)
  await (client.getInfo as () => Promise<unknown>)()

  const adapter = new Nip47EnvelopeAdapter({
    transport: transportOf(client),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: 1000,
  })

  void adapter.request('pay_invoice', { invoice: 'lnbc1fake' })
  await new Promise((resolve) => setTimeout(resolve, 30))

  const payRequest = pool.requests.find((entry) => entry.method === 'pay_invoice')
  assert.ok(payRequest)
  const adapterSubscription = subscriptionForRequest(pool, payRequest.eventId)
  assert.ok(adapterSubscription)
  assert.deepEqual(adapterSubscription.filter['#e'], [payRequest.eventId])
  assert.deepEqual(adapterSubscription.filter.authors, [identity.walletPubkey])
  assert.deepEqual(adapterSubscription.filter.kinds, [23195])
})

test('the request template carries the NIP-47 tags for the negotiated encryption', async () => {
  const identity = buildIdentity()
  const pool = new FakeNip47Pool({ identity })
  const client = buildRealClient(identity, pool)
  await (client.getInfo as () => Promise<unknown>)()

  const adapter = new Nip47EnvelopeAdapter({
    transport: transportOf(client),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: 500,
  })

  const template = adapter.buildRequestTemplate('pay_invoice', { invoice: 'lnbc1fake' })
  assert.equal(template.kind, 23194)
  assert.deepEqual(template.tags, [
    ['p', identity.walletPubkey],
    ['v', '1.0'],
    ['encryption', 'nip44_v2'],
  ])
  assert.deepEqual(JSON.parse(template.content), {
    method: 'pay_invoice',
    params: { invoice: 'lnbc1fake' },
  })
})

test('a transport that throws while publishing settles the request as not submitted', async () => {
  const identity = buildIdentity()
  const pool = new FakeNip47Pool({ identity })
  const client = buildRealClient(identity, pool)
  await (client.getInfo as () => Promise<unknown>)()

  // Replace the publish path with one that throws synchronously.
  ;(client as { pool: { publish: unknown } }).pool = {
    subscribe: (pool as unknown as { subscribe: unknown }).subscribe,
    publish: () => {
      throw new Error('transport failure')
    },
  }

  const adapter = new Nip47EnvelopeAdapter({
    transport: transportOf(client),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: 500,
  })

  const result = await adapter.request('pay_invoice', { invoice: 'lnbc1fake' })
  assert.deepEqual(result, { status: 'failed', kind: 'not-submitted' })
})
