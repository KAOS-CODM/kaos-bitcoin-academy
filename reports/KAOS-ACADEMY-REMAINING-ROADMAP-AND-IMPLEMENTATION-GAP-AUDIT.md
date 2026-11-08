# KAOS Bitcoin Academy — Remaining Roadmap and Implementation Gap Audit

**Date:** 2026-11-07  
**Repository:** `/data/data/com.termux/files/home/kaos-bitcoin-academy`  
**Audit type:** Read-only product and engineering audit  
**Result:** **AUDIT COMPLETE — NO IMPLEMENTATION, DATABASE WRITE, DEPLOYMENT, OR GIT WRITE PERFORMED**

---

## 0. Current status update (2026-11-07)

This audit was written before the S3 and S4 implementations were accepted. Its technical findings and S2 caveats are preserved below. The following status supersedes the stale S3/S4 lines in the detailed tables.

| Phase | Current status | Evidence |
|---|---|---|
| S3 Bitcoin Playground | **COMPLETE** | `reports/S3-BITCOIN-PLAYGROUND-IMPLEMENTATION-REPORT.md`; owner manually tested the playground and confirmed it works |
| S4 AI Tutor | **COMPLETE** | `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md`; owner manually tested the actual application and confirmed: “It works end to end.” |
| S5 Wallet connection and invoice literacy | **NEXT — NOT IMPLEMENTED** | `PRD.md` §5.1 Module E, FR-009, AC-012/AC-016; see the S5 readiness report |
| S6a Payment logic and failure handling | **NOT STARTED** | No payment intent, state machine, or receipt implementation |
| S6b Real settlement | **NOT STARTED / BLOCKED** | No receiving wallet, funding path, or verified settlement |
| S7 Stabilization, deployment, documentation | **NOT STARTED** | No public deployment or submission package |

S4 is closed. Do not reopen its implemented decisions: the tutor uses server-side OpenRouter `openrouter/auto`, authenticated learner access, and session-only history as recorded in the S4 report. The deferred S4 items remain exactly as documented there.

S2's formal browser/accessibility acceptance remains **not fully accepted** per `reports/S2-FINAL-ACTUAL-APPLICATION-ACCEPTANCE.md`. The S3 and S4 owner browser confirmations are evidence for S3 and S4 only; they are not retroactive S2 acceptance.

S5 is a read-only readiness inspection at this point. No S5 code, dependency, database change, wallet connection, invoice generation, payment, or settlement has been performed.

---

## 1. Executive Summary

The project has a working learning core and a substantially implemented S2 quiz system, but it is **not yet a hackathon-ready MVP** and does **not** satisfy the PRD Definition of Done.

The strongest completed area is S1/S2: registration and sessions, catalogue, lessons, lesson completion, progress, dashboard, quizzes, assessments, server-side scoring, XP, achievements, saved feedback, idempotency, and course-completion reconciliation. The S2 implementation has strong API and database evidence, including 65/65 non-database tests and a prior 13/13 guarded database run. S2 is nevertheless **not accepted** because the browser, keyboard, screen-reader, 360 px, and mobile acceptance work has not been performed.

The largest remaining gaps are:

- Bitcoin playground: **implemented and owner-confirmed; S3 complete**.
- AI tutor: **implemented and owner-confirmed end to end; S4 complete**. AI-generated practice questions remain deferred.
- Lightning wallet connection and guided payment: **not implemented**. S5 is next; S6 payment work is not started.
- Public deployment, PWA, README, architecture diagram, security/wallet documentation, presentation, demo video, and public repository: **not implemented**.
- AC-014 and the Definition of Done's “without relying on mock payment results” clause remain unresolved because real sats and a real receiving path are required.

The November 1 zero-budget addendum remains useful as a historical feasibility study, but its repository observations, dates, provider limits, and “no further audit” recommendation are stale. Its D-15, D-04, D-09/P-04, P-03, Z-01, and Z-02 decisions were recommendations, not approvals. Current evidence shows D-15 and D-04 reflected in implementation, P-03 applied, D-09/P-04 implemented but without a formal recorded approval, Z-01 implemented for S4 without a separate policy sign-off, and Z-02 still pending. Its OpenRouter free-tier figures were dated external claims, not re-verified in this audit.

At final verification, the previously recorded isolated server PID `11122` was **not present**, and ports `4100`, `4000`, and `5173` were not listening. This audit did not stop or restart any process. The cause is unknown. Browser acceptance cannot be run until the owner approves a test environment again.

**Current next phase (2026-11-07):** S5 Wallet Connection and Invoice Literacy, after owner review and the D-11/D-02/dependency decisions. S3 and S4 are complete and owner-confirmed. S2 browser/accessibility acceptance remains a separate unresolved acceptance item. Do not seed the application database, do not start S6 payment work, and do not install wallet dependencies merely because S4 passed.

---

## 2. Repository Baseline

### 2.1 Git and working-tree state

| Item | Value |
|---|---|
| Repository root | `/data/data/com.termux/files/home/kaos-bitcoin-academy` |
| Branch | `main` |
| HEAD | `1f1d51538fae8f946f1b4b7cc933ed4dc6fbf43f` |
| HEAD parent | `41d37e7df79bdba48b55399ef20fdea0ac7ea4db` |
| HEAD commit message | `chore: checkpoint S2 quiz integration and DNS work` |
| Staged files before audit | 0 |
| Modified tracked files before audit | 0 |
| Deleted tracked files before audit | 0 |
| Untracked files before audit | `reports/S2-PROGRESS-CHECKPOINT-COMMIT-REPORT.md` |
| Working tree after audit | The checkpoint report plus this audit report, both untracked; no staged or modified tracked files |
| Remote | None configured |
| Branches | `main` only |

Recent history:

```text
1f1d515 chore: checkpoint S2 quiz integration and DNS work
41d37e7 docs: add pre-S2 Git initialization report
e7673e8 chore: expand gitignore for local artifacts
9512f9c chore: establish S1 project baseline
```

The S2 checkpoint commit and its parent match the expected values. No push occurred.

### 2.2 PRD integrity

| File | SHA-256 | Role |
|---|---|---|
| `PRD.md` | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | Sole authoritative PRD |
| `PRD-ORIGINAL.txt` | `7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed` | Preserved reference copy |
| `PRD.txt` | `80f7f293030ec9cb8429811b74233d1906500c11b47c9a214a6521db3884d873` | Archived, non-authoritative copy |

`PRD.md` matched the required hash at the start of the audit. `PRD.txt` and `PRD.md` remain divergent and were **not** reconciled. `PRD-MD-SHA256.txt` records that the only authorized difference between `PRD.md` and `PRD-ORIGINAL.txt` is the appended “Final authority” section. `PRD.txt` remains archived and unchanged.

### 2.3 Project structure and documentation

| Area | State |
|---|---|
| `client/` | React 19, TypeScript, Vite 8, Tailwind 4, React Router 7 |
| `server/` | Node.js, Express 5, TypeScript, Mongoose 9, Zod 4, pino, express-session, connect-mongo |
| `server/src/routes/` | `auth.ts`, `courses.ts`, `lessons.ts`, `progress.ts`, `dashboard.ts`, `quizzes.ts` |
| `server/src/models/` | `User`, `Course`, `Lesson`, `Progress`, `Quiz`, `QuizAttempt`, `XpEvent`, `Achievement`, `UserAchievement` |
| `server/src/content/` | 8 courses, 22 lessons, 30 quizzes, 87 questions, 3 achievements |
| `reports/` | 22 reports before this audit, including S1/S2, DNS, architecture, acceptance, and the zero-budget addendum |
| `README.md` | Absent |
| `docs/` | Absent; OD-001 remains open |
| `ARCHITECTURE.md` | 0 bytes |
| `IMPLEMENTATION-PLAN.md` | 0 bytes |
| `CHANGELOG.md` | 0 bytes |
| `TEST-REPORT.md` | 0 bytes |
| `.github/` | Absent; no CI workflow |
| Deployment configuration | None found (`render.yaml`, Dockerfile, Vercel/Netlify configuration absent) |
| Presentation/demo artifacts | None found (`.pptx`, `.pdf`, `.mp4`, `.webm` absent) |

### 2.4 Runtime state at final verification

The checkpoint report recorded an isolated application on `127.0.0.1:4100` using `kaos_academy_test`. At final audit verification:

- PID `11122` was not found.
- No `node`, `tsx`, or `vite` process was found.
- Ports `4100`, `4000`, and `5173` refused connections.
- `/api/health` on `4100` returned connection refused.

This audit did **not** stop, restart, or reconfigure any process. The change occurred outside this audit, and its cause is unknown. It is recorded as a limitation, not as a successful preservation of the running server.

---

## 3. Authoritative Plan and Decision Reconciliation

### 3.1 PRD authority

`PRD.md` is the sole authoritative source. The audit used the complete 983-line document, including:

- Modules A–E in §5.1.
- The eight-course curriculum in §6.
- FR-001–FR-016 in §7.
- UX requirements in §8.
- Technical specification, data models, API, wallet decision, and security in §9–§13.
- AC-001–AC-018 in §14.
- Non-functional requirements in §15.
- Design, roadmap, testing, metrics, deliverables, future roadmap, risks, decisions, and Definition of Done in §17–§25.

The PRD is not amended by this report. Where later documents propose scope changes, they are identified as proposals or owner decisions, not as PRD edits.

### 3.2 Approved owner decisions and later plans

The following S2 decisions are treated as owner-approved because `S2-SUMMARY.md` and `reports/S2-IMPLEMENTATION-REPORT.md` record them as supplied approvals:

| ID | Approved decision |
|---|---|
| S2-OD-01 | 22 lesson checks and 8 course assessments, authored from existing lesson content |
| S2-OD-02 | Course completion requires every published lesson complete and the course assessment passed; lesson completion remains independent and idempotent |
| S2-OD-03 | XP ledger and three minimal achievements; no double-award; gamification deferrable if P0 is threatened |
| S2-OD-04 | Anonymous preview quiz retrieval allowed; anonymous attempts/results 401; no anonymous persistence |
| S2-OD-05 | Client-generated `attemptKey`; unique `{userId, quizId, attemptKey}`; identical replay returns the original result; changed answers with the same key return 409 |
| S2-OD-06 | No new dependencies for S2 |
| S2-OD-07 | Dashboard keeps lesson resume and adds assessment status as a sibling field |
| S2-OD-08 | No retroactive S1 XP or achievements; stale quizzes become draft; quizzes and attempts are not deleted |
| S2-OD-09 | Results include per-question feedback after submission |
| S2-OD-10 | Attempt, XP, and achievement writes use MongoDB transactions; concurrent reward-index races retry safely |
| S2-OD-11 | Lesson checks pass at 67%; course assessments at 80% |
| S2-OD-12 | Bitcoin 101 has an 8-question assessment; courses 02–08 have 5 questions each |

The owner also confirmed that the existing **8-course, 22-lesson** curriculum must remain unchanged and authorized S2 implementation.

These approvals do **not** approve AI, wallet, playground, deployment, or the full PRD curriculum depth.

### 3.3 Classification of later material

| Class | Examples | Status |
|---|---|---|
| Immutable PRD requirements | FR-001–FR-016, AC-001–AC-018, Modules A–E, §25 Definition of Done | Authoritative |
| Owner-approved implementation decisions | S2-OD-01–S2-OD-12; 8-course/22-lesson scope; S2 access policy | Approved for their stated scope |
| Later implementation plans | `reports/S2-PLANNING-AND-ROADMAP-REPORT.md`, S1/S2 implementation reports, S3–S7 slice plans | Planning evidence, not PRD amendments |
| Architecture recommendations | Provider-independent AI gateway, NWC primary with LNbits fallback, deterministic lesson grounding, curated fallback | Recommendations only |
| Unapproved proposals | Z-01, Z-02, D-01, D-02, D-03, D-05, D-06, D-11, P-01, P-02, P-05 | Not approved |
| Historical feasibility | `reports/ZERO-BUDGET-FEASIBILITY-ADDENDUM.md` | Historical; dated facts not current requirements |

### 3.4 Zero-budget addendum decision reconciliation

The addendum explicitly states that none of its decision table is approved by the report. The later repository evidence is:

| ID | Addendum recommendation | Later evidence | Audit conclusion |
|---|---|---|---|
| D-15 | Approve scaffold, dependency batch, and Atlas use | S1 and S2 were implemented and committed | **Approved in effect**; no standalone formal decision record found |
| D-04 | Single-origin topology | Express serves the built SPA and `/api`; session cookie is same-origin; no CORS package | **Reflected in implementation**; no later formal decision record found |
| D-09 / P-04 | Bitcoin 101 complete plus first module of 02–08 | 8 courses, 22 lessons; Bitcoin 101 has 8 lessons; courses 02–08 have 2 lessons each; S2 owner confirmed the 22-lesson curriculum unchanged | **Implemented and owner-confirmed as the working scope**; formal D-09/P-04 approval record remains unconfirmed |
| P-03 | One preview lesson without an account | `btc101-what-is-bitcoin` is the single preview lesson; anonymous preview GET returns 200 | **Applied** |
| Z-01 | OpenRouter free router, configurable override, daily cap, curated fallback, training opt-out | No AI code, dependency, route, model, environment key, or UI | **Not approved; not implemented** |
| Z-02 | Sponsor vs learner-funded vs documented deviation for AC-014 | No wallet or payment implementation; AC-014 unresolved | **Not approved; blocked** |

Other addendum-era decisions remain pending: D-01 receiving wallet, D-02 NWC custody, D-03 funding model, D-05 LNbits role, D-06 acceptance environment, D-07 offline scope, D-08 mnemonic display, D-10 dependency batch, D-11 wallet spike, OD-001 documentation structure, P-01 recipient, P-02 amount/funding, and P-05 tutor progress access.

### 3.5 Addendum roadmap versus actual state

| Slice | Addendum window | Actual state on 2026-11-05/07 | Status |
|---|---|---|---|
| S1 | Nov 3–6 | Auth, catalogue, lessons, completion, progress, dashboard implemented and API/DB tested | Implemented; AC-003 browser evidence still missing |
| S2 | Nov 6–8 | Quizzes, assessments, scoring, XP, achievements, saved feedback, concurrency fixes implemented; API/DB tested | Implemented; browser acceptance not performed; not accepted |
| S3 | Nov 4–8 | Implemented; owner-confirmed in a browser | **COMPLETE** |
| S4 | Nov 9–11 | Implemented; automated tests recorded; owner-confirmed end to end | **COMPLETE** |
| S5 | Nov 10–12 | No wallet route, model, NWC/LNbits code, or UI | **NEXT — not implemented** |
| S6a | Nov 12–15 | No payment intent, state machine, failure taxonomy, receipt, or fake adapter | Not started |
| S6b | Nov 14–16 | No real settlement, receiving wallet, or funding path | Not started; blocked |
| S7 | Nov 16–18 | No PWA, public deployment, README, architecture diagram, or submission package | Not started |

The addendum’s dates are historical planning targets, not current commitments. The current deadline is November 20, 2026, leaving approximately two weeks.

### 3.6 Addendum external facts and obsolete observations

The addendum’s OpenRouter, Render, and Atlas figures were dated November 1, 2026. They were **not re-verified** in this audit and are not product requirements:

- OpenRouter free-model requests per minute/day and the zero-priced model catalogue.
- Render free-tier hours, spin-down behavior, memory, and billing behavior.
- Atlas free-tier storage, connection, operation, pause, and backup limits.

The addendum’s statement that the repository had no `package.json`, no `src/`, and no `.git` is obsolete: the repository now contains a full S1/S2 implementation and Git history. Its statement that “no further audit is recommended” is also obsolete because substantial implementation occurred after November 1; this audit is the required current baseline.

The addendum’s recommendations that remain useful are the AC-014 feasibility warning, the curated fallback requirement, the server-side key rule, the privacy/training-opt-out concern, the manual backup gap, and the Render billing-verification warning. They are recommendations, not approvals.

---

## 4. Complete Requirement Matrix

### 4.1 Status definitions and ID conventions

Status values used below:

- **COMPLETE:** implementation and relevant verification evidence exist for the stated scope.
- **PARTIAL:** some implementation exists, but required work or evidence remains.
- **NOT IMPLEMENTED:** no meaningful implementation found.
- **BLOCKED:** cannot proceed because of a dependency, environment, funding, or unresolved decision.
- **UNVERIFIED:** implementation may exist, but acceptance evidence is insufficient.

Official IDs are preserved exactly. Rows beginning `MOD-`, `CUR-`, `UX-`, `TECH-`, `SEC-`, `NFR-`, `HACK-`, and `DOD-` are **audit labels** for PRD bullets that have no official identifier. They are not new product requirements.

### 4.2 Functional requirements

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| FR-001 | Users can register and authenticate | §7 | COMPLETE | `server/src/routes/auth.ts`; `server/src/lib/password.ts`; `server/test/validation.test.ts`; prior guarded DB suite 13/13 | Browser functional acceptance under AC-001; no password-reset requirement in PRD | P0 |
| FR-002 | Users can access the course catalogue | §7 | COMPLETE | `server/src/routes/courses.ts`; `client/src/pages/Catalogue.tsx`; `client/src/pages/Home.tsx`; content tests | Browser acceptance; catalogue currently shows 02–08 first modules only | P0 |
| FR-003 | Users can view lessons | §7 | COMPLETE | `server/src/routes/lessons.ts`; `client/src/pages/Lesson.tsx`; `client/src/components/SectionRenderer.tsx` | Browser acceptance; no diagrams/illustrations | P0 |
| FR-004 | Users can complete lessons | §7 | COMPLETE | `server/src/routes/progress.ts`; unique progress index; prior DB suite | Browser acceptance; parent-course publication check remains a residual defect | P0 |
| FR-005 | Users can complete quizzes | §7 | COMPLETE | `server/src/routes/quizzes.ts`; `client/src/components/Quiz.tsx`; `server/test/quiz.test.ts`; prior DB suite | Browser acceptance; residual accessibility and robustness concerns | P0 |
| FR-006 | Learning progress is persisted | §7 | COMPLETE | `ProgressModel`; progress routes; dashboard; prior DB suite | Browser acceptance | P0 |
| FR-007 | Users can access the Bitcoin playground | §7 | COMPLETE | `reports/S3-BITCOIN-PLAYGROUND-IMPLEMENTATION-REPORT.md`; six-lab implementation; owner browser confirmation | Formal mobile/keyboard acceptance is still not claimed | P0 |
| FR-008 | Users can interact with the AI tutor | §7 | COMPLETE | `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md`; automated tests; owner manual end-to-end browser acceptance | Practice-question generation and conversation retrieval endpoints remain deferred | P0 |
| FR-009 | Users can connect a compatible Lightning wallet | §7 | NOT IMPLEMENTED | No wallet route, model, NWC/LNbits code, or UI | Wallet spike; D-01/D-02/D-05/D-06/D-11; AC-012/AC-016 | P0 |
| FR-010 | Users can complete a guided Lightning payment | §7 | NOT IMPLEMENTED | No payment intent, state machine, invoice handling, or receipt | S6a logic and S6b real settlement; AC-013/AC-014/AC-015; Z-02 | P0 |
| FR-011 | Users can view their learning dashboard | §7 | COMPLETE | `server/src/routes/dashboard.ts`; `client/src/pages/Dashboard.tsx`; prior DB suite; AI tutor access present | Browser acceptance still useful | P0 |
| FR-012 | Users can earn XP and achievements | §7 | COMPLETE | `server/src/lib/rewards.ts`; XP/achievement models; DB tests; owner-approved minimal scope | Browser acceptance; achievement display exists; no badge engine | P1 |
| FR-013 | Users can access multiple learning paths | §7 | NOT IMPLEMENTED | Catalogue is one ordered sequence; no path model or path UI | Define and implement multiple paths; this is P1 and must not delay P0 | P1 |
| FR-014 | Users can receive completion certificates | §7 | NOT IMPLEMENTED | No certificate model, route, PDF, or UI | P2 feature | P2 |
| FR-015 | Users can access community learning features | §7 | NOT IMPLEMENTED | No community model, route, or UI | P2 feature | P2 |
| FR-016 | Developers can access advanced technical courses | §7 | PARTIAL | Course 08 “Beyond Bitcoin” exists but only its first module; no developer environment | Expand advanced/developer content; P2 | P2 |

### 4.3 Acceptance criteria

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| AC-001 | A new learner can register and sign in | §14 | PARTIAL | API/DB auth tests passed; no browser functional test | Run browser register/sign-in acceptance | P0 |
| AC-002 | A learner can access published courses | §14 | PARTIAL | Catalogue API/DB tests; no browser acceptance | Browser catalogue/course acceptance | P0 |
| AC-003 | Lessons display correctly on mobile | §14 | UNVERIFIED | Responsive classes exist; no 360 px or Android test | Android Chrome/360 px responsive test | P0 |
| AC-004 | Lesson completion is persisted | §14 | COMPLETE | Unique progress index; prior guarded DB suite | None for implementation; browser check still useful | P0 |
| AC-005 | Learners can submit quiz answers | §14 | PARTIAL | API/DB submit tests; no browser acceptance | Browser quiz submission | P0 |
| AC-006 | Quiz results are calculated correctly | §14 | COMPLETE | `server/test/quiz.test.ts`; prior DB suite | No known calculation gap | P0 |
| AC-007 | Progress updates after lesson completion | §14 | COMPLETE | Progress/dashboard integration tests; prior DB suite | Browser confirmation | P0 |
| AC-008 | The Bitcoin playground supports its documented exercises | §14 | COMPLETE | S3 report; six implemented labs; owner browser confirmation | Formal mobile/keyboard acceptance is not claimed | P0 |
| AC-009 | Simulations are visibly distinguished from real transactions | §14 | COMPLETE | S3 report; persistent simulation labels and fictional-only behavior; owner browser confirmation | Formal UX/accessibility review is not claimed | P0 |
| AC-010 | The AI tutor answers questions using educational context | §14 | COMPLETE | S4 report; automated tests; owner end-to-end browser acceptance with lesson references | None for the accepted path | P0 |
| AC-011 | The AI tutor handles unsupported questions safely | §14 | PARTIAL | S4 prompt policy and input-validation tests; no adversarial answer acceptance recorded | Add adversarial evaluation and record evidence | P0 |
| AC-012 | A compatible Lightning wallet can be connected | §14 | NOT IMPLEMENTED | No wallet implementation | Wallet spike; real connection test | P0 |
| AC-013 | The platform can generate or handle a real Lightning payment request | §14 | NOT IMPLEMENTED | No wallet/payment implementation | Real invoice generation/handling test; receiving wallet | P0 |
| AC-014 | A guided payment can be completed and verified | §14 | NOT IMPLEMENTED / BLOCKED | No payment implementation; no funded receiving path | Real sats and receive path; Z-02; simulation/testnet cannot satisfy this | P0 |
| AC-015 | Payment failures are communicated accurately | §14 | NOT IMPLEMENTED | No payment state machine | Build failure taxonomy and negative tests | P0 |
| AC-016 | Wallet secrets are not exposed in logs or frontend bundles | §14 | NOT IMPLEMENTED | No wallet implementation; existing static bundle scan passes but is not wallet evidence | Wallet secret handling, redaction, bundle/log scan | P0 |
| AC-017 | The application is accessible through a public deployment | §14 | NOT IMPLEMENTED | No remote, deployment config, or public URL | Deploy; smoke test; cold-start rehearsal | P0 |
| AC-018 | The repository includes setup and architecture documentation | §14 | NOT IMPLEMENTED | `README.md` absent; `ARCHITECTURE.md` is 0 bytes | README, setup, architecture, security, wallet docs | P0 |

### 4.4 Module A — Learning Management

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| MOD-A-01 | Course catalogue | §5.1 Module A | COMPLETE | 8 published courses; catalogue API/UI | Browser acceptance | P0 |
| MOD-A-02 | Learning paths | §5.1 Module A | NOT IMPLEMENTED | One ordered catalogue; no path model | Define multiple paths; FR-013 is P1 | P1 |
| MOD-A-03 | Lessons divided into manageable sections | §5.1 Module A | COMPLETE | 22 lessons, 166 sections; `SectionRenderer` | Browser acceptance | P0 |
| MOD-A-04 | Text, diagrams and illustrations | §5.1 Module A | PARTIAL | Text, callouts, lists, terms, examples, reflections; no diagram/illustration section type | Add diagrams/illustrations; design assets | P1 |
| MOD-A-05 | Knowledge checks | §5.1 Module A | COMPLETE | 22 lesson checks; 2 questions each | Browser acceptance | P0 |
| MOD-A-06 | Lesson completion tracking | §5.1 Module A | COMPLETE | Progress model and route; DB tests | Browser acceptance | P0 |
| MOD-A-07 | Course progress indicators | §5.1 Module A | COMPLETE | Course/dashboard progress summaries | Browser acceptance | P0 |
| MOD-A-08 | Resume learning functionality | §5.1 Module A | COMPLETE | Dashboard resume; course next lesson; assessment-aware resume | Browser acceptance | P0 |

### 4.5 Module B — Interactive Bitcoin Playground

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| MOD-B-01 | Wallet creation using fictional demonstration data | §5.1 Module B | COMPLETE | S3 report; `WalletCreationSimulation`; no real keys or seeds | Formal mobile/keyboard acceptance not claimed | P0 |
| MOD-B-02 | Public/private key relationships | §5.1 Module B | COMPLETE | S3 report; `KeyRelationshipsSimulation` | Formal accessibility acceptance not claimed | P0 |
| MOD-B-03 | Bitcoin transaction construction | §5.1 Module B | COMPLETE | S3 report; `TransactionConstructionSimulation` | Formal accessibility acceptance not claimed | P0 |
| MOD-B-04 | Broadcasting and confirmation concepts | §5.1 Module B | COMPLETE | S3 report; `BroadcastingSimulation`; simulated timeline only | Formal accessibility acceptance not claimed | P0 |
| MOD-B-05 | Blockchain block formation | §5.1 Module B | COMPLETE | S3 report; `BlockFormationSimulation` | Formal accessibility acceptance not claimed | P0 |
| MOD-B-06 | Mining and proof-of-work demonstrations | §5.1 Module B | COMPLETE | S3 report; `MiningSimulation` | Formal accessibility acceptance not claimed | P0 |
| MOD-B-07 | All simulated activities clearly labelled as simulations | §5.1 Module B | COMPLETE | S3 report; persistent simulation banner and safety panel | Formal UX review not claimed | P0 |
| MOD-B-08 | No simulated transaction represented as actual network transaction | §5.1 Module B | COMPLETE | S3 report; no network, wallet, or transaction creation | Keep under review | P0 |

### 4.6 Module C — KAOS AI Tutor

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| MOD-C-01 | Conversational interface | §5.1 Module C | COMPLETE | `client/src/pages/Tutor.tsx`; protected `/tutor`; owner end-to-end acceptance | None for the accepted path | P0 |
| MOD-C-02 | Context-aware lesson assistance | §5.1 Module C | COMPLETE | `server/src/lib/tutorContext.ts`; lesson context in the S4 report | None for the accepted path | P0 |
| MOD-C-03 | Beginner-friendly explanations | §5.1 Module C | COMPLETE | S4 system prompt; owner confirmed beginner-friendly answer with lesson references | Broader answer-quality evaluation not recorded | P0 |
| MOD-C-04 | Alternative explanations for difficult concepts | §5.1 Module C | PARTIAL | Tutor can respond to follow-up requests; no dedicated alternative-explanation control or acceptance evidence | Add explicit UX/evaluation evidence if required | P0 |
| MOD-C-05 | Examples based on African financial situations | §5.1 Module C | COMPLETE | S4 system prompt permits relevant African examples without stereotyping | Example-quality review not recorded | P0 |
| MOD-C-06 | Follow-up questions | §5.1 Module C | COMPLETE | Bounded session history in `server/src/routes/tutor.ts`; S4 tests | None for the accepted path | P0 |
| MOD-C-07 | Practice question generation | §5.1 Module C | NOT IMPLEMENTED | S4 can discuss informal practice in chat, but no draft-generation flow exists | Separate draft-generation flow; validation/review controls are proposed, not approved | P0 |
| MOD-C-08 | Clear uncertainty handling | §5.1 Module C | COMPLETE | S4 system prompt requires plain uncertainty and lesson suggestions | Adversarial evaluation not recorded | P0 |
| MOD-C-09 | Curated educational material as primary knowledge source | §5.1 Module C | COMPLETE | S4 system prompt and published-lesson context injection | None for the accepted path | P0 |
| MOD-C-10 | Must not invent transaction information, financial advice, protocol specifications, or wallet security guarantees | §5.1 Module C | PARTIAL | S4 system prompt contains refusal and anti-invention rules; input tests reject system-role injection | Adversarial answer-level tests and manual safety acceptance are not recorded | P0 |

### 4.7 Module D — Practice and Gamification

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| MOD-D-01 | Multiple-choice quizzes | §5.1 Module D | COMPLETE | 30 quizzes, 87 questions; `QuizRunner` | Browser acceptance | P0 |
| MOD-D-02 | Scenario-based questions | §5.1 Module D | PARTIAL | Only 1 of 87 questions has a `scenario` field | Add scenario coverage where pedagogically useful | P1 |
| MOD-D-03 | Immediate answer feedback | §5.1 Module D | COMPLETE | Immediate per-question feedback and explanation; saved feedback in history | Browser acceptance; color-only option state concern | P0 |
| MOD-D-04 | XP points | §5.1 Module D | COMPLETE | XP ledger; 10/25/50; DB tests | Browser acceptance | P1 |
| MOD-D-05 | Achievement badges | §5.1 Module D | COMPLETE | Three minimal achievements; owner-approved simplification | Browser acceptance; richer badges are future work | P1 |
| MOD-D-06 | Course completion tracking | §5.1 Module D | COMPLETE | All published lessons plus assessment pass; DB tests | Browser acceptance | P0 |
| MOD-D-07 | Learning milestones | §5.1 Module D | PARTIAL | Achievements provide minimal milestones; no dedicated milestone system | Define milestones if retained in scope | P1 |
| MOD-D-08 | Gamification rewards demonstrated understanding, not time spent | §5.1 Module D | COMPLETE | XP only on lesson-check pass, assessment pass, course completion; no completion-click XP | Keep policy under review | P1 |

### 4.8 Module E — Bitcoin and Lightning Wallet Experience

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| MOD-E-01 | Explain wallet functionality | §5.1 Module E | PARTIAL | Course 04 lesson content explains keys, addresses, seed phrases, custody | Interactive wallet experience absent | P0 |
| MOD-E-02 | Introduce receiving and sending payments | §5.1 Module E | PARTIAL | Course 05 lesson content covers receiving, sending, fees, confirmations | Interactive experience absent | P0 |
| MOD-E-03 | Explain Lightning invoices | §5.1 Module E | PARTIAL | Course 06 lesson content covers channels, invoices, expiry, authorization | Interactive invoice inspection absent | P0 |
| MOD-E-04 | Explain payment authorization | §5.1 Module E | PARTIAL | Course 06 lesson content says the wallet authorizes, not the website | Guided authorization UI absent | P0 |
| MOD-E-05 | Display payment outcomes | §5.1 Module E | NOT IMPLEMENTED | No payment implementation | State machine and receipt UI | P0 |
| MOD-E-06 | Provide guided safety instructions | §5.1 Module E | PARTIAL | Course 07 and lesson content cover scams, seed phrases, test payments | Wallet-flow safety instructions absent | P0 |
| MOD-E-07 | Integrate an actual Bitcoin/Lightning wallet implementation | §5.1 Module E | NOT IMPLEMENTED | No wallet code | NWC/LNbits selection and integration | P0 |
| MOD-E-08 | No user seed phrases or private keys collected | §5.1 Module E | COMPLETE | No wallet implementation exists; no seed/key collection found | Preserve rule in future wallet work | P0 |
| MOD-E-09 | Evaluate NWC and LNbits before selection | §5.1 Module E, §12 | BLOCKED | No wallet spike; D-01/D-02/D-05/D-06/D-11 pending | Run controlled wallet spike | P0 |
| MOD-E-10 | Wallet security requirements | §12 | NOT IMPLEMENTED | No wallet implementation | Secret isolation, least privilege, explicit authorization, no logging of secrets | P0 |

### 4.9 Curriculum and content

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| CUR-01 | Initial curriculum contains eight courses | §6 | COMPLETE | `server/src/content/index.ts`; content test | None | P0 |
| CUR-02 | Each course contains introduction, objectives, lessons, illustrations/demonstrations, knowledge checks, assessment, completion status | §6 | PARTIAL | Bitcoin 101 has 8 lessons and all quiz types; courses 02–08 have 2 lessons and 1 module; no illustrations; no explicit course-intro field | Expand content depth or formally record the 22-lesson scope; add illustrations | P1 |
| CUR-03 | Clear, accessible English | §6 | PARTIAL | Authored content and AI review pass; no human subject-matter review | Human content review | P1 |
| CUR-04 | Introduce technical terminology gradually | §6 | PARTIAL | Terms sections and progressive lessons; no formal readability test | Human review | P1 |
| CUR-05 | Include African examples where appropriate | §6 | COMPLETE | Dakar/Abidjan, mobile money, market-trader examples in Bitcoin 101 | Expand across later courses | P1 |
| CUR-06 | Distinguish Bitcoin from other cryptocurrencies | §6 | PARTIAL | Some lesson content distinguishes Bitcoin; not systematically reviewed | Content review and targeted lessons | P1 |
| CUR-07 | Explain advantages and limitations | §6 | COMPLETE | Lessons discuss trade-offs, throughput, volatility, custody, fees | Human review | P1 |
| CUR-08 | Avoid investment promises and speculative claims | §6 | COMPLETE | Home and lessons explicitly reject hype and guarantees; content scan found only warnings and distractor options | Human review | P0 |
| CUR-09 | Include safety guidance wherever relevant | §6 | COMPLETE | Course 07 and repeated seed-phrase/scam guidance | Human review | P0 |
| CUR-10 | Each course has a course assessment | §6 | COMPLETE | 8 assessments; Bitcoin 101 8 questions; others 5 | Browser acceptance | P0 |
| CUR-11 | Completion status | §6 | COMPLETE | Course/dashboard completion semantics | Browser acceptance | P0 |
| CUR-12 | 8 courses, 22 lessons, 30 quizzes, 87 questions | §6, S2 scope | COMPLETE | Read-only content import; `server/test/quiz-content.test.ts` | None | P0 |
| CUR-13 | Human content review | §23 risk mitigation | NOT IMPLEMENTED | AI review only; report says human review deferred | Assign reviewer; record review | P1 |
| CUR-14 | Relevant illustrations or demonstrations | §6 | NOT IMPLEMENTED | No diagram/illustration section type or assets | Design and add | P1 |

### 4.10 UX, design, and mobile

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| UX-01 | First-time visitor understands purpose and can start | §8.1 | COMPLETE | Landing page, register, preview lesson, first course | Browser acceptance | P0 |
| UX-02 | Dashboard provides welcome, current path, progress, continue, next lesson, achievements, AI tutor access | §8.2 | PARTIAL | Dashboard has welcome, progress, resume, next lesson, recent achievements; no AI tutor access; no explicit “current path” | Add AI access when tutor exists; clarify path | P0 |
| UX-03 | Work on common Android smartphones | §8.3 | UNVERIFIED | No device/browser test | Android Chrome test | P0 |
| UX-04 | Responsive layouts | §8.3 | PARTIAL | Tailwind responsive classes throughout; no 360 px evidence | Responsive test | P0 |
| UX-05 | Minimize unnecessary network requests | §8.3 | UNVERIFIED | React Query used; no measurement | Measure and review | P1 |
| UX-06 | Avoid oversized media | §8.3 | COMPLETE | No image assets; small CSS/JS bundle | Keep under review | P1 |
| UX-07 | Readable text and accessible controls | §8.3 | PARTIAL | Semantic headings, fieldsets, labels, skip link, focus styles | Screen-reader and keyboard audit | P0 |
| UX-08 | Handle temporary network failures gracefully | §8.3 | PARTIAL | Loading/error/retry states; no offline support | Offline/PWA decision and tests | P1 |
| UX-09 | Lightweight PWA preferred | §8.3 | NOT IMPLEMENTED | No manifest, service worker, or PWA plugin | Decide D-07; implement if approved | P1 |
| UX-10 | Near-black/amber visual identity and palette | §17 | COMPLETE | `client/src/index.css` matches PRD palette | Visual review | P1 |
| UX-11 | Educational, not trading-oriented | §17 | COMPLETE | Copy and layout avoid trading dashboards | Visual review | P1 |
| UX-12 | Technical illustrations | §17 | NOT IMPLEMENTED | No illustrations | Add with content work | P1 |
| UX-13 | Simple navigation and obvious next actions | §17 | COMPLETE | Layout, course cards, resume, next lesson | Browser acceptance | P0 |

### 4.11 Technical architecture, data, and API

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| TECH-01 | React, TypeScript, Vite, Tailwind, React Router | §9.1 | COMPLETE | `client/package.json`; `client/src` | None | P0 |
| TECH-02 | Progressive Web App support | §9.1 | NOT IMPLEMENTED | No manifest/service worker | Implement if approved | P1 |
| TECH-03 | Node.js, Express.js, REST API | §9.1 | COMPLETE | `server/src/app.ts`; route modules | None | P0 |
| TECH-04 | Authentication middleware | §9.1 | COMPLETE | `server/src/middleware/auth.ts`; session routes | None | P0 |
| TECH-05 | Input validation | §9.1 | COMPLETE | Zod schemas; `validateBody` | Malformed JSON edge case remains | P0 |
| TECH-06 | Centralized error handling | §9.1 | COMPLETE | `server/src/middleware/errors.ts`; `AppError` | Add body-parser `SyntaxError` handling | P1 |
| TECH-07 | MongoDB and Mongoose | §9.1 | COMPLETE | Models, indexes, connection management, DNS resolver | None for current scope | P0 |
| TECH-08 | AI provider, server-side requests, curated knowledge base, contextual retrieval | §9.1 | NOT IMPLEMENTED | No AI code or dependencies | Build after decisions | P0 |
| TECH-09 | NWC/LNbits evaluation and compatible wallet | §9.1, §12 | BLOCKED | No wallet spike | Run spike; record decision | P0 |
| TECH-10 | Wallet service isolated from general learning API | §9.2 | NOT IMPLEMENTED | No wallet service | Design isolated service | P0 |
| TECH-11 | Health endpoint | §9.1, addendum | COMPLETE | `/api/health` returns status/db only | Deployment check | P0 |
| TECH-12 | Graceful shutdown | Addendum operational plan | COMPLETE | `server/src/index.ts` SIGTERM/SIGINT handling | Deployment check | P1 |
| TECH-13 | Environment-based configuration | §13, §15 | COMPLETE | `server/src/config.ts`; Zod; production fail-fast | Add AI/wallet variables when approved | P0 |
| TECH-14 | Deployment configuration | §18, §21 | NOT IMPLEMENTED | No Render/Docker/CI config | Create and test | P0 |
| TECH-15 | CI/automated verification pipeline | §15 maintainability | NOT IMPLEMENTED | No `.github` | Add CI if approved | P1 |
| TECH-16 | Data models: User, Course, Lesson, Progress, Quiz, QuizAttempt, Achievement, UserAchievement | §10 | COMPLETE | Nine Mongoose models | Add AIConversation and wallet metadata later | P0 |
| TECH-17 | API: auth, courses, progress, quizzes | §11 | COMPLETE | Auth/courses/lessons/progress/dashboard/quizzes routes | `GET /api/progress` global endpoint is not separate; dashboard supplies overall progress | P1 |
| TECH-18 | API: AI tutor and wallet | §11 | PARTIAL | AI tutor route is complete; no wallet route exists | Build wallet API only if S5 Option B is approved | P0 |
| TECH-19 | Documentation structure `docs/` | §9.3 | BLOCKED | OD-001 open; no `docs/` | Owner decision | P1 |
| TECH-20 | README and setup documentation | §21, AC-018 | NOT IMPLEMENTED | README absent | Write README | P0 |

### 4.12 Security and privacy

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| SEC-AUTH-01 | Secure password hashing | §13 | COMPLETE | Argon2id; `server/src/lib/password.ts`; password tests | None | P0 |
| SEC-AUTH-02 | Validated authentication requests | §13 | COMPLETE | Zod auth schemas; validation tests | None | P0 |
| SEC-AUTH-03 | Protected user routes | §13 | COMPLETE | `requireAuth`; session-scoped ownership | Browser/DB acceptance | P0 |
| SEC-AUTH-04 | Secure session/token handling | §13 | COMPLETE | HttpOnly, SameSite=Lax, Secure in production, session regeneration, Mongo store | Deployment cookie test | P0 |
| SEC-AUTH-05 | Rate limiting | §13 | COMPLETE | Auth 20/10 min; attempts 30/10 min; in-memory store | Document single-instance limitation; distributed store if scaled | P0 |
| SEC-APP-01 | Server-side validation | §13 | COMPLETE | Zod; server scoring; no client-trusted score/XP | Malformed JSON branch | P0 |
| SEC-APP-02 | Safe error responses | §13 | PARTIAL | Central error handler; no stack traces; malformed JSON can become 500 | Add `SyntaxError`/`entity.parse.failed` handling | P1 |
| SEC-APP-03 | Appropriate CORS restrictions | §13 | COMPLETE | Single origin; origin guard; JSON-only mutations | Deployment origin test | P0 |
| SEC-APP-04 | Environment-based secrets | §13 | COMPLETE | `.env` ignored; production requires DB/session secrets | AI key handling when added | P0 |
| SEC-APP-05 | No hardcoded API credentials | §13 | COMPLETE | Secret-pattern scan; static bundle test | Repeat before deployment | P0 |
| SEC-APP-06 | Protection against injection and XSS | §13 | PARTIAL | Mongoose/Zod/React escaping/Helmet CSP | Dedicated security review | P1 |
| SEC-AI-01 | AI API keys remain server-side | §13 | NOT IMPLEMENTED | No AI | Enforce when built | P0 |
| SEC-AI-02 | AI input size limits | §13 | NOT IMPLEMENTED | No AI | Enforce when built | P0 |
| SEC-AI-03 | AI request rate limits | §13 | NOT IMPLEMENTED | No AI | Enforce when built | P0 |
| SEC-AI-04 | No unnecessary personal information in prompts | §13 | NOT IMPLEMENTED | No AI | Prompt minimization and tests | P0 |
| SEC-AI-05 | Treat learner content as untrusted | §13 | NOT IMPLEMENTED | No AI | Delimit, sanitize, adversarial tests | P0 |
| SEC-AI-06 | Prevent unverified financial instructions as facts | §13 | NOT IMPLEMENTED | No AI | Refusal/safety policy | P0 |
| SEC-PAY-01 | Wallet operations isolated | §13 | NOT IMPLEMENTED | No wallet | Isolated service | P0 |
| SEC-PAY-02 | Payment amounts and invoices validated | §13 | NOT IMPLEMENTED | No payment | Validation and caps | P0 |
| SEC-PAY-03 | Payment status verified | §13 | NOT IMPLEMENTED | No payment | Receiver-side verification | P0 |
| SEC-PAY-04 | No automatic payment without explicit authorization | §13 | NOT IMPLEMENTED | No payment | Consent flow | P0 |
| SEC-PAY-05 | No logging of sensitive connection credentials | §13 | NOT IMPLEMENTED | No wallet; current logger redacts some secrets | Add wallet/AI redaction | P0 |
| SEC-PRIV-01 | Collect only necessary learner information | §13 | COMPLETE | Email, display name, password hash only | Privacy review | P1 |
| SEC-PRIV-02 | Avoid personal information in application logs | §13 | PARTIAL | Pino redaction for cookies/auth/password/secret; no full PII audit | Log review; add AI/wallet fields | P1 |
| SEC-PRIV-03 | Provide clear privacy information | §13 | NOT IMPLEMENTED | No privacy page or notice | Add before public deployment | P0 |
| SEC-PRIV-04 | Do not expose one user's learning records to another | §13 | COMPLETE | Session-scoped queries; cross-user DB tests | Browser/DB acceptance | P0 |

### 4.13 Non-functional requirements

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| NFR-PERF-01 | Responsive interactions on mid-range Android | §15 | UNVERIFIED | No device measurement | Android performance test | P0 |
| NFR-PERF-02 | Optimized image assets | §15 | COMPLETE | No image assets; CSS/JS bundle only | Keep under review | P1 |
| NFR-PERF-03 | Minimal unnecessary API calls | §15 | UNVERIFIED | React Query; no measurement | Measure and review | P1 |
| NFR-PERF-04 | Graceful slow-network handling | §15 | PARTIAL | Loading/error/retry states | Offline/slow-network test | P1 |
| NFR-REL-01 | Clear loading states | §15 | COMPLETE | Route-level loading states | Browser acceptance | P0 |
| NFR-REL-02 | Useful error messages | §15 | COMPLETE | Error panels, retry actions, API codes | Browser acceptance | P0 |
| NFR-REL-03 | Safe handling of interrupted requests | §15 | PARTIAL | Idempotent quiz attempts and progress; no full offline queue | Test interruption scenarios | P1 |
| NFR-REL-04 | Persistent learning progress | §15 | COMPLETE | Progress model; DB tests | Browser acceptance | P0 |
| NFR-ACC-01 | Readable typography | §15 | PARTIAL | Base font and sizing; no accessibility audit | Audit | P0 |
| NFR-ACC-02 | Adequate contrast | §15 | PARTIAL | PRD palette; addendum reported contrast ratios; no automated audit | Contrast audit | P0 |
| NFR-ACC-03 | Keyboard-accessible controls | §15 | UNVERIFIED | Focus styles for links/buttons/inputs; no keyboard walkthrough | Keyboard-only test | P0 |
| NFR-ACC-04 | Clear language | §15 | PARTIAL | Beginner-oriented copy; no readability test | Human review | P1 |
| NFR-ACC-05 | Avoid reliance on color alone to communicate status | §15 | PARTIAL | Question feedback has text; option-level correct/incorrect state is color-only | Add text/icon indicators; verify screen reader | P0 |
| NFR-MAINT-01 | Modular frontend and backend | §15 | COMPLETE | Route/component/model separation | None | P1 |
| NFR-MAINT-02 | Consistent naming conventions | §15 | PARTIAL | Mostly consistent; no lint rule | Review | P2 |
| NFR-MAINT-03 | Documented API contracts | §15 | PARTIAL | Reports describe contracts; no README/OpenAPI | Document | P1 |
| NFR-MAINT-04 | Reusable components | §15 | COMPLETE | Layout, QuizRunner, ProgressBar, SectionRenderer | None | P1 |
| NFR-MAINT-05 | Environment-based configuration | §15 | COMPLETE | Zod config | Add AI/wallet variables later | P0 |
| NFR-MAINT-06 | Automated tests for critical functionality | §15 | COMPLETE | 65 non-DB tests; 13 guarded DB tests | Add S3–S7 tests and CI | P0 |

### 4.14 Hackathon deliverables, testing, and Definition of Done

| Requirement ID | Requirement | PRD reference | Implementation status | Evidence | Remaining work | Priority |
|---|---|---|---|---|---|---|
| HACK-01 | Submission deadline November 20, 2026 | §1, §18 | COMPLETE | Recorded in PRD | Plan against remaining time | P0 |
| HACK-02 | Public GitHub repository | §21 | NOT IMPLEMENTED | No remote configured | Owner approval; create remote; push; secret scan | P0 |
| HACK-03 | Accessible deployed MVP or demonstration video | §21 | NOT IMPLEMENTED | No deployment or video | Deploy and/or record | P0 |
| HACK-04 | Product presentation | §21 | NOT IMPLEMENTED | No presentation artifact | Create three-minute presentation | P0 |
| HACK-05 | README with setup instructions | §21 | NOT IMPLEMENTED | README absent | Write and verify setup | P0 |
| HACK-06 | Architecture diagram | §21 | NOT IMPLEMENTED | `ARCHITECTURE.md` 0 bytes; reports contain text only | Create diagram | P0 |
| HACK-07 | Documented wallet integration | §21 | NOT IMPLEMENTED | No wallet | Document selected design and security | P0 |
| HACK-08 | Security considerations | §21 | NOT IMPLEMENTED | No submission security document | Write security section | P0 |
| HACK-09 | Demonstrable end-to-end user journey | §21, §19 | NOT IMPLEMENTED | Only steps 1–5 are implementable today | Complete full journey | P0 |
| HACK-10 | Future development roadmap | §21, §22 | NOT IMPLEMENTED | Reports contain roadmap; no submission artifact | Write roadmap | P0 |
| HACK-11 | Suggested three-minute presentation structure | §21 | NOT IMPLEMENTED | No presentation | Follow PRD structure | P0 |
| HACK-12 | Primary demo journey: open, register, start Bitcoin 101, complete lesson, take quiz, playground, AI tutor, wallet, payment, verify | §19 | PARTIAL | Steps 1–7 exist at API/UI level; wallet and payment steps are absent | Build S5/S6 and rehearse | P0 |
| HACK-13 | Success metrics and measured results | §20 | NOT IMPLEMENTED | No analytics or measurement | Define metrics; do not invent results | P2 |
| HACK-14 | Negative testing: invalid login, missing lesson, incorrect quiz, AI failure, wallet disconnect, invalid invoice, rejected payment, network interruption | §19 | PARTIAL | Auth/quiz/DNS/AI input negative tests exist; wallet is absent; AI adversarial answer tests are not recorded | Add remaining negative tests | P0 |
| DOD-01 | The public application works | §25 | NOT MET | No public deployment | Deploy and smoke test | P0 |
| DOD-02 | A beginner can complete the introductory learning journey | §25 | PARTIAL | Bitcoin 101 content and quizzes exist; browser acceptance absent | Complete and verify journey | P0 |
| DOD-03 | Lessons and quiz progress persist | §25 | COMPLETE | Progress/quiz persistence and DB tests | Browser confirmation | P0 |
| DOD-04 | The Bitcoin playground provides functional educational demonstrations | §25 | MET for S3 scope | S3 report; owner browser confirmation | Formal mobile/accessibility acceptance not claimed | P0 |
| DOD-05 | The AI tutor works with contextual educational content | §25 | MET for S4 scope | S4 report; owner end-to-end acceptance with lesson references | AC-011 adversarial evidence not recorded | P0 |
| DOD-06 | An actual Lightning wallet integration is operational | §25 | NOT MET | No wallet | Build S5 | P0 |
| DOD-07 | A guided payment can be completed and verified | §25 | NOT MET | No payment | Build S6a/S6b; funding | P0 |
| DOD-08 | Critical security checks pass | §25 | PARTIAL | Auth/security implementation; no final review | Security review and fixes | P0 |
| DOD-09 | Repository and documentation are publicly accessible | §25 | NOT MET | No remote, README, or docs | Publish after approval | P0 |
| DOD-10 | A complete demonstration can be performed without mock payment results | §25 | NOT MET | No payment; AC-014 unresolved | Real payment or documented deviation, which cannot satisfy this clause | P0 |

---

## 5. S2 Acceptance Status

### 5.1 Implementation verification

S2 implementation evidence is strong at the source, API, and database levels.

| Area | Evidence | Result |
|---|---|---|
| Content counts | Read-only content import: 8 courses, 22 lessons, 30 quizzes, 87 questions, 3 achievements | PASS |
| Per-course counts | Bitcoin 101: 8 lessons, 9 quizzes, 24 questions; courses 02–08: 2 lessons, 3 quizzes, 9 questions each | PASS |
| Lesson checks | 22 checks, 2 questions each | PASS |
| Course assessments | 8 assessments; Bitcoin 101 8 questions; courses 02–08 5 questions each | PASS |
| Pass thresholds | Lesson checks 67%; assessments 80% | PASS |
| Public quiz DTO | `toPublicQuiz` omits `correctOptionId`, explanation, score, pass flag, and XP | PASS by source and tests |
| Server-side scoring | `scoreQuiz` validates answers and computes score/pass on server | PASS; unit tests |
| Attempt persistence | `QuizAttempt` unique `{userId, quizId, attemptKey}` | PASS |
| Same-key identical replay | Returns original result with `replayed: true` | PASS; DB tests |
| Same-key changed answers | Returns `409 ATTEMPT_KEY_REUSED` in pre-check, in-transaction, and duplicate-key paths | PASS; concurrency fix and DB tests |
| Course-completion race | Post-commit reconciliation from both lesson and assessment paths; unique reward indexes | PASS; concurrency test |
| Saved feedback | Results endpoint returns per-question feedback; standalone quiz page renders it in a disclosure | PASS by source; browser disclosure not tested |
| Stale quiz retirement | Seeder marks missing quizzes `draft`; attempts preserved | PASS by source; guarded DB test |
| Stale achievement preservation | Authored achievements update; stale definitions drafted; user history preserved | PASS; 13/13 DB suite |
| XP and achievements | 10/25/50; `first-check`, `first-assessment`, `first-course`; duplicate-safe | PASS; DB tests |
| DB test guard | Requires `RUN_DB_TESTS=1`, `MONGODB_URI`, derives `${MONGODB_DB}_test`, asserts actual `kaos_academy_test`, uses `deleteMany`, no `dropDatabase` | PASS by source |
| Non-DB suite | 65/65 passed at checkpoint | PASS; not rerun in this audit |
| DB suite | 13/13 passed in the prior feedback-fix task | PASS; not rerun in this audit |
| Typecheck/build | Passed at checkpoint and in prior fix tasks | PASS; not rerun in this audit |

### 5.2 Browser acceptance

Browser acceptance is **not performed** and S2 is **not accepted**.

| Browser check | Status | Evidence |
|---|---|---|
| Desktop browser walkthrough | BLOCKED | No browser channel; server absent at final verification |
| Android Chrome walkthrough | BLOCKED | Manual checklist prepared but not run |
| Keyboard-only use | BLOCKED | No keyboard walkthrough |
| Screen-reader semantics | BLOCKED | No screen-reader test |
| 360 px responsive layout | BLOCKED | No device/viewport test |
| Color-independent correctness state | PARTIAL / UNVERIFIED | Option-level correct/wrong styling is color-only; question-level feedback has text |
| Saved-feedback disclosure | UNVERIFIED | Native `<details>` exists; keyboard/focus behavior not tested |
| Lighthouse/accessibility audit | BLOCKED | Not performed |
| AC-003 mobile display | UNVERIFIED | No responsive evidence |

There is no client test framework, and API assertions cannot substitute for browser acceptance. The prior S2 UI report explicitly records Phase 1 as not passed and Phase 2 (application-database readiness) as not entered.

### 5.3 Residual S2 source concerns

These concerns are retained until independently verified. Several were identified in earlier audits and remain visible in current source.

| Concern | Current source evidence | Impact | Priority |
|---|---|---|---|
| Option-level correctness is color-only | `client/src/components/Quiz.tsx:145-172` uses border/background colors; question-level text appears at `:177-184` | Accessibility NFR; screen-reader meaning unclear | P1 |
| Malformed JSON may return 500 | `server/src/middleware/errors.ts` has no `SyntaxError`/`entity.parse.failed` branch | Client error handling; possible raw-body logging | P1 |
| Cache headers missing on middleware errors | `setQuizCacheHeaders` is called inside handlers after `requireDb`, `requireAuth`, and rate limiter | 401/503/429 responses may lack `private, no-store` | P2 |
| Lesson completion does not check parent course publication | `server/src/routes/progress.ts:105-113` checks only lesson status | A published lesson in a draft course can be completed | P1 |
| Non-UUID attempt-key fallback | `client/src/components/Quiz.tsx:15-19` falls back to timestamp/random; `server/src/schemas/quiz.ts:5` requires UUID | 400 in browsers without `crypto.randomUUID` on non-secure contexts | P1 |
| Order-sensitive canonical comparison | `server/src/lib/quiz.ts:169-179` compares by index; test title overstates order coverage | Replay after question reorder may be treated as different answers | P2 |
| Transaction fallback/crash window | `server/src/routes/quizzes.ts` uses `withTransaction`; post-commit reconciliation can be missed on crash | Delayed completion reward, not a double award | P2 |
| In-memory rate limiter | `express-rate-limit` default memory store | Resets on restart; per-instance only | P2 |
| No production seed guard | `server/src/seed/run.ts` requires `MONGODB_URI` but has no environment guard | Operational risk of seeding the wrong database | P1 |

These do not invalidate the S2 API/DB evidence, but they must be resolved or explicitly accepted before S2 is described as fully complete.

### 5.4 S2 verdict

**Implementation:** verified at source, API, and database levels for the approved S2 scope.  
**Acceptance:** **NOT ACCEPTED** because browser, keyboard, screen-reader, 360 px, and mobile evidence is absent.  
**Application database:** not assessed in this audit; prior evidence says `kaos_academy` had 8 courses, 22 lessons, and 0 quizzes. Do not seed it merely because S2 API tests passed.

---

## 6. AI Feature Assessment

### 6.1 Required AI capabilities

The PRD requires the following, primarily in Module C and §13:

| Capability | PRD reference | Status | Evidence |
|---|---|---|---|
| Conversational tutor interface | §5.1 Module C | COMPLETE | `client/src/pages/Tutor.tsx`; protected `/tutor`; owner end-to-end acceptance |
| Context-aware lesson assistance | §5.1 Module C | COMPLETE | `server/src/lib/tutorContext.ts`; published-lesson context injection |
| Beginner-friendly explanations | §5.1 Module C | COMPLETE | S4 system prompt; owner confirmed beginner-friendly answer with lesson references |
| Alternative explanations | §5.1 Module C | PARTIAL | Tutor can respond to follow-ups; no dedicated alternative-explanation control or acceptance evidence |
| African/local examples | §5.1 Module C | COMPLETE for implementation | S4 system prompt permits relevant African examples without stereotyping; quality review not recorded |
| Follow-up questions | §5.1 Module C | COMPLETE | Bounded session history in `server/src/routes/tutor.ts` |
| Practice question generation | §5.1 Module C | NOT IMPLEMENTED | Tutor can discuss informal practice, but no draft-generation flow exists |
| Clear uncertainty handling | §5.1 Module C | COMPLETE | S4 system prompt requires plain uncertainty and lesson suggestions |
| Curated material as primary source | §5.1 Module C | COMPLETE | S4 system prompt and lesson context injection |
| No invented transactions, financial advice, protocol facts, or wallet guarantees | §5.1 Module C | PARTIAL | Prompt guardrails exist; adversarial answer-level tests and manual safety acceptance are not recorded |
| Dashboard AI tutor access | §8.2 | COMPLETE | Dashboard and Layout link to `/tutor` |
| Server-side AI requests, curated knowledge base, contextual retrieval | §9.1 | COMPLETE | `server/src/routes/tutor.ts`; `server/src/lib/openrouter.ts`; `server/src/lib/tutorContext.ts` |
| AI security: server-side keys, input limits, rate limits, no unnecessary PII, untrusted input, financial safety | §13 | COMPLETE for implemented path | Server-side key, validation, rate limits, prompt policy, and tests |
| AI integration and negative testing | §19 | PARTIAL | 8 tutor tests; no adversarial answer evaluation |
| AC-010 and AC-011 | §14 | AC-010 COMPLETE; AC-011 PARTIAL | Owner acceptance for AC-010; AC-011 safety evidence is not separately recorded |

**AI-generated practice questions:** the PRD explicitly requires “Practice question generation” in Module C. It does **not** specify a full validation/publication workflow. The following are **proposed controls**, not immutable PRD requirements: schema validation, correct-answer validation, explanation generation, lesson citation, human quality review, draft/published states, and separation from graded assessments. They should be treated as recommendations requiring owner approval.

### 6.2 Existing implementation and reusable foundations

Existing S4 implementation:

- `server/src/routes/tutor.ts`, `server/src/lib/openrouter.ts`, `server/src/lib/tutorContext.ts`, and `server/src/lib/tutorPrompt.ts`.
- `server/src/schemas/tutor.ts`.
- `client/src/pages/Tutor.tsx`.
- `server/test/tutor.test.ts`.
- Dashboard and Layout links to `/tutor`.
- `AI_ENABLED` and `OPENROUTER_API_KEY` configuration in `server/src/config.ts` and `server/.env.example`.
- No AI SDK dependency; the provider call uses native `fetch`.
- No conversation persistence and no practice-question generation.
- No external AI call was made during this audit.

Reusable foundations for a future gateway:

- Node.js 20+ with native `fetch`; no HTTP client dependency is required.
- Zod for environment and response validation.
- Pino with redaction support.
- Central `AppError` and error middleware.
- `express-rate-limit`.
- Session-based authentication and ownership checks.
- Mongoose models and indexes.
- Existing test harness with Node's test runner and `tsx`.
- Static bundle secret scan.

### 6.3 Proposed provider-independent AI gateway

> **Superseded for S4.** This section is a historical architecture proposal. S4 was implemented with a fixed server-side OpenRouter `openrouter/auto` integration as recorded in the S4 report. Do not use this section to reopen S4 or add model rotation/fallbacks.

This is an architecture recommendation, not an approved implementation.

**Configuration:** keep the application usable with AI disabled.

```text
AI_ENABLED=false
AI_PROVIDER=openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=<server-side secret>
AI_MODEL=<approved model or router>
AI_TIMEOUT_MS=20000
AI_MAX_INPUT_CHARS=2000
AI_DAILY_REQUEST_CAP=<owner-approved global cap>
AI_PER_LEARNER_DAILY_CAP=<owner-approved cap>
AI_FALLBACK_MODE=curated
```

`AI_ENABLED=false` should hide or disable the tutor UI and make the API return a controlled “AI disabled” response, not a crash. The core learning path must remain usable without AI.

**Suggested module boundary:**

```text
server/src/services/ai/
  types.ts          # provider interface, request/response, capability flags
  gateway.ts        # provider selection, timeout, retry, fallback, logging
  providers/
    openai-compatible.ts
    openrouter.ts   # only if OpenRouter-specific behavior is needed
  prompt.ts         # system policy and bounded context assembly
  grounding.ts      # published lesson/course/glossary retrieval
  safety.ts         # input/output checks and refusal policy
  usage.ts          # per-learner and global counters
```

**Provider interface:** a narrow chat-completion contract with capability flags:

```text
chat(request): Promise<AiResponse>
capabilities: {
  streaming: boolean
  jsonMode: boolean
  toolCalling: boolean
  systemRole: boolean
  maxContext: number
}
```

Routes should depend on the gateway interface, never on OpenRouter-specific fields.

**Would a common OpenAI-compatible interface suffice?** For OpenRouter and many providers, yes: a single OpenAI-compatible adapter can cover `POST /chat/completions`, message arrays, model selection, temperature, max tokens, and usage metadata. It will not cover every provider. Dedicated adapters are necessary where providers differ in:

- Authentication headers and base URL.
- Model naming and routing.
- Response envelope and streaming format.
- Structured-output/JSON-mode support.
- Tool-calling support and schema dialect.
- Error codes and rate-limit headers.
- Safety/refusal response shapes.
- Usage/token metadata.
- Regional/privacy requirements.

Do not assume every provider accepts the same API format, structured output, or tool calling. Do not rely on tool calling for grounding; the tutor should have no tools and no database access.

**Grounding:** deterministic retrieval from the current published lesson, its objectives, and course glossary. No embeddings or vector database are required. The server should:

1. Validate the requested lesson/course and confirm it is published.
2. Assemble a bounded system policy.
3. Inject the current lesson text and objectives within a character budget.
4. Inject glossary terms used in the lesson.
5. Optionally inject a narrow progress band if P-05 is approved; never raw records, email, or payment data.
6. Delimit the learner question as untrusted input.
7. Send server-side only.

**Safety and privacy:**

- Server-side key only; the browser never calls the provider.
- Redact `AI_API_KEY`, `OPENROUTER_API_KEY`, prompts, completions, and wallet/payment fields from logs by default.
- Cap input length; reject oversized requests.
- Rate-limit per learner and globally; enforce a daily cap.
- Treat learner text as data, not instructions; strip role markers and instruction-looking patterns.
- Refuse price predictions, investment advice, seed/private-key requests, payment-status claims, and “guaranteed safe” wallet claims.
- Surface uncertainty; do not present unverified protocol facts as certain.
- Do not send email, IP, user id, or payment data in prompts.
- Disclose third-party processing and training/retention policy in the tutor UI.
- No tools and no database access for the model.

**Failure and cost behavior:**

- Timeout via `AbortController`.
- One retry on timeout/5xx with jitter; no blind retry on 4xx.
- On provider failure, quota exhaustion, or `AI_ENABLED=false`, return a curated “Lesson Help” fallback: key points, glossary, suggested questions with authored answers, and a link to the relevant section.
- Log the fact of a fallback, not learner content.
- Treat free-tier availability and limits as operational dependencies, not guarantees.

**Avoiding OpenRouter lock-in:**

- Use `AI_PROVIDER` and `AI_BASE_URL` configuration, not OpenRouter-specific route logic.
- Keep provider-specific code inside an adapter.
- Test with a mock adapter and at least one alternate OpenAI-compatible provider before claiming portability.
- Do not encode OpenRouter model IDs in domain logic.
- Do not make OpenRouter’s free router the only supported path.

### 6.4 AI-generated practice questions: proposed separation

If the owner approves AI question generation, keep it separate from curated graded assessments:

- Generated questions are `draft`, not published.
- Each question carries source lesson/course, model, prompt version, generation time, and a generated flag.
- Validate schema, exactly one correct option, explanation presence, and lesson support.
- Require human review before publication.
- Do not award XP or affect course completion until a reviewed question is published as part of an approved quiz.
- Keep generated content out of the seeded curated `quizzes` unless explicitly promoted through review.
- Provide a kill switch and a per-learner generation cap.
- Test for answer leakage, ambiguity, duplicate questions, and unsupported claims.

### 6.5 AI verdict

**S4 tutor: implemented and owner-confirmed for the accepted end-to-end path.**  
**Practice-question generation: not implemented; deferred.**  
**Provider-independent gateway: not implemented; S4 uses server-side OpenRouter.**  
**OpenRouter `openrouter/auto`: implemented for S4 per owner instruction; production terms and quotas still require verification.**  
**Conversation retrieval endpoints: deferred.**  
**AC-011 adversarial safety evidence: not separately recorded.**

---

## 7. Hackathon Readiness

### 7.1 Confirmed hackathon requirements

| Item | Confirmed requirement | Source |
|---|---|---|
| Hackathon | Dakar Bitcoin Hack by BTrust | PRD header |
| Deadline | November 20, 2026 | PRD header, §18 |
| P0 commitment | FR-001–FR-011 | §7 |
| P1/P2 | FR-012–FR-016 must not delay the working MVP | §7 |
| Submission package | Public GitHub repository; deployed MVP or demo video; product presentation; README; architecture diagram; wallet integration documentation; security considerations; demonstrable end-to-end journey; future roadmap | §21 |
| Demo journey | Open app, register, start Bitcoin 101, complete lesson, take quiz, explore simulation, ask AI tutor, connect wallet, complete guided payment, verify result | §19 |
| Definition of Done | Public app works; beginner journey; persistent progress; playground; contextual AI tutor; actual Lightning integration; verified guided payment; security checks; public repository/docs; no mock payment results | §25 |

### 7.2 Confirmed versus assumed

**Confirmed:** the deadline, deliverables, P0/P1/P2 priorities, demo journey, and Definition of Done are recorded in the PRD.

**Not confirmed:** the repository contains no explicit judging criteria, scoring rubric, or evaluator guidance. This audit does not invent any. If the hackathon publishes criteria outside the repository, they must be obtained from the organizer and added as a separate source.

### 7.3 Readiness assessment

| Area | Status | Reason |
|---|---|---|
| Learning core | PARTIAL | S1 implemented and API/DB tested; browser/mobile acceptance absent |
| S2 quizzes and assessments | PARTIAL | Implemented and API/DB tested; browser acceptance absent; S2 not accepted |
| Playground | COMPLETE for S3 scope | Implemented and owner-confirmed in a browser; formal mobile/accessibility acceptance not claimed |
| AI tutor | COMPLETE for S4 scope | Implemented and owner-confirmed end to end; deferred items are listed in the S4 report |
| Wallet connection | NOT READY | No implementation; decisions pending |
| Guided payment | NOT READY | No implementation; AC-014 funding unresolved |
| Public deployment | NOT READY | No remote, deployment config, or public URL |
| Documentation | NOT READY | README absent; architecture file empty; no security/wallet docs |
| Presentation/demo | NOT READY | No presentation or video |
| Public repository | NOT READY | No remote configured; no push |
| End-to-end journey | NOT READY | Only the first five steps are implementable today |

**Hackathon readiness verdict:** **not ready**. The project has a credible learning-core demo, but the submission-critical P0 areas are missing, and the remaining time is approximately two weeks.

### 7.4 Work that could jeopardize submission

1. S2 browser acceptance remains blocked and the isolated server is currently down.
2. The playground, AI tutor, wallet, and payment are all unstarted P0 features.
3. AC-014 requires real sats and a receiving path; no funding decision exists.
4. No public remote or deployment exists; deployment and documentation are not started.
5. The application database readiness and production seed are not assessed.
6. Owner decisions for AI and wallet remain open.
7. The final submission package has multiple artifacts, not just code.
8. Human content review and accessibility evidence are outstanding.
9. Free-tier cold starts, Atlas DNS variability, and Render billing uncertainty remain operational risks.
10. No CI or client test framework increases regression risk during the compressed final phase.

---

## 8. Prioritized Remaining Roadmap

### 8.1 Sequencing principles

- Do not skip S2 browser acceptance because API/DB tests pass.
- Do not seed the application database until browser acceptance passes and the owner authorizes a separate Phase 2 seed.
- Complete P0 features before P1/P2.
- Parallelize independent work: S3 has no backend dependency; AI architecture and wallet spike can proceed in parallel with S2 acceptance, but implementation requires approval.
- Keep the curated learning path usable if AI or wallet work slips.
- Treat AC-014 as a hard funding/receiving-path gate, not a simulation task.
- Reserve time for documentation, deployment, and rehearsal; they are submission-critical.

### 8.2 Phase 0 — Immediate gates (P0)

| Task | Requirement | Current status | Evidence | Remaining work | Dependencies | Priority | Acceptance criteria | Owner decision |
|---|---|---|---|---|---|---|---|---|
| Restore an approved test environment | AC-001/002/003/005, S2 | BLOCKED | PID 11122 absent; ports down | Owner approves restarting isolated server on `4100` with `kaos_academy_test` or provides another browser channel | Owner approval; do not restart without it | P0 | Health endpoint responds; DB is the prepared test DB; no production DB touched | Yes |
| Complete S2 browser acceptance | AC-001/002/003/005, S2 | BLOCKED | Manual checklist prepared, not run | Register/login, catalogue, preview, lesson, completion, dashboard, quiz, assessment, saved feedback, keyboard, screen reader, 360 px | Working test environment and browser | P0 | Checklist evidence recorded; defects logged | Yes, for restart/browser access |
| Enter application-DB readiness assessment | Phase 2 gate | NOT ENTERED | Prior report says Phase 2 blocked | Read-only assessment of `kaos_academy` after S2 browser acceptance | S2 acceptance pass | P0 | Read-only readiness report; no seed | Yes, for any seed |
| Formalize D-09/P-04 and current scope | PRD §6, owner scope | Implemented but formal record unconfirmed | 8 courses/22 lessons; S2 owner confirmed curriculum unchanged | Record the approved scope explicitly; decide whether 22 lessons is sufficient for submission | Owner | P0 | Written decision; catalogue claims match | Yes |
| Freeze submission scope | PRD §7, §21 | Open | P0 gaps large | Choose minimum P0 demo set and defer P1/P2 explicitly | Owner | P0 | Scope list approved | Yes |

### 8.3 Phase 1 — P0 feature build (parallel where possible)

| Task | Requirement | Current status | Evidence | Remaining work | Dependencies | Priority | Acceptance criteria | Owner decision |
|---|---|---|---|---|---|---|---|---|
| S3 Bitcoin playground | FR-007, AC-008/009, Module B | **COMPLETE** | `reports/S3-BITCOIN-PLAYGROUND-IMPLEMENTATION-REPORT.md`; owner browser confirmation | No remaining implementation work; formal mobile/keyboard acceptance still outstanding | D-08 handled by S3's no-mnemonic design; D-10 was not needed for S3 | P0 | Six labs work; AC-008/009 evidence; mobile/keyboard check | Not for S3 closure |
| S4 AI tutor minimal | FR-008, AC-010/011, Module C | **COMPLETE** | `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md`; automated tests; owner end-to-end acceptance | Deferred: practice-question generation and conversation retrieval endpoints. AC-011 safety behavior is not separately claimed by the manual acceptance; it remains covered by the implementation's prompt policy and tests only as recorded. | S4 provider/model choice was set by owner instruction; P-05 progress context is not used by the implemented tutor | P0 | AC-010 demonstrated by owner; no secret exposure | Not for S4 closure |
| S5 wallet connection and invoice literacy | FR-009, AC-012/016, Module E | NOT IMPLEMENTED | No code | Wallet spike; NWC/LNbits adapter; connection state; invoice inspection; secret handling | D-11, D-02, D-01, D-05, D-06 | P0 | AC-012/016 pass; live wallet response; no secrets in logs/bundle | Yes |
| S6a payment logic and failure handling | FR-010 partial, AC-015 | NOT IMPLEMENTED | No code | Payment intent, state machine, fake adapter, receipt UI, failure taxonomy | S5 | P0 | Full flow against fake adapter; AC-015; no mock-success claim | Yes |
| S6b real settlement | AC-013/014, DoD | NOT IMPLEMENTED / BLOCKED | No funding/receiving path | Real invoice, wallet approval, receiver verification, receipt | S6a; D-01/D-03/D-06/P-01/P-02/Z-02; funds | P0 | Real payment completed and verified; AC-013/014 evidence | Yes |

### 8.4 Phase 2 — Stabilization, deployment, and submission (P0)

| Task | Requirement | Current status | Evidence | Remaining work | Dependencies | Priority | Acceptance criteria | Owner decision |
|---|---|---|---|---|---|---|---|---|
| S7 PWA, accessibility, responsive QA | AC-003, §8.3, §15 | NOT IMPLEMENTED | No PWA; no browser QA | PWA decision, manifest/service worker if approved; keyboard/screen-reader/360 px; Lighthouse | D-07; S2/S3/S4/S5/S6 | P0 | AC-003 evidence; accessible controls; installable if approved | Yes for D-07 |
| Public deployment | AC-017 | NOT IMPLEMENTED | No remote/deployment | Render/free host or approved alternative; production env; health; cold-start rehearsal; billing verification | Owner approval; deployment account | P0 | Public URL works; smoke test | Yes |
| Application DB readiness and production seed | AC-002/004/007, deployment | NOT ASSESSED | Prior app DB evidence stale | Read-only readiness; separate production seed authorization | S2 acceptance; owner approval | P0 | Correct DB target; no test data; verified counts | Yes |
| Documentation package | AC-018, §21 | NOT IMPLEMENTED | README absent; architecture empty | README, setup, architecture diagram, security, wallet integration, future roadmap | S7; OD-001 | P0 | Documentation review | Yes for OD-001/push |
| Public repository and submission package | §21 | NOT IMPLEMENTED | No remote; no artifacts | Secret scan; remote; push; presentation; demo video; E2E rehearsal | All P0; owner approval | P0 | All nine deliverables present | Yes |
| Final E2E and negative testing | §19, §25 | PARTIAL | Only learning core | Full demo journey; AI/wallet failure cases; network interruption; payment rejection | All P0 | P0 | E2E and negative evidence recorded | No |

### 8.5 Phase 3 — P1 quality and acceptance work

| Task | Requirement | Current status | Evidence | Remaining work | Dependencies | Priority | Acceptance criteria | Owner decision |
|---|---|---|---|---|---|---|---|---|
| Fix residual S2 source concerns | AC-003/005, NFRs | PARTIAL | See §5.3 | Parent-course check, malformed JSON 400, UUID fallback, order-insensitive compare, cache headers, color-independent states | None | P1 | Tests and browser checks pass | No |
| Add course introductions, objectives, diagrams | PRD §6 | PARTIAL | No course-intro field; no illustrations | Content/design work | Human review | P1 | Each course meets §6 content list or approved scope | Yes for scope |
| Add scenario-based questions | Module D | PARTIAL | 1/87 questions has scenario | Author more scenarios where useful | Content review | P1 | Coverage reviewed | No |
| Dashboard AI tutor access | §8.2 | COMPLETE | Dashboard and Layout link to `/tutor` | None | None | P1 | Link present | No |
| Human content review | §23 risk mitigation | NOT IMPLEMENTED | AI review only | Assign reviewer; correct issues | Owner | P1 | Review record | Yes |
| Privacy notice and log review | §13 | PARTIAL | No privacy page; redaction partial | Add notice; review PII | Deployment | P1 | Privacy review | No |
| CI and broader tests | §15 | NOT IMPLEMENTED | No `.github`; no client tests | Add CI if approved; client test decision | D-10 | P1 | Automated checks run | Yes for dependencies |

### 8.6 Phase 4 — P2/P3 enhancements

| Task | Requirement | Current status | Priority |
|---|---|---|---|
| Multiple learning paths | FR-013 | NOT IMPLEMENTED | P2 |
| Completion certificates | FR-014 | NOT IMPLEMENTED | P2 |
| Community learning features | FR-015 | NOT IMPLEMENTED | P2 |
| Advanced developer courses | FR-016 | PARTIAL | P2 |
| Rich achievement badges | Module D | PARTIAL | P2 |
| Offline learning and advanced PWA | §22 Phase 3 | NOT IMPLEMENTED | P3 |
| Additional African languages | §22 Phase 3 | NOT IMPLEMENTED | P3 |
| Nostr and ecosystem integrations | §22 Phase 4 | NOT IMPLEMENTED | P3 |

### 8.7 Dependency graph

```text
S2 browser acceptance
  -> application-DB readiness (read-only)
  -> production seed authorization
  -> public deployment and final E2E

S3 playground (independent of backend)
  -> final demo journey

S4 AI tutor (complete; owner-confirmed)
  -> optional AI-generated practice questions (deferred)

Wallet spike and decisions (D-11, D-02, D-01, D-05, D-06)
  -> S5 connection and invoice literacy
  -> S6a payment logic and failure handling
  -> S6b real settlement (requires funding/receiving path)

S7 deployment, PWA, accessibility, docs
  -> submission package, presentation, demo video, public repo
```

Do not move directly from S2 API tests to application-database seeding. The prior UI report makes browser acceptance the Phase 1 gate, and this audit preserves that gate.

---

## 9. Owner Decisions Required

No decision below is approved by this audit. Each requires explicit owner approval before implementation.

| Decision | Why it is needed now | Options / recommendation | Blocks | Current status |
|---|---|---|---|---|
| D-09 / P-04 formal curriculum scope | The catalogue claims eight courses but courses 02–08 are first-module only | Record the 22-lesson scope explicitly; decide whether it is sufficient for §6 and the submission | Content claims, S3/S4 sequencing | Implemented; formal record unconfirmed |
| Z-01 AI operating policy | Required before any AI code | `AI_ENABLED=false` default; OpenRouter-compatible provider; configurable model; daily cap; curated fallback; training opt-out; privacy disclosure | S4 | Implemented for S4 as recorded; no separate policy sign-off |
| P-05 tutor progress access | Determines prompt context | Recommend a narrow banded summary, never raw records or payment data | S4 | Not used in S4; remains a future decision |
| AI provider/model and data policy | Prevents lock-in and privacy surprises | Approve OpenRouter for investigation; require adapter boundary; approve model evaluation set; approve retention/training policy | S4 | Resolved for S4: OpenRouter `openrouter/auto` per owner instruction; production terms still unverified |
| AI-generated practice-question policy | PRD requires generation, but validation/publication is unspecified | Approve draft-only generation, schema validation, human review, separation from graded quizzes, no XP until published | AI quiz generation | Deferred; not implemented |
| D-01 receiving-wallet architecture | Required for real invoice/settlement | LNbits invoice key or academy NWC wallet; evaluate both | S5/S6b | Pending |
| D-02 NWC credential custody | Security policy | Recommend browser-held, memory-only | S5 | Pending |
| D-03 payment/funding model | Determines consent and demo script | Learner-funded, academy-funded, or documented deviation; no decision made by this audit | S6b | Pending |
| D-05 LNbits role/fallback | Avoids non-compliant demo | Recommend receiving-only complement to NWC | S5/S6 | Pending |
| D-06 wallet acceptance environment | Defines AC-014 evidence bar | Recommend mainnet with a written tiny-amount cap, after testnet rehearsal | S6b | Pending |
| D-11 wallet validation spike | Critical path | Run before S5; record compatibility and payment evidence | S5 | Pending |
| P-01 payment recipient | Required for honest consent | Academy, community partner, self, or merchant | S6b | Pending |
| P-02 amount and funding source | Required for consent/caps | Recommend tiny fixed amount and explicit funding source | S6b | Pending |
| Z-02 AC-014 path | DoD conflict | Sponsor, learner-funded, or documented deviation; simulation/testnet cannot satisfy AC-014 | S6b, DoD | Pending |
| D-08 mnemonic display in playground | Safety/education design | Recommend no valid BIP39 mnemonic; fixed illustrative example only | S3 | Resolved for S3 by no-mnemonic display |
| D-10 dependency batch | Playground/crypto libraries | Approve exact dependencies before adding | S3/S5 | Not needed for S3; pending for the S5 NWC dependency |
| D-07 offline/PWA scope | PWA is preferred, not required | Recommend read-only shell cache; no offline completion writes | S7 | Pending |
| OD-001 documentation structure | AC-018 docs | Keep root canonical; decide whether `docs/` is created | S7 | Open |
| Git remote/push | Public repository deliverable | Approve remote, push, and secret scan | Submission | Not approved |
| Deployment | AC-017 | Approve host/account and billing safeguards | Submission | Not approved |
| Production DB seed | Deployment data | Approve only after S2 acceptance and readiness assessment | Deployment | Not approved |
| Browser/test environment restart | S2 acceptance | Approve restarting isolated `4100` server or provide browser channel | S2 acceptance | Blocked |
| Human content reviewer | §23 risk mitigation | Assign a reviewer and review record | Content quality | Not assigned |

---

## 10. Risks and Unresolved Questions

### 10.1 Technical risks

| Risk | Impact | Current evidence | Mitigation |
|---|---|---|---|
| Isolated server is down | Blocks S2 browser acceptance | PID 11122 absent; ports closed | Owner-approved restart or alternate browser channel |
| S2 browser acceptance absent | S2 cannot be accepted; deployment confidence low | No browser/keyboard/screen-reader/360 evidence | Complete manual checklist |
| Residual S2 defects | Security/accessibility/robustness gaps | See §5.3 | Fix and test |
| AI provider/model churn and quota | Tutor may fail during demo | S4 uses `openrouter/auto`; production quotas and terms are unverified | Re-verify quotas; do not redesign S4 |
| AI hallucination/prompt injection | Misinformation and unsafe advice | S4 prompt guardrails and input tests exist; adversarial answer tests are not recorded | Add evaluation evidence; do not redesign S4 |
| Wallet integration complexity | S5/S6 may slip | No spike | Run D-11 early; choose NWC/LNbits with evidence |
| AC-014 funding conflict | DoD cannot be met | No funds/receiving path | Owner decision Z-02; do not fake settlement |
| Atlas DNS variability | DB connection failures | Custom resolver and 18 tests; intermittent network | Retries; demo rehearsal; health check |
| Render free-tier cold start/billing | Demo failure or unexpected charge | No deployment; billing unverified | Warm-up, health check, billing verification |
| No CI/client tests | Regressions during compressed phase | No `.github`; no client test framework | Add CI/tests if approved |
| Application DB readiness unknown | Production seed risk | Prior evidence stale; no current inspection | Read-only readiness after S2 acceptance |
| Future AI/wallet secret leakage | Security breach | No implementation yet | Server-side keys, redaction, bundle/log scans |
| In-memory rate limiter | Resets on restart; per-instance | Current implementation | Document; use shared store if scaled |
| Transaction crash window | Delayed completion reward | Post-commit reconciliation; no outbox | Accept/document or add reconciliation job |

### 10.2 Educational risks

| Risk | Impact | Mitigation |
|---|---|---|
| AI misinformation | Learner harm and credibility loss | Curated grounding, refusals, uncertainty, human review |
| Human content review absent | Factual/ pedagogical errors | Assign reviewer; correct before submission |
| Courses 02–08 are thin | PRD §6 “each course” expectation not fully met | Formal scope decision; expand if time |
| Only one scenario-based question | Module D scenario requirement weak | Add scenarios where useful |
| No diagrams/illustrations | Learning experience weaker | Add visual explanations |
| No learner testing or item analysis | Question quality unproven | Small usability test; review |
| AI-generated questions could be ambiguous | Assessment quality | Draft-only, validation, human review, no XP until published |

### 10.3 Security and privacy risks

| Risk | Impact | Mitigation |
|---|---|---|
| Malformed JSON returns 500 | Poor error handling; possible log exposure | Add body-parser error branch |
| Parent-course publication gap | Draft content can be completed | Check parent course status |
| Color-only option state | Accessibility failure | Add text/icon indicators |
| Cache headers missing on middleware errors | Learner data caching risk | Set headers before auth/rate-limit middleware |
| Non-UUID fallback | Quiz submission 400 on some browsers | Use `crypto.randomUUID` or valid UUID fallback |
| No privacy page | PRD privacy requirement unmet | Add notice before deployment |
| Wallet/AI secrets not yet handled | Future breach risk | Server-side keys, redaction, least privilege |
| No final security review | AC-016/DoD security clause unmet | Perform review and fix |

### 10.4 Delivery risks

| Risk | Impact | Mitigation |
|---|---|---|
| Approximately two weeks remain | P0 scope at risk | Freeze scope; parallelize; defer P1/P2 |
| No public repo/deployment | Submission cannot be made | Owner approvals; start early |
| Documentation/presentation unstarted | Submission package incomplete | Assign work now, not after code |
| Owner decisions pending | S5/S6 blocked | Decide D-11/D-02/dependency and S5 scope immediately |
| Browser acceptance blocked | S2 and AC-003 at risk | Restore test environment |
| Funding unresolved | AC-014/DoD at risk | Decide Z-02; document deviation if needed |
| External provider limits dated | AI demo may fail | Re-verify before implementation; fallback |

### 10.5 Unresolved questions

1. Is D-09/P-04 formally approved, or is the 22-lesson scope only an implementation convention?
2. Is the current 22-lesson curriculum sufficient for PRD §6's “each course” content list?
3. Will AC-014 be funded, sponsored, or documented as a deviation?
4. Which wallet path will be selected: NWC, LNbits, or a hybrid?
5. S4 uses server-side OpenRouter `openrouter/auto` per owner instruction. Current provider quotas and privacy terms still require owner verification before production.
6. Is AI-generated practice-question generation in the MVP, or deferred? (S4 does not claim persisted or graded generation.)
7. P-05 progress context is not used by the implemented S4 tutor; lesson grounding is used instead.
8. Is a PWA/offline shell required for the submission, or optional?
9. What documentation structure will OD-001 approve?
10. Can the isolated test server be restarted, and by whom?
11. Is browser acceptance required before application-DB seeding? Prior evidence says yes.
12. Are there hackathon judging criteria outside the repository? None are documented.
13. Are the addendum's Render/Atlas/OpenRouter limits still current? Not verified.

---

## 11. Recommended Next Phase

**Current recommendation (2026-11-07): S5 — Wallet Connection and Invoice Literacy, after owner review and approval.**

S3 and S4 are complete and owner-confirmed. S5 is the next unimplemented slice. S5 implementation is not approved and has not started.

Reasons:

1. S5 is the next P0 dependency for the PRD demo journey: connect wallet, understand an invoice, then move to guided payment in S6a/S6b.
2. S5 is currently blocked by wallet decisions D-11, D-02, and the exact NWC dependency.
3. S5 can stay small: browser-held memory-only NWC connection, live `get_info`, honest status/disconnect, and sample-invoice literacy. Payment execution and settlement stay in S6a/S6b.
4. S2's formal browser/accessibility acceptance remains outstanding and must be tracked separately; S3/S4 evidence does not close it.
5. S4's deferred items (practice-question generation and conversation retrieval) remain deferred and must not be silently claimed.

**Current next task (not implemented here):**

1. Owner reviews and accepts the S4 closure and S5 readiness report.
2. Owner decides S5 Option A (client-only) or Option B (metadata-only server record).
3. Owner approves the D-11 zero-funds wallet spike, D-02 browser-memory-only custody, and the exact NWC dependency.
4. Owner decides whether invoice literacy is sample-only or includes a read-only BOLT11 decoder.
5. Run the spike and record wallet compatibility, CSP, and secret-handling evidence.
6. Implement S5 only after those approvals.
7. Do not execute `pay_invoice`, create real invoices, or claim settlement in S5.
8. Do not seed `kaos_academy`, implement S6 payments, or deploy until separately approved.

**Historical Phase 0 note:** the earlier recommendation to restore the isolated test environment and complete S2 browser acceptance remains relevant to S2 acceptance, but it is not the current phase sequence.

---

## 12. Audit Limitations

This audit is evidence-based but not exhaustive.

- **Read-only:** no application source, test, configuration, PRD, checksum, DNS, Atlas, credential, or environment file was modified. The only repository write is this report.
- **No Git writes:** no staging, commit, amend, reset, stash, clean, discard, push, or deploy occurred.
- **No database writes:** neither `kaos_academy` nor `kaos_academy_test` was seeded, reset, cleaned, or modified. `server/test/db.integration.test.ts` was not run because it deletes every collection in the guarded test database.
- **No tests run:** the audit relied on prior recorded results: 65/65 non-DB tests at checkpoint and 13/13 guarded DB tests in the feedback-fix task. Those results were not independently rerun here.
- **No browser:** no browser, keyboard, screen-reader, Lighthouse, or 360 px test was performed.
- **No server:** PID `11122` and ports `4100`, `4000`, and `5173` were absent at final verification. This audit did not restart them.
- **No database inspection:** application database readiness was not re-inspected. Prior evidence says `kaos_academy` had 8 courses, 22 lessons, and 0 quizzes; that evidence may be stale.
- **No external APIs:** no AI provider, wallet, relay, Atlas, or hosting API was called. Addendum provider limits and pricing were not re-verified.
- **No deployment/remote:** no remote is configured; no deployment exists; no public URL was tested.
- **No human content review:** content quality was assessed from source and prior AI review only.
- **No judging criteria:** the repository documents no hackathon judging rubric; none was invented.
- **PRD discrepancy:** `PRD.txt` remains archived and divergent from `PRD.md`; it was not reconciled.
- **Source inspection limits:** absence of a feature was established by repository search, not by exhaustive runtime probing.
- **Addendum facts:** the November 1 zero-budget addendum is historical; its dates, provider limits, repository observations, and recommendations are not treated as current requirements.

### Evidence index

Key evidence paths:

- PRD: `PRD.md`, `PRD-ORIGINAL.txt`, `PRD.txt`, `PRD-MD-SHA256.txt`, `PRD-SHA256.txt`
- S2 checkpoint: `reports/S2-PROGRESS-CHECKPOINT-COMMIT-REPORT.md`
- S2 implementation: `reports/S2-IMPLEMENTATION-REPORT.md`, `reports/S2-CONCURRENCY-FIX-REPORT.md`, `reports/S2-FEEDBACK-AND-SEEDER-FIX-REPORT.md`
- S2 acceptance and UI: `reports/S2-ACCEPTANCE-AUDIT-REPORT.md`, `reports/S2-UI-TESTING-AND-APPLICATION-DB-READINESS-REPORT.md`, `reports/S2-ANDROID-CHROME-UI-TESTING-PREPARATION-REPORT.md`, `reports/S2-QUIZ-IMPLEMENTATION-AND-VISIBILITY-AUDIT.md`
- S2 planning: `S2-SUMMARY.md`, `reports/S2-PLANNING-AND-ROADMAP-REPORT.md`, `reports/S2-PRE-IMPLEMENTATION-AUDIT-REPORT.md`
- Architecture and zero-budget: `reports/ARCHITECTURE-DISCOVERY-REPORT.md`, `reports/ARCHITECTURE-REVIEW-ADDENDUM.md`, `reports/ARCHITECTURE-CORRECTIONS-REPORT.md`, `reports/PRODUCT-AND-LEARNING-ARCHITECTURE-AUDIT.md`, `reports/ZERO-BUDGET-FEASIBILITY-ADDENDUM.md`
- DNS: `reports/DNS-IMPLEMENTATION-REPORT.md`, `reports/DNS-MONGODB-INSPECTION-REPORT.md`, `reports/DNS-MONGODB-CUSTOM-RESOLVER-INVESTIGATION.md`
- Source: `server/src/routes/`, `server/src/lib/`, `server/src/models/`, `server/src/content/`, `server/src/seed/`, `client/src/pages/`, `client/src/components/`
- Tests: `server/test/content.test.ts`, `quiz.test.ts`, `quiz-content.test.ts`, `progress.test.ts`, `rewards.test.ts`, `validation.test.ts`, `http.test.ts`, `password.test.ts`, `static.test.ts`, `dns.test.ts`, `db.integration.test.ts`

---

**End of audit.** No remediation, AI implementation, wallet integration, database seeding, deployment, or Git write was performed. Owner review and explicit approval are required before the next phase.
