# Slice 1 Implementation Report

Project: KAOS Bitcoin Academy
Slice: S1 — accounts, catalogue, lessons, persistent progress, learner dashboard, one account-free preview lesson
Date: November 1, 2026
Author: OpenCode implementation session (owner-authorized S1)

## Status

**S1 implementation: complete. S1 acceptance verification: incomplete.**

All S1 code, content, build and locally runnable tests are finished and passing. The seven
database-backed acceptance tests could not be executed because this project has no MongoDB
Atlas connection string or session secret configured, and no local MongoDB is available on
Termux/Android. No database result in this report is claimed as verified. Details are in
sections 9 and 10.

---

## 1. Implemented S1 features

### Application foundation

- React 19 + TypeScript + Vite 8 frontend in `client/`.
- Node.js + Express 5 + TypeScript backend in `server/`.
- MongoDB Atlas through Mongoose 9, with one reused pooled connection (max pool 10).
- Single-origin production architecture: Express serves `/api/*` and the built SPA from
  `client/dist`, with SPA fallback for client-side routes.
- Tailwind CSS 4 with the PRD §17 palette (`#17140F`, `#F5B942`, `#FDE68A`, `#FFFFFF`,
  `#A8A29E`, `#211E18`).
- Working development workflow (`npm run dev`: Express on 4000, Vite on 5173 with `/api` proxy)
  and production build workflow (`npm run build`, `npm start`).
- Root workspace `package.json` contains scripts only and no dependencies.

### Accounts and authentication

- Registration, login, logout and current-session (`/api/auth/me`).
- Argon2id password hashing (19 MiB memory, time cost 2, parallelism 1).
- Server-side Zod validation with field-level error details.
- Duplicate-account rejection via a unique email index plus an explicit 409 response.
- Server-side sessions in MongoDB via `connect-mongo` (collection `sessions`, 7-day TTL).
- Session regeneration on registration/login (fixation defence) and destruction on logout.
- Cookie configuration: `__Host-kaos_session` in production, `HttpOnly`, `Secure` in
  production, `SameSite=Lax`, `Path=/`, no `Domain`. Development uses the non-prefixed
  `kaos_session` because `__Host-` requires HTTPS with `Secure`.
- `trust proxy` set to 1 in production for the Render TLS terminator.
- Authentication rate limiting: 20 attempts per IP per 10 minutes (relaxed under tests).

### Catalogue and lessons

- Eight published courses with stable slugs and ordered modules.
- Course catalogue, course detail with modules and lessons, and individual lesson delivery.
- Lesson content rendered from structured section blocks (paragraph, heading, callout,
  example, list, terms, reflection).
- Published/draft filtering on every course and lesson query; drafts are not exposed.
- Course and lesson navigation (previous/next within a course, breadcrumbs, resume links).

### Account-free preview

- Exactly one lesson is designated `isPreview: true`: **“What Bitcoin is, in plain language”**
  (`btc101-what-is-bitcoin`), Bitcoin 101 module 1 lesson 2.
- Anonymous visitors can open it and read the full content.
- Anonymous completion attempts return `401`; nothing is stored. No anonymous progress system
  exists.
- The UI explains that progress is not saved and offers registration/sign-in.
- A partial unique index enforces at most one preview lesson in the database.

### Persistent progress and dashboard

- Authenticated “mark lesson complete” with an idempotent upsert.
- Compound unique index `{ userId, lessonSlug }`; repeat completion returns 200 with
  `alreadyCompleted: true` instead of creating a duplicate.
- Progress list, per-course progress and overall progress endpoints.
- Ownership is derived only from `req.session.userId`; no endpoint accepts a client-supplied
  user id.
- Dashboard shows overall progress, per-course progress, next lesson, resume action, recently
  completed lessons, and a first-time learner state driven by stored records.
- Resume target is the first incomplete lesson in course order.

### Content

- 22 authored lessons across 8 courses; Bitcoin 101 complete (8 lessons, 4 modules), and the
  first module of courses 02–08 (2 lessons each).
- Content is real educational prose, beginner-first, with definitions, examples and reflection
  prompts; no investment promises or financial guarantees.
- Idempotent seeder keyed on stable slugs; repeated runs update and never duplicate.
- Content validation fails the seed on duplicate slugs, missing modules, missing objectives,
  empty sections, or a preview count other than one.

### Explicitly not implemented

No quizzes, XP, achievements, playground, AI tutor/OpenRouter, NWC wallet, payment state
machine, settlement, PWA, deployment, `accessLevel`, entitlements, subscriptions, premium
middleware, checkout, pricing, upgrade UI or payment SDKs.

---

## 2. File-by-file change summary

### Repository root

| File | Purpose |
| --- | --- |
| `package.json` | Workspace scripts only (`dev`, `build`, `start`, `seed`, `typecheck`, `test`); no dependencies. |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.env`, logs and coverage. No Git commands were run. |
| `scripts/dev.mjs` | Starts server and client development processes; forwards termination. |

### Server configuration and entry points

| File | Purpose |
| --- | --- |
| `server/package.json` | Server manifest and scripts; dependencies added individually via npm. |
| `server/package-lock.json` | Generated lockfile (npm). |
| `server/tsconfig.json` | `NodeNext` ESM, strict, `rootDir src`, `outDir dist`. |
| `server/.env.example` | Documented environment template with empty secret values. |
| `server/src/config.ts` | Zod environment parsing; production guards; empty values treated as unset; cookie name and client build path. |
| `server/src/logger.ts` | Pino structured logger with redaction of cookies, authorization, passwords, hashes, secrets and DB URI. |
| `server/src/errors.ts` | `AppError` and typed error helpers. |
| `server/src/db.ts` | Pooled Atlas connection, readiness check, disconnect, idempotent index creation. |
| `server/src/app.ts` | Express app: Helmet, logging, JSON limit, sessions, CSRF/origin guard, routes, static SPA, error handling. |
| `server/src/index.ts` | Boot sequence, Mongo session store, graceful shutdown, production fail-fast. |
| `server/src/types/session.d.ts` | `express-session` `userId` typing. |

### Server models, middleware, libraries

| File | Purpose |
| --- | --- |
| `server/src/models/User.ts` | Learner account; email unique; password hash excluded from queries by default. |
| `server/src/models/Course.ts` | Course, embedded modules, status, ordering. |
| `server/src/models/Lesson.ts` | Lesson, module link, structured sections, objectives, preview flag. |
| `server/src/models/Progress.ts` | Lesson completion keyed to learner; compound unique index. |
| `server/src/middleware/auth.ts` | `requireDb` (503) and `requireAuth` (401). |
| `server/src/middleware/validate.ts` | Zod body validation with field errors. |
| `server/src/middleware/origin.ts` | CSRF defence: JSON-only mutations and Origin/host validation. |
| `server/src/middleware/errors.ts` | JSON 404 for `/api`, central error mapping, no stack traces to clients. |
| `server/src/lib/password.ts` | Argon2id hash/verify. |
| `server/src/lib/progress.ts` | Pure course/overall progress calculations. |
| `server/src/lib/http.ts` | Safe single route-param normalisation for Express 5. |
| `server/src/schemas/auth.ts` | Registration and login schemas. |

### Server routes and seeding

| File | Purpose |
| --- | --- |
| `server/src/routes/auth.ts` | Register, login, logout, me; session regeneration; rate limiting. |
| `server/src/routes/courses.ts` | Catalogue, course detail with modules/lessons, flat lesson list. |
| `server/src/routes/lessons.ts` | Lesson delivery, preview access, previous/next navigation. |
| `server/src/routes/progress.ts` | List progress, per-course progress, idempotent completion. |
| `server/src/routes/dashboard.ts` | Aggregated dashboard, resume target, recent completions. |
| `server/src/seed/seedContent.ts` | Idempotent upsert seeding and post-seed integrity checks. |
| `server/src/seed/run.ts` | CLI wrapper: connect, ensure indexes, seed, disconnect. |

### Server content (authored source of truth)

| File | Purpose |
| --- | --- |
| `server/src/content/types.ts` | Content types and authoring helpers. |
| `server/src/content/index.ts` | Course bundles plus structural validation. |
| `server/src/content/courses/01-bitcoin-101.ts` | Bitcoin 101 bundle and module metadata. |
| `server/src/content/courses/01-bitcoin-101-a.ts` | Bitcoin 101 lessons 1–4. |
| `server/src/content/courses/01-bitcoin-101-b.ts` | Bitcoin 101 lessons 5–8. |
| `server/src/content/courses/02-money-and-bitcoin.ts` | Money and Bitcoin, first module. |
| `server/src/content/courses/03-how-bitcoin-works.ts` | How Bitcoin Works, first module. |
| `server/src/content/courses/04-bitcoin-wallets.ts` | Bitcoin Wallets, first module. |
| `server/src/content/courses/05-using-bitcoin.ts` | Using Bitcoin, first module. |
| `server/src/content/courses/06-lightning-network.ts` | Lightning Network, first module. |
| `server/src/content/courses/07-staying-safe.ts` | Staying Safe, first module. |
| `server/src/content/courses/08-beyond-bitcoin.ts` | Beyond Bitcoin, first module. |

### Client

| File | Purpose |
| --- | --- |
| `client/package.json` | Client manifest and scripts. |
| `client/package-lock.json` | Generated lockfile (npm). |
| `client/tsconfig.json` | Bundler-mode React TypeScript configuration. |
| `client/vite.config.ts` | React + Tailwind plugins, `/api` dev proxy, build output. |
| `client/index.html` | App shell, language, viewport, description. |
| `client/src/main.tsx` | React root, Query client, router. |
| `client/src/App.tsx` | Route table. |
| `client/src/index.css` | Tailwind import and PRD palette tokens. |
| `client/src/lib/api.ts` | Typed fetch wrapper, `ApiError`, field-error extraction. |
| `client/src/lib/types.ts` | API response types. |
| `client/src/lib/queries.ts` | TanStack Query hooks and auth/progress mutations. |
| `client/src/lib/config.ts` | Single preview lesson slug constant. |
| `client/src/components/Layout.tsx` | Header, navigation, session-aware actions, footer, skip link. |
| `client/src/components/ProgressBar.tsx` | Native `<progress>` display: accessible and CSP-safe with no inline styles. |
| `client/src/components/ProtectedRoute.tsx` | Navigation-level guard only. |
| `client/src/components/SectionRenderer.tsx` | Lesson section rendering. |
| `client/src/pages/Home.tsx` | Landing page with preview and account CTAs. |
| `client/src/pages/Catalogue.tsx` | Full course catalogue with progress. |
| `client/src/pages/CourseDetail.tsx` | Modules, lessons, resume, locked-lesson affordance. |
| `client/src/pages/Lesson.tsx` | Lesson reader, preview banner, completion, navigation, 401/404/503 states. |
| `client/src/pages/Login.tsx` | Sign-in form. |
| `client/src/pages/Register.tsx` | Registration form. |
| `client/src/pages/Dashboard.tsx` | Persisted learner dashboard. |
| `client/src/pages/NotFound.tsx` | 404 page. |

### Tests

| File | Purpose |
| --- | --- |
| `server/test/helpers.ts` | Ephemeral server and cookie-aware HTTP test client. |
| `server/test/content.test.ts` | Curriculum structure, counts, preview, content depth. |
| `server/test/progress.test.ts` | Pure progress calculations. |
| `server/test/validation.test.ts` | Registration/login schema behaviour. |
| `server/test/password.test.ts` | Argon2id hashing and verification. |
| `server/test/http.test.ts` | Health, 503 degradation, 404, origin guard, JSON enforcement, auth middleware. |
| `server/test/static.test.ts` | Built SPA serving and bundle secret scan. |
| `server/test/db.integration.test.ts` | Atlas-backed acceptance tests; skipped without explicit opt-in. |

Generated, not authored: `server/dist/`, `client/dist/`, both `node_modules/` directories.

No existing report, PRD or reference file was modified. No `docs/` directory was created.

---

## 3. Installed dependencies and purposes

Installation followed the required workflow: manifests created without dependency lists, then
each package installed with its own `npm install <package>` or `npm install -D <package>` in
the package directory. `npm ls --depth=0` is clean in both packages and both lockfiles exist.

### Server production

| Package | Version | Purpose |
| --- | --- | --- |
| `express` | 5.3.0 | HTTP framework and static serving. |
| `mongoose` | 9.11.4 | MongoDB ODM and connection pooling. |
| `zod` | 4.6.7 | Environment and input validation. |
| `express-session` | 1.19.0 | Server-side sessions. |
| `connect-mongo` | 6.0.0 | MongoDB session store. |
| `argon2` | 0.45.1 | Argon2id password hashing (compiled from source on Termux). |
| `helmet` | 8.3.0 | Security headers and production CSP. |
| `express-rate-limit` | 8.7.2 | Authentication rate limiting. |
| `pino` | 10.4.0 | Structured logging. |
| `pino-http` | 11.0.0 | Request logging. |
| `dotenv` | 18.0.9 | Local `.env` loading. |

### Server development

`typescript` 5.9.3, `tsx` 4.23.15, `@types/node` 26.6.6, `@types/express` 5.0.6,
`@types/express-session` 1.19.0.

### Client production

`react` 19.3.1, `react-dom` 19.3.1, `react-router-dom` 7.18.5, `@tanstack/react-query` 5.105.1.

### Client development

`vite` 8.3.5, `@vitejs/plugin-react` 6.1.2, `typescript` 5.9.3, `tailwindcss` 4.3.3,
`@tailwindcss/vite` 4.3.3, `@types/react` 19.3.0, `@types/react-dom` 19.3.0.

### Dependency notes

- TypeScript 7.0.2 was installed first, but its native compiler has no Android ARM64 package
  (`@typescript/typescript-android-arm64` does not exist), so `tsc` could not run on Termux.
  The same dependency was pinned to the JavaScript-based TypeScript 5.9.3, which compiles
  successfully. This is the only version substitution and it is disclosed here.
- `argon2` 0.45.1 compiled successfully with the Termux clang toolchain and verified
  Argon2id hashing at runtime.
- React Hook Form was not installed because plain controlled forms cover the two S1 auth forms;
  no dependency was added for appearance.
- npm 11 emitted an informational `allowScripts` warning for `argon2` and `esbuild`. Both
  install scripts executed successfully; if a future reinstall blocks them, npm's own
  `npm install-scripts approve argon2 esbuild` remedy applies.

---

## 4. Database models and indexes

| Model | Collection | Fields (S1 only) | Indexes |
| --- | --- | --- | --- |
| `User` | `users` | `email` (lowercase, unique), `passwordHash` (select: false), `displayName`, timestamps | `users_email_unique` unique |
| `Course` | `courses` | `slug`, `title`, `description`, `level`, `order`, `status`, embedded `modules[{slug,title,order}]`, `estimatedMinutes`, timestamps | `courses_slug_unique`; `courses_status_order` |
| `Lesson` | `lessons` | `slug`, `courseSlug`, `moduleSlug`, `title`, `summary`, `order`, `minutes`, `status`, `isPreview`, `objectives[]`, structured `sections[]`, timestamps | `lessons_slug_unique`; `lessons_course_order`; `lessons_status_course`; `lessons_single_preview` partial unique on `isPreview: true` |
| `Progress` | `progresses` | `userId`, `lessonSlug`, `courseSlug`, `completedAt`, timestamps | `progress_user_lesson_unique` unique `{userId, lessonSlug}`; `progress_user_course`; `userId` index |
| Session store | `sessions` | connect-mongo managed | TTL index managed by connect-mongo |

- Index creation is idempotent via `Model.createIndexes()` at boot; indexes are never dropped.
- No payment, subscription, entitlement, organisation, cohort or vector collections exist.
- A single pooled Mongoose connection is reused; no per-request connection.

---

## 5. API routes

All responses are JSON. Errors use `{ "error": { "code", "message", "details?" } }` and never
include stack traces. “Auth” means a valid session; “DB” means the route returns a controlled
`503 DB_UNAVAILABLE` when the database is not ready.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Liveness plus `db: up/down`; no secrets. |
| POST | `/api/auth/register` | Public, rate-limited, DB | Create account; 201 user; 409 duplicate. |
| POST | `/api/auth/login` | Public, rate-limited, DB | Sign in; regenerates session. |
| POST | `/api/auth/logout` | Public | Destroy session and clear cookie; 204. |
| GET | `/api/auth/me` | Public, DB | `{ user }` or `{ user: null }`. |
| GET | `/api/courses` | Public, DB | Published courses with counts and (if signed in) progress. |
| GET | `/api/courses/:courseId` | Public, DB | Published course, modules, lessons, progress. Slug or ObjectId accepted. |
| GET | `/api/courses/:courseId/lessons` | Public, DB | Flat published lesson list. |
| GET | `/api/lessons/:lessonId` | Preview: public; others: auth; DB | Full lesson, course/module, previous/next, completion state. |
| GET | `/api/progress` | Auth, DB | Session learner’s completion records. |
| GET | `/api/progress/:courseId` | Auth, DB | Session learner’s progress in one course. |
| POST | `/api/progress/lessons/:lessonId/complete` | Auth, DB | Idempotent completion; 201 new, 200 already complete. |
| GET | `/api/dashboard` | Auth, DB | Overall and per-course progress, resume target, recent completions, first-time state. |

Notes:

- `/api/dashboard` is the only route beyond the PRD §11 list; it was required by the S1 task.
- No route accepts or trusts a client-supplied user id.
- Mutating requests must be JSON and pass the Origin/host check.

---

## 6. Frontend routes

| Route | Page | Notes |
| --- | --- | --- |
| `/` | Home | Hero, preview CTA, course grid, account-aware primary CTA. |
| `/courses` | Catalogue | All published courses, progress when signed in. |
| `/courses/:slug` | Course detail | Modules, lessons, resume, preview badge, sign-in affordance. |
| `/lessons/:slug` | Lesson reader | Full content, preview banner, completion, previous/next, 401/404/503 states. |
| `/login` | Sign in | Preserves `next` redirect. |
| `/register` | Create account | Preserves `next` redirect. |
| `/dashboard` | Learner dashboard | Client guard is navigation convenience only; API enforces auth. |
| `*` | Not found | 404 page. |

---

## 7. Seeded curriculum content

Eight courses, 22 lessons. Bitcoin 101 is complete; courses 02–08 expose their first module.

| # | Course | Module(s) in S1 | Lessons | Minutes |
| --- | --- | --- | --- | --- |
| 01 | Bitcoin 101 | Why Bitcoin exists; How Bitcoin is different; Staying safe: the basics; Your next steps | 8 | 53 |
| 02 | Money and Bitcoin | What money does | 2 | 14 |
| 03 | How Bitcoin Works | Transactions and the ledger | 2 | 16 |
| 04 | Bitcoin Wallets | Keys and addresses | 2 | 16 |
| 05 | Using Bitcoin | Sending and receiving | 2 | 16 |
| 06 | Lightning Network | Why Lightning | 2 | 18 |
| 07 | Staying Safe | Spotting scams | 2 | 15 |
| 08 | Beyond Bitcoin | What else is built on Bitcoin | 2 | 14 |

Bitcoin 101 lessons:

1. `btc101-money-problem` — Money and the problem Bitcoin addresses
2. `btc101-what-is-bitcoin` — What Bitcoin is, in plain language (**preview**)
3. `btc101-no-company` — No company, no central office
4. `btc101-what-it-is-not` — What Bitcoin is not
5. `btc101-keys` — Your keys, your coins
6. `btc101-scams` — Scams that target beginners
7. `btc101-what-you-can-do` — What you can do with Bitcoin today
8. `btc101-recap` — Recap: explain Bitcoin in your own words

Courses 02–08 lessons: `money-three-jobs`, `money-scarcity`, `how-ledger`, `how-transaction`,
`wallets-keys`, `wallets-seed`, `using-receive`, `using-fees`, `ln-scaling`, `ln-channels`,
`safe-scams`, `safe-checklist`, `beyond-nostr`, `beyond-next`.

Each lesson has at least two learning objectives, an explainer body of 800+ characters,
defined terms, an example or callout, and a reflection prompt. Content avoids price prediction,
financial guarantees and investment advice.

Seeding: `npm run seed` (from root) or `npm --prefix server run seed`. It requires
`MONGODB_URI`, validates content, ensures indexes, upserts by slug, then asserts 8 courses,
22 lessons and exactly 1 preview. Repeat runs are idempotent.

---

## 8. Environment variables required

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes (runtime data, seed, tests) | Existing Atlas cluster connection string. |
| `MONGODB_DB` | No | Database name; default `kaos_academy`. |
| `SESSION_SECRET` | Yes in production | Session signing secret, 32+ characters. |
| `NODE_ENV` | No | `development` default; `production` enforces secure cookie and fail-fast config. |
| `PORT` | No | Server port; default 4000. |
| `APP_ORIGIN` | No | Additional trusted browser origin. Same-host requests are always accepted. |
| `RENDER_EXTERNAL_URL` | No | Render-provided service URL, accepted as a trusted origin. |
| `LOG_LEVEL` | No | Pino level; default `info`, silent under tests. |

`server/.env.example` documents all values with empty secrets. `server/.env` currently exists as
a byte-identical copy of that example (empty `MONGODB_URI` and `SESSION_SECRET`); empty values
are treated as unset so the server still starts in development. Production refuses to start
without `MONGODB_URI` and `SESSION_SECRET`.

No secrets are committed, logged, bundled or included in this report.

---

## 9. Tests actually executed and results

Environment: Termux on Android ARM64, Node v26.4.0, npm 11.20.0.

### Type checking

- `npm run typecheck` at root → server `tsc --noEmit` passed; client `tsc --noEmit` passed.

### Production builds

- `npm run build` at root → server `tsc` emitted `server/dist`; client `vite build` passed.
- Client output: `index.html` 0.61 kB, CSS 18.89 kB (gzip 4.36 kB), JS 333.55 kB
  (gzip 99.82 kB).

### Automated tests

Command: `npm test` (`npm --prefix server test`, Node test runner with tsx).

Result: **28 passed, 0 failed, 1 suite skipped (7 database tests).**

Passed coverage:

- **Content (6 tests):** structural validation, eight approved courses in order, Bitcoin 101
  has 8 lessons and 02–08 have 2 each, exactly one preview from Bitcoin 101, every lesson has
  objectives and 800+ characters of body content, unique slugs/orders.
- **Progress (6 tests):** zero state, completion counting, course-order next lesson, complete
  course, empty course, overall aggregation.
- **Validation (4 tests):** email normalisation, short password/bad email/blank name rejection,
  128-character cap, login validation.
- **Password (3 tests):** Argon2id hash and verify, unique salts, malformed digest fails closed.
- **HTTP/security (7 tests):** health shape, controlled 503 for data routes, JSON 404, cross-origin
  mutation rejection, same-origin pass-through, non-JSON rejection, `requireAuth`.
- **Build/static (2 tests):** built SPA served for `/`, `/courses`, `/dashboard`; `/api/*` stays
  JSON; frontend bundle contains no MongoDB URI, `SESSION_SECRET`, `MONGODB_URI` or
  `passwordHash`.

### Runtime checks performed

- `NODE_ENV=production` without `MONGODB_URI` → exit 1 with a clear message.
- `NODE_ENV=production` with a URI but no `SESSION_SECRET` → exit 1 with a clear message.
- Development server with no database → starts, `GET /api/health` returns
  `{"status":"ok","db":"down"}`, SPA `/` returns 200, `/api/courses` returns 503.
- Production-mode app: CSP present, HSTS present, `X-Powered-By` absent (verified via an
  in-process app instance with placeholder config; no external service contacted).
- `npm run dev` → Vite served on 5173, `/api/health` proxied successfully, clean SIGTERM
  shutdown with no leftover processes.
- Log redaction: requests carrying dummy `Cookie` and `Authorization` headers produced zero
  occurrences of those dummy values in logs.
- `npm run seed` without `MONGODB_URI` → exits 1 with guidance; no data is written.
- `npm ls --depth=0` clean in both packages; both lockfiles present.
- PRD integrity: `PRD.md` SHA-256
  `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` matches
  `PRD-MD-SHA256.txt`; `PRD-ORIGINAL.txt` matches its recorded reference hash.

No test result in this section depends on a database.

---

## 10. Tests blocked by missing configuration or external access

### Blocked suite

`server/test/db.integration.test.ts` — **7 tests, not executed.** The suite is skipped unless
`RUN_DB_TESTS=1` and `MONGODB_URI` are both set. Tests run against
`<MONGODB_DB>_test` and drop only that test database afterwards.

Blocked tests and therefore unverified behaviours:

1. Seeding twice is idempotent against a real database; unique indexes exist as intended.
2. Anonymous visitors can read the preview and cannot read other lessons, dashboard or persist
   completion.
3. Unpublished courses/lessons are excluded from catalogue and lesson routes.
4. Registration, duplicate rejection, cookie attributes, session persistence and logout against
   Atlas.
5. Completion persists across a new session and drives dashboard totals/resume target.
6. Learner A cannot read or alter Learner B’s progress; a body-supplied `userId` is ignored.
7. Auth responses contain no password hashes or Argon2 strings.

### Reason

- No `MONGODB_URI` or `SESSION_SECRET` is present in the environment.
- `server/.env` exists only as an empty copy of `.env.example`.
- No local MongoDB server is installed, and Docker is not available or permitted.
- An unrelated project (`~/freelancer-bid-radar/.env`) contains a `MONGODB_URI`, but it was
  **not used**: its cluster ownership and intended scope are unknown, and borrowing another
  project’s credentials is outside this task’s explicit authorization.

### How to unblock

1. Put the existing Atlas connection string in `server/.env` as `MONGODB_URI` and set a
   `SESSION_SECRET` of 32+ characters.
2. Run `npm run seed`.
3. Run `RUN_DB_TESTS=1 npm test` from `server/` (or `RUN_DB_TESTS=1 npm --prefix server test`
   from the root).
4. Start the app and verify registration, login, preview access, completion and dashboard
   against Atlas.

Until step 3 passes, S1 acceptance remains incomplete even though the code path is implemented.

---

## 11. Security checks performed

- **Password storage:** Argon2id, 19 MiB, time cost 2; hashes verified; never returned by the
  API; `passwordHash` is `select: false` by default.
- **Session handling:** server-side MongoDB sessions; regeneration on register/login; destroy on
  logout; `HttpOnly`; `SameSite=Lax`; `Path=/`; no `Domain`; `Secure` and `__Host-` prefix in
  production; 7-day expiry.
- **CSRF:** `SameSite=Lax` plus an Origin/host check on every mutation plus JSON-only request
  bodies; cross-origin and form-style posts rejected.
- **Rate limiting:** 20 auth attempts per IP per 10 minutes, with a JSON 429 response.
- **Headers:** Helmet; production CSP restricts scripts/styles/connect to self; HSTS;
  `X-Powered-By` disabled; frame ancestors denied. The UI uses no inline styles, so
  `style-src 'self'` needs no `unsafe-inline` exception.
- **Proxy trust:** `trust proxy` = 1 only in production, matching Render.
- **Authorization:** every learner-owned operation filters by `req.session.userId`; no client
  user id is accepted; course/lesson queries filter `status: 'published'`.
- **Preview boundary:** anonymous read is limited to the single `isPreview` lesson; anonymous
  completion returns 401 and creates no record.
- **Input handling:** Zod validation, 32 kB JSON limit, route-param normalisation, controlled
  duplicate-key handling.
- **Error handling:** central handler; generic 500 message; no stack traces to clients; 503 when
  the database is not ready.
- **Logging:** structured Pino with redaction of cookies, authorization headers, passwords,
  password hashes, secrets and database URI. Dummy-secret test found zero leaks.
- **Bundle:** automated scan confirmed no server secrets in the production frontend assets.
- **Startup safety:** production refuses to boot without database and session secrets.

Not performed: penetration testing, dependency CVE audit, TLS configuration at Render (no
deployment), and an independent review of Atlas network access rules.

---

## 12. Known limitations and unresolved issues

1. **Primary blocker:** Atlas-backed acceptance testing is unverified (section 10). Do not treat
   persistence, seeding or cross-user isolation as proven until that suite runs.
2. **TypeScript pin:** TypeScript 7 cannot run on Termux/Android ARM64; 5.9.3 is used. Revisit
   only if a compatible native package appears.
3. **`server/.env`:** an empty copy of `.env.example` appeared in the working tree during the
   task (timestamp later than the example). It contains no secrets, is ignored by `.gitignore`,
   and was not deleted because its origin is not confirmed. Empty values are treated as unset.
4. **Development sessions:** without `MONGODB_URI`, development falls back to Express’s
   in-memory session store with a warning. Production refuses this configuration.
5. **Cookie name in development:** `kaos_session` instead of `__Host-kaos_session`, because
   `__Host-` requires HTTPS; production uses the approved name.
6. **No email verification or password reset:** not part of S1.
7. **No global API rate limit:** limiting is applied to authentication endpoints, as required;
   other routes rely on session auth and validation.
8. **Content scope:** courses 02–08 contain only their approved first module; this is deliberate
   S1 scope, not missing content.
9. **Editorial review:** content is accurate to the best of the implementation session’s
   knowledge and avoids investment claims, but has not had a separate subject-matter review.
10. **Visual/accessibility QA:** no desktop browser was connected, so no screenshot-based visual
    review or automated accessibility audit was run. The production CSS/HTML build succeeds and
    semantic/ARIA affordances are implemented, but this is not a substitute for a visual audit.
11. **Deployment:** not performed. Render configuration, PWA and submission work remain S7.
12. **Report scope:** no implementation plan or architecture document was rewritten; those
    remain as they were.

---

## 13. Confirmation that S2 and later slices were not started

Confirmed. No S2–S7 feature, placeholder, disabled control, dependency or database field was
added. Specifically absent:

- No quizzes, grading, XP, achievements or rewards.
- No playground/simulator.
- No AI tutor, OpenRouter client, model configuration or chat UI.
- No NWC wallet, invoices, payments or Lightning settlement.
- No payment state machine, receipts or failure taxonomy.
- No PWA manifest/service worker or deployment configuration.
- No `accessLevel`, entitlements, subscriptions, premium middleware, checkout, pricing or
  upgrade UI.

Searching application source for `accessLevel|entitlement|subscription|premium|checkout|pricing|
upgrade|quiz|openrouter|nwc|payment sdk` returns only the educational phrase “daily pricing” in
lesson prose. No later-slice dependencies are installed.

---

## 14. Confirmation that PRD and OD-001 were left unchanged

- `PRD.md` was not edited, renamed, reformatted, deleted or regenerated. Its SHA-256 is
  `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`, matching the value in
  `PRD-MD-SHA256.txt`.
- `PRD-ORIGINAL.txt` remains unchanged at SHA-256
  `7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed`.
- `PRD.txt` and `PRD-SHA256.txt` were not modified.
- `OD-001` in `ENGINEERING-DECISIONS.md` remains **Open**; it was not resolved or edited.
- No `docs/` directory was created.
- No existing report was overwritten; this is a new file.
- No Git operation, commit, branch, push or deployment was performed.

---

## Appendix: key commands

```text
# install (already completed; individual installs were used)
cd server && npm install <package>            # production dependencies
cd server && npm install -D <package>         # development dependencies
cd client && npm install <package>
cd client && npm install -D <package>

# development
npm run dev                                   # Express :4000 + Vite :5173

# production build and start
npm run build
npm run seed                                  # requires MONGODB_URI
npm start

# verification
npm run typecheck
npm test
RUN_DB_TESTS=1 npm test                       # requires MONGODB_URI
sha256sum PRD.md PRD-ORIGINAL.txt
```

End of report.
