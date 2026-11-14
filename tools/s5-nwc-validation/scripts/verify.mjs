import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  APPROVED_RELAY,
  NwcHarnessError,
  parseNwcUri,
  sanitizeGetInfoResponse,
} from '../src/nwc.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) =>
  readFileSync(path.join(root, relativePath), 'utf8')
const readJson = (relativePath) => JSON.parse(read(relativePath))

const pkg = readJson('package.json')
const lock = readJson('package-lock.json')
const installedSdk = readJson('node_modules/@getalby/sdk/package.json')

assert.equal(pkg.dependencies['@getalby/sdk'], '9.0.0', 'SDK must be pinned to 9.0.0')
assert.equal(pkg.devDependencies.vite, '8.3.5', 'Vite must be pinned to 8.3.5')
assert.deepEqual(Object.keys(pkg.dependencies), ['@getalby/sdk'])
assert.deepEqual(Object.keys(pkg.devDependencies), ['vite'])
assert.equal(installedSdk.version, '9.0.0', 'Installed SDK version must be 9.0.0')
assert.equal(
  lock.packages['node_modules/@getalby/sdk'].version,
  '9.0.0',
  'Lockfile SDK version must be 9.0.0',
)

const nwcSource = read('src/nwc.js')
const mainSource = read('src/main.js')
const source = `${nwcSource}\n${mainSource}`
const html = read('index.html')

assert.match(nwcSource, new RegExp(`APPROVED_RELAY = '${APPROVED_RELAY.replaceAll('.', '\\.')}'`))
assert.match(mainSource, /from '@getalby\/sdk\/nwc'/)
assert.match(mainSource, /new NWCClient\(/)
assert.equal(
  (mainSource.match(/\.getInfo\(\)/g) ?? []).length,
  1,
  'getInfo must appear exactly once in harness source',
)
assert.match(mainSource, /client\.close\(\)/)
assert.match(mainSource, /console\[method\] = noop/)
assert.match(mainSource, /console\[method\] = originals\.get\(method\)/)
assert.match(mainSource, /input\.value = ''/)
assert.match(mainSource, /client = null/)
assert.match(mainSource, /parsed\.secret = ''/)

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
    source.includes(method),
    false,
    `Forbidden NWC method reference found in harness source: ${method}`,
  )
}

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
  'new WebSocket',
]) {
  assert.equal(
    source.includes(marker) || html.includes(marker),
    false,
    `Forbidden persistent-storage or network marker found: ${marker}`,
  )
}

for (const marker of ['console.log(', 'console.info(', 'console.warn(', 'console.error(']) {
  assert.equal(
    source.includes(marker),
    false,
    `Direct console output must not appear in harness source: ${marker}`,
  )
}

assert.match(html, /type="password"/, 'The URI input must be password-style')
assert.match(html, /autocomplete="off"/, 'The URI input must disable autocomplete')
assert.match(html, /wss:\/\/relay\.coinos\.io/, 'The approved relay must be visible in the page')

const pubkey = 'a'.repeat(64)
const secret = 'b'.repeat(64)
const approvedUri = `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(
  APPROVED_RELAY,
)}&secret=${secret}`

assert.deepEqual(parseNwcUri(approvedUri), {
  walletPubkey: pubkey,
  secret,
  relay: APPROVED_RELAY,
})

const withLud16 = `${approvedUri}&lud16=test%40example.com`
assert.equal(parseNwcUri(withLud16).relay, APPROVED_RELAY)

function rejects(uri, label) {
  assert.throws(
    () => parseNwcUri(uri),
    (error) => error instanceof NwcHarnessError,
    label,
  )
}

const disallowedRelays = [
  'wss://relay.damus.io',
  'wss://relay.coinos.io.evil',
  'wss://relay.coinos.io:443',
  'wss://relay.coinos.io/path',
  'ws://relay.coinos.io',
  'http://relay.coinos.io',
  'https://relay.coinos.io',
  'wss://user:pass@relay.coinos.io',
  'wss://relay.coinos.io?x=1',
  'wss://relay.coinos.io#fragment',
]
for (const relay of disallowedRelays) {
  rejects(
    `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(relay)}&secret=${secret}`,
    `Relay must be rejected: ${relay}`,
  )
}

rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(
    APPROVED_RELAY,
  )}&relay=${encodeURIComponent(APPROVED_RELAY)}&secret=${secret}`,
  'Duplicate relay parameters must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}&secret=${secret}&secret=${secret}`,
  'Duplicate secret parameters must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}`,
  'Missing secret must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?secret=${secret}`,
  'Missing relay must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}&secret=abc`,
  'Short secret must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}&secret=${secret}&extra=1`,
  'Unsupported query parameter must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}&secret=${secret}#fragment`,
  'Fragment must be rejected',
)
rejects(
  `nostr+walletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}&secret=${secret.slice(0, 32)} ${secret.slice(32)}`,
  'Internal whitespace must be rejected',
)
rejects(
  `nostrwalletconnect://${pubkey}?relay=${encodeURIComponent(APPROVED_RELAY)}&secret=${secret}`,
  'Non-canonical scheme must be rejected',
)

const safeInfo = sanitizeGetInfoResponse({
  alias: 'Coinos test',
  color: '#f7931a',
  pubkey,
  network: 'bitcoin',
  block_height: 123,
  methods: ['get_info', 'pay_invoice'],
  extensions: ['example'],
  secret: 'must-not-appear',
  relay: 'must-not-appear',
  unexpected: 'must-not-appear',
})
assert.equal(safeInfo.alias, 'Coinos test')
assert.equal(safeInfo.block_height, 123)
assert.deepEqual(safeInfo.methods, ['get_info', 'pay_invoice'])
assert.equal('secret' in safeInfo, false)
assert.equal('relay' in safeInfo, false)
assert.equal('unexpected' in safeInfo, false)

assert.throws(() => sanitizeGetInfoResponse(null), NwcHarnessError)
assert.throws(() => sanitizeGetInfoResponse({ alias: 'x' }), NwcHarnessError)
assert.throws(
  () => sanitizeGetInfoResponse({ methods: 'get_info' }),
  NwcHarnessError,
)
assert.deepEqual(sanitizeGetInfoResponse({ methods: [] }).methods, [])

console.log(
  `Static verification passed: @getalby/sdk ${installedSdk.version}, relay ${APPROVED_RELAY}, get_info only, no persistent storage or backend calls in harness source.`,
)
