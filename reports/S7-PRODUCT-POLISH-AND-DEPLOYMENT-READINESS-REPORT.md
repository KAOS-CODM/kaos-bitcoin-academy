# KAOS Bitcoin Academy — S7 Product Polish & Deployment Readiness Progress Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-14
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `fc1450b267879486d2997b592b35afe399d38def`
- S6 checkpoint commit: **`fc1450b267879486d2997b592b35afe399d38def`** — *"chore: checkpoint S6 wallet account dashboard"*
- Change type: Owner-authorized S7 implementation (no deployment performed)
- Result: **S7 WORKSTREAMS A–F IMPLEMENTED — the initial JavaScript bundle fell from 621.97 kB to 313.45 kB (−49.6 %), the application is now an installable progressive web app with a safety-bounded service worker, the production security headers and cache boundaries were hardened, focused accessibility defects were fixed, and deployment and rollback documentation was written. 305/305 tests pass, both typechecks pass, the production build succeeds. S7 changes remain UNCOMMITTED pending owner approval. No live wallet operation, no deployment, no DNS change, and no database operation was performed.**

> **Status statement:** S7 changed the client, the server's static-delivery configuration, the
> environment documentation, and the test suite. It did **not** commit, stage, push, or
> deploy anything. It did not execute a live wallet method, a payment, an invoice, or a
> settlement lookup. It did not run a database migration or a destructive database operation.
> No service was purchased or registered. Browser and device testing **could not be
> performed** in this environment because no browser is attached to the session; every
> statement below is backed by an automated check, and the browser-dependent checks are
> listed as outstanding.

---

## 1. Phase 0 — The S6 checkpoint

### 1.1 Git state inspection

| Item | Finding |
| --- | --- |
| Repository | `/data/data/com.termux/files/home/kaos-bitcoin-academy` |
| Branch | `main` |
| HEAD before the checkpoint | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` — matched the reported value |
| Stashes | 0 |
| Tracked modifications | 6 files |
| Untracked, committable files | 45 files |
| Ignored paths | `client/dist/`, `client/node_modules/`, `server/dist/`, `server/node_modules/`, `server/.env`, `tools/s5-nwc-validation/dist/`, `tools/s5-nwc-validation/node_modules/` |

Every dirty file was inspected individually rather than assumed to belong to S6.

### 1.2 Secret review

| Check | Result |
| --- | --- |
| `nostr+walletconnect://` in changed files | Only in parser code, test vectors (`'a'.repeat(64)` / `'b'.repeat(64)`), and documentation. **No real URI.** |
| `nsec1…`, `sk-…`, `BEGIN … PRIVATE KEY` | None found |
| `mongodb+srv://user:password@…` | None found |
| `OPENROUTER_API_KEY=`, `SESSION_SECRET=` with a value | None found |
| Long hex literals | Two, in `server/test/fixtures/invoice-vectors.ts`: a **locally generated synthetic** preimage and its SHA-256 payment hash. The pair was verified to be self-consistent (`sha256(preimage) == payment_hash`), which confirms it was generated locally and is not a real payment's preimage. |
| `server/.env` | Confirmed **ignored** by `.gitignore` (`.env` rule) and never staged |
| `client/.env.local` and any `VITE_*` value | No secret is ever placed in a client build variable; `client/.env.example` documents this explicitly |

### 1.3 Validation before the commit

| Check | Result |
| --- | --- |
| S6 wallet account dashboard present | Yes — `client/src/features/wallet/WalletAccountDashboard.tsx` and `client/src/features/wallet/account.ts` |
| Test suite | 283 tests, 283 pass, 0 fail |
| Server typecheck | Clean |
| Client typecheck | Clean |
| Production build | Success |
| PRD SHA-256 | `PRD.md` `1e73e32c…` and `PRD-ORIGINAL.txt` `7a44c87e…` both match `PRD-MD-SHA256.txt` |
| Live wallet operation required | No |

### 1.4 The checkpoint commit

53 files were staged with explicit paths (no `git add -A`), the staged diff was reviewed
again for secrets, and the commit was created:

```
fc1450b267879486d2997b592b35afe399d38def
chore: checkpoint S6 wallet account dashboard
53 files changed, 15846 insertions(+), 112 deletions(-)
```

The staged set covered the complete wallet feature set (client wallet modules, the S5
validation harness, all S5/S6 test files and fixtures, the S5 and S6 reports, and the
manifests and lockfiles the code needs). It contained no credential, no `.env` file, and no
generated artefact.

### 1.5 Verification after the commit

| Item | Result |
| --- | --- |
| New commit hash | `fc1450b267879486d2997b592b35afe399d38def` |
| Commit message | `chore: checkpoint S6 wallet account dashboard` |
| File summary | 53 files changed, 15846 insertions, 112 deletions |
| Branch | `main` |
| Intended work left out | None — the working tree was clean immediately after the commit |
| Unrelated remaining dirty work | None; every dirty file was a project deliverable and was committed |
| Push | **Not performed.** No remote and no upstream are configured, so nothing could be pushed |
| Amend | Not used |

**S7 began only after this verification passed.**

---

## 2. Phase 1 — S7 workstreams

### S7-A — UI and UX polish

| Improvement | Where |
| --- | --- |
| Every route except the landing page and the 404 page is loaded on demand, so a learner only downloads the page they open | `client/src/App.tsx` |
| A stable, announced loading state replaces the blank frame while a route chunk downloads; the spinner respects reduced motion | `client/src/App.tsx` → `RouteFallback` |
| The main navigation became a horizontally scrollable strip on small screens instead of wrapping into an unpredictable block, and the header stacks on narrow viewports | `client/src/components/Layout.tsx` |
| The current page is marked in the navigation with both a visual treatment and `aria-current` | `client/src/components/Layout.tsx` (via `NavLink`) |
| One shared form field component gives every form the same label, input, error, and hint treatment | `client/src/components/FormField.tsx`, `Login.tsx`, `Register.tsx` |
| A failed submission moves the keyboard to the first field that needs attention | `FormField.tsx` → `useFocusFirstError` |
| Breadcrumbs on the lesson and playground pages use a list structure and mark the current item | `client/src/pages/Lesson.tsx`, `features/playground/SimulationLayout.tsx` |

No existing functionality was removed to simplify the interface.

### S7-B — Progressive Web App

The project had **no** PWA implementation at all. The following was added.

| Piece | Where |
| --- | --- |
| Valid web app manifest with name, short name, description, id, start URL, scope, standalone display, orientation, theme and background colours, categories, shortcuts, and four icons | `client/public/manifest.webmanifest` |
| Application icons at 192×192, 512×512, and a 512×512 maskable icon, plus an SVG favicon | `client/public/icons/` |
| A dependency-free PNG generator that reproduces the icons | `scripts/generate-icons.mjs` |
| Service worker with a safety-bounded caching strategy | `client/public/sw.js` |
| An offline fallback page | `client/public/offline.html` |
| Registration, update detection, and install-prompt handling | `client/src/pwa.ts` |
| The learner-facing update notice and install control | `client/src/components/PwaManager.tsx` |
| Manifest, icon, and Apple touch-icon links plus a `<noscript>` message | `client/index.html` |

**Offline boundaries, enforced by the worker and covered by tests:**

1. No `/api/` response is ever cached — every API route is authenticated.
2. No cross-origin request is ever intercepted — the NWC relays are out of reach.
3. No non-`GET` request is ever handled — a payment or invoice action cannot be replayed.
4. The worker never reads, stores, or transmits a wallet URI, secret, or preimage.
5. The offline page states plainly: *"Nothing was sent."* and that no account request, wallet
   request, payment, or invoice can complete offline.

**Caching strategy:** navigation is network-first so an online learner always receives the
current shell; hashed assets are cache-first because their name changes with their content;
on activation the asset cache is pruned to the files the current build references, so a stale
asset can never be served after a deployment.

**Update handling:** the worker does not call `skipWaiting()` on install. It waits until the
learner accepts the *"A new version of the Academy is ready"* prompt, and only then takes
over and reloads. Nothing reloads behind the learner's back.

### S7-C — Performance optimisation

| Change | Effect |
| --- | --- |
| Route-level code splitting with `React.lazy` | The NWC SDK, `nostr-tools`, and the BOLT 11 decoder left the initial bundle entirely |
| The wallet practice became its own chunk | 191.21 kB, fetched only when a learner opens `/wallet` |

| Bundle | Before the checkpoint | After S7 | Change |
| --- | --- | --- | --- |
| Initial JavaScript | 621.97 kB | **313.45 kB** | **−308.52 kB (−49.6 %)** |
| Initial JavaScript, gzip | 181.59 kB | **97.79 kB** | **−83.80 kB (−46.1 %)** |
| Initial CSS | 25.54 kB | 29.19 kB | +3.65 kB (reduced-motion and focus rules) |
| Initial CSS, gzip | 5.40 kB | 5.98 kB | +0.58 kB |

All figures are the decimal kilobytes Vite reports, so the two columns are directly
comparable.

The wallet chunk is now 195.79 kB (61.01 kB gzip) and is downloaded only on demand. **No
required SDK functionality was removed**: the wallet chunk still contains the complete NWC
client, and a test asserts it.

### S7-D — Accessibility

| Improvement | Where |
| --- | --- |
| A quiz result is no longer conveyed by border colour alone: the correct option and a wrong selection each carry a visually hidden text marker | `client/src/components/Quiz.tsx` |
| Per-question feedback is announced when it appears | `client/src/components/Quiz.tsx` |
| The quiz submit button reports its busy state | `client/src/components/Quiz.tsx` |
| Every field validation message is announced with `role="alert"` and wired to its control with `aria-invalid` and `aria-describedby` | `client/src/components/FormField.tsx` |
| The sign-in and registration forms use the shared field component, so both are consistent and correct | `Login.tsx`, `Register.tsx` |
| Reduced motion is honoured: no smooth scrolling, no spinning loaders, no transitions | `client/src/index.css` |
| The focus indicator covers links, buttons, inputs, textareas, selects, `summary`, and `[tabindex]`, and is removed only for pointer users | `client/src/index.css` |
| A high-contrast focus ring is kept in forced-colours mode | `client/src/index.css` |
| The lesson and playground breadcrumbs use list semantics and mark the current item | `Lesson.tsx`, `SimulationLayout.tsx` |
| Long words and code samples no longer force a horizontal scroll on a phone | `client/src/index.css` |

### S7-E — Security and reliability

| Change | Where |
| --- | --- |
| The production policy now states `worker-src 'self'` and `manifest-src 'self'` explicitly instead of relying on a fallback | `server/src/app.ts` |
| The relay allowlist in `connect-src` is unchanged — still exactly the two approved relays | `server/src/app.ts` |
| The application shell and the service worker are served `no-cache`, so a new deployment and a new worker are picked up immediately | `server/src/app.ts` |
| Content-hashed assets are served `max-age=31536000, immutable` | `server/src/app.ts` |
| Every API request is abandoned after 20 seconds instead of hanging forever, and the failure is reported in plain language | `client/src/lib/api.ts` |
| A network failure is reported as a network failure, not as a server error | `client/src/lib/api.ts` |
| The API origin is configurable for a split deployment, with the value documented as public | `client/src/lib/api.ts`, `client/.env.example` |

Authentication, session handling, authorisation boundaries, input validation, and the CSP
itself were reviewed and found to be sound. The wallet privacy guarantees are unchanged: the
S6 security tests still pass, and the new modules contain no storage API, no network call
beyond the academy API, and no console output.

### S7-F — Deployment readiness

| Deliverable | Where |
| --- | --- |
| A complete deployment and operations guide | `DEPLOYMENT.md` |
| Documented environment variables for the server, including `RENDER_EXTERNAL_URL` | `server/.env.example` |
| A client environment example that states that every `VITE_` value is public | `client/.env.example` |
| Health-check behaviour, including what a platform should do when `db` is `down` | `DEPLOYMENT.md` |
| Static routing and the SPA fallback, tabulated | `DEPLOYMENT.md` |
| Cookie, origin, and CSRF behaviour, and what a split deployment would require | `DEPLOYMENT.md` |
| A security-header reference table | `DEPLOYMENT.md` |
| A rollback procedure, including how the service worker converges after a rollback | `DEPLOYMENT.md` |
| The zero-budget constraint tabulated with the free tier used for each need | `DEPLOYMENT.md` |
| An explicit list of what still needs separate owner approval | `DEPLOYMENT.md` |

---

## 3. Files created and modified

### Created (7)

| File | Purpose |
| --- | --- |
| `client/public/manifest.webmanifest` | The installable web app manifest |
| `client/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon.svg` | The application icons |
| `client/public/sw.js` | The service worker |
| `client/public/offline.html` | The offline fallback page |
| `client/src/pwa.ts` | Registration, update detection, and install prompt |
| `client/src/components/PwaManager.tsx` | The update notice and install control |
| `client/src/components/FormField.tsx` | The shared form field and focus management |
| `scripts/generate-icons.mjs` | The dependency-free icon generator |
| `client/.env.example` | The client environment documentation |
| `server/test/s7-product-readiness.test.ts` | 22 S7 regression tests |
| `DEPLOYMENT.md` | The deployment and operations guide |

### Modified (14)

| File | Change |
| --- | --- |
| `client/src/App.tsx` | Route-level code splitting and the loading fallback |
| `client/src/components/Layout.tsx` | Responsive navigation, active-page state, PWA controls |
| `client/src/components/Quiz.tsx` | Text alternatives for colour-only results, announced feedback, busy state |
| `client/src/features/playground/SimulationLayout.tsx` | Breadcrumb list semantics and current-page marking |
| `client/src/index.css` | Reduced motion, focus visibility, forced colours, no horizontal overflow |
| `client/src/lib/api.ts` | Request timeout, network-failure handling, configurable API origin |
| `client/src/main.tsx` | Service worker registration after the first paint |
| `client/src/pages/Lesson.tsx` | Breadcrumb list semantics and current-page marking |
| `client/src/pages/Login.tsx` | The shared form field and focus management |
| `client/src/pages/Register.tsx` | The shared form field and focus management |
| `client/index.html` | Manifest, icons, Apple touch icon, `<noscript>` message |
| `server/src/app.ts` | CSP directives for the worker and manifest, cache boundaries |
| `server/.env.example` | Complete environment documentation |
| `server/test/wallet.test.ts` | Two brittle assertions rewritten to test the intent instead of exact utility class names |

### Unchanged

`PRD.md` and every frozen document · `server/src/**` apart from `app.ts` · all S1–S6 wallet
modules · `client/src/features/wallet/**` · every other page and component · both
lockfiles · every report from S1–S6 · `tools/s5-nwc-validation/**`.

---

## 4. Tests and validation results

### 4.1 New tests

`server/test/s7-product-readiness.test.ts` — **22 tests** covering:

| Area | Coverage |
| --- | --- |
| Code splitting | The entry chunk carries no NWC SDK, `nostr-tools`, or BOLT 11 decoder; the wallet route is its own chunk; the entry chunk stays under a 400 kB budget; every route uses `React.lazy` with a `Suspense` fallback |
| PWA | The manifest is valid and complete with a 192 and a 512 icon and a maskable icon; the shell links the manifest and icons; the icons are real PNGs of the right size; the worker never caches an API, cross-origin, or non-`GET` request and never handles wallet material; the worker waits for the learner; the offline page states that nothing was sent; the built output ships every artefact |
| Security headers | The policy allows the worker and the manifest only from this origin; the relay allowlist did not grow; the shell and worker are revalidated and hashed assets are immutable |
| Accessibility | The quiz never relies on colour alone; validation messages are announced; reduced motion is honoured; every focusable control keeps a visible indicator; the navigation is labelled and marks the current page |
| Deployed shape | Every built asset and every route chunk is served with a 200; a client-side route returns the application shell; the worker and the manifest are served with the right content types |

### 4.2 Automated verification

```
$ npm run build          # build first: two test files assert against the built output
$ npm run typecheck      # server + client
$ npm --prefix server test
ℹ tests 305
ℹ pass 305
ℹ fail 0
```

| Check | Result |
| --- | --- |
| Full test suite | **305 pass, 0 fail** (283 at the checkpoint, +22 new) |
| Server typecheck | **Clean** |
| Client typecheck | **Clean** |
| Production build | **Success** — 118 modules, ~1.2 s |
| PRD SHA-256 | `PRD.md` `1e73e32c…` unchanged; `PRD-ORIGINAL.txt` `7a44c87e…` unchanged |
| Live wallet operation | **None.** No NWC method was executed against a real relay or wallet. |
| Git operation | **None during S7.** The S7 changes are uncommitted, as instructed. |
| Database operation | **None.** No schema change, no migration, no seed, no write. |
| Deployment | **None.** Nothing was deployed, published, or pushed. |

### 4.3 Checks that were performed against a running server

A live instance of the built application was started locally and verified over HTTP:

| Check | Result |
| --- | --- |
| `Content-Security-Policy` | Contains `worker-src 'self'` and `manifest-src 'self'`; the relay allowlist unchanged |
| `/manifest.webmanifest` | 200, `application/manifest+json` |
| `/sw.js` | 200, `text/javascript`, `cache-control: no-cache` |
| `/icons/icon-192.png` | 200, `image/png` |
| `/offline.html` | 200 |
| `/assets/*` | 200, `cache-control: public, max-age=31536000, immutable` |
| `/courses` | 200, the application shell |

### 4.4 Browser and device testing — NOT performed

**No browser was attached to this session, so no browser-based or device-based test was
run.** The following remain outstanding and must be performed by the owner or a session with
a browser attached:

- Installability on Android Chrome and desktop Chrome (the "Add to home screen" prompt).
- The service worker's install, offline fallback, and update prompt in a real browser.
- A visual pass over mobile, tablet, and desktop widths.
- A screen-reader pass (TalkBack or NVDA) over the quiz, the forms, and the wallet dashboard.
- A real keyboard-only pass over the whole navigation.
- Lighthouse or an equivalent measurement in a real browser.

The automated checks above confirm the *shape* of the application, not its rendered
appearance on a device.

---

## 5. PWA implementation status

| Requirement | Status |
| --- | --- |
| Valid web app manifest | **Done** |
| Application name and short name | **Done** — "KAOS Bitcoin Academy" / "KAOS Academy" |
| Appropriate application icons | **Done** — 192, 512, maskable 512, SVG favicon, generated from source |
| Theme and background colours | **Done** — `#17140f`, matching the application surface |
| Standalone display configuration | **Done** — `standalone`, with `minimal-ui` and `browser` fallbacks |
| Service worker registration | **Done** — after the first paint, production only |
| Installability | **Implemented**; the browser prompt still needs a device check |
| Appropriate offline fallback | **Done** — `offline.html`, stating that nothing was sent |
| Safe caching strategy | **Done** — network-first navigation, cache-first hashed assets, deployment-aware pruning, no API, cross-origin, or non-`GET` caching |
| Application update detection and user-friendly handling | **Done** — the new version waits for the learner's acceptance |

---

## 6. Outstanding blockers and limitations

1. **Browser and device testing could not be performed.** No browser is attached to this
   session. The list in §4.4 is outstanding.
2. **S7 changes are not committed.** The instruction was not to stage or commit during S7
   without separate owner approval, so the whole S7 change set is sitting in the working
   tree on top of the S6 checkpoint.
3. **The session store is the in-process `MemoryStore`.** A multi-process deployment needs a
   shared store. This is a configuration decision, not a code change, and it is documented.
4. **A split deployment still needs a code change.** The session cookie is `sameSite=lax`,
   so a cross-origin client cannot receive it. Changing that policy requires an explicit
   approval and a matching CORS configuration.
5. **The AI Tutor still needs an OpenRouter key** for the tutor to leave its disabled state.
   It is optional and free-tier only.
6. **The service worker cache version is a manual constant.** `CACHE_VERSION` in
   `client/public/sw.js` must be bumped by hand when a change requires the old caches to be
   dropped. The pruning step makes this rarely necessary, but it is not automatic.
7. **The icon generator draws a geometric mark.** It is reproducible and dependency-free, but
   it is not a designer-produced asset. A learner-facing brand review is still advisable.

## 7. Decisions requiring owner approval

| Decision | Why it needs approval |
| --- | --- |
| Commit and push the S7 change set | S7 was instructed not to stage or commit without separate approval |
| Choose a hosting platform and a domain | A purchase or registration, and a DNS change |
| Set `MONGODB_URI` and `SESSION_SECRET` in the production environment | Real credentials |
| Change the session cookie policy for a split deployment | A security-relevant change |
| Configure a shared session store for a multi-process deployment | An architecture change |
| Supply an `OPENROUTER_API_KEY` | Enables an external service, even on a free tier |
| Run the first live deployment | An external action |

---

## 8. Reproduction commands

```sh
cd /data/data/com.termux/files/home/kaos-bitcoin-academy

# Build first: static.test.ts and s7-product-readiness.test.ts assert against client/dist
npm run build

npm run typecheck                 # server + client
npm --prefix server test          # 305 tests

# Regenerate the application icons
node scripts/generate-icons.mjs

# PRD integrity
sha256sum PRD.md PRD-ORIGINAL.txt
```

---

**End of report.**
