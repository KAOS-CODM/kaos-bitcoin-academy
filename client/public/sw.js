/*
 * KAOS Bitcoin Academy service worker.
 *
 * Safety rules this file enforces, deliberately:
 *
 *   1. It never caches an API response. Every /api/ route is authenticated, and a cached
 *      account response would show one learner's data to another device or account.
 *   2. It never touches a cross-origin request. The NWC relays are cross-origin, and the
 *      wallet conversation must never be inspected, stored, or replayed by the service
 *      worker.
 *   3. It never caches a non-GET request, so no payment, invoice, or state-changing action
 *      can be replayed from a cache.
 *   4. It never implies an action succeeded. The offline page states plainly that nothing
 *      was sent and that no wallet request can complete offline.
 *
 * Caching strategy:
 *   - Navigation (HTML): network first, so a learner always gets the current application.
 *     When the network fails, the last cached shell is served, and then the offline page.
 *   - Static assets (hashed file names): cache first, because the name changes whenever the
 *     content changes.
 *   - On activation the asset cache is pruned to the files the current build references, so
 *     a stale asset can never be served after a deployment.
 */

const CACHE_VERSION = 'kaos-academy-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const ASSET_CACHE = `${CACHE_VERSION}-assets`

const SHELL_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // Each entry is added on its own so one missing file cannot fail the whole install.
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      // The worker deliberately does not call skipWaiting(): a new version is only applied
      // after the learner accepts the update prompt in the page.
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
      await pruneAssetCache()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/**
 * Remove cached assets that the current build no longer references.
 *
 * The shell is fetched from the network first so the pruning always matches what the
 * learner is actually running.
 */
async function pruneAssetCache() {
  try {
    const response = await fetch('/index.html', { cache: 'no-store' })
    if (!response.ok) return

    const html = await response.text()
    const referenced = new Set()

    for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
      const url = match[1]
      if (url.startsWith('/api/')) continue
      referenced.add(url)
    }

    const cache = await caches.open(ASSET_CACHE)
    const keys = await cache.keys()
    await Promise.all(
      keys
        .filter((request) => !referenced.has(new URL(request.url).pathname))
        .map((request) => cache.delete(request)),
    )
  } catch {
    // A failed prune is not fatal. The cache is a performance aid, never a correctness
    // requirement, and the navigation path is network first.
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request

  // Rule 3: only safe, read-only requests are ever considered.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Rule 2: cross-origin traffic, including the NWC relays, is never intercepted.
  if (url.origin !== self.location.origin) return

  // Rule 1: authenticated API responses are never cached.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  event.respondWith(handleAsset(request))
})

async function handleNavigation(request) {
  try {
    const fresh = await fetch(request)
    if (fresh.ok) {
      const cache = await caches.open(SHELL_CACHE)
      await cache.put('/index.html', fresh.clone())
    }
    return fresh
  } catch {
    const shell = await caches.match('/index.html')
    if (shell) return shell
    const offline = await caches.match('/offline.html')
    if (offline) return offline
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

async function handleAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const fresh = await fetch(request)
    if (fresh.ok && fresh.type === 'basic') {
      const cache = await caches.open(ASSET_CACHE)
      await cache.put(request, fresh.clone())
    }
    return fresh
  } catch {
    if (cached) return cached
    return Response.error()
  }
}
