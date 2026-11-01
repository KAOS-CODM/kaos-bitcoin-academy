# KAOS Bitcoin Academy — Zero-Budget Feasibility & Future Expansion Addendum

**Date:** November 1, 2026
**Mode:** Read-only audit. Nothing provisioned, installed, deployed or modified except this report.
**Authoritative spec:** `PRD.md` (immutable; checksum verified before and after writing)
**Scope:** Can the product be delivered at **₦0 additional project expenditure**, and what must be true for that claim to hold?

### Label legend

| Label | Meaning |
|---|---|
| **[V]** | Verified — checked against a live source, official documentation, or the local repository on 1 Nov 2026 |
| **[D]** | Existing project decision — recorded, with its status as currently written |
| **[R]** | Recommendation — this report's proposal, **not approved** |
| **[A]** | Assumption — plausible, not verified |
| **[U]** | Unverified — could not be confirmed; must be checked before relying on it |
| **[F]** | Future expansion proposal — explicitly outside the hackathon |

> **Note on decision IDs.** `ENGINEERING-DECISIONS.md` currently records **only OD-001** (Status: Open). The identifiers D-01…D-15 are proposals from `reports/ARCHITECTURE-CORRECTIONS-AUDIT.md` (lines 127–152), all marked Pending. P-01…P-04 come from `reports/PRODUCT-AND-LEARNING-ARCHITECTURE-AUDIT.md` §13. This addendum does not promote any of them.

---

## 1. Executive Summary

Zero-cash delivery is **achievable for the entire educational product**, and **not guaranteed for the one requirement that involves real money**.

| Area | ₦0 feasibility | Basis |
|---|---|---|
| Accounts, catalogue, lessons, progress | **Yes** | Render Free + Atlas Free + open-source stack |
| Quizzes, XP, completion | **Yes** | Server-side logic, no external service |
| Playground simulations | **Yes** | Client-side only, no network |
| AI tutor | **Yes, with a hard daily ceiling** | 50 free-model requests/day **[V]** |
| Wallet connection (NWC) | **Yes** | Browser-held secret; no funds required |
| Invoice generation (AC-013) | **Yes, if a receiving wallet exists** | Issuing an invoice costs nothing; receiving capability is the open question **[U]** |
| Real payment + verification (AC-014) | **No — conditional** | Requires funded sats and a receiving endpoint; neither is provided by the free tier |
| Public deployment (AC-017) | **Yes** | Render Free, `*.onrender.com` |

**Three findings change the plan:**

1. **The AI constraint is 50 requests per day, not cost.** OpenRouter's free-model tier allows **20 requests/minute and 50 requests/day** for accounts that have purchased fewer than 10 credits all-time **[V]**. A 30-person demo can exhaust the day's tutor quota by mid-morning. The tutor must therefore ship with a **curated fallback**, not a broken chat.

2. **AC-014 cannot be promised at ₦0.** PRD AC-014 reads: *"A guided payment can be completed and verified"*, and the Definition of Done requires *"A complete demonstration can be performed without relying on mock payment results"* **[V]**. Simulations and testnet cannot satisfy either. This is an unresolved feasibility conflict, documented in §6 and §11 — **not** silently downgraded.

3. **Atlas managed backups are not part of the ₦0 plan.** The free-tier documentation says backups *can be enabled* on Free clusters, but it does not establish that enabling them is free of charge or free of a payment method **[U]**. Until the cost and payment requirements are independently verified as zero, managed backups are **excluded** from the zero-additional-spend plan. Recovery relies on manual exports — verified before being depended on — plus version-controlled lesson source files. A content export is **not** a complete backup of learner accounts and progress.

**Bottom line:** approve **D-15, D-04, D-09 / P-04, P-03 and Z-01** — five approvals — and Slice 1 starts immediately at ₦0. AC-014 is the only requirement needing a decision that money or a sponsor must answer.

---

## 2. Revised Product and Monetisation Strategy

### 2.1 What ships now — free by decision, not by accident

| Item | Status | Source |
|---|---|---|
| Free educational access | **Approved** | `PRD.md` §24 |
| Paid subscriptions | **Excluded from MVP** | `PRD.md` §16 |
| Access model declared as "Free educational platform" | **Approved** | `PRD.md` header |
| Paywalls, checkout, tiers | **Not present, not planned for submission** | — |

The hackathon release has **no** paywall, subscription, checkout, paid tier, entitlement check, or payment requirement. This is not a temporary limitation to be hinted at in the UI; it is the approved product.

**Explicitly forbidden in the build:** fake subscription records, disabled "Upgrade" buttons, pricing pages, "premium coming soon" banners, and unused payment SDKs. Each is a promise the code cannot keep.

### 2.2 Future tiers — proposals only

| Tier | Contents | Architecture impact | Effort |
|---|---|---|---|
| **Free** (now) | Beginner courses, lessons, checks, progress, simulations, core practicals, basic tutor | None beyond today's build | — |
| **Premium** **[F]** | Advanced technical courses, specialist paths, extended labs, advanced tutoring, extra assessments | A server-side entitlements check introduced **only when a real premium offering is approved**; no change to the learning model | **Low–moderate** — additive authorisation at an existing boundary |
| **Institutional / partner** **[F]** | Cohort management, organisational reporting, sponsored programmes, custom environments | Adds `organisations`, `cohorts`, `memberships`; reporting queries; role separation — a **separate** extension | **Moderate** — new collections and authorisation scopes |

**Assessment:** the existing authentication and course architecture can accommodate a premium tier later **without restructuring**, because course content is already data with a publication status and authorisation is already server-side. The institutional tier is a genuine extension, not a flag — it needs organisational identity and reporting, which is why it is kept separate.

**Do not build any of this now.** Nothing in this table is implemented in the hackathon, and **no schema field is added for a hypothetical product**.

---

## 3. Access-Control Architecture Recommendation

### 3.1 The principle

**Authentication** answers *who is this learner*. **Authorisation** answers *may this learner access this course*. They are separate concerns, and only the server can answer the second.

A frontend route guard is **navigation**, never security. Any restriction that exists only in React is a restriction a learner can remove with developer tools.

### 3.2 What ships in the hackathon

**[R] The hackathon build has no monetisation infrastructure at all:**

1. **Published courses are accessible to every learner** — including the account-free preview permitted by PRD §8.1 (P-03). There is no gate, because there is nothing to gate.
2. **Authentication and authorisation stay conceptually separate.** The session answers *who this learner is*; every protected operation independently checks *may this learner act on this record*.
3. **Server-side validation is mandatory for protected operations** — writing progress, submitting a quiz, opening a tutor session, storing a wallet connection. Ownership of the record is checked against the session on the server, not inferred from a client-supplied id.
4. **Frontend guards are navigation only.** A route guard may redirect an anonymous visitor to sign-in; it never constitutes access control.

**Not built, not stubbed, not scaffolded:** `accessLevel` or any similar monetisation-specific field, an `entitlements` collection, subscription or plan records, premium-access middleware, payment dependencies, and any unused authorisation hook whose only purpose is a hypothetical product.

### 3.3 Future expansion — documented, not built

**[F] When a real premium offering is approved**, server-side course entitlements can be introduced additively:

- An `entitlements` collection keyed by learner and course or plan, recording source, validity window and status.
- A single authorisation check at the existing lesson-read boundary — the same boundary that already verifies the learner is authenticated.
- A commercial marker on a course, added **at that point**, when there is a real offering to mark.

Because content is already data with a publication status and authorisation is already server-side, this is an extension at one existing boundary, not a redesign. Existing learners are unaffected: anything without an explicit commercial marker stays open.

**Institutional features are a separate future architectural extension** — organisations, cohorts, memberships and reporting scopes. They are not a flag on the learner model and are not part of this plan.

### 3.4 What not to build

| Do not build | Why |
|---|---|
| `accessLevel` or similar fields | No current requirement; adding them now is speculative schema |
| Entitlement or subscription collections | No subscriber, no plan, no offering exists |
| Premium-access middleware | Nothing to enforce; an unused hook is dead code with a security-shaped surface |
| Checkout placeholders | PRD §16 excludes them; a dead button is a false promise |
| Client-side gating | Not security |
| "Premium" badges on content | Implies gating that does not exist |

---

## 4. Technology Stack and Infrastructure Assessment

All components below are ₦0: open-source packages and free tiers. No paid upgrade is required by this design.

| Component | Why needed | Appropriate for hackathon | Free-tier limits **[V]** | Operational risk | Fallback | ₦ cost |
|---|---|---|---|---|---|---|
| **React + TypeScript + Vite** | UI, typing, static build | Yes | None (build-time) | Native binaries on Termux **[U]** | Pre-built deps / pure-JS alternative | ₦0 |
| **Tailwind CSS** | PRD palette, responsive layout | Yes | None | None material | Plain CSS | ₦0 |
| **React Router** | Deep-linkable lessons, resume | Yes | None | None | Hand-rolled router (not advised) | ₦0 |
| **TanStack Query** | Server-state caching, retries | Yes | None | Over-fetching if keys are careless | `fetch` + `useEffect` | ₦0 |
| **Node + Express + TypeScript** | API, sessions, validation | Yes | None | Express 5 async error handling must be centralised | Fastify | ₦0 |
| **Zod** | One schema per boundary | Yes | None | Schema drift if duplicated | Manual validation | ₦0 |
| **MongoDB Atlas Free + Mongoose** | Persistence | Yes | **0.5 GB**, **500 connections**, 100 ops/s, 30-day idle pause, 3-node replica set, MongoDB 8.0 | Storage is finite; cluster pauses; single region | Local `mongod` is **not available** here **[V]** — no fallback on-device | ₦0 |
| **OpenRouter free model** | AI tutor | Yes, with a ceiling | **20 req/min, 50 req/day** (<10 credits all-time); 1000/day (≥10 credits) | Model churn; quota exhaustion; provider data policy | Curated help panel (§5) | ₦0 |
| **Render Free web service** | Hosting | Yes | **750 instance-hours/month**, **512 MB RAM, <1 CPU**, **spins down after 15 min idle**, **ephemeral filesystem** | Cold start; no SLA; single instance | Warm-up + cached shell + recorded demo | ₦0 |
| **Free `onrender.com` subdomain** | Public URL | Yes | Shared domain | None | — | ₦0 |

### 4.1 Database configuration that must be verified before implementation

**[R] Owner checklist — these are account-level facts I cannot verify from here:**

1. Cluster is **Free (M0)** and **not paused** (pauses after 30 days with zero connections) **[V]**.
2. Cluster region relative to the Render region — cross-continent latency is noticeable on cold queries.
3. Storage headroom against **0.5 GB**; content is text-only, so the expected footprint is a few MB **[A]**.
4. **Managed backups are excluded from the ₦0 plan** unless their cost and payment requirements are independently verified as zero **[U]**. Do not enable a paid backup feature. Recovery expectations are set in §7.5.
5. **IP access list** — Render's egress IPs are not static **[A]**, so `0.0.0.0/0` is the likely requirement. Compensate with a strong password and a least-privilege user.
6. **Database user** has `readWrite` on the application database only — not `atlasAdmin`.
7. **Connection cap 500** **[V]** — application pool must be small (10 is ample for one instance).
8. **MongoDB 8.0** **[V]** — confirm the chosen Mongoose major supports it.
9. **Replica set of 3** **[V]** — multi-document transactions are available if payment intents need them.
10. Whether the cluster is shared with another project; if so, storage and connection budgets are shared too.

### 4.2 Deliberate non-choices

| Rejected | Reason |
|---|---|
| Next.js | A server runtime the PRD does not need; larger surface on 512 MB |
| Separate frontend/backend hosts | Breaks same-origin cookies; adds a second free-tier dependency |
| Redis | Sessions can live in Atlas; a second service is a second failure |
| Vector database | The tutor is lesson-scoped; retrieval is a string lookup |
| Docker | Not available locally **[V]**; Render builds from source |
| Paid AI fallback wired in | Would create expenditure; documented but **disabled by default** |

---

## 5. AI Tutor Feasibility

### 5.1 What the free tier actually allows

| Limit | Value | Consequence |
|---|---|---|
| Requests per minute (free models) | **20** **[V]** | Per-learner cap of 3/min is comfortable |
| Requests per day, <10 credits purchased all-time | **50** **[V]** | **The binding constraint** |
| Requests per day, ≥10 credits purchased | 1000 **[V]** | Would require spending; **not** part of this plan |
| Model availability | 17 zero-priced variants on 1 Nov 2026 **[V]** | Churns without notice |

**[R] Preferred entry point: OpenRouter's `openrouter/free` router.** **[V]** It is listed as a zero-priced model with a 200k context window on 1 Nov 2026, and it selects among currently available free models rather than pinning the application to one vendor's model ID.

```
OPENROUTER_MODEL=openrouter/free   # default
OPENROUTER_MODEL=<explicit-id>     # optional override, when a specific model is required
```

- **Default to the router; allow a configurable override.** Model choice is configuration, never application logic.
- **Do not depend on a fixed list of model IDs** as a permanent guarantee. Today's catalogue (17 zero-priced variants on 1 Nov 2026) is evidence of current availability, not a commitment. No individual ID is dependable.
- **Treat availability and rate limits as operational dependencies.** Handle 404/429/5xx, record which model answered, and fall through to the curated panel.
- **Do not purchase credits to raise quotas.** The 1000/day tier is documented for completeness only and is not part of this plan.

### 5.2 The daily budget is a shared budget

Fifty requests is not fifty per learner; it is fifty for the whole deployment. **[R] Allocation:**

- 3 requests/learner/day (enough for a question, a simplification, and a follow-up).
- Global ceiling 45/day, reserving 5 for the demo window.
- Exhaustion is a **normal state**, not an error: the UI switches to curated help with an honest notice.
- The ceiling **cannot be raised without purchasing credits**, which this plan excludes. The design must work inside it, not hope to exceed it.

### 5.3 The fallback must be worth using

**[R] "Lesson Help" panel** — deterministic, generated from the same content the tutor grounds on:

1. The lesson's three key points, verbatim from the published content.
2. Glossary entries for every technical term on that page.
3. Three suggested questions with **curated** answers written by the author.
4. A link to the exact section that answers the most common confusion.
5. A one-line explanation of *why* the tutor is unavailable.

This is not a chat, and it must not pretend to be. It is labelled **"Curated help — the AI tutor has reached today's free limit."** A learner can still finish the lesson; they simply lose free-form questioning.

### 5.4 Availability and privacy

- **Churn [V]:** free model IDs rotate; a chain plus fallback is mandatory, not defensive polish.
- **Data policy [V]:** OpenRouter documents that free models have a **separate** training setting, and that opting out of training prevents routing to providers that train. **[R]** Enable the free-model training opt-out and disclose in the tutor UI that questions are processed by a third-party model. **[U]** The exact effect of that setting on free-model availability is unverified and must be tested.
- **Key handling [V]:** `OPENROUTER_API_KEY` is server-side only, never in the bundle, never in logs. A client-side key would be extracted in minutes.
- **Input limits:** 2,000 characters, 10 requests/minute/learner, learner text delimited as untrusted. The tutor has **no tools and no database access**.

### 5.5 Does the core product survive without AI?

**Yes.** Lessons, quizzes, progress, simulations and the dashboard have no dependency on the provider. Only FR-008 / AC-010 / AC-011 depend on it, and those are **conditional on the free model being available at demonstration time**. That conditionality is recorded in §11 rather than hidden.

---

## 6. Educational Lightning Payment Feasibility

### 6.1 The three environments are not interchangeable

| Environment | What it proves | Cost | Satisfies AC-014? | Satisfies the Definition of Done? |
|---|---|---|---|---|
| **Simulation** | The learner understands the flow | ₦0 | **No** | **No** — "without relying on mock payment results" |
| **Testnet / regtest** | The mechanics work on a real protocol | ₦0 (hosted testnet) **[U]** | **No** — not a real payment | **No** |
| **Mainnet** | A real invoice was paid and verified | Requires sats + a receiving endpoint | **Yes** | **Yes** |

**[R] Testnet and regtest are excellent rehearsals and must never be presented as AC-014 evidence.**

### 6.2 What can be built at ₦0

| Capability | Buildable now | Note |
|---|---|---|
| Invoice inspection UI | **Yes** | An invoice is a string; rendering it costs nothing |
| Wallet connection (NWC) | **Yes** | `get_info` round trip; no funds, no payment |
| Payment state machine | **Yes** | Build against fakes; states are protocol states |
| Failure taxonomy (AC-015) | **Yes** | Expiry vs refusal vs unknown are logic, not money |
| Receipt UI | **Yes** | Populated only by verified data |
| Invoice generation (AC-013) | **Yes, if a receiving wallet exists** | Creating an invoice costs ₦0; **receiving** capability is the open question **[U]** |
| Real settlement (AC-014) | **No** | Requires funded sats and a working receive path |

### 6.3 The exact external resources a real payment needs

1. **A receiving wallet** that can issue invoices and report settlement, reachable over NWC or an equivalent API, with **inbound capacity**.
2. **A payer with sats** — either the learner's own wallet or sponsored funds.
3. **A fixed amount** (recommendation: 21 sats) and an explicit disclosure of who receives it and why.

The free tier supplies **none** of these. It supplies hosting and a database.

### 6.4 Funding paths — none chosen

| Path | Owner spend | Learner spend | Requirements | Honest assessment |
|---|---|---|---|---|
| **Learner-funded** | **₦0** | 21 sats | Learner already holds sats in an NWC-capable wallet; receiving wallet exists | Cheapest for the project, but **assumes a funded learner**, which the PRD says cannot be assumed |
| **Sponsor-funded** | **₦0** | ₦0 | A consenting partner supplies receiving wallet and funds; written agreement | Best experience; requires a real partner, not a hypothetical one |
| **Academy-funded** | > ₦0 | ₦0 | Owner funds a float | **Violates the zero-budget constraint** — excluded |
| **Custodial free wallet as receiver** | **₦0** | 21 sats | A no-cost wallet with NWC receive support | **Unverified** — must be tested before being promised |

**[R]** If a real payment is to be demonstrated, the **learner-funded** path is the only one that respects ₦0 without a partner, and the **sponsor** path is the only one that works for a learner without sats. **P-01 and P-02 remain open; this report does not choose, and it does not commit the owner to learner-funded payments** — that path is described, not adopted.

### 6.5 The unresolved conflict, stated plainly

- **PRD AC-014 [V]:** *"A guided payment can be completed and verified."*
- **PRD Definition of Done [V]:** *"A complete demonstration can be performed without relying on mock payment results."*
- **Zero-budget constraint:** no funds, no paid receiving infrastructure.

At ₦0, AC-014 holds **only if** a learner-funded payment meets a working no-cost receive path, or a sponsor provides one. Neither is verified. The options for the owner are:

1. Secure a sponsor or confirm the learner-funded path (**preserves AC-014**).
2. Approve a documented deviation: demonstrate AC-012/AC-013/AC-015 plus a testnet payment, and **report AC-014 as not met** (**preserves honesty**, breaks the requirement).
3. Accept the requirement is unmet and say so in the submission.

**Do not pick option 2 or 3 on the owner's behalf.** The PRD is not amended by this report.

---

## 7. Deployment and Operational Plan

### 7.1 Topology

```
Browser  ──HTTPS──▶  Render Free (single origin)
                       ├── /            → built SPA (dist/)
                       ├── /api/*       → Express
                       └── session      → Atlas (TTL index)
                              │
                              └──▶ Atlas Free (M0), eu/af region per owner
                       Express ──▶ OpenRouter (server-side key)
```

One origin. No CORS configuration is needed for the application itself; if a `cors` middleware is included, it must allow only `APP_ORIGIN`.

### 7.2 Configuration

| Variable | Purpose | Handling |
|---|---|---|
| `MONGODB_URI` | Atlas connection | Render environment, never committed |
| `SESSION_SECRET` | Cookie signing | 32+ random bytes, rotated per environment |
| `OPENROUTER_API_KEY` | Tutor | Server-side only |
| `OPENROUTER_MODEL` | Free-model entry point | Defaults to `openrouter/free`; an explicit model ID may override it without a code change |
| `APP_ORIGIN` | Cookie origin / links | `https://<name>.onrender.com` |
| `NODE_ENV` | Production behaviour | `production` |
| `PORT` | Injected by Render | Do not hardcode |

**Session cookie:** `__Host-kaos_session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain`. Requires `app.set('trust proxy', 1)` on Render — without it, `Secure` cookies are dropped and login silently fails.

### 7.3 Database connection management

- Connect **once** at boot; reuse the pool. `maxPoolSize: 10` against the 500 cap.
- `serverSelectionTimeoutMS: 8000` so a paused cluster fails fast with an actionable message instead of hanging the request.
- Retry with capped backoff on cold start; expose `/api/health` returning `{ status, db }` only.
- Graceful shutdown on `SIGTERM`: stop accepting, close the server, close Mongoose.

### 7.4 Logging and errors

- `pino`, JSON, request id per request.
- **Redact:** `req.headers.cookie`, `req.headers.authorization`, `MONGODB_URI`, `OPENROUTER_API_KEY`, any field named `secret`, `preimage`, `nwc`.
- Client-facing errors: `{ error: { code, message } }`; stack traces never leave the server.

### 7.5 Backups and recovery

| Layer | Mechanism | Status |
|---|---|---|
| **Managed database backups** | Atlas backup feature | **Excluded from the ₦0 plan** unless cost and payment requirements are independently verified as zero **[U]**. Not enabled by this plan |
| **Manual database export** | `mongodump` of content and progress to device storage, where the environment supports it | **[R]** Manual, before 18 November. **Not yet tested** — run and verify a restore before relying on it |
| **Lesson source** | Version-controlled seed files in the repository | Recoverable content source; **does not include learner records** |
| **Learner accounts and progress** | Live data in the cluster only | A content export is **not** a complete backup of learner accounts and progress. This gap is acknowledged, not solved |
| **Uploaded files** | None — the application accepts no uploads | Avoids the ephemeral-filesystem trap entirely |

**Recovery honesty:** manual export is a mitigation, not a guarantee. It may not capture every collection, it depends on a working local `mongodump` toolchain **[U]**, and it has **not been tested in this environment**. No restore has been demonstrated, and this report does not claim one has. A content export protects authored material; it does not protect learner accounts or progress. That residual risk is stated in §9 (R4) rather than papered over.

### 7.6 Render billing safeguard

Free-tier deployment is recommended, with an explicit condition attached:

1. **Verify the account's billing configuration and usage limits before deployment.** Confirm whether a payment method is attached, whether any paid resource is active, and what the account's spending controls are. **[U]** — this report did not access the Render account and cannot confirm any of it.
2. **Do not enable paid upgrades or paid instances.** Starter instances, extra instance hours, persistent disks and paid databases are all out of scope.
3. **Do not assume that exceeding free limits is harmless.** Free-tier behaviour is not a contractual guarantee against charges, and account configuration can change the consequences of overage **[U]**. Treat "it will simply stop working" as unverified.
4. **If the account configuration cannot guarantee ₦0 additional charges, document the uncertainty and require owner verification before deployment.** That verification is a prerequisite for S7, not an optional check.

**The 750-hour cap is a design constraint, not a budget.** Staying inside it is achieved by not running a 24/7 keep-alive (§7.7), not by paying for more hours.

### 7.7 Remaining demonstrable despite free-tier limits

| Risk | Mitigation |
|---|---|
| 15-minute spin-down **[V]** | Warm-up request 60–90 s before any demo; service worker serves the shell instantly |
| Cold start latency | Skeleton UI on first paint; health check shows "waking the server" rather than an error |
| 750-hour monthly cap **[V]** | Do **not** keep a 24/7 keep-alive (~730 h/month would consume nearly all headroom). Warm only during demo windows |
| Atlas idle pause **[V]** | Check 24 h before the demo; resume early |
| Single instance | No in-memory state that matters; sessions in Atlas |
| Judge opens the URL cold | Short recorded walkthrough as a **backup**, never as a substitute for the live app |

---

## 8. Revised Implementation Roadmap

Dates respect PRD §18 (Learning core Nov 3–8, Integrations Nov 9–13, Stabilization Nov 14–17, Submission Nov 18–20).

| Slice | Window | User-visible result | PRD | ₦0 status | External dependency |
|---|---|---|---|---|---|
| **S1** | Nov 3–6 | Register, read a real lesson, progress persists, dashboard reflects it | FR-001–004, FR-011; AC-001–004, AC-007 | **Yes** | Atlas |
| **S2** | Nov 6–8 | Quizzes with feedback, XP, completion | FR-005, FR-006, FR-012; AC-005, AC-006 | **Yes** | Atlas |
| **S3** | Nov 4–8 (parallel) | Six labelled simulations | FR-007; AC-008, AC-009 | **Yes** | None |
| **S4** | Nov 9–11 | Tutor grounded in the current lesson + curated fallback | FR-008; AC-010, AC-011 | **Yes, capped at 50/day** | OpenRouter free model |
| **S5** | Nov 10–12 | Connect a wallet, inspect a real invoice | FR-009; AC-012, AC-016 | **Yes** | NWC relay + wallet |
| **S6a** | Nov 12–15 | Payment state machine, failure taxonomy, receipt UI, verification adapter | FR-010 (partial); AC-013, AC-015 | **Yes** — built against fakes | Receiving wallet (for AC-013) |
| **S6b** | Nov 14–16 | **Real** settlement, verified | AC-014 | **Conditional** | Funds + receive path |
| **S7** | Nov 16–18 | Installable, accessible, deployed, documented | AC-017, AC-018 | **Yes** | Render |

**The S6a/S6b split is the key structural change.** Everything about payments that is *logic* can be built and tested at ₦0. Only the *settlement event* requires money. Separating them means an unfunded AC-014 does not block the rest of the payment feature from shipping, and it prevents a fake result from being dressed up as a real one.

**Parallelism:** S3 has no backend dependency and can start on day one. S4 depends only on S1's content. S5 depends on the wallet spike (D-11) but not on S6.

**Deferred:** FR-013 (paths), FR-014 (certificates), FR-015 (community), FR-016 (advanced tracks), offline writes, badge engine, institutional features, i18n.

**Do not assume all nine roadmap items complete.** Content authoring remains the largest single risk; see §9.

---

## 9. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Free model withdrawn or rate-limited at demo | **High** | Medium | Model chain + curated fallback + demo reserve |
| R2 | 50/day quota exhausted mid-demo | **High** | Medium | Per-learner cap, global cap, reserve, honest notice |
| R3 | Render asleep when a judge opens the link | High | Medium | Warm-up, skeleton UI, cached shell, video backup |
| R4 | Atlas cluster paused, full, or lost | Medium | High | Pre-demo check; text-only content; monitoring; **no managed backup** — manual export only, and it does not cover learner records (§7.5) |
| R5 | **AC-014 unfunded** | **High** | **High** | Owner decision in §6.5 — cannot be engineered away |
| R6 | No persistent disk | Medium | Medium | No uploads; no local writes; content in DB |
| R7 | Termux cannot build native modules | Medium | Medium | Verify before S1 (Test D); prefer pure-JS or prebuilt |
| R8 | Content authoring overruns | **High** | High | Depth-first: Bitcoin 101 complete, others first module |
| R9 | Free-model training policy on learner text | Medium | Medium | Enable opt-out; disclose; no PII in prompts |
| R10 | Single instance restart mid-session | Medium | Low | Sessions in Atlas; health check; retry |
| R11 | `trust proxy` misconfigured → silent login failure | Medium | High | Explicit test on the deployed URL, not just localhost |
| R12 | Sponsor promised but not delivered | Medium | High | Written confirmation before S6b is scheduled |
| R13 | Render account configuration permits charges when free limits are exceeded | Low–Medium | High | Owner verifies billing configuration and spending controls before deployment; no paid resources enabled; treat overage as potentially billable until verified **[U]** |

**R5 and R13 are the only risks with no technical mitigation.** R5 needs funding; R13 needs owner verification of the hosting account's billing configuration. Every other row has an engineering answer.

---

## 10. Decision Register

Categories: **Now** (approve to start), **Verify** (needs a fact, not a preference), **Sponsor** (needs external resources), **Defer** (not on the critical path).

| ID | Question | Category | Recommendation | Blocks |
|---|---|---|---|---|
| **D-15** | Scaffold, dependency batch, use the existing Atlas cluster | **Now** | Approve | S1 |
| **D-04** | Single-origin topology | **Now** | Approve | S1 (cookie flags) |
| **D-09 / P-04** | Curriculum scope at submission | **Now** | Bitcoin 101 complete + first module of 02–08 | Content work |
| **P-03** | Preview lesson without an account | **Now** | Yes, one lesson (PRD §8.1 permits) | S1 route guard |
| **Z-01** *(new)* | Free-model operating policy: `openrouter/free` default, configurable override, 50/day cap, curated fallback, training opt-out | **Now** | Adopt as described | S4 |
| **Z-02** *(new)* | AC-014 path: sponsor vs learner-funded vs documented deviation | **Sponsor** — does **not** block S1 | Owner's call; **no funding decision is made by this report** | S6b, DoD claim |
| **D-07** | Offline scope | Defer (default: read-only cache) | Read-only PWA | S7 |
| **D-02** | NWC custody model | Verify | Browser-held, memory only | S5 |
| **D-01** | Receiving-wallet architecture | Verify | LNbits invoice key **or** academy NWC wallet | S6 |
| **D-06** | Controlled test environment | Verify | Testnet rehearsal before mainnet | S6 |
| **D-11** | Wallet validation spike | Verify | Run before S5 | S5 |
| **D-03, D-05, D-08, D-10, D-12 (OD-001), D-13, D-14** | — | Defer | Unchanged | — |
| **P-01** | Payment recipient | **Sponsor** — does **not** block S1 | Unresolved until a feasible receiving wallet and funding arrangement exist | S6 |
| **P-02** | Amount and funding | **Sponsor** — does **not** block S1 | Unresolved; this report does **not** commit the owner to learner-funded payments | S6b |

**The five S1 approvals are D-15, D-04, D-09 / P-04, P-03 and Z-01.** Z-02, P-01 and P-02 do not block S1, and no payment funding decision is made here.

**Nothing in this table is approved by this report.** Z-01 and Z-02 are the only identifiers introduced here, because the zero-budget strategy created two decisions the existing register did not cover.

---

## 11. PRD Traceability and Unresolved Requirements

### 11.1 Functional requirements

| ID | Requirement **[V]** | ₦0 status |
|---|---|---|
| FR-001 | Users can register and authenticate | **Deliverable** |
| FR-002 | Users can access the course catalogue | **Deliverable** |
| FR-003 | Users can view lessons | **Deliverable** |
| FR-004 | Users can complete lessons | **Deliverable** |
| FR-005 | Users can complete quizzes | **Deliverable** |
| FR-006 | Learning progress is persisted | **Deliverable** |
| FR-007 | Users can access the Bitcoin playground | **Deliverable** |
| FR-008 | Users can interact with the AI tutor | **Conditional** — free-model availability |
| FR-009 | Users can connect a compatible Lightning wallet | **Deliverable** |
| FR-010 | Users can complete a guided Lightning payment | **Conditional** — real settlement |
| FR-011 | Users can view their learning dashboard | **Deliverable** |
| FR-012 | Users can earn XP and achievements | **Deliverable** (simplified) |
| FR-013 | Users can access multiple learning paths | Deferred (P1) |
| FR-014 | Users can receive completion certificates | Deferred (P2) |
| FR-015 | Users can access community learning features | Deferred (P2) |
| FR-016 | Developers can access advanced technical courses | Deferred (P2) |

### 11.2 Acceptance criteria that are affected

| ID | Criterion **[V]** | ₦0 status |
|---|---|---|
| AC-010 | The AI tutor answers questions using educational context | **Conditional** |
| AC-011 | The AI tutor handles unsupported questions safely | **Conditional** |
| AC-012 | A compatible Lightning wallet can be connected | **Deliverable** |
| AC-013 | The platform can generate or handle a real Lightning payment request | **Deliverable if a receiving wallet exists** **[U]** |
| AC-014 | A guided payment can be completed and verified | **Not guaranteed at ₦0** |
| AC-015 | Payment failures are communicated accurately | **Deliverable** |
| AC-016 | Wallet secrets are not exposed in logs or frontend bundles | **Deliverable** |
| AC-017 | The application is accessible through a public deployment | **Deliverable** |
| AC-018 | The repository includes setup and architecture documentation | **Deliverable** (needs Git approval) |

### 11.3 Definition of Done — clause-by-clause

| Clause **[V]** | Status at ₦0 |
|---|---|
| The public application works | **Yes** |
| A beginner can complete the introductory learning journey | **Yes** |
| Lessons and quiz progress persist | **Yes** |
| The playground provides functional demonstrations | **Yes** |
| The AI tutor works with contextual content | **Conditional** |
| An actual Lightning wallet integration is operational | **Yes** (connection) |
| A guided payment can be completed and verified | **Conditional** |
| Critical security checks pass | **Yes** |
| Repository and documentation publicly accessible | **Yes** (Git approval required) |
| No reliance on mock payment results | **Blocked** unless §6.5 resolves |

### 11.4 Other PRD constraints

- **§16** excludes paid subscriptions, payment-gating and trading from the MVP — consistent with the free-first model.
- **§24** records *Free educational access* as **Approved** and *AI provider* as **To be evaluated** — OpenRouter is therefore a recommendation requiring approval **[V]**.
- **§17** palette is already contrast-verified (`#FFFFFF` 18.37:1, `#A8A29E` 7.28:1, `#F5B942` 10.41:1 on `#17140F`).
- **OD-001** remains **Open**; no `docs/` directory is created by this report.

---

## 12. Final Build-Readiness Recommendation

**The project is ready to begin Slice 1 at ₦0 — conditional on five approvals.**

| # | Approval | Why it is the gate |
|---|---|---|
| 1 | **D-15** | Nothing may be scaffolded or installed without it |
| 2 | **D-04** | Cookie and session code in S1 depends on the topology |
| 3 | **D-09 / P-04** | Determines which content is authored first |
| 4 | **P-03** | Changes the S1 route guard |
| 5 | **Z-01** | The tutor's default model, cap and fallback are design, not an afterthought |

**Not required to start:** D-01, D-02, D-06, D-11 (S5/S6), and Z-02, P-01, P-02 (S6b). **No funding decision is being made by this report**, and the owner is **not** committed to learner-funded payments.

**The one thing that cannot be engineered away:** AC-014 and the Definition of Done's *"without relying on mock payment results"* require real sats and a real receive path. Zero budget does not supply them. The owner must choose between securing a sponsor, relying on learner-funded payments, or recording a documented deviation. I have not chosen, and no implementation should proceed past S6a while it is unresolved.

**No further audit is recommended.** After this report, the next action is implementation under approval — and, separately, one decision about whether the payment demonstration will be real.

---

## Appendix — Sources and Verification

| Source | URL | Accessed | Used for |
|---|---|---|---|
| OpenRouter rate limits | https://openrouter.ai/docs/api-reference/limits | 1 Nov 2026 | 20 req/min; 50/day (<10 credits); 1000/day (≥10); threshold 10 |
| OpenRouter privacy policy | https://openrouter.ai/docs/features/privacy-and-logging | 1 Nov 2026 | Separate free-model training setting; provider data policies |
| OpenRouter model catalogue | https://openrouter.ai/api/v1/models | 1 Nov 2026 | `openrouter/free` listed zero-priced, 200k context; 17 zero-priced variants total |
| Render Free docs | https://render.com/docs/free | 1 Nov 2026 | 750 hours; 15-minute spin-down; ephemeral filesystem |
| Render pricing | https://render.com/pricing | 1 Nov 2026 | Free: 512 MB RAM, <1 CPU, $0 |
| Atlas free-tier limits | https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ | 1 Nov 2026 | 0.5 GB; 500 connections; 100 ops/s; 30-day pause; MongoDB 8.0. Backup availability is noted on the page, but **cost and payment requirements were not verified** — hence excluded (§7.5) |
| `PRD.md` | local, immutable (sha256 `1e73e32c…50c23d`) | 1 Nov 2026 | §7, §16, §17, §18, §24, §25, FR/AC tables |

**Local repository state at time of writing:** documentation only — no `package.json`, no `src/`, no `.git`; `ARCHITECTURE.md`, `IMPLEMENTATION-PLAN.md`, `CHANGELOG.md` and `TEST-REPORT.md` remain 0 bytes; `ENGINEERING-DECISIONS.md` contains only OD-001 (Open).

*End of addendum. No application code, configuration, dependency, service, database, deployment, Git state, PRD or existing report was modified.*
