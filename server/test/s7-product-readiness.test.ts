import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { config } from '../src/config.js'
import { startTestServer } from './helpers.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const CLIENT_DIST = path.join(ROOT, 'client/dist')
const PUBLIC_DIR = path.join(ROOT, 'client/public')

const indexHtml = path.join(CLIENT_DIST, 'index.html')
const built = existsSync(indexHtml)

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function readPublic(relativePath: string): string {
  return readFileSync(path.join(PUBLIC_DIR, relativePath), 'utf8')
}

function builtFile(relativePath: string): string {
  return readFileSync(path.join(CLIENT_DIST, relativePath), 'utf8')
}

// ---------------------------------------------------------------------------
// S7-C: the initial download stays small
// ---------------------------------------------------------------------------

test('the initial bundle does not carry the wallet SDK, nostr-tools, or the BOLT 11 decoder', {
  skip: !built,
}, () => {
  const assets = path.join(CLIENT_DIST, 'assets')
  const entryName = readdirSync(assets).find(
    (name) => name.startsWith('index-') && name.endsWith('.js'),
  )
  assert.ok(entryName, 'the build should produce an entry chunk')

  const entry = readFileSync(path.join(assets, entryName), 'utf8')

  assert.equal(/NWCClient|getWalletServiceInfo/.test(entry), false)
  assert.equal(/nip44|getPublicKey\(/.test(entry), false)
  assert.equal(/decodeInvoice/.test(entry), false)
})

test('the wallet practice is delivered as its own chunk', { skip: !built }, () => {
  const assets = path.join(CLIENT_DIST, 'assets')
  const chunks = readdirSync(assets).filter((name) => name.endsWith('.js'))

  const walletChunk = chunks.find((name) => name.startsWith('Wallet-'))
  assert.ok(walletChunk, 'the wallet route should be a separate chunk')

  const wallet = readFileSync(path.join(assets, walletChunk), 'utf8')
  assert.equal(/NWCClient|getWalletServiceInfo/.test(wallet), true)
})

test('the initial JavaScript bundle stays under the size budget', { skip: !built }, () => {
  const assets = path.join(CLIENT_DIST, 'assets')
  const entryName = readdirSync(assets).find(
    (name) => name.startsWith('index-') && name.endsWith('.js'),
  )
  assert.ok(entryName)

  const size = readFileSync(path.join(assets, entryName)).byteLength
  assert.ok(
    size < 400_000,
    `the entry chunk should stay under 400 kB, but it is ${size} bytes`,
  )
})

test('every application route is loaded on demand', () => {
  const source = read('client/src/App.tsx')

  for (const route of [
    'Catalogue',
    'CourseDetail',
    'Lesson',
    'Quiz',
    'Login',
    'Register',
    'Dashboard',
    'Playground',
    'PlaygroundSimulation',
    'Tutor',
    'Wallet',
  ]) {
    assert.match(
      source,
      new RegExp(`lazy\\(\\(\\) =>\\s*import\\('\\./pages/${route}'\\)`),
      `${route} should be loaded with React.lazy`,
    )
  }

  assert.match(source, /<Suspense fallback=\{<RouteFallback \/>\}>/)
})

// ---------------------------------------------------------------------------
// S7-B: the progressive web app
// ---------------------------------------------------------------------------

test('the web app manifest is valid and complete', () => {
  const manifest = JSON.parse(readPublic('manifest.webmanifest')) as {
    name: string
    short_name: string
    start_url: string
    scope: string
    display: string
    theme_color: string
    background_color: string
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>
  }

  assert.equal(manifest.name, 'KAOS Bitcoin Academy')
  assert.ok(manifest.short_name.length > 0)
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i)
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i)

  const sizes = manifest.icons.map((icon) => icon.sizes)
  assert.ok(sizes.includes('192x192'), 'a 192x192 icon is required for installability')
  assert.ok(sizes.includes('512x512'), 'a 512x512 icon is required for installability')
  assert.ok(
    manifest.icons.some((icon) => icon.purpose === 'maskable'),
    'a maskable icon is required for a good Android install',
  )
})

test('the built application links the manifest and the icons', { skip: !built }, () => {
  const html = builtFile('index.html')

  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(html, /rel="apple-touch-icon"/)
  assert.match(html, /name="theme-color" content="#17140F"/)
  assert.match(html, /<noscript>/)
})

test('the application icons are real PNG files with the expected size', () => {
  for (const [name, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
  ] as const) {
    const file = path.join(PUBLIC_DIR, 'icons', name)
    assert.ok(existsSync(file), `${name} should exist`)

    const bytes = readFileSync(file)
    assert.equal(
      bytes.subarray(0, 8).toString('hex'),
      '89504e470d0a1a0a',
      `${name} should be a PNG file`,
    )
    assert.equal(bytes.readUInt32BE(16), size, `${name} width`)
    assert.equal(bytes.readUInt32BE(20), size, `${name} height`)
  }
})

test('the service worker never caches an account, wallet, or payment response', () => {
  const worker = readPublic('sw.js')

  // An authenticated API response must never enter a cache.
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)\)\s*return/)
  // A cross-origin request, which includes the NWC relays, is never intercepted.
  assert.match(worker, /url\.origin !== self\.location\.origin\)\s*return/)
  // A state-changing request is never replayed from a cache.
  assert.match(worker, /request\.method !== 'GET'\)\s*return/)
  // No wallet material may be stored by the worker.
  for (const marker of ['nostr+walletconnect', 'secret', 'preimage']) {
    assert.equal(
      worker.includes(marker),
      false,
      `the service worker must not handle ${marker}`,
    )
  }
})

test('the service worker waits for the learner before it takes over', () => {
  const worker = readPublic('sw.js')

  const installHandler = worker.slice(
    worker.indexOf("addEventListener('install'"),
    worker.indexOf("addEventListener('activate'"),
  )
  const messageHandler = worker.slice(worker.indexOf("addEventListener('message'"))

  // The install handler must not activate the new version by itself.
  assert.equal(
    /self\.skipWaiting\(\)/.test(installHandler),
    false,
    'the worker must not call skipWaiting while installing',
  )
  // It is only activated when the page asks for it, which happens after the learner
  // accepts the update prompt.
  assert.match(messageHandler, /SKIP_WAITING/)
  assert.match(messageHandler, /self\.skipWaiting\(\)/)
})

test('the offline page states plainly that nothing was sent', () => {
  const offline = readPublic('offline.html')

  assert.match(offline, /You are offline/)
  assert.match(offline, /Nothing was sent\./)
  assert.match(offline, /no account request, wallet\s+request, payment, or invoice can be completed/)
})

test('the built application ships the service worker and the offline page', { skip: !built }, () => {
  assert.ok(existsSync(path.join(CLIENT_DIST, 'sw.js')))
  assert.ok(existsSync(path.join(CLIENT_DIST, 'offline.html')))
  assert.ok(existsSync(path.join(CLIENT_DIST, 'manifest.webmanifest')))
  assert.ok(existsSync(path.join(CLIENT_DIST, 'icons/icon-512.png')))
})

test('the service worker is only registered in a production build', () => {
  const source = read('client/src/pwa.ts')

  assert.match(source, /import\.meta\.env\.DEV/)
  assert.match(source, /registerServiceWorker/)
  // The registration must not block the first paint.
  const main = read('client/src/main.tsx')
  assert.match(main, /registerServiceWorker\(\)/)
})

// ---------------------------------------------------------------------------
// S7-E: security headers and cache boundaries
// ---------------------------------------------------------------------------

test('the production policy allows the service worker and the manifest only from this origin', () => {
  const source = read('server/src/app.ts')

  assert.match(source, /workerSrc: \["'self'"\]/)
  assert.match(source, /manifestSrc: \["'self'"\]/)
  // The relay allowlist must not grow.
  assert.match(
    source,
    /connectSrc: \["'self'", 'wss:\/\/relay\.coinos\.io', 'wss:\/\/relay\.getalby\.com'\]/,
  )
})

test('the shell and the worker are always revalidated, and hashed assets are immutable', () => {
  const source = read('server/src/app.ts')

  assert.match(source, /filePath\.endsWith\('index\.html'\) \|\| filePath\.endsWith\('sw\.js'\)/)
  assert.match(source, /no-cache/)
  assert.match(source, /max-age=31536000, immutable/)
})

// ---------------------------------------------------------------------------
// S7-D: accessibility
// ---------------------------------------------------------------------------

test('the quiz never relies on colour alone to report a result', () => {
  const source = read('client/src/components/Quiz.tsx')

  assert.match(source, /sr-only">— correct answer/)
  assert.match(source, /sr-only">— your answer, not correct/)
  // The per-question feedback is announced when it appears.
  assert.match(source, /role="status"/)
})

test('form validation messages are announced', () => {
  const source = read('client/src/components/FormField.tsx')

  assert.match(source, /role="alert"/)
  assert.match(source, /aria-invalid/)
  assert.match(source, /aria-describedby/)
  // A failed submission moves the keyboard to the first field that needs attention.
  assert.match(source, /useFocusFirstError/)
})

test('reduced motion is honoured', () => {
  const css = read('client/src/index.css')

  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /animation-duration: 0\.01ms !important/)
  assert.match(css, /scroll-behavior: auto/)
})

test('every focusable control keeps a visible focus indicator', () => {
  const css = read('client/src/index.css')

  assert.match(css, /a:focus-visible,[\s\S]*?button:focus-visible,[\s\S]*?input:focus-visible/)
  assert.match(css, /textarea:focus-visible/)
  assert.match(css, /select:focus-visible/)
  // The ring must not be removed for pointer users only.
  assert.match(css, /:focus:not\(:focus-visible\)/)
})

test('the main navigation is labelled and marks the current page', () => {
  const source = read('client/src/components/Layout.tsx')

  assert.match(source, /aria-label="Main"/)
  assert.match(source, /NavLink/)
  assert.match(source, /isActive/)
})

// ---------------------------------------------------------------------------
// The deployed shape, checked over HTTP
// ---------------------------------------------------------------------------

test('every built asset and route chunk is actually served', { skip: !built }, async (t) => {
  const server = await startTestServer({ clientDist: CLIENT_DIST })
  t.after(() => server.close())

  const shell = await (await fetch(`${server.baseUrl}/`)).text()
  const referenced = [...shell.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((match) => match[1])

  assert.ok(referenced.length > 0, 'the shell should reference its assets')

  for (const asset of referenced) {
    const response = await fetch(`${server.baseUrl}${asset}`)
    assert.equal(response.status, 200, `${asset} should be served`)
  }

  // Every lazy route chunk must exist and be reachable, or a navigation would 404.
  const assets = path.join(CLIENT_DIST, 'assets')
  const chunks = readdirSync(assets).filter((name) => name.endsWith('.js'))

  for (const chunk of chunks) {
    const response = await fetch(`${server.baseUrl}/assets/${chunk}`)
    assert.equal(response.status, 200, `${chunk} should be served`)
  }
})

test('a client-side route is served by the application shell', { skip: !built }, async (t) => {
  const server = await startTestServer({ clientDist: CLIENT_DIST })
  t.after(() => server.close())

  for (const route of ['/', '/courses', '/lessons/btc101-what-is-bitcoin', '/wallet']) {
    const response = await fetch(`${server.baseUrl}${route}`)
    assert.equal(response.status, 200, route)
    assert.match(
      await response.text(),
      /<div id="root"><\/div>/,
      `${route} should return the application shell`,
    )
  }
})

test('the deployed service worker and manifest are reachable with the right types', {
  skip: !built,
}, async (t) => {
  const server = await startTestServer({ clientDist: CLIENT_DIST })
  t.after(() => server.close())

  const worker = await fetch(`${server.baseUrl}/sw.js`)
  assert.equal(worker.status, 200)
  assert.match(worker.headers.get('content-type') ?? '', /javascript/)

  const manifest = await fetch(`${server.baseUrl}/manifest.webmanifest`)
  assert.equal(manifest.status, 200)
  assert.match(manifest.headers.get('content-type') ?? '', /manifest\+json/)
  const manifestBody = await manifest.text()
  assert.doesNotThrow(() => JSON.parse(manifestBody))
})
