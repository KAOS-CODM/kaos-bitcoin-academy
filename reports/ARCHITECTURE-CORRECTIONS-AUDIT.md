# KAOS Bitcoin Academy — Corrections Audit and Build-Readiness Gate

**Date:** November 1, 2026
**Audits:** `reports/ARCHITECTURE-CORRECTIONS-REPORT.md` (1 Nov 2026)
**Governing spec:** `PRD.md` (immutable; checksum verified before and after)
**Repository state:** documentation only — no `package.json`, no `src/`, no `node_modules`, no `.git`. Nothing in this report was executed.

---

## 1. Executive Verdict

The correction report is substantially accurate, but **three defects would produce wrong behaviour if implemented as written**, all in the wallet module:

1. **LNbits has no `expired` payment status.** Expired incoming invoices are stored as `status: "failed"` with the label `expired` (v1.6.2 source). The state machine's `expired` transitions therefore cannot fire as specified, and expired invoices would be reported to learners as payment failures — a direct violation of AC-015.
2. **The signed-challenge design verifies against the wrong key.** It signs with the NWC *client* secret but verifies against `walletPubkey`, which is the *wallet service's* public key in the URI. That verification would always fail.
3. **Unauthenticated payment lookup is global, not wallet-scoped.** `GET /api/v1/payments/{hash}` resolves across every wallet on the instance and returns the preimage once settled. Payment hashes must be treated as sensitive identifiers, and the LNbits instance must be dedicated or the exposure acknowledged in writing.

None of the three blocks the first implementation slice. **The project is ready to begin building, subject to four explicit approvals. The wallet vertical is not ready.**

---

## 2. Genuine Implementation Blockers

### B-1 — LNbits expiry is not a status (affects the payment module)

| | |
|---|---|
| **Claim reviewed** | Corrections report §6.2–6.3: transitions `invoice_issued → expired` and `payment_pending → expired` fire when "receiver reports expired". |
| **Evidence** | **[V]** `PaymentState` in `v1.6.2/lnbits/core/models/payments.py` defines only `pending`, `success`, `failed` — no `expired`. **[V]** `update_pending_payment` in `v1.6.2/lnbits/core/services/payments.py` does: `if payment.is_in and payment.is_expired: payment.status = FAILED; payment.labels.append("expired")`. |
| **Consequence** | An invoice that expires unpaid arrives as `failed`, not `expired`. A naive mapping records it as a payment failure and shows the learner "payment failed" — AC-015 ("Payment failures are communicated accurately") would be false, and the learner may believe money moved when it did not. |
| **Smallest correction** | Map receiver `failed` **+ label `expired`** → our `expired`; `failed` without the label → our `failed`. The label is only visible in `details`, which requires the owning invoice key — so the amount/label checks require the key, not the unauthenticated path (§I-4). |

### B-2 — Signed challenge targets the wrong public key (affects the connection design, only if adopted)

| | |
|---|---|
| **Claim reviewed** | Corrections report §5.5: browser signs the nonce "with the NWC client key" and posts `{nonce, signature, walletPubkey, metadata}`; the backend "verifies the signature against `walletPubkey`". |
| **Evidence** | **[V]** NIP-47: the URI is `nostr+walletconnect://<wallet-service-pubkey>?relay=…&secret=…`. `<wallet-service-pubkey>` identifies the wallet service; the `secret` is the **client's** private key. A signature made with the client secret verifies only against the **client pubkey derived from that secret** — a different key entirely. |
| **Consequence** | Every signature verification fails, so `challenge_signed` is unreachable. If someone "fixes" it by deriving the client pubkey but keeps the label `walletPubkey`, the record silently conflates two identities. |
| **Smallest correction** | Add a distinct field `clientPubkey` (secp256k1 public key derived from the secret, computed in the browser), keep `walletPubkey` for the service, and verify the signature against `clientPubkey`. Treat the challenge as optional (§I-7). |

### B-3 — Unauthenticated lookup is instance-global (affects the receiving configuration)

| | |
|---|---|
| **Claim reviewed** | Corrections report §4.2: "`GET /api/v1/payments/{payment_hash}` … work[s] with and without keys"; §4.5 lists privacy impact but not scope. |
| **Evidence** | **[V]** `payment_api.py` calls `get_standalone_payment(hash, wallet_id=…)` only when a key identifies a wallet. **[V]** `crud/payments.py`: `get_standalone_payment` filters `wallet_id` **only if provided**, otherwise matches `checking_id OR payment_hash` across the whole table. |
| **Consequence** | Anyone holding a payment hash can read `paid` and the **preimage** for **any** payment on that LNbits instance, not just the academy's. On a shared/hosted instance this leaks other tenants' payment existence and preimages; conversely, academy receipts are readable by anyone who obtains a hash. Hashes also appear in URL paths, so they land in proxy and access logs by default. |
| **Smallest correction** | (a) Use a **dedicated** instance or accept the cross-tenant exposure in writing; (b) never put a payment hash in a client-facing URL — the PRD already specifies `GET /api/wallet/payments/:paymentId`, so map `paymentId → hash` server-side; (c) redact hashes from logs and analytics; (d) never use a payment hash as a bearer token to unlock content. |

---

## 3. Important Corrections

| ID | Claim reviewed | Evidence | Consequence | Smallest correction |
|---|---|---|---|---|
| **I-1** | `payment_requested → payment_pending` when "wallet accepted the request" | **[V]** NIP-47 `pay_invoice` returns a single response at completion or timeout; there is no intermediate "accepted" event | The transition is unobservable; `payment_pending` would never be entered, or would be entered on a guess | Define `payment_pending` as time-based ("dispatched, no terminal evidence yet"), or drop it and keep `payment_requested` until verification |
| **I-2** | Only `cancelled → paid` may override a terminal state | **[C]** A payment in flight at expiry can still settle; LNbits may mark it failed first and settle afterwards | A learner who paid near expiry is recorded as expired/failed; money moved, activity not credited | **Receiver settlement always wins**: allow `expired → paid` and `failed → paid` within a grace window; `paid` is the only absorbing state |
| **I-3** | Cancellation only from `invoice_issued` | **[C]** After dispatch, the wallet may already be paying | API has no defined response for "cancel" during `payment_requested`/`payment_pending` | Return `409 PAYMENT_IN_PROGRESS`; do not transition; keep reconciling |
| **I-4** | `verifying → paid` requires amount + hash match | **[V]** Unauthenticated status returns only `paid`/`preimage`; `details` (amount, labels, expiry) require the owning key | Amount and expiry/label checks silently cannot run on the no-key path | Require the invoice key for the verification read; treat the no-key call as a health signal only |
| **I-5** | "`get_info` answered … proves this connection is authorised" | **[V]** A valid encrypted round trip proves the wallet service holds its key and processed the request; per-method permissions and budgets are wallet-specific (NWC extensions), not core-spec | Overstates the guarantee; a wallet may answer `get_info` yet refuse `pay_invoice` | Say "the wallet service is live and accepted this connection"; treat method support as a claim until the first real request |
| **I-6** | Test B step B7 is safe because the balance is zero | **[C]** Zero balance is necessary but depends on a human check; a funded instance would make a wrong-acceptance case dangerous | If the key is wrongly accepted, a 1-sat invoice could be paid | Use an **expired** BOLT11 invoice for B7, so no payment can settle even if the key is accepted; re-check balance immediately before |
| **I-7** | `verificationLevel: challenge_signed` | **[C]** Anyone can mint a keypair; possession of a key proves continuity, not that a wallet exists | The label can be read as "verified wallet", which it is not | Rename to `key_possession_proved`; make the nonce single-use and session-bound; never render it as "verified" |

---

## 4. Non-Blocking Issues (deferred)

| ID | Issue | Why it can wait |
|---|---|---|
| N-1 | `abandoned` as an analytics label | Nothing depends on it; compute later from timestamps if wanted |
| N-2 | Info event may be stale vs `get_info.methods` | Resolved by trusting the live response; no design change |
| N-3 | NIP-47 marks `invoice` optional in `make_invoice` responses | Edge case; handle a missing `bolt11` with a clear error when the wallet module is built |
| N-4 | Service-worker cache policy for wallet pages | Must never cache payment/wallet pages; already covered by the addendum's "never cache" list |
| N-5 | Exact session-store choice (`connect-mongo` vs custom) | Implementation detail; both satisfy the PRD |

**UNVERIFIED (must not be assumed):** `make_invoice` support on any named wallet; inbound liquidity on the academy wallet; wallet-side budget enforcement; runtime behaviour of any LNbits instance; whether LNbits expiry labels remain stable across versions. These are Test A/B questions, not audit findings.

---

## 5. PRD Traceability Findings

Wording quoted exactly from `PRD.md`; no requirement added or altered.

| ID | Wording | Verdict against the proposed architecture | Note |
|---|---|---|---|
| FR-009 | "Users can connect a compatible Lightning wallet" | **Satisfiable** by browser-held NWC | Requires a wallet that supports NWC — unverified for any specific wallet |
| FR-010 | "Users can complete a guided Lightning payment" | **Satisfiable**, but requires both components (learner NWC + academy receiving) | D-01 unresolved |
| AC-012 | "A compatible Lightning wallet can be connected" | **Satisfiable**; evidence must be a real `get_info` round trip | Metadata alone cannot prove this |
| AC-013 | "The platform can generate or handle a real Lightning payment request" | **Requires the receiving component**; PRD §11 already lists `POST /api/wallet/invoices`, so invoice creation is anticipated | Not blocked by PRD; blocked by D-01 |
| AC-014 | "A guided payment can be completed and verified" | **At risk** until B-1 and I-2 are fixed | Verification must be receiver-side and expiry-aware |
| AC-015 | "Payment failures are communicated accurately" | **Would fail** under the report as written (B-1) | Expired ≠ failed |
| AC-017 | "The application is accessible through a public deployment" | **Unaffected**; single-origin topology satisfies it | Deployment not authorised yet |

**No PRD requirement blocks the first slice.** The wallet requirements are independent of authentication, courses, lessons and progress.

---

## 6. First Vertical Implementation Slice

### 6.1 What exists vs what is proposed

**Exists:** `AGENTS.md`, `PRD.md` and its reference/checksum files, `ENGINEERING-DECISIONS.md`, four empty supporting docs (`ARCHITECTURE.md`, `CHANGELOG.md`, `IMPLEMENTATION-PLAN.md`, `TEST-REPORT.md`), and three reports. **No application code, configuration, or dependency manifest exists.** Every application path below is **proposed**.

### 6.2 Slice 1 — "Learner entry path: register → read a real lesson → completion persists"

A single vertical through UI, API and database, using the **exact PRD endpoint paths** (PRD §11):

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Session-based auth |
| `GET /api/courses`, `GET /api/courses/:courseId`, `GET /api/courses/:courseId/lessons`, `GET /api/lessons/:lessonId` | Catalogue + reader |
| `GET /api/progress`, `POST /api/progress/lessons/:lessonId/complete` | Completion + dashboard |

**User-visible functionality:** a new learner registers, signs in, browses a catalogue containing one published course (Bitcoin 101), opens a real lesson, marks it complete, reloads, and still sees it complete with updated progress on a dashboard.

**PRD requirements:** FR-001, FR-002, FR-003, FR-004, FR-011 (partial); AC-001, AC-002, AC-003, AC-004, AC-007.

**Proposed files (none exist):** `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`; `server/{index,app,db}.ts`, `server/config/env.ts`, `server/models/{User,Course,Lesson,Progress}.ts`, `server/routes/{auth,courses,lessons,progress}.ts`, `server/middleware/{auth,error,validate}.ts`; `client/src/{main,App}.tsx`, `client/src/pages/{Register,Login,Catalogue,Lesson,Dashboard}.tsx`, `client/src/lib/api.ts`; `seed/seed.ts`; `tests/{auth,progress}.test.ts`.

**Dependencies (batch approval required):** `express`, `mongoose`, `zod`, `argon2`, `express-session`, `connect-mongo`, `helmet`, `pino`; `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `vite`, `typescript`, `tailwindcss`, `vitest`, `supertest`, `mongodb-memory-server` (CI only).

**Acceptance criteria:** a fresh user can register, log in, open a lesson, complete it, and see it persist after reload; completion is idempotent; a second user cannot read the first user's progress; session cookie is `HttpOnly; Secure; SameSite=Lax; Path=/`; no password hash appears in any response.

**Tests:** unit (password hashing, validation schemas); integration (register → login → complete twice → progress unchanged; unauthenticated 401; cross-user 403/404); database (unique index on `{userId, lessonId}`); manual responsive check at 360 px width.

**Decisions required first:** D-15 (below), and confirmation of D-04's same-origin default.

### 6.3 Sequencing after Slice 1

Slice 2 = quizzes (FR-005, AC-005/AC-006). Slice 3 = AI tutor (FR-008). Slice 4 = playground (FR-007) — buildable in parallel at any time, no backend. Wallet work starts only after the spike and D-01.

---

## 7. Explicit Owner Approvals Required

| ID | Approval | Status |
|---|---|---|
| **D-15** (new) | **Start implementation:** create the application scaffold, install the dependency batch above, and provision a MongoDB Atlas free cluster | Pending |
| **D-04** | **Confirm single-origin topology** before auth code is finalised (cookie flags depend on it) | Pending |
| **D-09** | **Curriculum scope** — Slice 1 needs one real Bitcoin 101 lesson; confirm that authoring starts now | Pending |
| **D-01** | Receiving-wallet architecture | Pending — **not needed for Slice 1** |
| **D-02** | NWC custody model | Pending — **not needed for Slice 1** |
| **D-11** | Validation spike | Pending — independent of Slice 1, run in parallel |

D-03, D-05, D-06, D-07, D-08, D-10, D-12 (OD-001), D-13, D-14 remain pending; none blocks Slice 1 except D-10's dependency batch, folded into D-15.

---

## 8. Final Build-Readiness Decision

**Ready to build Slice 1 now — conditional on D-15 and D-04.**

- **Blockers found: 3** (B-1 LNbits expiry mapping, B-2 challenge key confusion, B-3 global unauthenticated lookup). All are confined to the wallet module and none is a PRD conflict.
- **Buildable immediately:** authentication, course/lesson delivery, progress persistence, dashboard, playground. These are 8 of the 16 functional requirements and the spine of the product.
- **Must wait:** the entire wallet vertical (D-01, D-02, D-06, spike results).
- **Checks not performed:** no live LNbits request, no wallet connection, no dependency installation, no build, no tests, no deployment, no Git operation.

The next step is implementation of Slice 1 upon approval — not another architecture review.

---

## 9. Sources

All accessed **1 November 2026**.

| Source | URL | Used for |
|---|---|---|
| NIP-47 | https://github.com/nostr-protocol/nips/blob/master/47.md | URI key roles, `make_invoice`, `lookup_invoice`, `get_info.methods`, `pay_invoice` single-response semantics |
| LNbits `payment_api.py` v1.6.2 | https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/payment_api.py | Unauthenticated status route; `out:true` admin requirement |
| LNbits `wallet_api.py` v1.6.2 | https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/wallet_api.py#L55-L62 | `GET /api/v1/wallet` returns no key material |
| LNbits `models/payments.py` v1.6.2 | https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/models/payments.py | `PaymentState` = pending/success/failed only |
| LNbits `services/payments.py` v1.6.2 | https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/payments.py | Expired invoices marked `failed` with label `expired` |
| LNbits `crud/payments.py` v1.6.2 | https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/crud/payments.py | Global lookup when no `wallet_id` is supplied |
| LNbits docs — Authentication | https://docs.lnbits.com/api/authentication | Documented key matrix (and the inconsistent `adminkey` example) |
| `PRD.md` | local, immutable | FR-001–011, AC-001–017, §11 endpoints |

---

*End of audit. No application code, configuration, dependency, PRD, existing report, or Git state was modified.*
