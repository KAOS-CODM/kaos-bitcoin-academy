# KAOS Bitcoin Academy — Architecture Discovery & Feasibility Assessment

**Report type:** Phase 2 — Read-only architecture discovery (no implementation)
**Assessment date:** October 30, 2026
**Author role:** Senior software architect (assessment only)
**Governing document:** `PRD.md` (root), authoritative and immutable
**Report status:** Proposal for project-owner review. Nothing in this report is implemented.

---

## 0. How to read this report

Every substantive claim is tagged. The tags matter, because this document mixes specification, measured facts and my opinion.

| Tag | Meaning |
|---|---|
| **[PRD]** | A requirement or constraint that comes from `PRD.md` and may not be changed by this report. |
| **[VERIFIED]** | Checked on this device or against a primary source on October 30, 2026. The check is stated. |
| **[REC]** | Architectural recommendation. Not binding. |
| **[ASSUMPTION]** | Believed true, not verified. Must be tested before it is relied on. |
| **[DECISION]** | Requires explicit project-owner approval before implementation. |
| **[GAP]** | Something the PRD requires that this design does not yet fully satisfy, or where risk remains. |

**Scope discipline.** This assessment covers only what `PRD.md` requires. It does not add subscriptions, exchanges, custody products, trading, tokens or community features. Where the PRD is technically hard, the difficulty is stated rather than designed away.

**Authority.** No requirement was changed, softened or reinterpreted. Where I recommend something the PRD leaves open (wallet provider, hosting, session strategy), that is flagged, not assumed.

---

## 1. Executive architecture assessment

**Conclusion:** the PRD's proposed stack is sound for the hackathon, and a complete P0 MVP is achievable by November 20, 2026 **if and only if** the wallet and AI spikes happen in the first three days rather than in the integration window. The PRD already warns about this (section 18, "Critical development rule"); this assessment confirms the warning is correct and gives it a schedule.

Five findings drive everything else:

1. **The wallet is the only genuinely risky deliverable.** Everything else — auth, courses, lessons, quizzes, progress, playground, dashboard — is routine CRUD plus browser-side simulation with well-understood failure modes. FR-009/FR-010 and AC-012/AC-013/AC-014 are the only requirements where a third party (a learner's wallet, a relay, a funded node) can fail through no fault of the code. **[VERIFIED]** by reading NIP-47: the protocol is still marked `draft`/`optional` upstream, so compatibility variance is a real risk, not a hypothetical one.

2. **NWC is the better fit for the PRD's stated custody position, but it is the riskier build.** LNbits is easier to make work and worse to defend. The PRD's provisional preference (NWC first, LNbits as fallback) is the right call, and this assessment endorses it as a *test-then-decide* recommendation, not a final choice. **[DECISION D-01]**

3. **Simulations do not need any Bitcoin infrastructure.** All six playground exercises in PRD §5.1 Module B can run entirely in the browser with WebCrypto plus one small pure-JavaScript secp256k1 library. This removes a whole class of cost, latency and failure from the MVP and makes AC-008/AC-009 straightforward. **[REC]**

4. **The Termux-only workflow works for writing code but cannot carry CI-grade testing or the production build.** Android/Bionic breaks prebuilt native binaries and Playwright browsers. The workflow stays Termux-first; the *verification and build* steps move to a hosted runner. This is a concrete technical reason, not a preference. **[VERIFIED]** environment facts in §13.

5. **Free hosting introduces a demo-day failure mode nobody expects.** **[VERIFIED]** Render free web services spin down after 15 minutes of idle and take about a minute to wake, and free instances have an ephemeral filesystem. A sleeping backend also means LNbits webhooks can be missed. The architecture must therefore treat *polling with reconciliation* as the primary payment-verification mechanism and webhooks as an optimisation, and the demo must pre-warm the service. This directly affects AC-014/AC-015.

**Headline risk statement:** the MVP is not at risk from the frontend, the database, or the curriculum. It is at risk from (a) an unproven wallet path and (b) cold-start latency during a judged demonstration. Both are mitigable now and neither is mitigated by writing more application code.

---

## 2. PRD requirements and constraints summary

### 2.1 Non-negotiable constraints extracted from `PRD.md`

| # | Constraint | PRD location | Architectural consequence |
|---|---|---|---|
| C1 | Authentication, catalogue, lessons, quizzes, progress, playground, AI tutor, wallet connect, guided payment, dashboard are **P0** | §7 (FR-001…FR-011) | All ten must be demonstrable; P1/P2 may not delay them |
| C2 | P1/P2 must not delay the MVP | §7 | Feature flags / routing prepared but unbuilt |
| C3 | Mobile-first, low bandwidth, Android phones, graceful network failure | §8.3, §15 | Bundle budget, PWA shell, explicit offline states |
| C4 | Lightweight PWA preferred | §8.3 | `vite-plugin-pwa`, precached shell |
| C5 | Simulated activity must be labelled; never represented as a real transaction | §5.1 Module B | Route-level and component-level simulation markers (AC-009) |
| C6 | AI tutor uses curated material, must not invent tx data, financial advice, protocol specs or wallet guarantees | §5.1 Module C, §13 | Server-side grounding, refusal policy, output filtering |
| C7 | A **real** Lightning wallet integration, guided payment completed **and verified** | §5.1 Module E, §25 | Third-party dependency; must be proven early |
| C8 | Never request/store seed phrases or private keys | §5.1 Module E, §12 | No field exists for them anywhere; enforced by schema review |
| C9 | Wallet service isolated from the general learning API | §9.2 | Separate module, router, credentials and rate limits |
| C10 | Payment success only when the actual network result is verified | §11, §13 | Verification state machine, not HTTP 200 |
| C11 | Security is first-class, not final polish | §13 | Security controls designed into each component, not appended |
| C12 | Public deployment + repository documentation | §21, AC-017, AC-018 | Hosting choice is a P0 dependency |
| C13 | Wallet integration validated early | §18 | Wallet spike in days 1–3 |
| C14 | No seed phrases, no custody of learner funds, no exchange, no trading | §12, §16 | Excludes several "easy" wallet shortcuts |

### 2.2 Priority map

- **P0 (must work):** FR-001 to FR-011 — 11 requirements.
- **P1 (only if P0 complete):** FR-012, FR-013.
- **P2 (explicitly deferrable):** FR-014, FR-015, FR-016.

FR-012 (XP/achievements) is P1 but is also named in PRD §5.1 Module D alongside P0 quiz features. Reading them together, gamification schema and XP accrual should be *designed* in the data model from day one (so it is not a migration later) while the *UI* stays P1. This is a sequencing recommendation, not a scope change.

### 2.3 Non-goals that constrain design

No self-built wallet, no exchange, no holding learner funds, no investment advice, no trading, no token, no full Nostr social layer, no instructor management, no subscriptions, no app-store publishing, no multi-language localisation, no production-scale Lightning infrastructure **[PRD §16]**.

---

## 3. Proposed high-level architecture

```
                        LEARNER (mobile-first PWA)
                                  |
                     HTTPS / JSON  (no wallet secrets)
                                  v
                 +----------------------------------+
                 |      STATIC FRONTEND (CDN)       |   React + TS + Vite + Tailwind
                 |  app shell, routes, simulations  |   React Router, Workbox
                 +----------------------------------+
                                  |
                                  v
        +------------------------------------------------------+
        |                  EXPRESS API (Node.js)               |
        |  auth | courses | progress | quizzes | tutor | wallet |
        |------------------------------------------------------|
        | middleware: helmet, cors, rate-limit, zod validation, |
        |             auth guard, error handler, request id     |
        |------------------------------------------------------|
        | services/ai   services/learning   services/wallet     |
        +------------------------------------------------------+
             |                  |                    |
             v                  v                    v
      MongoDB Atlas      OpenRouter API        Wallet adapter
      (Mongoose)         (server-side key)     (NWC | LNbits)
             ^                  |                    |
             |                  |                    v
      (no direct DB        (no client key)     Lightning Network
       from client)                              (real sats)
```

**Three boundaries that carry most of the risk and therefore get most of the design attention:**

1. **Browser ↔ API.** The browser never holds an AI key, a wallet secret, an admin key, or another learner's data. Every write is authorised server-side by session identity, never by an ID supplied in the request body.
2. **API ↔ wallet.** A walled module. Own env vars, own rate limit, own audit log, own error vocabulary. A bug in the learning API must not be able to move money. **[PRD §9.2]**
3. **Simulation ↔ reality.** A visual and structural boundary, not a styling afterthought. Simulated artefacts live on dedicated routes and never reuse real invoice, address or balance components without an explicit "SIMULATION" variant. **[PRD §5.1, AC-009]**

### 3.1 Deployment shape (recommended, not yet commissioned)

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Static hosting on a CDN (Cloudflare Pages / Netlify / Vercel) | Free, global, no cold start; PWA caching works best from a CDN **[REC]** |
| API | Single Node service on a free/cheap PaaS (Render free, or $7 Starter for the demo week) | Cold-start trade-off analysed in §12 **[DECISION D-05]** |
| Database | MongoDB Atlas free cluster | Managed, no Docker on device required **[VERIFIED]** free = 512 MB, 100 ops/s |
| AI | OpenRouter, server-side | PRD names it; one key, many models, easy fallback **[REC]** |
| Lightning | Learner's own wallet over NWC (if selected) | No custody, no funding infrastructure **[DECISION D-01]** |

---

## 4. Frontend architecture

### 4.1 Stack suitability

React + TypeScript + Vite + Tailwind + React Router are named in the PRD **[§9.1]** and are appropriate: static-first SPA, small runtime, no server-side rendering requirement anywhere in the PRD, and a build that a CDN can host. I recommend keeping all six exactly as specified.

- **React 19 + TS strict mode.** TS strictness is what prevents the most common beginner-project defect class here: `undefined` progress values rendered as `NaN%`. Enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` from day one — retrofitting is painful.
- **Vite.** Fast dev server, static output. **[ASSUMPTION]** Vite's Rollup native binary may not resolve on Android/Bionic (§13). If so, build in CI; do not switch frameworks over it.
- **Tailwind.** Matches the PRD palette directly via CSS variables, keeps CSS small, avoids a component library's bundle weight. **[REC]** Avoid a heavyweight UI kit (MUI/Chakra) — it fights the "educational, not financial" design direction and inflates the mobile bundle.
- **React Router (v6/v7 data router).** Route-level code splitting is the main tool for the mobile performance requirement.

### 4.2 Routing and page organisation

Aligned to the PRD's `features/` structure **[§9.3]**:

```
/                        landing (public, onboarding entry)
/login  /register        auth
/dashboard               FR-011 learner dashboard
/courses                 FR-002 catalogue
/courses/:courseId       course overview + lesson list
/courses/:courseId/lessons/:lessonId   FR-003 lesson reader
/quizzes/:quizId         FR-005
/playground              FR-007 hub
/playground/:simId       individual simulation (each carries a SIMULATION banner)
/tutor                   FR-008 chat
/wallet                  FR-009 connect + status
/wallet/pay/:sessionId   FR-010 guided payment
*                        404
```

Rules:
- Public: `/`, `/login`, `/register`. Everything else behind an auth guard that redirects to `/login?next=…`.
- Each route group is lazy-loaded; the landing page must not pull the tutor, playground or wallet chunks.
- The lesson route is the most-visited route on a slow phone; keep its chunk free of quiz, tutor and wallet code.

**Alternatives considered:** Next.js (SSR/SEO, but adds a server runtime the PRD does not ask for and complicates static CDN hosting); a single-page tabbed shell without a router (simpler, but breaks deep links, the resume-learning requirement and AC-003's per-page responsive testing). Both rejected.

### 4.3 Mobile-first responsive design

- Design at 360×640 first; breakpoints only upward (sm/md/lg). No desktop-first downscaling.
- Touch targets ≥ 44×44 px; lesson body 16–18 px with 1.6 line-height.
- **Contrast is already compliant [VERIFIED]** — computed WCAG ratios for the PRD palette:

| Pair | Ratio | AA text (4.5:1) |
|---|---|---|
| `#FFFFFF` on `#17140F` | 18.37:1 | pass |
| `#A8A29E` on `#17140F` | 7.28:1 | pass |
| `#F5B942` on `#17140F` | 10.41:1 | pass |
| `#FDE68A` on `#17140F` | 14.75:1 | pass |
| `#17140F` on `#F5B942` | 10.41:1 | pass |

This satisfies "adequate contrast" **[§15]** without palette changes. The remaining accessibility risk is *non-colour signalling* — quiz correct/incorrect, payment success/failure and simulation badges must carry an icon and a text label, not just amber-vs-grey.

- Images: SVG diagrams (small, crisp) plus AVIF/WebP at explicit dimensions; nothing above ~80 KB per lesson asset.

### 4.4 PWA and offline

Recommended: `vite-plugin-pwa` (Workbox) with:
- **Precache** app shell + fonts + landing/lesson chrome.
- **Stale-while-revalidate** for course/lesson JSON.
- **Network-only** for `/api/tutor/*`, `/api/wallet/*`, `/api/auth/*` — never cache payment or auth responses.
- Explicit offline UI: "You're offline — showing the last lesson you opened. Progress will not be saved until you reconnect."

**Deliberately rejected: offline write queueing of lesson completion.** It looks user-friendly but creates a merge conflict on `completedLessons` and puts AC-004 (progress persisted) at risk of duplicate or lost writes. The PRD requires *graceful handling of temporary network failures* **[§8.3, §15]**, not offline-first authoring. Cached reading + honest messaging satisfies the requirement with far less risk. **[DECISION D-07]** if the owner wants offline completion anyway.

### 4.5 State management

- **Server state:** TanStack Query (caching, retries, background refetch, loading/error states the NFRs demand).
- **Session state:** one small auth context (`/api/auth/me` as the source of truth).
- **Local UI state:** `useState`/`useReducer`.

**Rejected:** Redux Toolkit (ceremony with no requirement behind it); Zustand (fine, but Query already covers the server cache, which is 90% of the state here). Keep the dependency count low — every package is a native-build risk on Termux (§13).

### 4.6 Frontend/backend communication

- Single axios/fetch wrapper in `services/api.ts`: base URL from env, `credentials: 'include'`, JSON only, centralised 401 → redirect, 429 → "slow down" toast, 5xx → retryable error state.
- **Typed contracts.** The PRD requires "documented API contracts" **[§15]**. Recommend one shared `types/api.ts` imported by client and server (a small `shared/` folder or a workspace package). Zod schemas on the server double as the runtime source of truth; infer TS types from them.
- **No wallet secret, invoice secret or AI key ever crosses to the browser** except the minimum the flow requires (an NWC URI is entered *by* the user in the browser and posted once to the server; it is never returned by the API, never logged).

---

## 5. Backend architecture

### 5.1 Node.js + Express suitability

Express is named in the PRD **[§9.1]** and is sufficient. Recommend **Express 5** (stable; async errors propagate to the error handler without a wrapper). If Express 4 is pinned instead, every async handler needs `try/catch` or `express-async-errors` — a small but real defect source.

**Alternatives considered:** Fastify (faster, schema-first, better defaults — but not what the PRD specifies, and no requirement here is throughput-bound); NestJS (too much structure for a 3-week MVP, and it obscures the boundary design the PRD cares about); serverless functions (would split the wallet module across many small functions and complicate rate limiting). Express retained.

### 5.2 Layering and boundaries

```
routes/         URL -> controller, no logic
validators/     zod schemas (body, params, query)
controllers/    HTTP in/out only; no business rules
services/       business logic, transactions, verification
models/         Mongoose schemas + indexes
middleware/     auth, rate limit, error, request-id, cors
config/         env parsing + validation at boot
```

Rules: controllers never touch Mongoose directly; services never read `req`; configuration is parsed once at boot and fails fast on a missing secret. This is what makes the "wallet isolated from the learning API" requirement **[§9.2]** structurally true rather than a naming convention.

### 5.3 Authentication and authorisation

Two viable designs; the PRD requires secure sessions/tokens and `/api/auth/logout` **[§9.1, §11]**.

| Option | Mechanics | Pros | Cons |
|---|---|---|---|
| **A. Server-side sessions** (recommended) | Opaque random ID in `httpOnly` cookie; session doc in Mongo via `connect-mongo`; TTL index | Trivial revocation (`logout`, "revoke all"), no token replay window, no CSRF token needed with `SameSite=Lax` + origin check | One DB read per request (cacheable), needs session cleanup |
| B. JWT access + refresh | 15-min access JWT in `httpOnly` cookie, rotating refresh token in DB | Stateless reads | Refresh rotation, reuse detection and revocation become code you must get right |

**Recommendation A** for a hackathon: fewer moving parts, and "logout actually logs out" is easier to prove. `bcrypt`-class hashing via **`node:crypto` `scrypt`** is preferred over a native `bcrypt` module to avoid the aarch64 build problem (§13). **[DECISION D-02]**

Password rules: minimum length 10 (no composition theatre), breach-list check optional, constant-time compare, generic error messages ("email or password is incorrect").

Authorisation rules:
- Ownership is always derived from the session, never from a body/param ID. `userId` is never accepted from the client.
- Every progress/attempt/conversation/payment document is queried with `{ _id, userId: req.user._id }` — a missing user filter is the single most likely data-leak defect in this app.
- Admin-only routes (none required for P0) would use a role claim; do not build an admin UI **[PRD §16]**.

### 5.4 Validation and error handling

- **Zod** at the edge for every endpoint: body, params, query. Reject unknown keys (`.strict()`) to prevent mass-assignment.
- Central error middleware maps `AppError(status, code, publicMessage)` → JSON; unknown errors → 500 with a generic message and a request-id only. **No stack traces, no Mongo error text, no keys in responses** **[PRD §13]**.
- Stable error envelope `{ error: { code, message } }` so the frontend can branch on `code` rather than prose.

### 5.5 Rate limiting and abuse prevention

Per-IP *and* per-user, endpoint-class specific:

| Class | Limit (initial) | Rationale |
|---|---|---|
| `/api/auth/login`, `/register` | 5/min/IP, 20/hour/IP | Credential stuffing |
| `/api/tutor/chat` | 10/min/user, 100/day/user | Cost control **[PRD §13]** |
| `/api/wallet/*` | 30/min/user; 5 payments/hour/user | Money-adjacent |
| Global API | 120/min/IP | Baseline |

Use `express-rate-limit` with the Mongo store for multi-instance correctness (or in-memory if single instance, documented). Return 429 with `Retry-After`.

### 5.6 API versioning and maintainability

The PRD gives exact paths under `/api/...` **[§11]**. **Recommendation:** implement them exactly as written and defer versioning. If a breaking change is ever needed, mount a `/api/v2` router rather than mutating `/api`. Adding `/api/v1` now would contradict the PRD's stated paths for no benefit — so do it only with approval. **[DECISION D-03]**

Other maintainability measures: request-id propagation, structured logs (pino) that redact `cookie`, `authorization`, `secret`, `nwc`, `invoice`, `preimage`; OpenAPI generated from the zod schemas (satisfies AC-018's documentation expectation alongside a hand-written `README`).

### 5.7 Idempotency and payment safety

- `POST /api/wallet/payments` accepts an `Idempotency-Key`; repeat within 10 minutes returns the original record, not a second payment.
- The server stores intent (`pending`) **before** calling the wallet, then reconciles. A crash mid-payment must leave a reconcilable record, never a silent one.
- Status machine: `pending → settling → succeeded | failed | expired | unknown`. `unknown` is a first-class state (relay timeout, ambiguous LNbits response) and the UI must show it honestly rather than guessing **[PRD §11, AC-015]**.

---

## 6. Database architecture

### 6.1 MongoDB + Mongoose suitability

Appropriate here: document-shaped curriculum content, no complex joins, no transactional money ledger of our own (the wallet holds the truth; we store references). **[PRD §9.1]** names it, and Atlas's free tier removes the "run a database on the phone" problem entirely. **[VERIFIED]** free cluster = 512 MB storage, ~100 ops/s, 500 connections, auto-pauses after 30 days of inactivity; one free cluster per project.

**Alternatives considered:** PostgreSQL (better for strict relational integrity and reporting — but not specified, and the syllabus content is naturally nested); SQLite/libSQL on-device (free and offline, but cannot serve a public deployment and would violate the "public accessible" requirement). MongoDB retained.

**Mongoose vs native driver:** Mongoose adds schema validation, middleware and population. Keep it (PRD names it), but disable `autoIndex` in production and create indexes explicitly at deploy time so they are reviewable.

### 6.2 Collections and indexes

| Collection | Key fields | Indexes | Notes |
|---|---|---|---|
| `users` | email (lowercased), passwordHash, displayName, role, createdAt, updatedAt | `{email:1}` unique | No seed/privkey fields may ever exist |
| `courses` | slug, title, description, level, modules[], published, order | `{slug:1}` unique, `{published:1, order:1}` | `modules` embedded: bounded, authored, no per-user growth |
| `lessons` | courseId, slug, title, content (blocks), order, learningObjectives[], estimatedDuration | `{courseId:1, order:1}` unique, `{courseId:1, slug:1}` unique | Content as structured blocks (heading/paragraph/list/diagram/check), not raw HTML |
| `usercourses` (progress) | userId, courseId, completedCount, completionPercentage, lastAccessedAt, lastLessonId | `{userId:1, courseId:1}` unique | Denormalised counter for dashboards |
| `lessoncompletions` | userId, lessonId, courseId, completedAt | `{userId:1, lessonId:1}` unique; `{userId:1, courseId:1}` | Idempotent completion (see 6.3) |
| `quizzes` | lessonId, courseId, questions[], passingScore | `{lessonId:1}`, `{courseId:1}` | Questions embedded (bounded) |
| `quizattempts` | userId, quizId, score, answers[], passed, completedAt | `{userId:1, quizId:1, completedAt:-1}` | Append-only |
| `achievements` | key, title, description, criteria, points | `{key:1}` unique | Seeded by content script |
| `userachievements` | userId, achievementId, earnedAt | `{userId:1, achievementId:1}` unique | Prevents duplicate awards |
| `aiconversations` | userId, lessonId?, title, createdAt, lastMessageAt | `{userId:1, lastMessageAt:-1}` | Messages in separate collection (6.3) |
| `aimessages` | conversationId, role, content, tokens, createdAt | `{conversationId:1, createdAt:1}` | Bounded growth per document |
| `walletconnections` | userId, provider, encryptedSecret (envelope), permissions, status, createdAt, revokedAt | `{userId:1}` unique-partial, `{status:1}` | **Separate collection — PRD §10** |
| `payments` | userId, provider, direction, paymentHash, invoiceRef, amountMsat, status, preimageHash, verifyAttempts, createdAt, verifiedAt | `{paymentHash:1}` unique; `{userId:1, createdAt:-1}`; `{status:1, createdAt:1}` (reconciler) | Unique payment hash = replay protection |
| `sessions` | sid, userId, expiresAt | TTL on `expiresAt` | If option A chosen |

### 6.3 Data-model decisions that would create migration pain later

These are the ones I would fight to get right before the first line of application code. Each is a refinement the PRD explicitly permits ("The following are logical entities. Exact schemas and relationships will be finalized during implementation" **[§10]**).

1. **`UserProgress.completedLessons` as an embedded array vs a `lessoncompletions` collection.** The PRD's logical model shows the array. Physical reality: an array of IDs with a unique compound index is either a growing document (16 MB limit headroom is fine here, but ordering and idempotency get fiddly) or a separately indexed set. **Recommendation:** separate collection with a unique `(userId, lessonId)` index; derive `completedCount` on `usercourses`. Idempotent by construction: completing twice is a no-op, not a duplicate. Moving from the array to a collection later is a data migration plus a code rewrite; doing it now is free. **[DECISION D-04]**

2. **`AIConversation.messages` as an embedded array.** PRD shows `messages` inside the conversation. Unbounded arrays are the classic MongoDB document-growth trap: a long tutor conversation eventually hits the 16 MB limit and every append rewrites the document. **Recommendation:** `aimessages` as its own collection, capped context window (last 12 messages or ~4k tokens) assembled server-side. Trivial now, painful after real usage.

3. **Wallet credentials in the user document.** The PRD forbids it explicitly **[§10]**: "Sensitive connection credentials must never be stored as ordinary unencrypted user fields." Design it correctly the first time: separate `walletconnections`, secret encrypted (AES-256-GCM, key from env/KMS), never selected by default in queries (`select: false`), never returned by any endpoint, deleted on `DELETE /api/wallet/connect`. A retroactive encryption migration is one of the worst possible late-stage tasks.

4. **Storing raw invoice/preimage strings.** Preimages are proofs of payment but also payment secrets; bolt11 invoices contain payment hashes and node pubkeys. Store the **hash** of the preimage (to compare) and the invoice only as long as needed for the flow; never log either whole. If a preimage is needed for an audit trail, store it encrypted and mark it sensitive. Cheap now.

5. **Timestamps and status as free strings.** Use `createdAt/updatedAt` consistently and an enum for every status. A `status: String` that accumulates `"success"`, `"succeeded"`, `"SUCCESS"`, `"paid"` across three modules is a migration waiting to happen, and it breaks AC-006/AC-015 interpretation.

6. **Course/lesson identity by `_id` in URLs vs slug.** The PRD's API uses `:courseId`/`:lessonId`. Accepting a slug as well as an ObjectId costs nothing now and avoids breaking every shared link if IDs change during reseeding. Recommend: store both, route on the identifier that parses.

### 6.4 Relationships and integrity

MongoDB has no foreign keys, so integrity is enforced in the service layer plus these rules: deletes are soft where history matters (payments never deleted), orphan lessons are prevented by seeding in one atomic script, and every reference-carrying write validates the parent first. A nightly integrity check is optional and out of P0 scope.

### 6.5 Retention and privacy

- Collect email + display name only **[PRD §13 "collect only necessary learner information"]**.
- No PII in logs; redact request bodies for auth, tutor and wallet routes.
- Conversations: retain while the account exists; support deletion; do not embed learner email in prompts **[PRD §13]**.
- Payments: retain hash + amount + status for the demo narrative; no personal data attached beyond `userId`.
- Atlas free tier has no point-in-time recovery; **backup = scheduled `mongodump` to a private repo/object store or a documented export script**. This matters: losing the seeded curriculum the night before submission is unrecoverable otherwise.

---

## 7. AI tutor architecture

### 7.1 Provider integration

OpenRouter is named in the PRD **[§9.1]** and is a good fit: one key, OpenAI-compatible API, many models, per-request routing. **[REC]** Keep the client behind a thin `AiProvider` interface so a direct provider or a local model can replace it without touching routes.

- All calls originate server-side. The key lives in `OPENROUTER_API_KEY`; the browser has no AI credential of any kind **[PRD §13]**.
- Request shape: `POST /api/tutor/chat` → server builds messages → provider → sanitise → persist → return.
- Timeout 20 s, `max_tokens` ≤ 500, temperature 0.2–0.4, single retry on 5xx with jitter, then a clean failure message.

### 7.2 Model selection and fallback

**[REC]** Configure primary + fallback in env (`AI_MODEL_PRIMARY`, `AI_MODEL_FALLBACK`), chosen at integration time by cost and quality on a 20-prompt evaluation set built from the curriculum. Fallback chain: primary → secondary → deterministic "the tutor is unavailable, here is the lesson passage that covers this" response. That last step matters: it keeps AC-010/AC-011 demonstrable even if the provider is down.

**Explicit non-goal:** don't auto-select the cheapest model per request. Predictable behaviour beats marginal savings for a judged demo.

### 7.3 Grounding and context

The PRD requires curated material as the primary knowledge source **[§5.1 Module C]**. For eight courses of authored content, **deterministic retrieval beats vector search**: the tutor request carries `lessonId` (and optional `courseId`), and the server injects that lesson's content plus its learning objectives and the course-level glossary. No embeddings, no vector index, no chunking pipeline — none of which the PRD asks for, all of which add failure modes.

Recommended prompt assembly:
1. System policy (role, scope, refusal rules, tone, citation-to-lesson instruction).
2. Retrieved lesson context (marked as authoritative).
3. Recent conversation turns (last 12, trimmed to a token budget).
4. Learner message (marked as untrusted).

**Cost control:** per-user daily message cap, global monthly budget guard (count tokens in `aimessages`), and a kill switch env var that disables the tutor and serves the fallback. **[PRD §13 "request rate limits"]**

### 7.4 Educational accuracy and misleading Bitcoin information

- The tutor must answer from the injected lesson content where it exists, and say so plainly where it does not: "This isn't covered in the lesson you're reading; here's the general idea, and you should verify it" — with the uncertainty surfaced in the UI, not buried **[§5.1 "clear uncertainty handling"]**.
- Hard refusals in the system prompt: no price predictions, no investment advice, no seed phrase handling, no "send your coins here", no claims that a wallet integration removes risk **[§5.1, §12]**.
- **Output filter** before persistence: reject/redact strings matching private-key or seed-phrase shapes (`xprv`, `lntb…`, 12/24-word BIP39 runs, `nsec1…`), any URL not on an allowlist, and any instruction to share credentials. Log the *fact* of a filter hit, never the content.
- Every tutor answer that touches wallet operation ends with a fixed safety line, rendered by the frontend (not generated by the model, so it cannot be omitted).

### 7.5 Prompt injection and unsafe instructions

- Learner text is data, never instructions. System prompt states precedence explicitly and repeats it after the learner turn.
- Strip/neutralise role markers (`system:`, `assistant:`) and instruction-looking patterns; cap input at 2,000 characters **[§13 "input size limits"]**.
- The model has no tools and no database access. It cannot read another learner's data even if instructed to — this is the strongest available mitigation and it is architectural, not prompt-based.
- Do not send the learner's email, IP or any identifier in the prompt **[§13 "no unnecessary personal information in prompts"]**.

### 7.6 Known gaps

**[GAP]** AC-010 ("answers questions using educational context") is provable by showing the injected lesson id and content in a server log/test. AC-011 ("handles unsupported questions safely") needs a written negative-test set — at least 15 adversarial prompts (seed phrase request, price prediction, "ignore previous instructions", other learners' data, fake protocol claims) run before submission. That test set should be authored in the testing phase, not improvised on demo day.

---

## 8. Bitcoin playground architecture

### 8.1 Browser vs backend split

| Simulation **[PRD §5.1 Module B]** | Runs where | Why |
|---|---|---|
| 1. Wallet creation (fictional data) | Browser | Deterministic demo keys; nothing to persist |
| 2. Public/private key relationships | Browser | Pure secp256k1 maths in JS |
| 3. Transaction construction | Browser | Serialise a fake UTXO set; no network |
| 4. Broadcasting / confirmation concepts | Browser (simulated timeline) | Must **not** touch the network — simulation only |
| 5. Blockchain block formation | Browser | SHA-256 via WebCrypto |
| 6. Mining / proof-of-work | Browser **Web Worker** | CPU-bound loop must not freeze the UI |

**Recommendation: all six are client-side. No backend endpoint is required for FR-007.** Backend involvement would add latency, cost and a false impression of network interaction, and would create a path where "simulated" data could be confused with real data.

### 8.2 Libraries and accuracy

- **secp256k1:** `@noble/secp256k1` — pure JS, audited, no native build (important on Termux). ~10–15 KB gzipped. **[REC]**
- **Hashing:** `crypto.subtle.digest('SHA-256', …)` — native, zero dependency. Double-SHA256 for txids and block hashes is correct Bitcoin behaviour.
- **Mining demo:** Web Worker iterating nonces against a difficulty target (leading zero bits), with a live hashrate estimate and an explicit "this is deliberately slowed down for teaching" note.
- **Transaction construction:** fake UTXOs → version/inputs/outputs/locktime → serialise → txid. Show the fields the learner is meant to understand (prevout, scriptSig stand-in, value, fee = inputs − outputs). Keep script semantics simplified but **labelled as simplified** — accuracy requirement **[§5.1 "Accuracy before simplicity" is PRD §3 principle 3]**.

### 8.3 Keeping simulated ≠ real

This is AC-009 and it is a design constraint, not a badge:

1. **Route isolation:** everything under `/playground/*` uses a distinct `SimulationLayout` with a persistent amber-on-dark "SIMULATION — no Bitcoin is involved" bar that does not scroll away.
2. **Vocabulary isolation:** "demo sats" and a distinct icon for simulated amounts; the words "invoice", "address" and "balance" may appear only with a `SIMULATED` qualifier component.
3. **No QR codes for anything** in the playground. A QR is the single strongest visual cue for "real payment" and must never appear in a simulation.
4. **No real hashes presented as live.** Demo txids are computed from demo data; label them "example txid".
5. **Explicit exit interstitial** when moving from playground to the real wallet module: one screen stating "The next section uses a real Lightning wallet and real money. Amounts will be real."
6. **Never generate a displayable seed phrase** that could be mistaken for usable. If the wallet-creation demo needs words, use a fixed illustrative phrase with a permanent "example only — never use these words for a real wallet" label. **[PRD §12 "never request or store seed phrases"]** — the safest reading is that we do not display a valid BIP39 mnemonic at all. **[DECISION D-08]**

**Verification approach for AC-009:** a short UX review checklist applied to each of the six screens (banner present, no QR, vocabulary qualified, exit interstitial) — evidence for the acceptance criterion rather than an assertion.

---

## 9. Lightning wallet architecture comparison

This is the critical section. Read the four-level distinction first, because most wallet integrations fail by conflating them.

### 9.1 Four different things that are not the same

| Level | What it means | Evidence required | Common mistake |
|---|---|---|---|
| **L1. Connection** | The app has an authorised channel to a wallet (NWC URI stored, or LNbits key configured) | A successful `get_info`/`get_balance`/wallet read | Showing "Connected" because a string was saved |
| **L2. Payment request (invoice)** | A BOLT11 invoice exists and is payable | Invoice string + payment hash returned by the wallet service | Treating invoice creation as payment |
| **L3. Payment executed** | Funds actually moved on Lightning | Wallet reports a settled payment **and** a preimage/checking-id exists | Trusting `200 OK` from our own API |
| **L4. Payment verified** | Independently confirmed: preimage hashes to the payment hash, or the node/wallet reports `settled`/`paid` | `sha256(preimage) == payment_hash` or `lookup_invoice.state == "settled"` or LNbits `paid: true` re-queried server-side | Trusting the webhook body, or the client's claim |

The PRD says this in one sentence — "Payment requests must never be treated as successful merely because an API request returned successfully" **[§11]**. Architecturally that means our `payments` record has a `status` that only reaches `succeeded` through L4 evidence.

### 9.2 Option A — Nostr Wallet Connect (NIP-47)

**[VERIFIED]** against the NIP-47 specification (fetched October 30, 2026):

- Transport: Nostr events over relays. Request `kind 23194`, response `kind 23195`, capability advertisement `kind 13194`.
- Encryption: NIP-44 preferred (`nip44_v2`), NIP-04 legacy fallback when the `encryption` tag is absent.
- Connection string: `nostr+walletconnect://<wallet-pubkey>?relay=<wss…>&secret=<32-byte-hex>`; the `secret` is the *client* key and must be treated as a wallet credential.
- Methods: `pay_invoice`, `make_invoice`, `lookup_invoice`, `get_balance`, `get_info`.
- `pay_invoice` returns `{ preimage, fees_paid? }` — a **cryptographic proof of settlement**.
- Error codes include `PAYMENT_FAILED`, `INSUFFICIENT_BALANCE`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `RESTRICTED`, `UNAUTHORIZED`, `UNSUPPORTED_ENCRYPTION`.
- Spec status: **`draft` `optional`**, with extensions in a separate repository. Compatibility variance is expected, not exceptional.

| Criterion | Assessment |
|---|---|
| Integration complexity | Medium. Relay connection, NIP-44 crypto, request/response correlation, timeout handling. `nostr-tools`/NDK are pure JS (noble-based) — no native build, works on Termux. |
| User onboarding | **Weakest point.** Beginner must install a compatible wallet, find NWC/"connect to app", paste/scan a URI. Needs a guided, illustrated flow and a fallback. |
| Custody | Best. Funds stay in the learner's wallet; the academy never holds or can move funds beyond the granted budget. |
| Permissions | Per-connection keys with budgets; wallet enforces spend limits and asks for approval. |
| Invoice creation | `make_invoice` (if supported) — capability varies by wallet. |
| Payment execution | `pay_invoice`; the user approves inside their wallet app. |
| Payment verification | Strong: preimage ↔ payment_hash, plus `lookup_invoice` (`settled`). |
| Webhook/polling | No webhooks. Poll `lookup_invoice` and reconcile unresolved payments. |
| Secret management | The connection `secret` is a bearer credential → encrypt at rest, never log, revoke on disconnect. |
| Security risks | Malicious relay metadata leakage (relay sees kinds/tags, not content); phishing lookalike NWC URIs; over-broad budgets; relay downtime losing responses. |
| Availability/cost | Relay + learner's wallet. No infrastructure cost to the academy. |
| Beginner suitability | Poor without careful UX; good once connected. |

**Reliability caveat that must shape the design:** responses are relayed events with no guaranteed delivery. A timeout does **not** mean the payment failed — it may have succeeded with the response lost. Therefore: on timeout, mark `unknown` and reconcile by `lookup_invoice(payment_hash)`; never retry `pay_invoice` blindly (double-payment risk). This is an idempotency requirement, not a nicety.

### 9.3 Option B — LNbits

**[VERIFIED]** against LNbits API documentation (fetched October 30, 2026):

- `POST /api/v1/payments` with `{"out": false, "amount": <sats>, "memo", "expiry", "webhook", "extra"}` → `{payment_hash, payment_request, checking_id}`. Auth: **invoice key** suffices.
- `POST /api/v1/payments` with `{"out": true, "bolt11": …}` → paying requires the **admin key** (invoice key cannot spend).
- `GET /api/v1/payments/{checking_id}` → array of payment objects with `status` (`success` etc.) and amount; invoice key suffices.
- `webhook` URL is POSTed when an invoice is paid; the docs explicitly warn: **"Always verify webhooks server-side … Don't trust webhook data alone."**
- Default API rate limit 200 requests/minute per IP (configurable).
- Keys are per-wallet; `admin` vs `invoice` is a real privilege boundary.

| Criterion | Assessment |
|---|---|
| Integration complexity | Low. Plain REST + API key. Fastest path to a working demo. |
| User onboarding | Depends entirely on deployment. With a shared academy wallet, the learner needs no wallet at all — which is *convenient* and *educationally weaker* for FR-009. |
| Custody | **Shared instance operator can access funds** (PRD §12 table says exactly this). If the academy holds the admin key, the academy is effectively custodial for demo funds — permitted only because it is *our* demo money, never learner money **[PRD §16 "holding user funds" out of scope]**. |
| Permissions | Coarse: invoice key vs admin key. No per-user budget. |
| Invoice creation | Excellent; the canonical use case. |
| Payment execution | Works, but requires the admin key on the server → the highest-value secret in the system. |
| Payment verification | Good: re-query status server-side; webhook optional. |
| Webhook/polling | Both available; polling is mandatory anyway because a sleeping free host drops webhooks. |
| Secret management | Admin key must never reach the browser **[PRD §12]**. Rotate on any suspicion. |
| Security risks | Admin key compromise = wallet drained; shared-instance custody confusion; misconfigured public instance. |
| Availability/cost | Hosting + funding + maintenance; or a hosted provider (accounts/credentials, not free at scale). |
| Beginner suitability | Good (no wallet needed to *receive*); poor for genuinely teaching "connect your wallet". |

### 9.4 Option C — other approaches (only where justified)

| Option | Verdict |
|---|---|
| **LNURL-pay / Lightning Address (read-only)** | Useful as a *supplementary* receiving path (show a QR that any wallet can pay). Cannot satisfy FR-009 ("connect a compatible wallet") on its own. Not a substitute. |
| **Direct node RPC (LND/CLN REST)** | Requires running a node and channels. Explicitly outside scope: "Production-scale Lightning infrastructure" **[§16]**. Rejected for MVP. |
| **Custodial third-party wallet API (e.g. a hosted account with API keys)** | Fastest to demo, worst for the PRD's custody and safety narrative; introduces a third-party account dependency. Rejected as primary; acceptable only as a throwaway spike. |
| **BOLT12 offers** | Not required, poorly supported by beginner wallets today. Ignore. |

### 9.5 Side-by-side decision matrix

| Criterion | NWC | LNbits | PRD weight |
|---|---|---|---|
| Satisfies FR-009 "connect a compatible wallet" | Yes, literally | Partially (account/key, not learner's wallet) | High |
| Satisfies FR-010 guided payment | Yes (learner pays) | Yes (learner pays invoice from any wallet, or system pays) | High |
| Payment verification strength | Preimage (cryptographic) | Server-side status re-query | High |
| Custody safety | Strong | Weak (shared operator) | High **[§12]** |
| Beginner onboarding | Weak → needs guided UX | Strong | Medium |
| Build time to demo | 3–5 days incl. relay handling | 1–2 days | Medium |
| Operational cost | ~0 | Hosting + funded wallet | Medium |
| Failure modes | Relay, wallet variance, timeouts | Admin key, webhook loss, funding | Medium |
| Evidence for AC-016 (no secrets in bundle) | Clean if designed right | Requires strict admin-key isolation | High |

### 9.6 Recommendation

**Primary: NWC, with a mandatory 3-day spike. Fallback: LNbits for a controlled demonstration wallet.**

Rationale: NWC is the only option that satisfies FR-009 in the sense the PRD clearly intends (a learner connects *their* wallet), keeps custody where the PRD wants it, and produces the strongest possible verification evidence (preimage) for AC-014. Its weakness is onboarding, which is a UX problem we can design for — not a technical impossibility.

Fallback trigger (write it down before starting): if by **November 2** a real payment cannot be completed and verified on a test device with at least one mainstream compatible wallet, switch to LNbits and document the switch in `ENGINEERING-DECISIONS.md`. The PRD explicitly authorises this fallback **[§18 "If one wallet approach proves impractical, use the alternative"]** — but it must be a recorded decision, not a silent drift.

### 9.7 Infrastructure required for a *real* payment demonstration

Nothing in this list is optional if AC-013/AC-014 are to be honest:

1. A funded Lightning wallet the learner controls (NWC path) **or** a funded LNbits wallet the academy controls.
2. Internet access on the demo device, with a wallet capable of paying the invoice.
3. At least one reachable Nostr relay (NWC) — pick a stable public relay and a second as backup.
4. A publicly reachable HTTPS API for the webhook path (LNbits) — and a polling reconciler for when the host sleeps.
5. Real sats. Even at 10–100 sats per demo, this is real money; budget it explicitly.
6. A second device or a second wallet to act as the payer for rehearsals.
7. Time: real payments settle in seconds, but *first-time* wallet setup can take 20 minutes. Rehearse the whole journey twice before demo day.

**[GAP]** There is no Lightning testnet/signet path that a mainstream beginner wallet supports well. Testing will therefore involve small **mainnet** payments. The PRD permits "test environments where supported" **[§12]**; where none is supported, the mitigation is small amounts, explicit labelling and a written rehearsal.

---

## 10. Security architecture

### 10.1 Requirement-to-component map

| PRD security requirement | Where it is enforced | How it is evidenced |
|---|---|---|
| Secure password hashing **[§13]** | `services/auth` — scrypt (node:crypto) or argon2id | Unit test asserts hash ≠ password, salted, constant-time verify |
| Validated auth requests | `validators/auth.ts` (zod, strict) | Tests for malformed/extra fields |
| Protected user routes | `middleware/requireAuth` | Integration test: 401 without session |
| Secure session/token handling | httpOnly + Secure + SameSite=Lax cookie; server-side session | Cookie flags asserted in test; no token in JS-accessible storage |
| Rate limiting | `middleware/rateLimit` per class | Test asserts 429 after N attempts |
| Server-side validation | zod on every route | Schema coverage check |
| Safe error responses | central error handler | Test asserts no stack/SQL/Mongo text leaks |
| CORS restrictions | `cors` with explicit origin allowlist | Test: foreign origin rejected |
| Environment-based secrets, no hardcoded creds | `config/env.ts` fail-fast parse; `.env.example` only | Repo scan in CI for secret patterns |
| Injection / XSS protection | parameterised Mongoose queries; no `eval`; React escaping; no `dangerouslySetInnerHTML` for lesson content (render blocks instead) | Lint rule banning `dangerouslySetInnerHTML`; review |
| AI keys server-side | provider called only from `services/ai` | Bundle grep for key prefix in build artifact |
| AI input size / rate limits | zod max length + per-user limiter | Test |
| No unnecessary PII in prompts | prompt builder takes lesson + message only | Code review + logged prompt fixture |
| Untrusted learner input | prompt structure + injection filters | Adversarial test set |
| No unverified financial instruction as fact | system policy + output filter + fixed safety footer | Negative tests |
| Wallet ops isolated | separate module/router/credentials/limiter | Dependency-direction test (learning code cannot import wallet) |
| Amounts/invoices validated | zod (msat bounds), invoice decode + payment_hash match | Unit tests on malformed invoices |
| Payment status verified | L4 verification state machine (§9.1) | Integration test with mocked wallet returning success/failure/timeout |
| No auto-payment without explicit authorisation | explicit confirm step → NWC wallet approval / LNbits intent record | E2E: no payment without confirm |
| No logging of wallet credentials | pino redaction paths | Log-capture test asserts secret absent |
| Privacy: no cross-user exposure | all queries scoped by session userId | A "tenant isolation" integration test: user B cannot read user A's progress/attempts/conversations/payments |
| Clear privacy information | static `/privacy` page | AC-018 documentation review |

### 10.2 Secrets inventory

| Secret | Where | Rotation |
|---|---|---|
| `SESSION_SECRET` / cookie signing | API env | On suspicion |
| `MONGODB_URI` | API env | On suspicion |
| `OPENROUTER_API_KEY` | API env | Monthly or on leak |
| `WALLET_ENCRYPTION_KEY` | API env | Plan a re-encrypt path if rotated |
| `LNBITS_ADMIN_KEY` (if LNbits) | API env, **never** browser | On suspicion |
| NWC URI / secret (per user) | Encrypted in `walletconnections` | Revoke on disconnect |

**Rule:** `.env` is never committed; `.env.example` contains names and formats only, never values. CI greps for `sk-`, `xprv`, `nsec`, `nostr+walletconnect` in tracked files.

### 10.3 Payment-specific controls

- Amount caps per payment (e.g. ≤ 1,000 sats) and per day, enforced server-side, not in the UI.
- Invoice must be freshly created by our server for this session; reject arbitrary learner-supplied invoices (prevents the app being used as a payment relay for third parties).
- Replay protection: unique index on `paymentHash`; a second attempt on the same hash returns the existing record.
- Never retry an ambiguous payment; reconcile instead (§9.2).
- Explicit "unknown" state in UI **[AC-015]**.

---

## 11. Testing strategy

### 11.1 Layers

| Layer | Tool | What it proves |
|---|---|---|
| Unit | Vitest | Progress maths, quiz scoring (AC-006), completion logic, payment state transitions, invoice/amount validation, prompt filters |
| Integration | Vitest + supertest + a real Atlas test database | Auth (AC-001), course retrieval (AC-002), progress persistence (AC-004, AC-007), tutor request path (AC-010), wallet adapter against mocked NWC/LNbits |
| Contract | zod schema ↔ client types | AC-018 "documented API contracts" stays true |
| E2E | Playwright **in CI only** (§13) | The 10-step demo journey (§19) |
| Manual device | Real Android phone | AC-003 responsive, AC-017 deployment, real wallet flows |
| Negative | Vitest + manual | AC-011, AC-015, §19 negative list |
| Security review | Manual + `npm audit` + bundle grep | AC-016 |

### 11.2 Critical-path tests that must exist before submission

1. Progress: complete lesson twice → single completion, percentage correct, no duplicate XP.
2. Quiz: fixture with known answers → exact score; wrong answers recorded.
3. Auth: register → login → `/me` → logout → `/me` = 401.
4. Isolation: user B requesting user A's progress/payment/conversation → 404, never 200.
5. Tutor: provider timeout → graceful fallback message, no 500 leak.
6. Tutor safety: 15 adversarial prompts → no seed-phrase/price-prediction/credential content.
7. Wallet: payment success (preimage match) → `succeeded`; wrong preimage → `failed`; timeout → `unknown`, then reconciliation resolves it; duplicate request → single record.
8. Simulation: playground components contain the simulation banner; no QR component renders under `/playground`.

### 11.3 What cannot be tested as specified

**[GAP]** `mongodb-memory-server` downloads an x86_64 `mongod` binary and will not run on aarch64 Android **[ASSUMPTION — verify in spike]**. Integration tests must therefore run against an Atlas test database (or in CI). Playwright's browser bundles do not support Termux/Android; E2E runs in GitHub Actions. Neither is a reason to abandon the Termux workflow; both are reasons to have CI.

---

## 12. Deployment and operational considerations

### 12.1 Hosting options

| Component | Recommended | Verified facts / alternatives |
|---|---|---|
| Frontend | Cloudflare Pages or Netlify (static) | Unlimited static hosting on Render too; Vercel free is documented as personal/non-commercial, which is a grey area for a hackathon submission — prefer Cloudflare/Netlify for clarity |
| API | Render free (Hobby) for build-up; **Render Starter $7 for demo week**, or Koyeb | **[VERIFIED]** free: 750 instance-hours/workspace/month, spins down after 15 min idle, ~1 min cold start, ephemeral filesystem, 512 MB RAM, 5 GB bandwidth. Koyeb free: 0.25 vCPU/1 GB, scale-to-zero. Fly.io: no standing free tier. |
| Database | MongoDB Atlas free | **[VERIFIED]** 512 MB, ~100 ops/s, 500 connections, 1 free cluster/project, auto-pause after 30 days idle, no log download |
| AI | OpenRouter (pay per token) | Budget guard + per-user caps |
| Lightning | NWC: none (learner's wallet + relay). LNbits: hosted instance + funded wallet | §9 |

### 12.2 Cost estimate

| Item | Monthly | Notes |
|---|---|---|
| Frontend | $0 | Static CDN tier |
| API (free) | $0 | Cold starts |
| API (Starter, demo week) | ~$7 prorated | Removes cold start — strongly advised for the judged demo |
| Atlas | $0 | 512 MB |
| OpenRouter | ~$1–5 | Depends on model and message volume |
| Lightning demos | a few hundred sats | Real money, budget explicitly |
| **Total** | **$0–12** | |

### 12.3 Operational concerns

- **Cold start vs AC-017/AC-014.** A sleeping API makes the first payment request slow enough to look broken. Mitigation: keep-warm ping every 10 minutes during the judging window, plus a manual warm-up 5 minutes before any demo. Document it in the README.
- **Webhook loss.** A sleeping host misses LNbits webhooks. Polling reconciliation is mandatory, not optional.
- **Logging.** Structured JSON, request-id, redacted. No PII, no secrets, no invoice/preimage bodies. Retention: 7–14 days.
- **Monitoring.** Uptime check on `/api/health` (DB ping + wallet adapter liveness), error-rate alert to email, and a simple `/api/health/ready` used by the pre-demo checklist.
- **Backup.** Nightly `mongodump` of curriculum + users to a private location; a restore rehearsal once. Atlas free has no PITR.
- **Recovery.** Documented "from zero to deployed" runbook (env vars, seed script, wallet reconnection) — this doubles as AC-018 evidence.

---

## 13. Termux compatibility assessment

### 13.1 Measured environment **[VERIFIED — October 30, 2026]**

| Fact | Value | Command |
|---|---|---|
| Architecture | `aarch64` | `uname -m` |
| Node | `v26.4.0` | `node -v` |
| npm | `11.20.0` | `npm -v` |
| Git | `2.56.0` | `git --version` |
| Docker | **not installed** (`command -v docker` empty) | `command -v docker` |
| `mongod` | **not installed** | `command -v mongod` |
| openssl / curl | present | `command -v` |
| CPUs / RAM | 8 / ~5.4 GB total | `/proc/cpuinfo`, `free -m` |
| Shared storage | `/storage/emulated/0/Download` accessible via `~/storage/shared` | `ls ~/storage/shared/Download` |

### 13.2 Risk table

| Concern | Verdict | Mitigation |
|---|---|---|
| Node 26 is very new | **[ASSUMPTION]** some packages pin engines `<26` | Prefer well-maintained libs; pin exact versions; `npm i --engine-strict=false` only if necessary |
| Native modules (bcrypt, sharp, canvas, argon2) | High risk: few or no Bionic aarch64 prebuilds; compiling needs a full toolchain | Choose pure-JS: `scrypt` (node:crypto), `bcryptjs` if needed, avoid `sharp` (use pre-sized static images / `imagemin` at authoring time) |
| Rollup 4 native binary | **[ASSUMPTION]** `@rollup/rollup-linux-arm64-*` may not load on Bionic | Build in CI/hosted runner; local `vite dev` unaffected |
| esbuild | Likely fine (statically linked Go binary) | Verify with a 2-minute spike before relying on it |
| `mongod` absent | Confirmed | Use Atlas; do not attempt to compile MongoDB on Android |
| `mongodb-memory-server` | Will fail (x86_64 binary download) | Integration tests run against Atlas test DB or CI |
| Docker absent | Confirmed | No local LNbits container; use hosted LNbits only if chosen |
| Playwright browsers | Not supported on Termux | E2E in GitHub Actions; manual device testing locally |
| File watching (`inotify` limits) | Risk of `ENOSPC`/`EMFILE` on large `node_modules` | `server.watch.usePolling` in Vite if it occurs; exclude `node_modules` |
| Long-running dev server + phone | Battery/thermal, background limits | Keep sessions short; test on a powered device |
| HTTPS/tunnel for webhooks | Not available locally | Use hosted API for any webhook testing |

### 13.3 Recommended workflow

**Termux-first, CI-verified, hosted-build shipped:**

1. Write and run code in Termux (`npm run dev`, unit tests with Vitest — Vitest is pure JS, works).
2. Push to GitHub → GitHub Actions runs: typecheck, lint, unit + integration tests, E2E, production build.
3. Deploy from CI to the static host and API host.
4. Rehearse on the physical Android device against the deployed URL.

This keeps the developer's actual working environment intact (the stated constraint) while removing the three things Termux genuinely cannot do: native-dependent builds, browser automation, and a locally hosted public webhook target. **No reason found to abandon the Termux-first workflow.**

---

## 14. Requirement-to-component traceability

### 14.1 Functional requirements

| ID | Priority | Requirement **[PRD §7]** | Components | How satisfied | Gaps / dependencies |
|---|---|---|---|---|---|
| FR-001 | P0 | Users can register and authenticate | `services/auth`, `models/users`, `sessions`, auth routes, `/login` `/register` | Email + password, scrypt hash, server session, guarded routes | Needs session decision **[D-02]** |
| FR-002 | P0 | Access course catalogue | `models/courses`, `GET /api/courses`, `/courses` | Published-only query, ordered | Seed content needed |
| FR-003 | P0 | View lessons | `models/lessons`, `GET /api/lessons/:lessonId`, `/lessons/:id` | Block content renderer, next/prev, objectives | Content authoring effort |
| FR-004 | P0 | Complete lessons | `POST /api/progress/lessons/:lessonId/complete` | Idempotent completion record + counter update | **[D-04]** model refinement |
| FR-005 | P0 | Complete quizzes | `models/quizzes`, `quizattempts`, `/quizzes/:id` | MC + scenario questions, immediate feedback | Question authoring |
| FR-006 | P0 | Progress persisted | `lessoncompletions`, `usercourses` | Server-side writes; resume via `lastLessonId` | AC-004 test |
| FR-007 | P0 | Access playground | `/playground/*`, WebCrypto, `@noble/secp256k1` worker | Six client-side simulations | **[D-08]** key-display policy |
| FR-008 | P0 | Interact with AI tutor | `services/ai`, `aimessages`, `/tutor` | Grounded chat, rate limited, filtered | Provider key, model choice |
| FR-009 | P0 | Connect compatible Lightning wallet | `services/wallet` (NWC adapter), `walletconnections` | NWC URI paste/deep-link → `get_info` proves connection | **Highest risk**; needs real wallet test; **[D-01]** |
| FR-010 | P0 | Complete guided Lightning payment | `payments`, `/wallet/pay/:sessionId` | Confirm step → `pay_invoice` → verify preimage | Real sats; relay reliability |
| FR-011 | P0 | View learning dashboard | `/dashboard`, `usercourses`, achievements | Continue learning, progress, next lesson | — |
| FR-012 | P1 | Earn XP and achievements | `userachievements`, progress events | XP on completion/quiz; badge criteria | Must not delay P0 |
| FR-013 | P1 | Multiple learning paths | `courses.path` field, `/paths` | Course grouping | Design field now, UI later |
| FR-014 | P2 | Completion certificates | PDF/HTML template | Deferred | — |
| FR-015 | P2 | Community learning | — | Out of MVP | PRD §16 limits scope |
| FR-016 | P2 | Developer advanced courses | `courses.level` | Content only | — |

### 14.2 Acceptance criteria

| ID | Criterion **[PRD §14]** | Verification | Architecture support | Status |
|---|---|---|---|---|
| AC-001 | New learner can register and sign in | Functional test | Auth service + session | Straightforward |
| AC-002 | Learner can access published courses | Functional test | Catalogue query filtered by `published` | Straightforward |
| AC-003 | Lessons display correctly on mobile | Responsive test | Mobile-first layout, 360px baseline | Needs device test |
| AC-004 | Lesson completion persisted | Database test | `lessoncompletions` unique index | Straightforward |
| AC-005 | Learners can submit quiz answers | Functional test | Attempt endpoint | Straightforward |
| AC-006 | Quiz results calculated correctly | Unit test | Scoring function, pure | Straightforward |
| AC-007 | Progress updates after completion | Integration test | Counter + percentage service | Straightforward |
| AC-008 | Playground supports documented exercises | Demonstration | Six simulations implemented | Content work |
| AC-009 | Simulations visibly distinguished | UX review | SimulationLayout, no QR, qualified vocabulary | Checklist evidence |
| AC-010 | Tutor answers using educational context | Functional test | Lesson injection + test fixture | Straightforward |
| AC-011 | Tutor handles unsupported questions safely | Negative test | Refusal policy + 15-prompt set | **Test set must be authored** |
| AC-012 | Compatible wallet can be connected | Integration test | NWC `get_info`/status | **At risk — external** |
| AC-013 | Platform can generate/handle a real payment request | Integration test | `make_invoice` or LNbits invoice | **At risk — external** |
| AC-014 | Guided payment completed and verified | End-to-end test | Preimage verification / LNbits status | **Highest risk** |
| AC-015 | Payment failures communicated accurately | Negative test | Status machine incl. `unknown` | Depends on AC-014 |
| AC-016 | Wallet secrets not in logs/bundles | Security review | Encryption, redaction, bundle grep | Straightforward |
| AC-017 | Public deployment accessible | Deployment test | Hosting plan §12 | Straightforward |
| AC-018 | Repository includes setup and architecture docs | Documentation review | README + ADRs + OpenAPI | Requires discipline |

### 14.3 Coverage summary

- **P0 functional requirements:** 11/11 have an architectural home. Two (FR-009, FR-010) depend on external systems and carry the schedule risk.
- **Acceptance criteria:** 18/18 mapped; 3 (AC-012/013/014) are externally dependent; 1 (AC-011) needs authored adversarial content; the rest are ordinary engineering.
- **No requirement is satisfied by interface alone** — PRD §14 is explicit that a feature is not complete because its UI exists, and the verification column above is written accordingly.

---

## 15. Risks, assumptions and unresolved decisions

### 15.1 Risks (ranked)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | NWC onboarding proves too hard / wallet incompatibility | High | High | 3-day spike; guided QR/paste UX; fallback to LNbits by Nov 2 |
| R2 | Relay timeouts cause `unknown` payment states in the demo | Medium | High | `lookup_invoice` reconciliation; never blind-retry; rehearse |
| R3 | Free-host cold start during judging | High | Medium | Paid tier for demo week or keep-warm + pre-warm checklist |
| R4 | Webhook missed while host asleep (LNbits path) | Medium | Medium | Polling as primary verification |
| R5 | Termux cannot build the production bundle (Rollup native) | Medium | Medium | Build in CI; never block on local build |
| R6 | AI cost or model drift | Low | Medium | Budget guard, pinned model, fallback message |
| R7 | AI produces unsafe financial/security content | Medium | High | Grounding, filters, adversarial test set, fixed safety footer |
| R8 | Curriculum authoring effort exceeds available days | Medium | High | Write Bitcoin 101 + Money first (demo path), others after P0 works |
| R9 | Learner confusion between simulation and real payment | Medium | High | AC-009 design rules + exit interstitial |
| R10 | Data model refactor mid-build (progress/conversations/wallet secrets) | Medium | High | Decide **[D-04]** before coding |
| R11 | Loss of Atlas data (no PITR) | Low | High | Nightly dump + restore rehearsal |
| R12 | Real money mishap in demo | Low | High | Amount caps, explicit confirm, rehearsal with small amounts |

### 15.2 Assumptions (must be confirmed)

| # | Assumption | Confirm by |
|---|---|---|
| A1 | A mainstream wallet with NWC support can be set up on a test device | Wallet spike, day 1 |
| A2 | Public relay reachable from the API host | Spike |
| A3 | `@noble/secp256k1` and WebCrypto cover all playground needs | Spike |
| A4 | Vite build works on Termux or CI within minutes | Spike |
| A5 | Atlas free tier latency from the API host is acceptable (<150 ms) | Spike |
| A6 | Chosen AI models stay available and affordable through Nov 20 | Weekly check |
| A7 | Judge/demo environment has usable internet | Rehearsal |

### 15.3 Unresolved decisions

| # | Decision | Recommendation | Blocking? |
|---|---|---|---|
| U1 | Wallet provider (NWC vs LNbits) | NWC, spike first, fallback recorded | Yes — FR-009/010 |
| U2 | Session strategy | Opaque server sessions | No |
| U3 | Progress model (array vs collection) | Separate collection | Yes — migration risk |
| U4 | Deployment host/tier | Render free + Starter for demo week | No |
| U5 | Offline progress writes | Not in MVP | No |
| U6 | Demo seed-phrase display | Do not display valid mnemonics | No |
| U7 | OD-001 docs structure | Still open — see `ENGINEERING-DECISIONS.md` | Yes — before `docs/` |

---

## 16. Recommended implementation sequence

Aligned to PRD §18, with the wallet moved to the very front because the PRD calls it the critical dependency.

| Window | Focus | Exit criteria |
|---|---|---|
| **Oct 30 – Nov 2** | **Wallet + AI spikes first.** Scaffold repo, env config, CI. Prove NWC connect + pay + verify with a throwaway script. Prove one AI call server-side. Confirm build path (local vs CI). Decide **[D-01]**, **[D-02]**, **[D-04]**. | A recorded, verified real payment in a spike; a recorded wallet decision; a green CI build |
| Nov 3 – Nov 5 | Backend core: auth, courses, lessons, progress, quizzes + tests | AC-001…AC-007 passing in integration tests |
| Nov 6 – Nov 8 | Frontend core: landing, auth, catalogue, lesson reader, dashboard, quiz UI | AC-003 demonstrable on a real phone |
| Nov 9 – Nov 10 | Playground (six simulations, worker, simulation UX) | AC-008, AC-009 |
| Nov 11 – Nov 12 | AI tutor end-to-end, safety filters, adversarial set | AC-010, AC-011 |
| Nov 13 | Wallet module integrated into the product flow (not a spike) | AC-012, AC-013 |
| Nov 14 – Nov 16 | Guided payment + verification + failure states; E2E journey | AC-014, AC-015 |
| Nov 17 | Hardening: rate limits, redaction, isolation tests, bundle audit | AC-016 |
| Nov 18 – Nov 19 | Deploy, seed content, rehearsals ×2, docs/README/architecture diagram | AC-017, AC-018 |
| Nov 20 | Submission: presentation, video backup, final checks | Package complete |

**Sequencing rules:** (1) never let P1/P2 work start before every P0 is demonstrable; (2) the wallet spike produces a *recorded* decision even if negative; (3) curriculum authoring for Bitcoin 101 happens in parallel with backend work, because content is the longest non-engineering task and it gates the demo path.

---

## 17. Decisions requiring explicit project-owner approval

| ID | Decision | Recommendation | Why it needs approval | PRD reference |
|---|---|---|---|---|
| D-01 | Wallet provider for the MVP | NWC primary; LNbits fallback if the Nov 2 spike fails | PRD explicitly leaves NWC vs LNbits "under evaluation" and requires testing before selection | §12, §24 |
| D-02 | Session strategy (opaque sessions vs JWT cookies) | Opaque server-side sessions | Security-relevant and hard to change later | §13 |
| D-03 | API versioning (`/api` as specified vs `/api/v1`) | Keep `/api` exactly as specified; add v2 only on a real breaking change | Deviating from specified paths is a scope decision | §11 |
| D-04 | Progress + conversation + wallet data model refinement (separate collections) | Refine as in §6.3 | PRD permits schema finalisation, but this changes the logical shapes it lists | §10 |
| D-05 | Hosting provider and paid-tier use for the demo week | Render + ~$7 Starter for demo week; Atlas free | Involves spending money and account creation | §21, AC-017 |
| D-06 | If LNbits is chosen: who funds and administers the wallet | Only academy-owned demo funds; never learner funds | Custody implications | §12, §16 |
| D-07 | Offline behaviour scope (read-cache only vs queued writes) | Read-cache only | Affects AC-004 interpretation | §8.3 |
| D-08 | Whether any mnemonic-like text may be shown in the wallet-creation simulation | Show none; use non-mnemonic illustrative data | Safety-critical interpretation of "no seed phrases" | §5.1, §12 |
| D-09 | Real-money policy: who funds test payments, max amount, who approves | Cap at ≤1,000 sats per payment, academy-funded, owner-approved budget | Real funds are involved | §20, §12 |
| D-10 | Dependency approvals for `@noble/secp256k1`, `nostr-tools`, `vite-plugin-pwa`, `pino`, `zod`, `express-rate-limit` | Approve as a batch | AGENTS.md: dependency installation requires approval | AGENTS.md |
| D-11 | OD-001 documentation structure | Resolve before creating `docs/` | Existing open decision | PRD §9.3 |
| D-12 | Password hashing implementation (scrypt vs argon2id native) | scrypt via `node:crypto` | Security-relevant, and native builds are fragile on Termux | §13 |

**Not decisions I am making.** I have not installed anything, created accounts, generated wallet credentials, or touched `PRD.md`, `PRD.txt`, `PRD-ORIGINAL.txt`, `AGENTS.md`, `ENGINEERING-DECISIONS.md` or any supporting document.

---

## Appendix A — What was actually verified during this assessment

| Check | Method | Result |
|---|---|---|
| PRD read in full | Read `PRD.md` (983 lines) | 25 sections, 16 FRs, 18 ACs, currency of constraints confirmed |
| Environment | `uname -m`, `node -v`, `npm -v`, `git --version`, `command -v docker mongod openssl curl`, `free -m`, `/proc/cpuinfo` | aarch64, Node 26.4.0, npm 11.20.0, Git 2.56.0, no Docker, no mongod |
| Shared storage | `ls ~/storage/shared/Download` | Accessible |
| NIP-47 semantics | Fetched `nostr-protocol/nips` `47.md` | Event kinds, methods, error codes, draft status, preimage proof |
| LNbits API | Fetched official LNbits API documentation | Endpoints, key privileges, status polling, webhook warning, rate limit |
| Atlas free tier | MongoDB docs + pricing page | 512 MB, ~100 ops/s, 500 connections, 30-day idle pause, no log download |
| Render free tier | `render.com/docs/free` + corroboration | 750 h/month, 15-min spin-down, ~1 min cold start, ephemeral FS |
| Palette contrast | Computed WCAG 2.x relative luminance ratios | All PRD colour pairs exceed 4.5:1 (table §4.3) |

Everything else in this report is tagged **[REC]**, **[ASSUMPTION]** or **[DECISION]** and should be treated accordingly.

## Appendix B — Report metadata

- **Filename:** `ARCHITECTURE-DISCOVERY-REPORT.md`
- **Project path:** `~/kaos-bitcoin-academy/reports/ARCHITECTURE-DISCOVERY-REPORT.md`
- **Device copy:** `~/storage/shared/Download/KAOS-Bitcoin-Academy/reports/ARCHITECTURE-DISCOVERY-REPORT.md`
- **Assessment date:** October 30, 2026
- **Implementations performed:** none
- **Files modified outside `reports/`:** none
