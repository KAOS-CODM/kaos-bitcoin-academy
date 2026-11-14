# KAOS Bitcoin Academy — Deployment and Operations Guide

The academy is a single-origin application: one Node.js server serves the JSON API and the
built client, and one MongoDB cluster stores the learning data. There is no paid service, no
subscription, no external API gateway, and no hosted asset pipeline.

**The application is deployed.** It runs as a Render Node.js Web Service at
**https://kaos-bitcoin-academy.onrender.com**. This guide documents the configuration that
service actually uses, and the procedure to reproduce it.

---

## 1. The live service

| Setting | Value |
| --- | --- |
| Hosting provider | **Render** |
| Service type | Node.js Web Service |
| Service name | `kaos-bitcoin-academy` |
| Repository | `KAOS-CODM/kaos-bitcoin-academy` |
| Branch | `main` |
| Root directory | Repository root |
| Public URL | `https://kaos-bitcoin-academy.onrender.com` |
| Instance plan | Free |
| Build command | `npm ci --include=dev --prefix server && npm ci --include=dev --prefix client && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

**Nothing in this guide should be run against the live service without explicit approval.**
The build and deploy commands below describe how the current service was produced; running
them triggers a new deployment.

### 1.1 The exact Render build command

```
npm ci --include=dev --prefix server && npm ci --include=dev --prefix client && npm run build
```

It does three things, in order:

1. **Installs the server's dependencies, including its development dependencies.** The
   TypeScript compiler is a dev dependency of `server/`, so it must be present for the build
   step to run.
2. **Installs the client's dependencies, including its development dependencies.** Vite, the
   Tailwind Vite plugin, and the client's TypeScript are all dev dependencies of `client/`,
   and all of them are needed to produce the production bundle.
3. **Runs the root build script**, which is
   `npm --prefix server run build && npm --prefix client run build` — the server's `tsc`
   compile into `server/dist/`, followed by the client's Vite build into `client/dist/`.

### 1.2 Why a plain `npm install` at the repository root is not enough

The root `package.json` is a **scripts-only package**. It declares no `workspaces` field, and
its lockfile contains only the root entry, so `npm install` at the root installs no
application dependencies at all.

The two applications are independent npm packages with **separate manifests and separate
lockfiles**:

| Package | Manifest | Lockfile | Runtime deps | Dev deps |
| --- | --- | --- | --- | --- |
| `client/` | `client/package.json` | `client/package-lock.json` | 6 | 7 |
| `server/` | `server/package.json` | `server/package-lock.json` | 11 | 5 |

Each must be installed separately. The build command therefore targets each package
explicitly with `--prefix`.

### 1.3 The start command

```
npm start
```

This is the root script, and it delegates to the server's own start script,
`npm --prefix server start`, which runs `node dist/index.js`. The compiled server serves both
the API and the built client from `client/dist`, which it resolves relative to its own build
output — so `server/dist/` and `client/dist/` must be deployed together.

### 1.4 The health check

```
GET /api/health
```

```json
{ "status": "ok", "db": "up" }
```

`status` reports that the process is serving. `db` reports whether the MongoDB connection is
ready. A `db` value of `down` means the process is up but cannot serve data; a load balancer
should not route traffic to it until `db` is `up`. The health check is excluded from the
request log so a polling platform does not flood the logs.

### 1.5 The free plan spins down

Render's **free** instance sleeps after a period of inactivity. The first request after a
quiet period therefore has to wake the instance, and that request can take noticeably longer
than a normal one. This is a property of the free tier, not a fault in the application.

**No uninterrupted-availability or production-grade-uptime claim is made.** If dependable
uptime matters, a paid instance is required.

## 2. What has to be true before a deployment

| Requirement | Where it comes from |
| --- | --- |
| A Node.js 20 or newer runtime | `server/package.json` → `engines.node` |
| A reachable MongoDB cluster | `MONGODB_URI` |
| A session secret of at least 32 characters | `SESSION_SECRET` |
| The client built and present in `client/dist` | `npm run build` |
| A public origin that serves HTTPS | `APP_ORIGIN` |

The server refuses to start in production when `MONGODB_URI` or `SESSION_SECRET` is missing.
It never prints a value while validating the configuration; only field names are reported.

## 3. Environment variables

### Server

Copy `server/.env.example` to `server/.env` and fill in the values. `server/.env` is ignored
by Git and must never be committed.

The names below are taken from the validation schema in `server/src/config.ts`, so they are
the variables the application actually reads.

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` enables the strict security headers and the secure cookie. |
| `PORT` | no | Defaults to `4000`. Render assigns the port and sets it in the environment. |
| `MONGODB_URI` | **yes** | The MongoDB connection string. The server refuses to start without it. |
| `MONGODB_DB` | no | Defaults to `kaos_academy`. |
| `SESSION_SECRET` | **yes** | Signs the session cookie. At least 32 characters. |
| `APP_ORIGIN` | recommended | The browser's origin, for example `https://kaos-bitcoin-academy.onrender.com`. |
| `RENDER_EXTERNAL_URL` | optional | A second allowed origin, for example a preview deployment URL. |
| `LOG_LEVEL` | no | Defaults to `info`. |
| `AI_ENABLED` | no | `true` enables the AI Tutor, but only together with a key. |
| `OPENROUTER_API_KEY` | optional | The tutor key. The tutor stays disabled without it. |

### Client

Copy `client/.env.example` to `client/.env.local`. Everything prefixed with `VITE_` is
**embedded in the built bundle and is public**. Never put a secret in this file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | no | The API origin for a split deployment. Leave empty for the normal single-origin deployment, which is what the live service uses. |

### What is set on the live service

`MONGODB_URI`, `SESSION_SECRET`, and `NODE_ENV=production` must be set for the service to
start at all, because the server refuses to start in production without the first two.
Whether `APP_ORIGIN` has been set to the public origin has **not** been confirmed, and this
guide does not claim it either way.

**No secret value is reproduced in this documentation.** The values live only in Render's
environment-variable store, which is never committed and is not readable from the repository.

## 4. Build

Locally, or on any host:

```sh
# The root package only holds the workspace scripts; the applications live in
# client/ and server/ and each has its own manifest and lockfile.
npm install --prefix client
npm install --prefix server

npm run build
```

`npm run build` compiles the server with `tsc` and builds the client with Vite. The result is
`server/dist/` and `client/dist/`. The server resolves the client directory relative to its
own build output, so the two folders must be deployed together.

Render uses the `npm ci` form documented in §1.1 instead, which installs from the lockfiles
exactly and additionally includes the development dependencies the build needs.

The client build emits:

- `client/dist/index.html` — the application shell
- `client/dist/assets/*` — content-hashed JavaScript and CSS
- `client/dist/sw.js` — the service worker
- `client/dist/manifest.webmanifest` and `client/dist/icons/*` — the installable web app
- `client/dist/offline.html` — the offline fallback

## 5. Run

```sh
npm start
```

The server listens on `PORT` and serves the API under `/api`, the built client from
`client/dist`, and the SPA fallback for every other `GET`. On Render the `PORT` is assigned by
the platform and injected into the environment.

### Health check

```sh
curl http://localhost:4000/api/health
```

```json
{ "status": "ok", "db": "up" }
```

`status` reports that the process is serving. `db` reports whether the database connection
is ready. A `db` value of `down` means the process is up but cannot serve data; a load
balancer should not route traffic to it until `db` is `up`. The health check is excluded
from the request log so a polling platform does not flood the logs.

### Against the live service

```sh
curl https://kaos-bitcoin-academy.onrender.com/api/health
```

The same endpoint is what the Render health check calls. Because the instance is on the free
plan it may be asleep, in which case the first request wakes it and takes longer than usual.

## 6. Routing and caching

| Request | Behaviour |
| --- | --- |
| `/api/**` | JSON API. An unknown path returns the JSON 404, never the HTML shell. |
| `/assets/**` | Content-hashed build assets. Cached for one year, `immutable`. |
| `/index.html`, `/sw.js` | `no-cache`, so a new deployment and a new worker are picked up immediately. |
| `/manifest.webmanifest`, `/icons/**`, `/offline.html` | Cached for one hour. |
| Any other `GET` | The SPA shell (`index.html`), so a client-side route such as `/courses` works on a direct visit. |
| Any non-`GET` to a non-API path | Rejected by the API 404 handler. |

## 7. Cookies, origins, and cross-site requests

- The session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- In production the cookie is named `__Host-kaos_session`. The `__Host-` prefix requires
  `secure`, `path=/`, and **no** `domain` attribute, so the browser only sends it to the
  exact origin that set it.
- The session store is MongoDB (`connect-mongo`) whenever `MONGODB_URI` is configured, which
  is always the case in production. Sessions are stored in a `sessions` collection with a
  seven-day TTL, so **a multi-process deployment works** and sessions survive a restart.
  The in-process `MemoryStore` is only the fallback used when no database is configured,
  which cannot happen in production because the server refuses to start without
  `MONGODB_URI`.
- Every mutating request must be JSON and must come from the request host or from an
  allowed origin (`APP_ORIGIN`, `RENDER_EXTERNAL_URL`). This is the CSRF defence.
- The server does **not** send a permissive `Access-Control-Allow-Origin` header. Same-origin
  requests need no CORS at all, which is the simplest and safest configuration.

### Split deployment

If the client and the API run on different origins:

1. Set `VITE_API_BASE_URL` to the API origin and rebuild the client.
2. Set `APP_ORIGIN` on the server to the client origin.
3. The session cookie must be sent across origins. `sameSite=lax` will not do this, so the
   cookie policy in `server/src/app.ts` has to be changed to `sameSite=none` together with
   `secure`, and the API has to answer with explicit CORS headers including
   `Access-Control-Allow-Credentials`. **This is a code change and needs its own approval.**

## 8. Security headers

In production the server sends:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `img-src 'self' data:`, `connect-src 'self' wss://relay.coinos.io wss://relay.getalby.com`, `font-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `worker-src 'self'`, `manifest-src 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |

The two WebSocket origins are the **only** NWC relays the academy accepts. `connect-src`
must never be widened to `wss://*`.

## 9. The service worker and the wallet

The service worker caches the application shell and static assets only. It never caches an
`/api/` response, never intercepts a cross-origin request, and never replays a
state-changing request. NWC credentials, wallet responses, and preimages never leave the
browser, so they can never enter the cache.

The worker does not activate itself. A new version waits until the learner accepts the
update prompt in the page. The worker file is served with `no-cache` so the browser notices
a new deployment promptly.

If a broken worker is ever deployed, a learner can clear it in the browser, and a new worker
replaces it on the next load. To force a new worker version, change `CACHE_VERSION` in
`client/public/sw.js` and rebuild.

## 10. Rollback

The client is static, so a rollback is a deployment of the previous build.

1. Keep the previous `client/dist` and `server/dist` artefacts.
2. Redeploy the previous artefacts. The asset file names are content-hashed, so the old
   shell still points at the old assets.
3. The service worker keeps the current shell in its cache until the new worker prunes it.
   The pruning step runs on activation and keeps only the assets the current shell
   references, so a rollback converges after one reload.
4. **The database schema is not changed by a client rollback.** The academy stores learning
   records only, and no client change alters a server-side shape.

There is no database migration in this project, so there is nothing to roll back in the data
layer.

## 11. Verification before a deployment

```sh
npm run build          # production build
npm run typecheck      # server and client
npm --prefix server test
```

`server/test/static.test.ts` and `server/test/s7-product-readiness.test.ts` assert against
the **built** output in `client/dist`, so the build must run before the tests. A test run
against a stale bundle can hide a packaging regression.

## 12. Zero-budget constraint

Everything the academy needs is free or self-hosted:

| Need | Used | Cost |
| --- | --- | --- |
| Web hosting | Render Node.js Web Service, free instance | Free tier |
| Database | MongoDB Atlas Free tier | Free tier |
| AI Tutor | OpenRouter, optional, disabled unless a key is set | Free tier / optional |
| Wallet connection | The learner's own wallet over NWC | Free |
| Relays | Coinos and Alby, chosen by the learner's wallet | Free |

No domain purchase, paid service, subscription, or hosted asset pipeline is required. The
free Render instance is the one part of the topology that trades uptime for cost: it sleeps
when idle (§1.5).

## 13. Hosting architecture

The live service is a **single origin**. There is no second host to configure.

```
                 https://kaos-bitcoin-academy.onrender.com
                                  │
                 ┌────────────────┴────────────────┐
                 │   Render Node.js Web Service      │
                 │   (free instance, port assigned)  │
                 │                                  │
                 │   Express process                 │
                 │   ├── /api/*   → JSON API        │
                 │   ├── /assets/* → hashed JS/CSS   │
                 │   ├── /sw.js, /manifest, /icons   │
                 │   └── any other GET → SPA shell   │
                 │                                  │
                 │   connect-mongo ──────────────┐   │
                 └──────────────────────────────┼───┘
                                                │
                        ┌───────────────────────┴──────────────┐
                        │ MongoDB (Atlas Free tier)            │
                        │ courses · accounts · progress ·       │
                        │ XP · attempts · achievements ·        │
                        │ sessions                              │
                        └──────────────────────────────────────┘
```

- **Express serves the built React frontend.** The client is compiled into `client/dist` and
  served as static files, with the SPA shell returned for client-side routes.
- **Express exposes the API.** Everything under `/api` is JSON, and an unknown API path
  returns the JSON 404 rather than the HTML shell.
- **The frontend and the API share the Render service origin.** The browser calls
  `/api/...` on the same host it loaded the page from, so there is no CORS configuration and
  no cross-site cookie problem.
- **The session cookie is first-party.** It is `__Host-`-prefixed in production, so the
  browser only ever sends it back to this exact origin.
- **The NWC wallet connection stays in the browser.** The learner's connection URI, secret,
  balance, and transaction history never reach the Render service. The browser talks to the
  approved relays directly, and the relays talk to the learner's wallet. **This path does not
  pass through the academy backend**, and the hosting arrangement does not change that.

## 14. Explicitly out of scope

The following need separate, explicit owner approval and are **not** performed by this
guide:

- Buying a domain or registering a service.
- Changing DNS.
- Running a production migration or a destructive database operation.
- Executing a live wallet operation, a payment, an invoice, or a settlement lookup.
- Pushing to a remote.
- Triggering a new Render deployment, or changing any Render service setting.
- Publishing a browser-level test pass against the live deployment. **No browser has been
  attached to the live site**, so the verification recorded in the README is HTTP-level
  only.
- Adding a `render.yaml` blueprint, or changing any application deployment behaviour.
