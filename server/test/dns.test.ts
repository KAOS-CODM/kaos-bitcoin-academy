import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { LookupOptions } from 'node:dns'
import {
  createMongoDnsInitializer,
  createMongoLookup,
  createMongoResolver,
  deriveMongoDnsScope,
  MONGODB_DNS_SERVERS,
  type CompatibleLookup,
  type ResolvedAddress,
  type ResolverLike,
} from '../src/lib/dns.js'

type ResolveOutcome = string[] | NodeJS.ErrnoException
type ResolveCallback = (
  error: NodeJS.ErrnoException | null,
  addresses: string[],
) => void

interface LookupResult {
  error: NodeJS.ErrnoException | null
  address: string | ResolvedAddress[] | undefined
  family: number | undefined
  callbacks: number
}

class FakeResolver implements ResolverLike {
  readonly calls: Array<{ family: 4 | 6; hostname: string }> = []

  constructor(
    private readonly a: ResolveOutcome = [],
    private readonly aaaa: ResolveOutcome = [],
  ) {}

  resolve4(hostname: string, callback: ResolveCallback): void {
    this.calls.push({ family: 4, hostname })
    this.respond(this.a, callback)
  }

  resolve6(hostname: string, callback: ResolveCallback): void {
    this.calls.push({ family: 6, hostname })
    this.respond(this.aaaa, callback)
  }

  private respond(outcome: ResolveOutcome, callback: ResolveCallback): void {
    queueMicrotask(() => {
      if (Array.isArray(outcome)) callback(null, outcome)
      else callback(outcome, [])
    })
  }
}

class DoubleCallbackResolver implements ResolverLike {
  resolve4(_hostname: string, callback: ResolveCallback): void {
    callback(null, ['192.0.2.1'])
    callback(null, ['192.0.2.2'])
  }

  resolve6(_hostname: string, callback: ResolveCallback): void {
    callback(null, [])
  }
}

class SilentResolver implements ResolverLike {
  resolve4(_hostname: string, _callback: ResolveCallback): void {}

  resolve6(_hostname: string, _callback: ResolveCallback): void {}
}

class ThrowingResolver implements ResolverLike {
  resolve4(): void {
    throw dnsError('ECONNREFUSED')
  }

  resolve6(): void {
    throw dnsError('ECONNREFUSED')
  }
}

function dnsError(code: string, message = code): NodeJS.ErrnoException {
  const error = new Error(message) as NodeJS.ErrnoException
  error.code = code
  return error
}

function runLookup(
  lookup: CompatibleLookup,
  hostname: string,
  options: LookupOptions | number = {},
): Promise<LookupResult> {
  return new Promise((resolve) => {
    let callbacks = 0

    lookup(hostname, options, (error, address, family) => {
      callbacks += 1

      if (callbacks === 1) {
        setTimeout(() => resolve({ error, address, family, callbacks }), 5)
      }
    })
  })
}

describe('MongoDB DNS helper', () => {
  test('resolves IPv4 when AAAA has no records', async () => {
    const resolver = new FakeResolver(['192.0.2.10'], dnsError('ENODATA'))
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', {})

    assert.equal(result.error, null)
    assert.equal(result.address, '192.0.2.10')
    assert.equal(result.family, 4)
    assert.equal(result.callbacks, 1)
  })

  test('resolves IPv6 when explicitly requested', async () => {
    const resolver = new FakeResolver(dnsError('ENODATA'), ['2001:db8::1'])
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', { family: 6 })

    assert.equal(result.error, null)
    assert.equal(result.address, '2001:db8::1')
    assert.equal(result.family, 6)
    assert.deepEqual(resolver.calls.map((call) => call.family), [6])
  })

  test('returns IPv4 before IPv6 when both are available', async () => {
    const resolver = new FakeResolver(['192.0.2.1'], ['2001:db8::1'])
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', { all: true })

    assert.equal(result.error, null)
    assert.deepEqual(result.address, [
      { address: '192.0.2.1', family: 4 },
      { address: '2001:db8::1', family: 6 },
    ])
  })

  test('returns a single address and family for the normal callback contract', async () => {
    const resolver = new FakeResolver(['192.0.2.20'], ['2001:db8::20'])
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', {})

    assert.equal(result.error, null)
    assert.equal(typeof result.address, 'string')
    assert.equal(result.family, 4)
  })

  test('handles IP literals without a DNS query', async () => {
    const resolver = new FakeResolver(['192.0.2.1'], ['2001:db8::1'])
    const lookup = createMongoLookup(resolver)

    const ipv4 = await runLookup(lookup, '203.0.113.5', { all: true })
    assert.deepEqual(ipv4.address, [{ address: '203.0.113.5', family: 4 }])

    const ipv6 = await runLookup(lookup, '2001:db8::5', { family: 6 })
    assert.equal(ipv6.address, '2001:db8::5')
    assert.equal(ipv6.family, 6)

    assert.deepEqual(resolver.calls, [])
  })

  test('uses IPv4 when AAAA returns ENODATA', async () => {
    const resolver = new FakeResolver(['192.0.2.30'], dnsError('ENODATA', 'no AAAA'))
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', { all: true })

    assert.equal(result.error, null)
    assert.deepEqual(result.address, [{ address: '192.0.2.30', family: 4 }])
  })

  test('reports a meaningful error when both families fail', async () => {
    const resolver = new FakeResolver(
      dnsError('ENOTFOUND', 'no A'),
      dnsError('ENODATA', 'no AAAA'),
    )
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', { all: true })

    assert.equal(result.error?.code, 'ENOTFOUND')
    assert.equal(result.error?.syscall, 'getaddrinfo')
    assert.equal(result.callbacks, 1)
  })

  test('reports ENODATA when both families return empty address lists', async () => {
    const resolver = new FakeResolver([], [])
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', {})

    assert.equal(result.error?.code, 'ENODATA')
  })

  test('completes the callback exactly once', async () => {
    const resolver = new DoubleCallbackResolver()
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', {})

    assert.equal(result.error, null)
    assert.equal(result.address, '192.0.2.1')
    assert.equal(result.callbacks, 1)
  })

  test('rejects invalid family input without querying DNS', async () => {
    const resolver = new FakeResolver(['192.0.2.1'], ['2001:db8::1'])
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', { family: 5 as never })

    assert.equal(result.error?.code, 'EAI_BADFLAGS')
    assert.deepEqual(resolver.calls, [])
  })

  test('accepts string family values', async () => {
    const resolver = new FakeResolver(dnsError('ENODATA'), ['2001:db8::2'])
    const lookup = createMongoLookup(resolver)

    const result = await runLookup(lookup, 'node.atlas.test', { family: 'IPv6' })

    assert.equal(result.error, null)
    assert.equal(result.address, '2001:db8::2')
    assert.equal(result.family, 6)
  })

  test('configures global DNS once, in the requested order', () => {
    const applied: string[][] = []
    const initialize = createMongoDnsInitializer((servers) => {
      applied.push([...servers])
    })

    initialize()
    initialize()

    assert.deepEqual(applied, [[...MONGODB_DNS_SERVERS]])
  })

  test('reports initialization errors and retries on the next call', () => {
    let attempts = 0
    const initialize = createMongoDnsInitializer(() => {
      attempts += 1
      throw new Error('setServers failed')
    })

    assert.throws(
      () => initialize(),
      /Failed to configure MongoDB SRV\/TXT DNS servers/,
    )
    assert.throws(
      () => initialize(),
      /Failed to configure MongoDB SRV\/TXT DNS servers/,
    )
    assert.equal(attempts, 2)
  })

  test('creates a dedicated resolver with explicit servers', () => {
    const resolver = createMongoResolver()

    assert.deepEqual(resolver.getServers(), [...MONGODB_DNS_SERVERS])
  })

  test('derives an Atlas scope without exposing credentials', () => {
    const scope = deriveMongoDnsScope(
      'mongodb+srv://user:not-a-real-secret@cluster0.example.mongodb.net/db',
    )

    assert.deepEqual(scope, {
      host: 'cluster0.example.mongodb.net',
      domain: 'example.mongodb.net',
    })
    assert.deepEqual(deriveMongoDnsScope('mongodb://localhost:27017/db'), {})
    assert.deepEqual(deriveMongoDnsScope('not a uri'), {})
  })

  test('uses the fallback lookup for hostnames outside the Atlas scope', async () => {
    const resolver = new FakeResolver(['192.0.2.40'], [])
    const fallbackCalls: string[] = []
    const fallback: CompatibleLookup = (hostname, _options, callback) => {
      fallbackCalls.push(hostname)
      callback(null, '198.51.100.40', 4)
    }
    const lookup = createMongoLookup(resolver, {
      host: 'cluster0.example.mongodb.net',
      domain: 'example.mongodb.net',
      fallbackLookup: fallback,
    })

    const outside = await runLookup(lookup, 'other.example.com', {})
    assert.equal(outside.address, '198.51.100.40')
    assert.deepEqual(resolver.calls, [])
    assert.deepEqual(fallbackCalls, ['other.example.com'])

    const inside = await runLookup(lookup, 'ac-1.example.mongodb.net', {})
    assert.equal(inside.address, '192.0.2.40')
    assert.deepEqual(
      resolver.calls.map((call) => call.family),
      [4, 6],
    )
  })

  test('propagates resolver failures through the callback without throwing', async () => {
    const lookup = createMongoLookup(new ThrowingResolver())

    const result = await runLookup(lookup, 'node.atlas.test', { family: 4 })

    assert.equal(result.error?.code, 'ECONNREFUSED')
    assert.equal(result.callbacks, 1)
  })

  test('times out a resolver that never completes', async () => {
    const lookup = createMongoLookup(new SilentResolver(), { timeoutMs: 20 })

    const result = await runLookup(lookup, 'node.atlas.test', { family: 4 })

    assert.equal(result.error?.code, 'ETIMEOUT')
    assert.equal(result.callbacks, 1)
  })
})
