# KAOS Bitcoin Academy — Deployment and Operations Guide

The academy is a single-origin application: one Node.js server serves the JSON API and the
built client, and one MongoDB cluster stores the learning data. There is no paid service, no
subscription, no external API gateway, and no hosted asset pipeline.

**Nothing in this guide has been executed.** No deployment, DNS change, database migration,
or purchase has been performed. Every step below needs the project owner's explicit
approval before it is run.

---

## 1. What has to be true before a deployment

| Requirement | Where it comes from |
| --- | --- |
| A Node.js 20 or newer runtime | `server/package.json` → `engines.node` |
| A reachable MongoDB cluster | `MONGODB_URI` |
| A session secret of at least 32 characters | `SESSION_SECRET` |
| The client built and present in `client/dist` | `npm run build` |
| A public origin that serves HTTPS | `APP_ORIGIN` |

The server refuses to start in production when `MONGODB_URI` or `SESSION_SECRET` is missing.
It never prints a value while validating the configuration; only field names are reported.

## 2. Environment variables

### Server

Copy `server/.env.example` to `server/.env` and fill in the values. `server/.env` is ignored
by Git and must never be committed.

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` enables the strict security headers and the secure cookie. |
| `PORT` | no | Defaults to `4000`. The platform usually assigns this. |
| `MONGODB_URI` | **yes** | The MongoDB connection string. The server refuses to start without it. |
| `MONGODB_DB` | no | Defaults to `kaos_academy`. |
| `SESSION_SECRET` | **yes** | Signs the session cookie. At least 32 characters. |
| `APP_ORIGIN` | recommended | The browser's origin, for example `https://academy.example`. |
| `RENDER_EXTERNAL_URL` | optional | A second allowed origin, for example a preview deployment URL. |
| `LOG_LEVEL` | no | Defaults to `info`. |
| `AI_ENABLED` | no | `true` enables the AI Tutor, but only together with a key. |
| `OPENROUTER_API_KEY` | optional | The tutor key. The tutor stays disabled without it. |

### Client

Copy `client/.env.example` to `client/.env.local`. Everything prefixed with `VITE_` is
**embedded in the built bundle and is public**. Never put a secret in this file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | no | The API origin for a split deployment. Leave empty for the normal single-origin deployment. |

## 3. Build

```sh
npm install
npm run build
```

`npm run build` compiles the server with `tsc` and builds the client with Vite. The result is
`server/dist/` and `client/dist/`. The server resolves the client directory relative to its
own build output, so the two folders must be deployed together.

The client build emits:

- `client/dist/index.html` — the application shell
- `client/dist/assets/*` — content-hashed JavaScript and CSS
- `client/dist/sw.js` — the service worker
- `client/dist/manifest.webmanifest` and `client/dist/icons/*` — the installable web app
- `client/dist/offline.html` — the offline fallback

## 4. Run

```sh
npm start
```

The server listens on `PORT` and serves the API under `/api`, the built client from
`client/dist`, and the SPA fallback for every other `GET`.

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

## 5. Routing and caching

| Request | Behaviour |
| --- | --- |
| `/api/**` | JSON API. An unknown path returns the JSON 404, never the HTML shell. |
| `/assets/**` | Content-hashed build assets. Cached for one year, `immutable`. |
| `/index.html`, `/sw.js` | `no-cache`, so a new deployment and a new worker are picked up immediately. |
| `/manifest.webmanifest`, `/icons/**`, `/offline.html` | Cached for one hour. |
| Any other `GET` | The SPA shell (`index.html`), so a client-side route such as `/courses` works on a direct visit. |
| Any non-`GET` to a non-API path | Rejected by the API 404 handler. |

## 6. Cookies, origins, and cross-site requests

- The session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- In production the cookie is named `__Host-kaos_session`. The `__Host-` prefix requires
  `secure`, `path=/`, and **no** `domain` attribute, so the browser only sends it to the
  exact origin that set it.
- The session store is the in-process `MemoryStore` by default. **A single-process deployment
  is required**, or a shared session store must be configured. The warning is printed on
  start-up in production.
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

## 7. Security headers

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

## 8. The service worker and the wallet

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

## 9. Rollback

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

## 10. Verification before a deployment

```sh
npm run build          # production build
npm run typecheck      # server and client
npm --prefix server test
```

`server/test/static.test.ts` and `server/test/s7-product-readiness.test.ts` assert against
the **built** output in `client/dist`, so the build must run before the tests. A test run
against a stale bundle can hide a packaging regression.

## 11. Zero-budget constraint

Everything the academy needs is free or self-hosted:

| Need | Used | Cost |
| --- | --- | --- |
| Web hosting | Any Node.js host or a free tier | Free tier |
| Database | MongoDB Atlas Free tier | Free tier |
| AI Tutor | OpenRouter, optional, disabled unless a key is set | Free tier / optional |
| Wallet connection | The learner's own wallet over NWC | Free |
| Relays | Coinos and Alby, chosen by the learner's wallet | Free |

No domain purchase, paid service, subscription, or hosted asset pipeline is required.

## 12. Explicitly out of scope

The following need separate, explicit owner approval and are **not** performed by this
guide:

- Buying a domain or registering a service.
- Changing DNS.
- Running a production migration or a destructive database operation.
- Executing a live wallet operation, a payment, an invoice, or a settlement lookup.
- Pushing to a remote or deploying to a hosting platform.
