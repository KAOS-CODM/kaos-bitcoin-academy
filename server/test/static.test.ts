import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { config } from '../src/config.js'
import { startTestServer } from './helpers.js'

const indexHtml = path.join(config.clientDist, 'index.html')
const built = existsSync(indexHtml)

test('production build serves the SPA and its client-side routes', { skip: !built }, async (t) => {
  const server = await startTestServer({ clientDist: config.clientDist })
  t.after(() => server.close())

  for (const route of [
    '/',
    '/courses',
    '/dashboard',
    '/tutor',
    '/wallet',
    '/playground',
    '/playground/wallet-creation',
    '/playground/key-relationships',
    '/playground/transaction-construction',
    '/playground/broadcasting',
    '/playground/block-formation',
    '/playground/mining',
  ]) {
    const response = await fetch(`${server.baseUrl}${route}`)
    assert.equal(response.status, 200, route)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    const html = await response.text()
    assert.match(html, /<div id="root"><\/div>/)
    assert.match(html, /KAOS Bitcoin Academy/)
  }

  const api = await fetch(`${server.baseUrl}/api/nope`)
  assert.equal(api.status, 404)
  assert.match(api.headers.get('content-type') ?? '', /application\/json/)
})

test('the frontend bundle contains no server secrets or credentials', { skip: !built }, () => {
  const assetDir = path.join(config.clientDist, 'assets')
  const files = [
    indexHtml,
    ...readdirSync(assetDir).map((name) => path.join(assetDir, name)),
  ]

  const forbidden = [
    'mongodb+srv://',
    'MONGODB_URI',
    'SESSION_SECRET',
    'passwordHash',
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'openrouter/auto',
  ]

  for (const file of files) {
    if (!/\.(js|css|html)$/.test(file)) continue
    const content = readFileSync(file, 'utf8')
    for (const needle of forbidden) {
      assert.equal(
        content.includes(needle),
        false,
        `${path.basename(file)} must not contain ${needle}`,
      )
    }
  }
})

test('the built learner interface includes the tutor page and API call', { skip: !built }, () => {
  const assetDir = path.join(config.clientDist, 'assets')
  const files = [
    indexHtml,
    ...readdirSync(assetDir).map((name) => path.join(assetDir, name)),
  ]
  const bundle = files
    .filter((file) => /\.(js|html)$/.test(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')

  assert.match(bundle, /\/tutor\/chat/)
  assert.match(bundle, /AI Tutor/)
  assert.match(bundle, /Ask the AI Tutor/)
})

test('the built learner interface includes the optional NWC wallet page', { skip: !built }, () => {
  const assetDir = path.join(config.clientDist, 'assets')
  const files = [
    indexHtml,
    ...readdirSync(assetDir).map((name) => path.join(assetDir, name)),
  ]
  const bundle = files
    .filter((file) => /\.(js|html)$/.test(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')

  assert.match(bundle, /Nostr Wallet Connect/)
  assert.match(bundle, /wss:\/\/relay\.coinos\.io/)
  assert.match(bundle, /wss:\/\/relay\.getalby\.com\/v1/)
  assert.match(bundle, /Disconnect and clear/)
  assert.match(bundle, /get_info/)
  assert.match(bundle, /Optional practical activity/)
  assert.match(bundle, /does not create an invoice/)
  assert.match(bundle, /Channels, liquidity and invoices/)
  assert.match(bundle, /Back to the lesson/)
  assert.match(bundle, /Method used by the Academy/)
  assert.match(bundle, /Methods reported by the connected wallet/)
  assert.match(bundle, /Requests wallet balance information\./)
  assert.match(bundle, /Requests payment of an invoice\./)
  assert.match(bundle, /has not called or tested/)
  assert.match(bundle, /Where to get an NWC connection/)
  assert.match(bundle, /https:\/\/coinos\.io/)
  assert.match(bundle, /https:\/\/zeusln\.com/)
  assert.match(bundle, /Coinos is the wallet\./)
  assert.match(bundle, /ZEUS is the wallet\./)
  assert.match(bundle, /Alby is the relay service, not the wallet provider\./)
  assert.match(bundle, /two tested examples, not a complete list of compatible wallets\./)
  assert.match(bundle, /Previously tested: this wallet\/relay combination/)
  assert.match(bundle, /ZEUS is the wallet\. It lets you choose from multiple NWC relays\./)
  assert.match(bundle, /wss:\/\/relay\.snort\.social/)
  assert.match(bundle, /wss:\/\/relay\.dasmus\.io/)
  assert.match(bundle, /Custom relay/)
  assert.match(bundle, /not approved for Academy use/)
  assert.match(bundle, /select Alby/)
  assert.match(
    bundle,
    /Never share it publicly or paste it into chats, screenshots, support requests, or reports\./,
  )
  assert.match(
    bundle,
    /Never enter your wallet seed phrase or private key into the Academy\./,
  )
  assert.match(
    bundle,
    /Wallet connection is optional; all educational content remains available\./,
  )

  for (const marker of [
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'document.cookie',
    'XMLHttpRequest',
    'navigator.sendBeacon',
  ]) {
    assert.equal(bundle.includes(marker), false, `Built wallet bundle must not contain ${marker}`)
  }
})
