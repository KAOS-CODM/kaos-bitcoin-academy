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
