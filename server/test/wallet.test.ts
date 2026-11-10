import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { WALLET_ACTIVITY_LESSON } from '../../client/src/features/wallet/activity.ts'
import { lightningNetwork } from '../../server/src/content/courses/06-lightning-network.ts'
import {
  ALBY_RELAY,
  APPROVED_RELAYS,
  COINOS_RELAY,
  WalletClientSession,
  WalletError,
  describeWalletError,
  parseNwcUri,
  requestGetInfo,
  sanitizeGetInfoResponse,
  type NwcClientLike,
  type NwcConnection,
} from '../../client/src/features/wallet/nwc.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PUBKEY = 'a'.repeat(64)
const SECRET = 'b'.repeat(64)

function buildUri(relay: string): string {
  return `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(relay)}&secret=${SECRET}`
}

const CONNECTION_URI = buildUri(COINOS_RELAY)
const ALBY_CONNECTION_URI = buildUri(ALBY_RELAY)

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function rejects(uri: unknown, label: string): void {
  assert.throws(
    () => parseNwcUri(uri),
    (error) => error instanceof WalletError,
    label,
  )
}

test('the approved relay allowlist contains exactly the two supported relays', () => {
  assert.equal(COINOS_RELAY, 'wss://relay.coinos.io')
  assert.equal(ALBY_RELAY, 'wss://relay.getalby.com/v1')
  assert.deepEqual(APPROVED_RELAYS, [COINOS_RELAY, ALBY_RELAY])
})

test('valid Coinos NWC URIs parse and normalize the approved relay', () => {
  assert.deepEqual(parseNwcUri(CONNECTION_URI), {
    walletPubkey: PUBKEY,
    secret: SECRET,
    relay: COINOS_RELAY,
  })

  const trailingSlash = buildUri(`${COINOS_RELAY}/`)
  assert.equal(parseNwcUri(trailingSlash).relay, COINOS_RELAY)

  const withLud16 = `${CONNECTION_URI}&lud16=test%40example.com`
  assert.equal(parseNwcUri(withLud16).relay, COINOS_RELAY)
})

test('valid Alby NWC URIs parse and preserve the exact /v1 path', () => {
  assert.deepEqual(parseNwcUri(ALBY_CONNECTION_URI), {
    walletPubkey: PUBKEY,
    secret: SECRET,
    relay: ALBY_RELAY,
  })

  const withLud16 = `${ALBY_CONNECTION_URI}&lud16=test%40example.com`
  assert.equal(parseNwcUri(withLud16).relay, ALBY_RELAY)
})

test('malformed, incomplete, duplicate, and unexpected NWC URI parts are rejected', () => {
  rejects('', 'Empty URI')
  rejects('   ', 'Whitespace-only URI')
  rejects('not-a-uri', 'Non-NWC URI')
  rejects(`nostrwalletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=${SECRET}`, 'Wrong scheme')
  rejects(`nostr+walletconnect://${PUBKEY}`, 'Missing query')
  rejects(`nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}`, 'Missing secret')
  rejects(`nostr+walletconnect://${PUBKEY}?secret=${SECRET}`, 'Missing relay')
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&relay=${encodeURIComponent(COINOS_RELAY)}&secret=${SECRET}`,
    'Duplicate relay',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(ALBY_RELAY)}&relay=${encodeURIComponent(ALBY_RELAY)}&secret=${SECRET}`,
    'Duplicate Alby relay',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=${SECRET}&secret=${SECRET}`,
    'Duplicate secret',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(ALBY_RELAY)}&secret=${SECRET}&extra=1`,
    'Unexpected Alby parameter',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=${SECRET}#fragment`,
    'Fragment',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=${SECRET.slice(0, 32)} ${SECRET.slice(32)}`,
    'Internal whitespace',
  )
  rejects(
    `nostr+walletconnect://${'a'.repeat(63)}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=${SECRET}`,
    'Short pubkey',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=abc`,
    'Short secret',
  )
  rejects(
    `nostr+walletconnect://${PUBKEY}?relay=${encodeURIComponent(COINOS_RELAY)}&secret=${'z'.repeat(64)}`,
    'Non-hex secret',
  )
})

test('unapproved relay hosts, schemes, ports, paths, and credentials are rejected', () => {
  const disallowedRelays = [
    'not-a-relay',
    'wss://relay.damus.io',
    'wss://relay.coinos.io.evil',
    'wss://relay.getalby.com.evil/v1',
    'wss://relay.coinos.io:443',
    'wss://relay.getalby.com:443/v1',
    'wss://relay.coinos.io/path',
    'wss://relay.getalby.com',
    'wss://relay.getalby.com/',
    'wss://relay.getalby.com/v1/',
    'wss://relay.getalby.com/v2',
    'wss://relay.getalby.com/v1/extra',
    'ws://relay.coinos.io',
    'ws://relay.getalby.com/v1',
    'http://relay.coinos.io',
    'http://relay.getalby.com/v1',
    'https://relay.coinos.io',
    'https://relay.getalby.com/v1',
    'wss://user:pass@relay.coinos.io',
    'wss://user:pass@relay.getalby.com/v1',
    'wss://relay.coinos.io?x=1',
    'wss://relay.getalby.com/v1?x=1',
    'wss://relay.coinos.io#fragment',
    'wss://relay.getalby.com/v1#fragment',
  ]

  for (const relay of disallowedRelays) {
    rejects(buildUri(relay), `Relay must be rejected: ${relay}`)
  }

  assert.throws(
    () => parseNwcUri(buildUri('wss://relay.getalby.com')),
    (error) =>
      error instanceof WalletError && /Alby relay must use the exact \/v1 path/.test(error.message),
    'Alby relay without /v1 must produce the path-specific error',
  )
})

test('get_info responses are reduced to allow-listed fields', () => {
  const safeInfo = sanitizeGetInfoResponse({
    alias: 'Example wallet',
    color: '#f7931a',
    pubkey: PUBKEY,
    network: 'mainnet',
    block_height: 975028,
    block_hash: 'c'.repeat(64),
    methods: ['get_info', 'pay_invoice', 'pay_invoice'],
    extensions: ['example'],
    secret: 'must-not-appear',
    relay: 'must-not-appear',
    metadata: { must: 'not appear' },
    unexpected: 'must-not-appear',
  })

  assert.deepEqual(safeInfo, {
    alias: 'Example wallet',
    color: '#f7931a',
    pubkey: PUBKEY,
    network: 'mainnet',
    block_height: 975028,
    block_hash: 'c'.repeat(64),
    methods: ['get_info', 'pay_invoice'],
    extensions: ['example'],
  })
  assert.equal('secret' in safeInfo, false)
  assert.equal('relay' in safeInfo, false)
  assert.equal('unexpected' in safeInfo, false)

  assert.throws(() => sanitizeGetInfoResponse(null), WalletError)
  assert.deepEqual(sanitizeGetInfoResponse({ alias: 'missing methods' }), {
    alias: 'missing methods',
    methods: [],
  })
  assert.deepEqual(sanitizeGetInfoResponse({ methods: null }).methods, [])
  assert.throws(() => sanitizeGetInfoResponse({ methods: 'get_info' }), WalletError)
  assert.throws(
    () => sanitizeGetInfoResponse({ methods: ['get_info'], extensions: 'not-an-array' }),
    WalletError,
  )
  assert.deepEqual(sanitizeGetInfoResponse({ methods: [] }).methods, [])
  assert.deepEqual(sanitizeGetInfoResponse({ methods: ['unknown_method'] }).methods, [
    'unknown_method',
  ])
})

test('safe wallet error descriptions never expose raw error messages', () => {
  const raw = 'raw connection material that must not be displayed'
  const walletError = Object.assign(new Error(raw), { code: 'UNAUTHORIZED' })
  const walletMessage = describeWalletError(walletError)
  assert.match(walletMessage, /UNAUTHORIZED/)
  assert.equal(walletMessage.includes(raw), false)

  const timeoutError = Object.assign(new Error(raw), { name: 'Nip47ReplyTimeoutError' })
  const timeoutMessage = describeWalletError(timeoutError)
  assert.match(timeoutMessage, /timeout/i)
  assert.equal(timeoutMessage.includes(raw), false)

  const genericMessage = describeWalletError(new Error(raw))
  assert.equal(genericMessage.includes(raw), false)
  assert.match(genericMessage, /did not log your connection URI or secret/)

  assert.match(
    describeWalletError(new WalletError(`Only ${COINOS_RELAY} or ${ALBY_RELAY} is accepted.`)),
    /Only wss:\/\/relay\.coinos\.io or wss:\/\/relay\.getalby\.com\/v1 is accepted\./,
  )
})

test('requestGetInfo suppresses SDK console output and restores console methods', async () => {
  const calls: string[] = []
  const target = {
    log: (...args: unknown[]) => calls.push(`log:${args.join(' ')}`),
    info: (...args: unknown[]) => calls.push(`info:${args.join(' ')}`),
    warn: (...args: unknown[]) => calls.push(`warn:${args.join(' ')}`),
    error: (...args: unknown[]) => calls.push(`error:${args.join(' ')}`),
    debug: (...args: unknown[]) => calls.push(`debug:${args.join(' ')}`),
  }
  const originalError = target.error

  const result = await requestGetInfo(
    {
      getInfo: async () => {
        target.error('sensitive SDK failure')
        target.debug('relay metadata')
        return { methods: ['get_info'] }
      },
    },
    target,
  )

  assert.deepEqual(result, { methods: ['get_info'] })
  assert.deepEqual(calls, [])
  assert.equal(target.error, originalError)

  await assert.rejects(
    requestGetInfo(
      {
        getInfo: async () => {
          target.error('another sensitive SDK failure')
          throw new Error('failure')
        },
      },
      target,
    ),
  )
  assert.deepEqual(calls, [])
  assert.equal(target.error, originalError)
})

test('WalletClientSession requests mocked get_info, sanitises it, and disconnects cleanly', async () => {
  const fakeInfo = {
    alias: 'ln.example',
    network: 'mainnet',
    block_height: 975028,
    methods: ['get_info', 'pay_invoice', 'pay_keysend', 'make_invoice', 'receive'],
    secret: 'must-not-appear',
    unexpected: 'must-not-appear',
  }
  let receivedSecret = ''
  let capturedConnection: NwcConnection | null = null
  let closed = 0

  const fakeClient: NwcClientLike = {
    getInfo: async () => fakeInfo,
    close: () => {
      closed += 1
    },
  }

  const session = new WalletClientSession((connection) => {
    receivedSecret = connection.secret
    capturedConnection = connection
    return fakeClient
  })

  const result = await session.connect(CONNECTION_URI)
  assert.equal(result.status, 'connected')
  if (result.status !== 'connected') return

  assert.equal(receivedSecret, SECRET)
  assert.equal(capturedConnection?.relay, COINOS_RELAY)
  assert.equal(capturedConnection?.secret, '')
  assert.equal(result.info.alias, 'ln.example')
  assert.equal('secret' in result.info, false)
  assert.equal('unexpected' in result.info, false)
  assert.equal(session.active, true)

  session.disconnect()
  assert.equal(session.active, false)
  assert.equal(closed, 1)
})

test('WalletClientSession passes a mocked Alby connection to the SDK factory', async () => {
  let capturedConnection: NwcConnection | null = null
  let closed = 0
  const session = new WalletClientSession((connection) => {
    capturedConnection = connection
    return {
      getInfo: async () => ({ alias: 'Alby test wallet', methods: ['get_info'] }),
      close: () => {
        closed += 1
      },
    }
  })

  const result = await session.connect(ALBY_CONNECTION_URI)
  assert.equal(result.status, 'connected')
  assert.equal(capturedConnection?.relay, ALBY_RELAY)
  assert.equal(capturedConnection?.secret, '')

  session.disconnect()
  assert.equal(closed, 1)
})

test('WalletClientSession closes the client on a failed get_info request', async () => {
  let closed = 0
  const failure = Object.assign(new Error('raw failure'), { code: 'RATE_LIMITED' })
  const session = new WalletClientSession(() => ({
    getInfo: async () => {
      throw failure
    },
    close: () => {
      closed += 1
    },
  }))

  await assert.rejects(session.connect(CONNECTION_URI), failure)
  assert.equal(session.active, false)
  assert.equal(closed, 1)
  assert.match(describeWalletError(failure), /RATE_LIMITED/)
  assert.equal(describeWalletError(failure).includes('raw failure'), false)
})

test('WalletClientSession ignores a delayed get_info response after disconnect', async () => {
  let resolveInfo: ((value: unknown) => void) | null = null
  let closed = 0
  const session = new WalletClientSession(() => ({
    getInfo: () =>
      new Promise<unknown>((resolve) => {
        resolveInfo = resolve
      }),
    close: () => {
      closed += 1
    },
  }))

  const pending = session.connect(CONNECTION_URI)
  assert.notEqual(resolveInfo, null)

  session.disconnect()
  resolveInfo!({ alias: 'stale', methods: ['get_info'] })

  assert.deepEqual(await pending, { status: 'stale' })
  assert.equal(session.active, false)
  assert.equal(closed, 1)
})

test('wallet source keeps credentials out of storage, logs, and the backend', () => {
  const walletSource = [
    read('client/src/features/wallet/nwc.ts'),
    read('client/src/features/wallet/activity.ts'),
    read('client/src/features/wallet/methods.ts'),
    read('client/src/features/wallet/WalletActivityCallout.tsx'),
    read('client/src/features/wallet/WalletMethods.tsx'),
    read('client/src/pages/Wallet.tsx'),
  ].join('\n')

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
  ]) {
    assert.equal(
      walletSource.includes(marker),
      false,
      `Wallet source must not contain ${marker}`,
    )
  }

  for (const marker of ['console.log(', 'console.info(', 'console.warn(', 'console.error(', 'console.debug(']) {
    assert.equal(
      walletSource.includes(marker),
      false,
      `Wallet source must not directly emit console output: ${marker}`,
    )
  }

  assert.equal(
    (walletSource.match(/\.getInfo\(\)/g) ?? []).length,
    1,
    'Wallet source must invoke getInfo exactly once',
  )

  for (const method of [
    'getBalance',
    'payInvoice',
    'payKeysend',
    'makeInvoice',
    'lookupInvoice',
    'listTransactions',
    'getBudget',
    'signMessage',
    'createConnection',
    'makeHoldInvoice',
    'settleHoldInvoice',
    'cancelHoldInvoice',
    'subscribeNotifications',
    'getWalletServiceInfo',
  ]) {
    assert.equal(
      walletSource.includes(method),
      false,
      `Wallet source must not reference forbidden NWC method ${method}`,
    )
  }

  assert.match(walletSource, /export const COINOS_RELAY = 'wss:\/\/relay\.coinos\.io'/)
  assert.match(walletSource, /export const ALBY_RELAY = 'wss:\/\/relay\.getalby\.com\/v1'/)
  assert.match(walletSource, /APPROVED_RELAYS = \[COINOS_RELAY, ALBY_RELAY\] as const/)
  assert.match(walletSource, /type="password"/)
  assert.match(walletSource, /Disconnect and clear/)
  assert.match(walletSource, /does not store or control your funds/)
  assert.match(walletSource, /reported capabilities, not verified functionality/)
  assert.match(walletSource, /Method used by the Academy/)
  assert.match(walletSource, /Methods reported by the connected wallet/)
  assert.match(walletSource, /has not called or tested/)
  assert.match(walletSource, /does not request payments/)
  assert.match(walletSource, /does not prove that it contains funds/)
  assert.match(walletSource, /Optional practical activity/)
  assert.match(walletSource, /read-only demonstration/i)
  assert.match(walletSource, /does not create an invoice/)
  assert.match(walletSource, /does not unlock/)
  assert.match(walletSource, /seed phrase or private key/)
  assert.match(walletSource, /not a claim that every NWC-compatible\s+wallet is supported/)
  assert.match(walletSource, /Where to get an NWC connection/)
  assert.ok(
    walletSource.indexOf('Where to get an NWC connection') <
      walletSource.indexOf('Connect your wallet'),
    'Setup guidance must appear before the connection form',
  )
  assert.match(walletSource, /href="https:\/\/coinos\.io"/)
  assert.match(walletSource, /href="https:\/\/zeusln\.com"/)
  assert.match(walletSource, /Coinos is the wallet\./)
  assert.match(walletSource, /ZEUS is the wallet\./)
  assert.match(walletSource, /Alby is the relay service, not the wallet provider\./)
  assert.match(walletSource, /two tested examples, not a complete list of compatible wallets\./)
  assert.match(walletSource, /Previously tested: this wallet\/relay combination/)
  assert.match(
    walletSource,
    /Never share it publicly or paste it into\s+chats, screenshots, support requests, or reports\./,
  )
  assert.match(
    walletSource,
    /Never enter your wallet seed phrase or private key into the Academy\./,
  )
  assert.match(
    walletSource,
    /Wallet connection is optional; all educational content remains available\./,
  )
  assert.equal(
    walletSource.includes('Coinos and Alby are examples'),
    false,
    'The wallet page must not describe Alby as a wallet example',
  )
  assert.match(walletSource, /Back to the lesson/)
  assert.match(walletSource, /WALLET_ACTIVITY_LESSON\.path/)
})

test('ZEUS relay alternatives stay informational and outside the allowlist and CSP', () => {
  const walletSource = read('client/src/pages/Wallet.tsx')
  const nwcSource = read('client/src/features/wallet/nwc.ts')
  const serverSource = read('server/src/app.ts')

  assert.match(walletSource, /ZEUS is the wallet\. It lets you choose from multiple NWC relays\./)
  assert.match(walletSource, /wss:\/\/relay\.snort\.social/)
  assert.match(walletSource, /wss:\/\/relay\.dasmus\.io/)
  assert.match(walletSource, /Snort[^<]*not approved for Academy use/)
  assert.match(walletSource, /Dasmus[^<]*not approved for Academy use/)
  assert.match(walletSource, /Custom relay[^<]*not approved for Academy use/)
  assert.match(walletSource, /select Alby/)
  assert.match(walletSource, /The Academy has approved and tested ZEUS only with Alby\./)

  assert.equal(nwcSource.includes('relay.snort.social'), false)
  assert.equal(nwcSource.includes('relay.dasmus.io'), false)
  assert.equal(serverSource.includes('relay.snort.social'), false)
  assert.equal(serverSource.includes('relay.dasmus.io'), false)
})

test('production CSP allows only the two approved relay WebSocket origins', () => {
  const serverSource = read('server/src/app.ts')
  assert.match(
    serverSource,
    /connectSrc: \["'self'", 'wss:\/\/relay\.coinos\.io', 'wss:\/\/relay\.getalby\.com'\]/,
  )
  assert.equal(/connectSrc:\s*\[[^\]]*'wss:'/.test(serverSource), false)
  assert.equal(serverSource.includes('wss://*'), false)
  assert.equal(
    serverSource.includes('wss://relay.getalby.com/v1'),
    false,
    'CSP must use the Alby origin without the NWC path',
  )
})

test('the wallet page stays protected and is linked from the main navigation and Lightning lesson', () => {
  const appSource = read('client/src/App.tsx')
  assert.match(
    appSource,
    /path="wallet"[\s\S]*?<ProtectedRoute>[\s\S]*?<Wallet \/>[\s\S]*?<\/ProtectedRoute>/,
  )

  const layoutSource = read('client/src/components/Layout.tsx')
  assert.match(
    layoutSource,
    /<nav aria-label="Main" className="flex flex-wrap items-center gap-2 text-sm">/,
  )
  assert.match(
    layoutSource,
    /!isLoading && user \?[\s\S]*?to="\/wallet"[\s\S]*?>\s*Wallet\s*<\/Link>/,
    'Signed-in learners must have a direct Wallet link in the main navigation',
  )

  const lessonSource = read('client/src/pages/Lesson.tsx')
  assert.match(lessonSource, /course\.slug === WALLET_ACTIVITY_LESSON\.courseSlug/)
  assert.match(lessonSource, /lesson\.slug === WALLET_ACTIVITY_LESSON\.slug/)
  assert.match(lessonSource, /<WalletActivityCallout \/>/)

  const activitySource = read('client/src/features/wallet/WalletActivityCallout.tsx')
  assert.match(activitySource, /to="\/wallet"/)
  assert.match(activitySource, /Optional practical activity/)
  assert.match(activitySource, /read-only demonstration/i)
  assert.match(activitySource, /only <code>get_info<\/code>/)
  assert.match(activitySource, /does not create an invoice/)
  assert.match(activitySource, /This activity is optional/)
  assert.match(activitySource, /seed phrase or private key/)
  assert.match(activitySource, /does not unlock/)
  assert.match(activitySource, /not a claim that every NWC-compatible\s+wallet is supported/)

  const walletSource = read('client/src/pages/Wallet.tsx')
  assert.match(walletSource, /WALLET_ACTIVITY_LESSON\.path/)
  assert.match(walletSource, /Back to the lesson/)

  assert.equal(WALLET_ACTIVITY_LESSON.courseSlug, '06-lightning-network')
  assert.equal(WALLET_ACTIVITY_LESSON.slug, 'ln-channels')
  assert.equal(WALLET_ACTIVITY_LESSON.path, '/lessons/ln-channels')

  assert.equal(lightningNetwork.course.slug, WALLET_ACTIVITY_LESSON.courseSlug)
  const activityLesson = lightningNetwork.lessons.find(
    (item) => item.slug === WALLET_ACTIVITY_LESSON.slug,
  )
  assert.ok(activityLesson, 'The wallet activity lesson must exist in the Lightning course')
  assert.equal(activityLesson.courseSlug, WALLET_ACTIVITY_LESSON.courseSlug)
  assert.equal(activityLesson.title, WALLET_ACTIVITY_LESSON.title)
})
