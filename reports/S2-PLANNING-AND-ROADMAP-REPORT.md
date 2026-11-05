# KAOS Bitcoin Academy — S2 Planning and Complete Implementation Roadmap

Project: KAOS Bitcoin Academy  
Phase: Post-S1 / S2 planning and roadmap discovery  
Date: November 1, 2026  
Status: Planning only. No S2 implementation is authorized by this report.  
Prepared by: OpenCode, under the project owner's read-only planning instruction.

---

## 0. Planning boundary and evidence rules

This report is a planning and inspection artifact. It does not implement S2, change application behavior, add dependencies, modify configuration, alter the PRD, resolve an engineering decision, or perform a Git operation.

The following boundaries were observed:

- `PRD.md` was read but not modified. Its SHA-256 is
  `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`,
  matching `PRD-MD-SHA256.txt`.
- `PRD-ORIGINAL.txt`, `PRD.txt`, `PRD-SHA256.txt`, `ENGINEERING-DECISIONS.md`,
  all existing reports, application source, tests, scripts, and configuration were not modified.
- No dependency was installed.
- No Git repository was initialized, no `.gitignore` rule was changed, no file was staged or
  committed, no remote was created, and nothing was pushed.
- The working tree was clean before this report was created. This report is the only new
  project file and remains untracked until the owner decides otherwise.
- No deployment, wallet connection, AI request, or real payment was performed.

Evidence in this report is separated into:

- **Verified in this review** — directly inspected in the current repository or rechecked with a
  command during this planning session.
- **Documented prior evidence** — a result recorded in an existing project report and not rerun
  during this planning session.
- **Proposed** — a planning recommendation that requires owner approval.
- **Unresolved** — a decision or external dependency that this report does not silently resolve.

The current test baseline was rechecked without database writes:

```text
npm test          -> 28 passed, 0 failed, database suite skipped
npm run typecheck -> server and client passed
```

The prior database-backed result remains documented evidence, not a result rerun here:

```text
RUN_DB_TESTS=1 npm test -> 35/35 passed, exit code 0
```

The database suite is intentionally opt-in and requires `RUN_DB_TESTS=1` plus `MONGODB_URI`.

---

## 1. Executive summary

S1 delivered the working learning spine: accounts, an eight-course catalogue, lesson reading,
one account-free preview lesson, persistent lesson completion, course and overall progress, and a
learner dashboard. The current S1 implementation is materially consistent with the existing S1
report. The report's status line is historical: it predates the successful Atlas verification and
still says S1 acceptance is incomplete. The later teardown-correction report records the clean
7/7 database suite and 35/35 full suite.

The complete MVP roadmap requires **eight slices total**:

| Slice | Name | Status |
|---|---|---|
| **S1** | Learner entry path: accounts, catalogue, lessons, progress, dashboard | **Completed baseline** |
| **S2** | Assessment, feedback, XP, and completion integration | Next; not started |
| **S3** | Interactive Bitcoin playground | Not started |
| **S4** | Contextual AI tutor | Not started |
| **S5** | Lightning wallet connection and invoice literacy | Not started |
| **S6a** | Guided payment logic, state machine, failure handling, receipt UI (fake settlement) | Not started |
| **S6b** | Real Lightning settlement and verified receipt | Not started; external funding gate |
| **S7** | Stabilization, PWA, accessibility, public deployment, documentation | Not started; final slice |

The total is eight because the remaining P0 work separates into five distinct user-facing
capabilities—assessment, playground, tutor, wallet connection, and payment—plus the cross-cutting
stabilization/submission slice, with the payment vertical split into logic and real settlement.
The S6a/S6b split is not artificial: S6a is buildable and testable at ₦0 against fakes, while S6b
is the only slice that requires real sats, a receiving wallet, and a funded settlement event.
Combining them would either block all payment logic on funding or tempt the project to present a
mock result as a real one.

S2 should follow S1 because it completes the learning loop (read → check → prove), uses the
existing lesson and progress spine, has no external-service dependency, and produces the quiz
signal that the tutor's later context summary can use. S2 does **not** depend on OD-001 or on the
wallet decisions D-01, D-02, D-03, D-05, D-06, or D-11. It does require a small number of new
product decisions about assessment coverage, the course-completion rule, and the P1
XP/achievement scope.

The project is not yet at the PRD's Definition of Done. S1 covers five P0 functional requirements
fully and one partially; five P0 requirements remain. Four acceptance criteria are verified, one is
implemented but lacks recorded mobile-device evidence, and thirteen are not yet satisfied. The
largest external blockers are the wallet/payment vertical and real settlement funding; the largest
non-external risk is assessment and playground content authoring.

---

## 2. Current S1 baseline

### 2.1 Repository and Git state

- Repository: `~/kaos-bitcoin-academy`
- Branch: `main`
- Working tree before this report: clean
- Tracked files: 97
- Commits:
  - `9512f9c12dcd6e76488568ff81faebdfafa41fb6` — `chore: establish S1 project baseline`
  - `e7673e84b1e01302f61617df01b53bd51260cb6f` — `chore: expand gitignore for local artifacts`
  - `41d37e7df79bdba48b55399ef20fdea0ac7ea4db` — `docs: add pre-S2 Git initialization report`
- Remotes: none
- `README.md`: absent
- `docs/`: absent
- Four subordinate documents are present but zero bytes:
  `ARCHITECTURE.md`, `IMPLEMENTATION-PLAN.md`, `CHANGELOG.md`, `TEST-REPORT.md`.
- `ENGINEERING-DECISIONS.md` contains only **OD-001**, status **Open**.

The absence of a remote and the empty documents are current facts, not implementation defects.
They become acceptance gaps at S7.

### 2.2 Implemented S1 functionality

| Area | Current implementation | Evidence |
|---|---|---|
| Accounts | Register, login, logout, current session; Argon2id hashing; duplicate-email 409; session regeneration; server-side sessions in MongoDB | `server/src/routes/auth.ts`, `server/src/lib/password.ts`, `server/src/app.ts`; database tests |
| Sessions and cookies | `HttpOnly`, `SameSite=Lax`, `Secure` in production, `__Host-` cookie in production, 7-day TTL | `server/src/app.ts`, `server/src/config.ts`; database test cookie assertions |
| Catalogue | Eight published courses; published/draft filtering; ordered modules; per-course progress | `server/src/routes/courses.ts`, `server/src/models/Course.ts` |
| Lessons | Structured section blocks; objectives; previous/next; preview access; authenticated access for all other lessons | `server/src/routes/lessons.ts`, `server/src/models/Lesson.ts`, `client/src/pages/Lesson.tsx` |
| Preview | Exactly one preview lesson, `btc101-what-is-bitcoin`; anonymous read; anonymous completion returns 401; no anonymous progress | `server/src/content/index.ts`, `server/src/routes/lessons.ts`; database test |
| Completion | Idempotent per-lesson completion; unique `{userId, lessonSlug}` index; 201 first, 200 repeat | `server/src/routes/progress.ts`, `server/src/models/Progress.ts`; database test |
| Progress | Per-course and overall summaries; next lesson; resume target; recent completions | `server/src/lib/progress.ts`, `server/src/routes/dashboard.ts` |
| Dashboard | Welcome, overall progress, course progress, resume, next lesson, recent completed lessons, first-time state | `client/src/pages/Dashboard.tsx`; database test |
| Content | 8 courses, 22 lessons; Bitcoin 101 complete; first module of courses 02–08; idempotent seeding; structural validation | `server/src/content/`, `server/src/seed/seedContent.ts`; content tests |
| Security baseline | Helmet/CSP, JSON-only mutations, Origin/host guard, Zod validation, auth rate limit, structured-log redaction, no stack traces, bundle secret scan | `server/src/app.ts`, `server/src/middleware/`, `server/test/static.test.ts`, `server/test/http.test.ts` |

### 2.3 S1 evidence status

- **Verified in this review:** the current non-database suite passes 28/28; server and client
  typechecks pass; the current code contains the S1 routes, models, pages, and tests described
  above.
- **Documented prior evidence:** the Atlas-backed S1 suite passed 7/7 and the full suite passed
  35/35 with exit code 0, after the teardown correction. The correction report records the exact
  commands and results.
- **Not verified:** AC-003's "lessons display correctly on mobile" has no recorded physical
  Android-device or responsive-browser test. The implementation is responsive by construction and
  uses the PRD palette, but the acceptance evidence is incomplete.
- **Not performed:** deployment, PWA installation, real wallet connection, AI request, real
  payment, end-to-end demo journey.

### 2.4 Historical report discrepancy, not a PRD conflict

`reports/S1-IMPLEMENTATION-REPORT.md` says:

> S1 implementation: complete. S1 acceptance verification: incomplete.

That statement was accurate when written: the Atlas tests had not run because no connection string
was configured. `reports/S1-DB-TEARDOWN-CORRECTION-REPORT.md` later records the successful 7/7 and
35/35 runs. The later evidence supersedes the earlier status for AC-001, AC-002, AC-004, and
AC-007. No application behavior changed between those reports. The earlier report was not edited
during this planning phase.

### 2.5 Secrets and sensitive files

`server/.env` exists with real local values and is ignored and untracked. No tracked file contains
the configured `MONGODB_URI` or `SESSION_SECRET` values, according to the pre-S2 Git report. This
report does not reproduce any secret value.

---

## 3. Documents and source files inspected

### 3.1 Governing and subordinate documents

| File | Inspection result |
|---|---|
| `AGENTS.md` | PRD authority, file roles, approval boundaries, and prohibited operations confirmed |
| `PRD.md` | Read in full for scope, requirements, acceptance criteria, security, testing, roadmap, and Definition of Done |
| `PRD-ORIGINAL.txt` | Read as the preserved reference; differs from `PRD.md` only by the authorized appended "Final authority" section, per `PRD-MD-SHA256.txt` |
| `PRD-MD-SHA256.txt` | PRD and reference checksums verified |
| `ENGINEERING-DECISIONS.md` | OD-001 only; status Open; no resolution added |
| `ARCHITECTURE.md` | 0 bytes |
| `IMPLEMENTATION-PLAN.md` | 0 bytes |
| `CHANGELOG.md` | 0 bytes |
| `TEST-REPORT.md` | 0 bytes |

### 3.2 Existing reports

| Report | Relevant use |
|---|---|
| `reports/ARCHITECTURE-DISCOVERY-REPORT.md` | Original architecture, data-model, API, security, testing, and sequence recommendations; predates S1 |
| `reports/ARCHITECTURE-REVIEW-ADDENDUM.md` | Wallet corrections, decision register D-01…D-13, and risk framing |
| `reports/ARCHITECTURE-CORRECTIONS-REPORT.md` | NWC receiving correction, LNbits key correction, connection lifecycle, payment state model |
| `reports/ARCHITECTURE-CORRECTIONS-AUDIT.md` | Build-readiness audit and first-slice recommendation |
| `reports/PRODUCT-AND-LEARNING-ARCHITECTURE-AUDIT.md` | Learning model, curriculum design, AI tutor scope, payment experience, and S1–S7 roadmap |
| `reports/ZERO-BUDGET-FEASIBILITY-ADDENDUM.md` | ₦0 feasibility, revised roadmap, S6a/S6b split, funding and deployment risks |
| `reports/S1-IMPLEMENTATION-REPORT.md` | S1 feature inventory and test record; status predates successful Atlas verification |
| `reports/S1-DB-TEARDOWN-CORRECTION-REPORT.md` | Teardown root cause, correction, 7/7 and 35/35 evidence |
| `reports/PRE-S2-GIT-INITIALIZATION-REPORT.md` | Git audit, ignore rules, commits, secrets exclusion, clean state |

These reports are historical planning evidence. Where they conflict with the current code, the
current code and the immutable PRD govern. No report was modified.

### 3.3 Application and test source

Inspected directly:

- Server: `server/src/app.ts`, `config.ts`, `db.ts`, `errors.ts`, `index.ts`, `logger.ts`;
  `models/User.ts`, `models/Course.ts`, `models/Lesson.ts`, `models/Progress.ts`;
  `routes/auth.ts`, `routes/courses.ts`, `routes/lessons.ts`, `routes/progress.ts`,
  `routes/dashboard.ts`; `middleware/`; `lib/`; `schemas/`; `content/`; `seed/`.
- Client: `client/src/App.tsx`, `components/Layout.tsx`, `components/ProgressBar.tsx`,
  `components/ProtectedRoute.tsx`, `components/SectionRenderer.tsx`, `lib/api.ts`,
  `lib/queries.ts`, `lib/types.ts`, `pages/Home.tsx`, `Catalogue.tsx`, `CourseDetail.tsx`,
  `Lesson.tsx`, `Dashboard.tsx`, `Login.tsx`, `Register.tsx`, `NotFound.tsx`.
- Tests: `server/test/content.test.ts`, `progress.test.ts`, `validation.test.ts`,
  `password.test.ts`, `http.test.ts`, `static.test.ts`, `db.integration.test.ts`,
  `helpers.ts`.
- Manifests and configuration: root, server, and client `package.json`; both lockfiles;
  `server/.env.example`; TypeScript and Vite configuration; `.gitignore`.
- Git: status, history, remotes, tracked-file count, and PRD checksum.

No `README.md` or `docs/` directory exists. No quiz, XP, achievement, playground, tutor, wallet, or
payment source exists in the current application.

---

## 4. Current implementation versus the PRD

### 4.1 Functional requirements

Status terms: **Implemented and verified**, **Implemented but not fully verified**,
**Partially implemented**, **Not implemented**, **Blocked by decision**, **Outside MVP**.

| ID | Priority | Requirement | Status | Evidence and gap |
|---|---|---|---|---|
| FR-001 | P0 | Users can register and authenticate | **Implemented and verified** | Auth routes, Argon2id, sessions; database test |
| FR-002 | P0 | Users can access the course catalogue | **Implemented and verified** | Published-only catalogue; database test |
| FR-003 | P0 | Users can view lessons | **Implemented but not fully verified** | Lesson reader and preview work; AC-003 mobile evidence missing |
| FR-004 | P0 | Users can complete lessons | **Implemented and verified** | Idempotent completion; database test |
| FR-005 | P0 | Users can complete quizzes | **Not implemented** | No quiz model, content, route, or UI |
| FR-006 | P0 | Learning progress is persisted | **Implemented and verified** | Per-lesson records, unique index; database test |
| FR-007 | P0 | Users can access the Bitcoin playground | **Not implemented** | No playground route or simulations |
| FR-008 | P0 | Users can interact with the AI tutor | **Not implemented** | No provider, prompt, conversation, or UI |
| FR-009 | P0 | Users can connect a compatible Lightning wallet | **Not implemented** | No NWC adapter, wallet model, or UI |
| FR-010 | P0 | Users can complete a guided Lightning payment | **Not implemented** | No invoice, payment, state machine, or receipt |
| FR-011 | P0 | Users can view their learning dashboard | **Implemented and verified** | Core dashboard and progress; database test. §8.2's achievements and tutor access are absent |
| FR-012 | P1 | Users can earn XP and achievements | **Not implemented** | No XP or achievement model; P1 must not delay P0 |
| FR-013 | P1 | Users can access multiple learning paths | **Not implemented** | Courses exist; no path grouping |
| FR-014 | P2 | Users can receive completion certificates | **Not implemented** | Deferred by PRD priority and §16 |
| FR-015 | P2 | Users can access community learning features | **Not implemented** | Deferred |
| FR-016 | P2 | Developers can access advanced technical courses | **Partially implemented / outside MVP** | Course 08 exists with its first module only; not a full advanced track |

**P0 count:** 11 requirements. Five are implemented and verified (FR-001, FR-002, FR-004, FR-006,
FR-011). One is implemented but not fully verified (FR-003). Five are not implemented (FR-005,
FR-007, FR-008, FR-009, FR-010).

### 4.2 Acceptance criteria

| ID | Criterion | Status | Evidence or gap |
|---|---|---|---|
| AC-001 | New learner can register and sign in | **Verified** | Database test |
| AC-002 | Learner can access published courses | **Verified** | Database test |
| AC-003 | Lessons display correctly on mobile | **Implemented, not fully verified** | Responsive layout; no recorded device/responsive test |
| AC-004 | Lesson completion is persisted | **Verified** | Database test |
| AC-005 | Learners can submit quiz answers | **Not met** | No quiz submission |
| AC-006 | Quiz results are calculated correctly | **Not met** | No scoring implementation or test |
| AC-007 | Progress updates after lesson completion | **Verified** | Database test |
| AC-008 | Playground supports documented exercises | **Not met** | No playground |
| AC-009 | Simulations are visibly distinguished | **Not met** | No simulations |
| AC-010 | AI tutor answers using educational context | **Not met** | No tutor |
| AC-011 | AI tutor handles unsupported questions safely | **Not met** | No tutor or refusal tests |
| AC-012 | Compatible Lightning wallet can be connected | **Not met** | No wallet integration |
| AC-013 | Platform can generate or handle a real Lightning payment request | **Not met** | No invoice or receiving path |
| AC-014 | Guided payment can be completed and verified | **Not met** | No payment flow or real settlement |
| AC-015 | Payment failures are communicated accurately | **Not met** | No state machine or failure taxonomy |
| AC-016 | Wallet secrets are not exposed in logs or frontend bundles | **Not met for wallet** | S1 bundle scan passes, but no wallet secret exists yet |
| AC-017 | Application is accessible through a public deployment | **Not met** | No remote and no deployment |
| AC-018 | Repository includes setup and architecture documentation | **Not met** | No README; four subordinate documents empty; no docs structure |

**Acceptance count:** 4 verified (AC-001, AC-002, AC-004, AC-007); 1 implemented but not fully
verified (AC-003); 13 not met.

### 4.3 Module, content, and experience gaps

| PRD area | Current state | Gap |
|---|---|---|
| §5.1 Module A — Learning Management | Catalogue, lessons, completion, progress, resume, course progress | Knowledge checks, course assessments, illustrations/demonstrations, and learning paths are absent |
| §5.1 Module B — Playground | Absent | All six simulations absent |
| §5.1 Module C — AI Tutor | Absent | Conversation, context, alternatives, examples, follow-ups, practice questions, uncertainty handling all absent |
| §5.1 Module D — Practice and Gamification | Lesson completion and computed course progress exist | Multiple-choice quizzes, scenario questions, immediate feedback, XP, achievements, milestones, and assessment-based completion are absent |
| §5.1 Module E — Wallet Experience | Absent | All wallet and payment requirements absent |
| §6 — Curriculum | 8 courses, 22 lessons; Bitcoin 101 complete; first module of 02–08 | Knowledge checks, course assessments, and illustrations absent; courses 02–08 are intentionally partial |
| §8.1 — Onboarding | Landing, preview, registration, catalogue, lesson start | Meets the core flow |
| §8.2 — Dashboard | Welcome, progress, continue, next lesson, recent lessons | Recent achievements and AI tutor access absent |
| §8.3 — Mobile accessibility | Responsive CSS, readable typography, skip link, native progress | No physical-device evidence; no PWA; offline behavior absent |
| §9.1 — Technical architecture | React 19, TypeScript, Vite, Tailwind, Router, Express 5, MongoDB, Mongoose, single origin | PWA support absent; AI and wallet components absent |
| §10 — Data models | User, Course, Lesson, Progress (separate records) | Quiz, QuizAttempt, Achievement, UserAchievement, AIConversation, wallet connection, payment models absent |
| §11 — API | Auth, courses, lessons, progress, dashboard | Quiz, tutor, and wallet endpoints absent |
| §13 — Security | Auth, validation, headers, origin guard, rate limit, redaction | AI and payment security controls not yet applicable; wallet secret handling not built |
| §14 — Acceptance | 4 verified, 1 partial, 13 unmet | See §4.2 |
| §15 — Non-functional | Responsive baseline, loading/error states, tests | PWA, offline behavior, full accessibility verification, documented API contracts, and automated critical-path coverage incomplete |
| §18 — Roadmap | S1 completed earlier than the PRD's Nov 3 start | S2–S7 remain |
| §19 — Testing | S1 unit/integration tests; database suite documented | No quiz, AI, wallet, payment, or end-to-end tests |
| §20 — Success metrics | No analytics or measured learner data | Not instrumented; no claims should be made |
| §21 — Deliverables | Source and reports exist locally | No public repository, deployed MVP, presentation, README, architecture diagram, wallet documentation, or demonstrated E2E journey |
| §25 — Definition of Done | Not complete | Public app, quiz persistence, playground, tutor, wallet, verified payment, public docs, and no-mock demo are outstanding |

### 4.4 Requirements that appear missed, partial, or interpreted

1. **Knowledge checks and course assessments are absent.** S1 lessons end with reflection
   prompts, not scored checks. `server/src/content/types.ts` and `server/src/models/Lesson.ts`
   contain no quiz section type; there is no quiz route. This is the largest direct S2 gap.
2. **Course completion is lesson-based and computed, not assessment-based.** The dashboard marks
   a course complete when all published lessons are complete
   (`client/src/pages/Dashboard.tsx`, `server/src/lib/progress.ts`). The PRD requires a course
   assessment and a completion status, but does not explicitly say the assessment gates
   completion. This is a product decision, not a defect to resolve silently.
3. **Dashboard achievements and tutor access are absent.** The core dashboard is implemented, but
   PRD §8.2 lists recent achievements and AI tutor access. XP/achievements are P1; tutor access
   arrives with S4.
4. **Illustrations and demonstrations are absent.** Lessons are text and callout blocks. The PRD
   asks for relevant illustrations or demonstrations. S3 addresses simulations; inline diagrams
   remain a content/design gap.
5. **The PWA preference is not implemented.** PRD §8.3 says a lightweight PWA is preferred and
   §9.1 lists PWA support. S7 covers it.
6. **Public repository and documentation are absent.** No remote, no README, no architecture
   diagram, and four empty subordinate documents. AC-018 and §21 are unmet.
7. **Mobile acceptance is not evidenced.** The layout is responsive, but no recorded test on a
   common Android device or emulated viewport exists. This should be closed before claiming S1
   acceptance in full.
8. **Curriculum depth is intentionally partial.** Eight courses exist, but only Bitcoin 101 is
   complete and courses 02–08 expose their first module. This is consistent with the approved
   depth-first planning direction in the reports, but it must be described honestly and not as
   eight complete courses.

No material conflict between the PRD and the current implementation records was found. The S1
report's stale status is a historical sequencing issue, not a PRD conflict.

## 5. Complete proposed slice roadmap

### 5.1 Roadmap overview

| Slice | Name | Primary user-visible result | PRD requirements | Depends on | External dependency | Status |
|---|---|---|---|---|---|---|
| **S1** | Learner entry path | Register, read a real lesson, save completion, see dashboard progress | FR-001–004, FR-006, FR-011; AC-001–004, AC-007 | — | Atlas | **Completed baseline** |
| **S2** | Assessment, feedback, XP, completion | Lesson checks and course assessments with feedback; quiz results persist; XP and completion signals | FR-005, FR-006 (regression), FR-012 (partial); AC-005, AC-006, AC-007 (regression) | S1 | Atlas | Next; not started |
| **S3** | Interactive Bitcoin playground | Six clearly labelled simulations of Bitcoin mechanics | FR-007; AC-008, AC-009 | S1 shell | None for core; dependency approval for crypto libraries | Not started |
| **S4** | Contextual AI tutor | Lesson-scoped Q&A, simpler explanations, examples, safe refusal, fallback | FR-008; AC-010, AC-011 | S1, S2 (quiz-band context) | OpenRouter free model/key | Not started |
| **S5** | Wallet connection and invoice literacy | Connect a compatible Lightning wallet, inspect capabilities, read an invoice | FR-009; AC-012, AC-016 | S1, wallet spike D-11, D-02 | NWC relay, compatible wallet, optional receiving wallet | Not started |
| **S6a** | Guided payment logic and failure handling | Readiness check, invoice inspection, confirmation, payment state machine, receipt UI against fakes | FR-010 (partial); AC-013 (adapter only), AC-015 | S5, S2 readiness quiz, D-01/D-03/D-06 for real adapter | Receiving wallet for AC-013 evidence | Not started |
| **S6b** | Real settlement and verified receipt | A real 21-sat practice payment completed and verified, with honest failure states | FR-010; AC-013, AC-014, AC-015 | S6a; funded receiving wallet | Real wallet, relay, inbound liquidity, funds | Not started; funding gate |
| **S7** | Stabilization, PWA, deployment, docs | Installable/read-only-offline app, accessible mobile UX, public deployment, README and architecture documentation | AC-003, AC-017, AC-018; §8.3, §15, §19, §21 | All prior slices; D-07, OD-001, deployment approval | Render/free host, Atlas, Git remote | Not started; final slice |

The sequence is **S1 → S2 → S3/S4 (parallel, with S5 started after the wallet spike) → S6a → S6b → S7**.
The critical path is **S1 → S2 → S5 → S6a → S6b → S7**. S3 and S4 are parallelizable and must not
delay the wallet vertical or final stabilization.

### 5.2 Slice S1 — Learner entry path (completed baseline)

1. **Identifier and name:** S1 — Learner entry path: accounts, catalogue, lessons, persistent
   progress, dashboard, one preview lesson.
2. **Purpose:** Establish the vertical spine through UI, API, and database that every later slice
   attaches to.
3. **User-facing functionality:** Register, sign in, sign out, browse eight published courses,
   open a course, read lessons, read one account-free preview lesson, mark lessons complete,
   resume learning, view overall and per-course progress, view recent completions.
4. **Backend responsibilities:** Session auth, password hashing, catalogue and lesson delivery,
   preview access control, idempotent completion, progress summaries, dashboard aggregation,
   published-only filtering, content seeding and validation.
5. **Frontend responsibilities:** Landing, auth forms, catalogue, course detail, lesson reader,
   preview banner, completion control, dashboard, protected route convenience guard, error and
   loading states.
6. **Data models and integrations:** `User`, `Course`, `Lesson`, `Progress`, MongoDB session
   store; MongoDB Atlas through Mongoose; single-origin Express serving the built SPA.
7. **Dependencies:** Completed under the owner-authorized S1 scope. No S2 dependency.
8. **PRD requirements and acceptance:** FR-001, FR-002, FR-003, FR-004, FR-006, FR-011;
   AC-001, AC-002, AC-003 (not fully verified), AC-004, AC-007.
9. **Security and privacy:** Argon2id, session regeneration, HttpOnly/SameSite/Secure cookies,
   ownership derived from session, Zod validation, JSON-only mutations, Origin guard, Helmet/CSP,
   auth rate limiting, log redaction, no stack traces, bundle secret scan, no client-supplied user
   id trusted.
10. **Testing and verification:** 28 non-database tests pass in this review; server/client
    typecheck pass; prior Atlas suite 7/7 and full suite 35/35; AC-003 device/responsive evidence
    still needed.
11. **Definition of Done:** All S1 routes and pages work; auth, catalogue, lesson, preview,
    completion, progress, and dashboard pass integration tests; no secrets are exposed; typecheck
    and build pass; AC-003 is verified on a common mobile viewport/device; no regressions.
12. **Risks and unresolved decisions:** S1 report's stale acceptance line; AC-003 mobile evidence;
    four empty subordinate documents; no remote/deployment. These are carried into S2/S7, not
    silently resolved.

### 5.3 Slice S2 — Assessment, feedback, XP, and completion integration

1. **Identifier and name:** S2 — Assessment, feedback, XP, and completion integration.
2. **Purpose:** Complete the learning loop by adding server-scored knowledge checks and course
   assessments, immediate explanatory feedback, persisted attempts, and the learner-facing
   completion/XP signals that make progress meaningful.
3. **User-facing functionality:** Answer 2–3 inline questions in a lesson; submit a course
   assessment; see score, pass/fail, per-question feedback, and explanations; retry; see quiz and
   assessment status on the course and dashboard; earn XP for demonstrated understanding.
4. **Backend responsibilities:** Quiz and attempt models, content seeding and validation,
   server-only scoring, attempt persistence and idempotency, ownership enforcement, answer-key
   non-disclosure, quiz/assessment retrieval, results retrieval, XP/achievement accrual if
   approved, course-completion integration.
5. **Frontend responsibilities:** Accessible quiz component, inline lesson checks, course
   assessment page/route, feedback states, retry, sign-in affordance for anonymous preview
   readers, dashboard XP/achievement/assessment display, query invalidation.
6. **Data models and integrations:** New `Quiz` and `QuizAttempt` collections; optional
   `XpEvent`, `Achievement`, and `UserAchievement`; existing `Progress`, `Lesson`, `Course`,
   `User`; Atlas.
7. **Dependencies:** S1 only. No wallet, AI, playground, PWA, or docs-structure dependency.
8. **PRD requirements and acceptance:** FR-005; FR-006 regression; FR-012 partial if approved;
   AC-005, AC-006, AC-007 regression; §5.1 Modules A and D; §6 knowledge checks and course
   assessment; §19 quiz scoring and course completion logic.
9. **Security and privacy:** Correct answers never sent before submission; attempts scoped to
   session user; server-side score only; input validation; idempotency; rate limiting; no XP
   trusted from client; no PII in logs; accessible non-color feedback.
10. **Testing and verification:** Pure scoring unit tests; content validation tests; Atlas
    integration tests for submit/retrieve/results/ownership/idempotency; negative tests for
    invalid quiz, missing/duplicate answers, invalid options, draft content, cross-user access;
    UI responsive and keyboard checks; no regressions.
11. **Definition of Done:** See §7.9. In short: every approved published assessment is seeded;
    all three PRD quiz endpoints work; scores are correct and attempts persist; answers are not
    leaked; feedback is accessible; dashboard/course completion reflects the approved rule; all
    tests and typechecks pass; no S1 regression.
12. **Risks and unresolved decisions:** Assessment content volume; course-completion rule;
    XP/achievement scope; anonymous preview quiz behavior; attempt idempotency; answer leakage;
    duplicate XP under concurrency; no client test framework. These are detailed in §7.10.

### 5.4 Slice S3 — Interactive Bitcoin playground

1. **Identifier and name:** S3 — Interactive Bitcoin playground.
2. **Purpose:** Let learners experiment with Bitcoin mechanics in a safe, clearly fictional
   environment, turning abstract concepts into observable behavior.
3. **User-facing functionality:** A playground hub and six labs: fictional wallet creation,
   public/private key relationships, transaction construction, broadcast/confirmation concepts,
   block formation, and mining/proof-of-work. Every lab carries a visible simulation label.
4. **Backend responsibilities:** None required for the core simulations. No real keys, no real
   transactions, no network calls, no wallet or node integration. Optional interaction analytics
   should not be added without a separate privacy decision.
5. **Frontend responsibilities:** `/playground` hub, `/playground/:simId` routes, deterministic
   demo data, local ephemeral state, simulation badge, educational explanation beside each
   result, accessible controls, mobile layout.
6. **Data models and integrations:** No new database model is required. Client-only crypto/hash
   helpers; no seed phrase or private key persistence; no QR codes that could be mistaken for a
   real wallet.
7. **Dependencies:** S1 layout and navigation. D-08 (mnemonic display policy) and D-10
   (dependency approval) are relevant. S3 does not require S2.
8. **PRD requirements and acceptance:** FR-007; AC-008, AC-009; §5.1 Module B; §16 excludes
   building a real wallet.
9. **Security and privacy:** No real seed phrases, private keys, or transactions; no network
   access from simulations; mandatory "simulation" label; no implied financial advice; no
   collection of learner secrets; no misleading QR or address.
10. **Testing and verification:** Unit tests for deterministic crypto/hash/transaction helpers
    where testable; no-network assertion; documented exercise checklist; UX review that every
    simulation is visibly distinguished; mobile and keyboard checks.
11. **Definition of Done:** Six documented labs work; each is labelled as a simulation; no
    simulated transaction is represented as real; no network or wallet call occurs; AC-008 and
    AC-009 evidence is recorded; mobile layout is usable; no new dependency is unapproved.
12. **Risks and unresolved decisions:** Crypto library compatibility on Android/Termux; D-08
    mnemonic policy; D-10 dependency approval; scope creep beyond six labs; risk of learners
    mistaking a simulation for real money. S3 can run in parallel with S2/S4 but must not delay
    S5–S7.

### 5.5 Slice S4 — Contextual AI tutor

1. **Identifier and name:** S4 — Contextual AI tutor.
2. **Purpose:** Provide a lesson-scoped teaching assistant that explains concepts, gives
   examples, checks understanding, and refuses unsafe or out-of-scope requests.
3. **User-facing functionality:** A tutor panel or page opened from a lesson; suggested questions;
   "explain simpler"; "give an example"; follow-up questions; answers grounded in the current
   lesson and curated content; visible uncertainty and safe refusal; a deterministic fallback when
   the provider is unavailable.
4. **Backend responsibilities:** Server-side provider adapter, prompt assembly, lesson/context
   retrieval, conversation and message persistence, input limits, rate limits, provider timeout
   and retry, fallback response, safety filters, token/cost metadata, no API key exposure.
5. **Frontend responsibilities:** Tutor route/panel, lesson context handoff, message list, input
   with limits, loading/error/fallback states, suggested questions, accessible labels, clear
   distinction between lesson content and tutor output.
6. **Data models and integrations:** `AIConversation`, `AIMessage` (messages in a separate
   collection or bounded embedded structure), optional lesson/course references; OpenRouter or
   compatible provider; no payment or wallet data in prompts.
7. **Dependencies:** S1 content; S2 quiz-band context if the progress-aware summary is used;
   Z-01 free-model policy; P-05 tutor progress access. No wallet dependency.
8. **PRD requirements and acceptance:** FR-008; AC-010, AC-011; §5.1 Module C; §13 AI security;
   §19 AI integration and negative tests.
9. **Security and privacy:** API key server-side only; learner input treated as untrusted; prompt
   injection and jailbreak resistance; no seeds/keys/wallet secrets; no PII in prompts; no price
   predictions or financial advice; no claims about payment status; rate and token caps; provider
   failure does not break lessons or quizzes.
10. **Testing and verification:** Prompt-assembly unit tests; provider mock and fallback tests;
    an authored adversarial set of at least 15 prompts (seed request, price prediction, prompt
    injection, other-user data, fake protocol claims); refusal and uncertainty checks; rate-limit
    tests; bundle/log secret scan; manual lesson-context test.
11. **Definition of Done:** AC-010 and AC-011 pass; tutor answers are grounded in the current
    lesson; unsafe asks are refused or safely bounded; provider-down fallback works; no secret is
    exposed; conversations are ownership-scoped; the core learning path works without the tutor.
12. **Risks and unresolved decisions:** Free-model availability and daily quota; latency; model
    drift; misinformation; prompt injection; Z-01 approval; P-05 scope; whether dynamic practice
    question generation is in the minimal submission scope. The product audit's minimal scope is
    lesson Q&A, simpler explanation, example, and three suggested questions; generated quizzes are
    deferred unless the owner explicitly expands scope.

### 5.6 Slice S5 — Lightning wallet connection and invoice literacy

1. **Identifier and name:** S5 — Lightning wallet connection and invoice literacy.
2. **Purpose:** Connect the learner's compatible Lightning wallet safely and teach the anatomy,
   authority, and limits of a Lightning invoice before any real payment is attempted.
3. **User-facing functionality:** Paste or scan an NWC connection URI; see whether the wallet
   answered and which methods it supports; see connection status; disconnect; inspect a Lightning
   invoice field by field (amount, description, recipient, expiry, network); see a clear
   distinction between a sample invoice and a real payable invoice.
4. **Backend responsibilities:** NWC URI parsing and validation; a `get_info`/capability
   handshake; connection status representation; invoice retrieval/creation adapter; strict
   validation of invoice fields; no logging of secrets; an adapter boundary that S6a can reuse.
   The backend must not treat a client-posted alias as proof of a live connection.
5. **Frontend responsibilities:** Wallet connection form/QR affordance; connection state machine
   (unknown, checking, connected, unavailable, refused); capability display; disconnect; invoice
   inspection panel; explicit "real money" and "not a seed phrase" guidance; accessible errors.
6. **Data models and integrations:** `walletconnections` metadata if the approved custody model
   stores metadata; NWC connection secret in browser memory only under the recommended D-02
   option; NWC relay and compatible wallet; optional receiving wallet for a real invoice.
7. **Dependencies:** S1; wallet validation spike D-11; D-02 custody model; D-01 receiving-wallet
   architecture for a real invoice; D-05 LNbits role; D-06 test environment. S5 does not require
   S3 or S4, although the playground's invoice anatomy lab is complementary.
8. **PRD requirements and acceptance:** FR-009; AC-012, AC-016; §5.1 Module E; §12 wallet
   integration decision and security requirements; §13 payment security.
9. **Security and privacy:** Never request or store seed phrases or private keys; NWC URI is a
   bearer credential and must never be logged, bundled, or persisted unencrypted; minimum
   permissions; explicit user authorization; no silent reconnect; redaction; CSP/connect-src
   review for the relay; clear disclosure that a connection does not make a learner immune to
   financial loss.
10. **Testing and verification:** URI parsing and validation unit tests; connection state-machine
    tests; mocked `get_info` and capability tests; real-wallet integration test for AC-012; secret
    scan of logs and frontend bundle for AC-016; disconnect test; relay-unavailable and
    wallet-refusal tests; invoice field validation.
11. **Definition of Done:** A compatible wallet can be connected and proven live by a wallet
    response; capabilities and status are shown honestly; disconnect works; an invoice can be
    inspected without implying it is payable if it is a sample; no wallet secret appears in logs
    or bundles; AC-012 and AC-016 pass; no real payment is claimed.
12. **Risks and unresolved decisions:** Wallet compatibility and NWC onboarding; relay
    availability; browser WebSocket/CSP constraints; D-01/D-02/D-05/D-06 unresolved; no receiving
    wallet means invoice inspection must use a clearly labelled sample and AC-013 cannot be
    claimed. The wallet spike should be run before S5, not during final stabilization.

### 5.7 Slice S6a — Guided payment logic, state machine, and failure handling

1. **Identifier and name:** S6a — Guided payment logic, state machine, failure handling, and
   receipt UI (fake settlement).
2. **Purpose:** Build and test the complete payment experience and verification logic at ₦0,
   against a fake adapter, without pretending that a fake result is a real payment.
3. **User-facing functionality:** A readiness check; invoice inspection; a clear confirmation
   screen naming the recipient, amount, and reason; a payment request; status states; a receipt
   derived only from verified data; distinct messages for refusal, insufficient balance, expiry,
   relay timeout/unknown, receiver failure, and late settlement.
4. **Backend responsibilities:** Payment intent model; one active intent per learner; amount and
   invoice validation; server-side idempotency; state machine; verification adapter interface with
   a fake implementation and a real-adapter seam; receiver-side verification contract; reconciler;
   ownership; no automatic payment; no mock-success path in production configuration.
5. **Frontend responsibilities:** Guided payment stages; readiness quiz integration from S2;
   confirmation with explicit real-money disclosure; pending/unknown/settled/failed/expired/
   cancelled states; "do not pay again" guidance for unknown; receipt; retry rules; accessible
   status and non-color signals.
6. **Data models and integrations:** `payments` with `userId`, provider, direction, payment hash,
   invoice reference, amount, status, verification attempts, timestamps; unique payment hash;
   status enum; fake adapter; real adapter stub; no real funds in S6a.
7. **Dependencies:** S5 connection and invoice handling; S2 readiness quiz; D-01, D-03, D-05, D-06
   for a real receiving path. S6a can proceed without funding only for logic and fake-adapter
   tests.
8. **PRD requirements and acceptance:** FR-010 (partial); AC-013 (adapter/flow only, not real
   evidence); AC-015; §11 payment endpoints and verification rule; §13 payment security;
   §19 payment state interpretation and negative tests.
9. **Security and privacy:** Fixed small amount and server-side cap; explicit per-invoice consent;
   no auto-pay; no logging of invoices, preimages, or connection secrets; idempotency; replay
   protection; receiver-side verification; never label a pending or unknown state as success;
   never present a fake result as a real payment.
10. **Testing and verification:** Pure state-machine unit tests for every transition; fake-adapter
    integration tests; failure-taxonomy tests for every row in the product audit; expiry vs
    failure; late settlement; duplicate submission; tab-close/return; ownership isolation;
    amount/invoice validation; no-secret scan; no real payment in S6a.
11. **Definition of Done:** The full guided flow works against the fake adapter; all states and
    failure messages are correct; receipts are derived from verified fake data only; AC-015 is
    demonstrated with fakes; the real adapter is isolated and disabled by default; no claim is
    made that AC-013 or AC-014 is satisfied.
12. **Risks and unresolved decisions:** Fake/real adapter divergence; state-model errors; the
    temptation to claim a mock settlement; D-01/D-03/D-06 and funding remain open; AC-013 needs a
    real receiving wallet even if S6a is complete. S6a must not be described as a real payment
    implementation.

### 5.8 Slice S6b — Real Lightning settlement and verified receipt

1. **Identifier and name:** S6b — Real Lightning settlement and verified receipt.
2. **Purpose:** Execute and verify one real, tiny practice payment end to end, producing honest
   evidence for the PRD's payment acceptance criteria.
3. **User-facing functionality:** The same guided flow as S6a, but with a real invoice from a real
   receiving wallet, a real wallet-side approval, receiver-confirmed settlement, and a receipt
   showing amount, shortened hash, time, and what was verified. The recipient and reason are named
   before approval.
4. **Backend responsibilities:** Enable the real adapter; create/retrieve a real invoice; verify
   settlement receiver-side; reconcile late or unknown states; store only necessary payment
   references; enforce amount caps and one active intent; expose no secrets; record evidence.
5. **Frontend responsibilities:** Real-money disclosure; recipient and amount confirmation; wallet
   approval guidance; honest pending/unknown/settled/failed/expired states; receipt retrieval
   after leaving and returning; no "paid" claim before receiver confirmation.
6. **Data models and integrations:** Real `payments` records; receiving wallet (D-01); learner
   wallet over NWC; relay; optional LNbits invoice service; funding source; unique payment hash;
   verified settlement evidence.
7. **Dependencies:** S6a; D-01 receiving-wallet architecture; D-03 payment direction/funding
   model; D-05 LNbits role; D-06 acceptance-test environment; P-01 recipient; P-02 amount and
   funding; Z-02 AC-014 path. This is the only slice with a hard funding gate.
8. **PRD requirements and acceptance:** FR-010; AC-013, AC-014, AC-015; §11 payment verification;
   §12 wallet integration; §25 "without relying on mock payment results."
9. **Security and privacy:** Real money requires explicit consent, a fixed tiny amount, a
   server-side cap, no auto-pay, no stored wallet secret, no seed/private keys, no logging of
   invoice/preimage secrets, and a documented recipient and purpose. The demo must not imply the
   payment is tuition, a subscription, or a content unlock.
10. **Testing and verification:** A real invoice generation/handling test (AC-013); a real
    end-to-end payment with receiver confirmation (AC-014); negative tests for refusal,
    insufficient balance, expiry, relay timeout/unknown, and receiver failure (AC-015); amount and
    hash match; receipt persistence; no-secret scan; repeatable demo rehearsal.
11. **Definition of Done:** A real guided payment is completed and verified; the amount and
    payment hash match the receiver's confirmation; the receipt is honest and retrievable; all
    negative states are communicated accurately; AC-013, AC-014, and AC-015 pass with real
    evidence; the funding/recipient arrangement is documented.
12. **Risks and unresolved decisions:** No funding or no receiving wallet; wallet/relay failure;
    mainnet risk; invoice expiry; demo reproducibility; learner/owner funding assumption. If these
    remain unresolved, the project must stop at S6a and record a documented deviation; it must not
    claim MVP completion or AC-014.

### 5.9 Slice S7 — Stabilization, PWA, public deployment, and documentation

1. **Identifier and name:** S7 — Stabilization, PWA, accessibility, public deployment, and
   documentation.
2. **Purpose:** Turn the working feature set into a publicly accessible, mobile-usable,
   documented, demonstrable MVP and close the remaining cross-cutting acceptance criteria.
3. **User-facing functionality:** Installable/read-only-offline app shell; responsive mobile UX;
   keyboard and screen-reader usable controls; clear loading/error/offline states; public URL;
   README and architecture/security/wallet documentation; complete primary demo journey.
4. **Backend responsibilities:** Production configuration and fail-fast checks; health endpoint;
   session store; rate limits; security headers; redaction; origin/CORS correctness; production
   seed; deployment health and cold-start behavior; no new product features.
5. **Frontend responsibilities:** PWA manifest and service worker; precache shell and read-only
   lesson content; network-only for auth, tutor, wallet, and payment; no offline completion writes
   unless separately approved; route-level code splitting; accessibility fixes; mobile QA; final
   copy and error states.
6. **Data models and integrations:** No new product model is required. Operational backup/export
   of content and progress before the demo; Render/free host; Atlas; public Git remote; optional
   demo video as backup, never a substitute for the live app.
7. **Dependencies:** All prior slices; D-07 offline scope; OD-001 documentation structure; owner
   approval for Git remote/push and deployment; hosting account/billing verification.
8. **PRD requirements and acceptance:** AC-003, AC-017, AC-018; §8.3 mobile/PWA; §15
   non-functional; §19 end-to-end and negative testing; §21 submission deliverables; §25
   Definition of Done.
9. **Security and privacy:** Production secrets only in environment variables; secure cookie
   flags; `trust proxy`; CSP; no secrets in bundles/logs; dependency audit; no auth/payment
   caching; privacy statement; least-privilege access; no learner data in logs; public repo
   secret scan before push.
10. **Testing and verification:** Production build; typecheck; full test suite including opt-in
    database tests; Lighthouse/performance; mobile device checks; keyboard and screen-reader
    checks; PWA install/offline read-only test; primary E2E journey; negative tests; deployment
    smoke test; cold-start rehearsal; bundle and repository secret scan; documentation review.
11. **Definition of Done:** Public URL works; PWA is installable and degrades honestly offline;
    AC-003 is evidenced on a mobile device; AC-017 and AC-018 pass; README, setup, architecture,
    security, wallet integration, and future roadmap are documented; the primary demo journey
    works without mock payment results; final test report and handover are produced.
12. **Risks and unresolved decisions:** Free-tier cold start; Atlas pause/latency; hosting
    overage/billing; no remote currently; OD-001 blocks a `docs/` structure; documentation and
    presentation time; if S6b is blocked, S7 can deploy a partial MVP but cannot claim the full
    Definition of Done. S7 is the final acceptance slice, not a substitute for S6b.

---

## 6. Total proposed number of slices and reasoning

### 6.1 Total

**Eight slices total:** S1 (completed) plus S2, S3, S4, S5, S6a, S6b, and S7.

### 6.2 Why eight, not an arbitrary number

The count is derived from the remaining P0 capabilities and the evidence boundary:

- S1 covers five P0 functional requirements fully and one partially: auth, catalogue, lessons,
  completion, progress, and dashboard.
- Five P0 capabilities remain: quizzes (S2), playground (S3), tutor (S4), wallet connection (S5),
  and guided payment (S6).
- Payment splits into **logic** and **real settlement** because the PRD's Definition of Done
  explicitly forbids relying on mock payment results, while the zero-budget constraint forbids
  assuming real funds. S6a can be built and tested at ₦0; S6b is the funded evidence gate. This is
  a dependency-driven split, not a cosmetic one.
- S7 is the cross-cutting stabilization/submission slice: PWA, accessibility, public deployment,
  documentation, end-to-end verification, and final handover. These share one verification
  environment and one acceptance gate; splitting them into separate slices would create
  coordination overhead without a distinct user capability.

### 6.3 Why not fewer or more

- **Not seven (unsplit S6):** An unsplit payment slice would either block all payment logic on
  funding or encourage a mock result to be presented as real. The PRD and the zero-budget report
  both require separating those claims.
- **Not nine or more:** There is no separate content slice because content authoring is embedded
  in S1/S2/S3 and is already the largest cross-cutting risk. There is no separate security slice
  because security is a per-slice acceptance gate. There is no separate deployment slice because
  S7 is the stabilization/submission gate. Splitting S3 into six one-simulation slices or S4 into
  provider/model slices would be artificial and would increase handoff cost.
- **S3 and S4 are parallelizable but still count as slices.** Parallel execution changes
  scheduling, not scope ownership.
- **S2 is not split into quiz engine and content.** The engine without content cannot satisfy
  AC-005 in a meaningful way, and content without the engine cannot be used. They are one
  coherent vertical.

### 6.4 Which slice follows S1

**S2 follows S1.** It is the next P0 capability, uses the existing lesson/progress spine, has no
external-service dependency, completes the "read → check → prove" learning loop, and produces the
quiz band that S4's tutor context can use. S3 and S4 can run in parallel afterward, but S2 is the
first implementation slice after S1.

### 6.5 Final slice and MVP completion

**S7 is the final slice that closes the MVP acceptance requirements.** S6b is the last feature
gate and the only slice that can produce real payment evidence. S7 then deploys, documents, and
verifies the complete journey. If S6b is not funded or not verified, S7 can still deploy a partial
MVP, but the project must not claim the PRD Definition of Done or AC-014.

---

## 7. Detailed S2 scope

### 7.1 Why S2 should follow S1

S2 is the correct next slice for five reasons:

1. **It is the next P0 capability.** FR-005 is the only remaining learning-core P0 requirement.
   The PRD's own Nov 3–8 window groups "dashboard, lessons, quizzes, progress and simulator" as the
   learning core.
2. **It completes the learning loop.** S1 supports reading and completion. S2 adds the "check"
   and "prove" steps that make completion evidence of understanding rather than only a click.
3. **It reuses the existing spine.** Lessons, progress, course summaries, dashboard, and seeding
   already exist. S2 extends them; it does not need a new architecture.
4. **It has no external-service dependency.** Quizzes, scoring, attempts, and XP can be built and
   tested with Atlas alone. No wallet, relay, AI key, or real funds are required.
5. **It produces a signal S4 can use.** The tutor's proposed progress summary includes a last-quiz
   band (`below|at|above`). S2 creates that signal; S4 can then use it without inventing data.

S2 does **not** depend on OD-001, the wallet decisions, the AI provider decision, or the PWA
decision. It is the first implementation slice after S1.

### 7.2 Exact scope included

#### P0 scope (required for S2 acceptance)

- A quiz content model covering:
  - lesson knowledge checks; and
  - one course assessment per published course.
- Server-side quiz retrieval, submission, scoring, feedback, and attempt history using the PRD's
  exact endpoint paths.
- A pure, testable scoring function.
- Persisted attempts with ownership and duplicate-submission protection.
- Inline lesson checks and a course-assessment experience in the client.
- Immediate explanatory feedback after submission, with accessible non-color signals.
- Course and dashboard display of quiz/assessment status.
- Course-completion integration under the owner-approved rule.
- Content validation and seeding for all approved quizzes.
- Unit, integration, negative, and regression tests.
- No S1 regression.

#### P1 scope (contained, not allowed to delay P0)

- A single XP counter backed by an auditable ledger.
- A minimal achievement set (for example: first lesson complete, first quiz pass, first course
  complete), not a badge engine.
- Dashboard XP and recent-achievement display.

P1 may be deferred if it threatens the S2 P0 date. FR-012 is P1 and must not delay the working MVP.

#### Proposed assessment coverage

The PRD requires knowledge checks and a course assessment for each course. The current published
scope is 22 lessons across eight courses. The proposed S2 content coverage is:

- **Every published lesson:** 2–3 inline knowledge-check questions with explanations.
- **Bitcoin 101:** one 8-question scenario assessment, consistent with the product audit.
- **Courses 02–08:** one 5-question scenario assessment per published course, covering the
  published first module and clearly scoped to what has been taught.
- **Question quality:** scenario-based where possible; one clearly correct answer; an explanation
  for every option or at least for the correct answer and the most plausible distractor; no trick
  questions; technical review before publication.

This is a proposed coverage plan, not a PRD-mandated question count. The exact count is an owner
decision because it determines content effort. The minimum defensible S2 for AC-005/AC-006 alone
would be one quiz, but that would not satisfy the PRD's curriculum requirement or the product's
"prove" model.

### 7.3 Features explicitly excluded from S2

- Playground simulations (S3).
- AI tutor and provider integration (S4).
- Wallet connection, invoice handling, and payments (S5–S6b).
- PWA, offline behavior, deployment, and documentation (S7).
- Certificates, multiple learning paths, community features, and advanced developer tracks
  (P1/P2; deferred by PRD priority).
- A general badge engine, leaderboards, streaks, or time-based gamification.
- Anonymous quiz progress or anonymous XP.
- Admin authoring UI; content remains code-authored and seeded.
- Analytics, tracking pixels, or learner-behavior profiling.
- New runtime dependencies. The existing React, Express, Mongoose, Zod, and Node test stack is
  sufficient for S2.
- Any change to the PRD, existing engineering decisions, or S1 progress semantics without
  explicit approval.

### 7.4 Required backend work

1. **Models**
   - `Quiz`: stable slug, kind (`lesson` or `course`), `courseSlug`, optional `lessonSlug`,
     title, passing score, ordered embedded questions, status, version/timestamps.
   - `QuizAttempt`: `userId`, `quizId`, `quizSlug`, `courseSlug`, optional `lessonSlug`,
     `attemptKey`, answers, score, total, percent, passed, `completedAt`.
   - Optional `XpEvent`: `userId`, unique event key, amount, source, timestamp.
   - Optional `Achievement` and `UserAchievement`: seeded definitions and unique awards.
2. **Content and seeding**
   - Add quiz definitions to the authored content source or a parallel quiz content module.
   - Extend `validateContent()` to reject duplicate quiz IDs, missing questions, missing
     explanations, invalid correct options, missing lesson/course references, and a quiz attached
     to draft content.
   - Extend the idempotent seeder to upsert quizzes by stable slug and to assert expected counts.
   - Do not seed quizzes for draft lessons or draft courses.
3. **Scoring library**
   - Pure function: inputs are the quiz definition and submitted answers; output is score, total,
     percent, pass/fail, and per-question feedback.
   - Reject unknown question IDs, duplicate answers, missing required answers, and options that do
     not belong to the question.
   - Never accept a client-supplied score, correctness flag, XP amount, or pass flag.
4. **Routes**
   - `GET /api/quizzes/:quizId` — authenticated; returns questions and options without correct
     answers or explanations; includes the learner's attempt summary if any.
   - `POST /api/quizzes/:quizId/attempts` — authenticated; validates answers, scores on the
     server, persists an idempotent attempt, returns score/pass/feedback/explanations and any XP
     award.
   - `GET /api/quizzes/:quizId/results` — authenticated; returns only the session learner's
     attempts and best result.
   - Extend lesson/course responses with quiz identifiers and assessment status; extend the
     dashboard with quiz/assessment/XP/achievement data.
5. **Ownership and idempotency**
   - Every attempt query is scoped by `req.session.userId`.
   - A client-generated `attemptId` (UUID) or equivalent idempotency key plus a unique compound
     index prevents duplicate attempts from retries.
   - A repeated request returns the original attempt rather than creating a second attempt or
     awarding XP twice.
6. **Completion integration**
   - Implement the owner-approved course-completion rule. The recommended rule is: all published
     lessons complete **and** the course assessment passed. If the owner chooses lesson-only
     completion, the assessment remains a separate result and XP signal.
   - Keep lesson completion independent and idempotent.
7. **Error and security behavior**
   - `requireDb` and `requireAuth` on all quiz routes.
   - 404 for missing/draft quizzes; 401 for anonymous attempts; 400 for malformed answers; 409 or
     equivalent for conflicting idempotency use.
   - No answer keys, correct-option indexes, or explanations before submission.
   - No stack traces, database text, or secrets in errors.
   - Rate-limit attempt submissions to reduce abuse and accidental duplicate floods.

### 7.5 Required frontend work

1. **Lesson knowledge checks**
   - A quiz component rendered after the lesson body or at the lesson's "check" point.
   - Radio groups or accessible option buttons; keyboard operable; no color-only correctness.
   - Submit action, loading state, score, pass/fail, per-question feedback, explanations, retry.
   - Signed-out preview readers see the quiz but are invited to sign in before submitting; no
     anonymous persistence.
2. **Course assessment**
   - A route such as `/quizzes/:quizId` (the PRD's API path is authoritative; the frontend route
     may be a readable equivalent) linked from the course detail page.
   - Clear statement of passing score, number of questions, and whether the assessment gates
     course completion.
   - Results view with best attempt and retry.
3. **Course and dashboard status**
   - Course detail shows lesson progress, assessment status, and completion status separately.
   - Dashboard shows XP (if approved), recent achievements (if approved), assessment status, and
     the next action.
   - Do not show "Course complete" until the approved completion rule is satisfied.
4. **Data and query integration**
   - Extend `client/src/lib/types.ts` and `client/src/lib/queries.ts` with quiz, attempt, results,
     XP, and achievement types/hooks.
   - Invalidate lesson, course, courses, dashboard, and quiz queries after a successful attempt.
   - Preserve existing S1 query behavior and error handling.
5. **Accessibility and mobile**
   - Use fieldsets/legends or equivalent grouping; visible focus; labels; error text tied to
     inputs; no reliance on color; touch targets adequate; readable question text; no horizontal
     scroll at 360px.
   - Announce score/feedback changes with appropriate live-region behavior without being noisy.

### 7.6 Data and API changes (proposed)

#### Quiz document

```text
Quiz {
  slug: string                 // stable, unique, e.g. "btc101-check-01"
  kind: "lesson" | "course"
  courseSlug: string
  lessonSlug?: string
  title: string
  passingScore: number         // percentage, e.g. 80 for a course assessment
  status: "published" | "draft"
  questions: [{
    id: string                 // stable within the quiz
    prompt: string
    scenario?: boolean
    options: [{ id: string, text: string }]
    correctOptionId: string    // never returned before submission
    explanation: string        // returned after submission
  }]
  version: number
  createdAt, updatedAt
}
```

Indexes: unique `slug`; `{courseSlug, kind}`; `{lessonSlug}` where present.

#### Attempt document

```text
QuizAttempt {
  userId: ObjectId
  quizId: ObjectId
  quizSlug: string
  courseSlug: string
  lessonSlug?: string
  attemptKey: string           // client UUID or server-issued idempotency key
  answers: [{ questionId, optionId, correct }]
  score: number
  total: number
  percent: number
  passed: boolean
  completedAt: Date
}
```

Indexes: unique `{userId, quizId, attemptKey}`; `{userId, quizId, completedAt: -1}`;
`{userId, courseSlug, completedAt: -1}`.

#### API contracts (proposed)

`GET /api/quizzes/:quizId`

```json
{
  "quiz": {
    "slug": "btc101-check-01",
    "kind": "lesson",
    "courseSlug": "01-bitcoin-101",
    "lessonSlug": "btc101-money-problem",
    "title": "Check your understanding",
    "passingScore": 67,
    "questions": [
      {
        "id": "q1",
        "prompt": "Why does Bitcoin need a shared ledger?",
        "scenario": false,
        "options": [
          { "id": "a", "text": "Option A" },
          { "id": "b", "text": "Option B" }
        ]
      }
    ]
  },
  "attemptSummary": {
    "attempts": 1,
    "bestPercent": 100,
    "passed": true
  }
}
```

No `correctOptionId` or `explanation` appears in this response.

`POST /api/quizzes/:quizId/attempts`

```json
{
  "attemptKey": "client-generated-uuid",
  "answers": [
    { "questionId": "q1", "optionId": "b" }
  ]
}
```

Response:

```json
{
  "attemptKey": "client-generated-uuid",
  "score": 1,
  "total": 1,
  "percent": 100,
  "passed": true,
  "feedback": [
    {
      "questionId": "q1",
      "selectedOptionId": "b",
      "correctOptionId": "b",
      "correct": true,
      "explanation": "A shared ledger lets participants agree on ownership without a central record keeper."
    }
  ],
  "xpAwarded": 0
}
```

`GET /api/quizzes/:quizId/results`

```json
{
  "attempts": [
    {
      "attemptKey": "client-generated-uuid",
      "score": 1,
      "total": 1,
      "percent": 100,
      "passed": true,
      "completedAt": "2026-11-01T00:00:00.000Z"
    }
  ],
  "bestPercent": 100,
  "passed": true
}
```

Only the session learner's attempts are returned. No endpoint accepts a user id.

#### Dashboard and course extensions (proposed)

- Course detail: `assessment: { quizSlug, passed, bestPercent, attempts } | null`.
- Lesson detail: `quiz: { slug, title, questionCount, passed, bestPercent } | null`.
- Dashboard: `xp`, `achievements`, and per-course `assessment` status.
- Existing fields remain backward-compatible where possible.

### 7.7 Dependencies and decisions for S2

**Hard dependencies**

- S1 code and tests.
- MongoDB Atlas, including the opt-in test database and the corrected teardown guard.
- The current S1 content scope (22 lessons, eight courses).

**Not dependencies**

- OD-001: documentation structure. It affects S7 only.
- D-01, D-02, D-03, D-05, D-06, D-11: wallet/payment decisions. They do not block S2.
- Z-01/Z-02: AI/funding decisions. They do not block S2.
- D-07: offline/PWA. It affects S7.
- D-08/D-10: playground/dependency decisions. They affect S3 and later.
- D-04: the single-origin topology is already reflected in S1; S2 must preserve it.

**Existing content-scope decision**

The current curriculum reflects the approved depth-first scope: Bitcoin 101 complete and the first
module of courses 02–08. S2 should not expand the curriculum beyond that scope without approval.
If D-09/P-04 was not formally recorded as approved, the owner should confirm it before S2 content
authoring.

### 7.8 Security and privacy considerations

- **Answer-key confidentiality:** correct answers and explanations are never sent before a
  submitted attempt. A learner must not be able to inspect the network response and get the key.
- **Server authority:** score, pass/fail, XP, and completion are computed server-side. Client
  values are treated as untrusted input.
- **Ownership:** every attempt and result query is scoped by the session user. No body/param user
  id is accepted.
- **Validation:** strict Zod schemas for quiz IDs, attempt keys, answer arrays, question IDs, and
  option IDs. Reject unknown keys and malformed arrays.
- **Idempotency:** unique `{userId, quizId, attemptKey}` prevents duplicate attempts and duplicate
  XP. A retry returns the original result.
- **Rate limiting:** limit attempt submissions per user/IP to reduce abuse and accidental loops.
- **Data minimization:** store only what is needed for scoring, feedback, and progress. Do not
  store free-text learner answers in S2; multiple-choice only.
- **Logging:** no answer keys, session identifiers, or secrets in logs. Request bodies should not
  be logged by default.
- **Accessibility:** correctness is conveyed by text and icon, not color alone. Feedback must be
  announced without trapping focus.
- **Draft protection:** draft quizzes and quizzes attached to draft content are never returned.
- **No PII:** quiz data contains no learner PII beyond the user reference.

### 7.9 Testing, acceptance, and Definition of Done

#### Unit tests

- Scoring: all correct, all wrong, mixed, unanswered, duplicate answers, unknown question/option,
  passing threshold boundary, zero-question guard.
- Course completion: lesson-only vs assessment-gated rule; incomplete lessons; failed assessment;
  passed assessment; no divide-by-zero.
- Content validation: duplicate quiz slug, duplicate question ID, missing explanation, invalid
  correct option, quiz attached to draft lesson/course, missing course assessment.
- XP: first award, repeat attempt, failed attempt, concurrency/idempotency.

#### Integration tests (Atlas, opt-in)

- `GET /api/quizzes/:quizId` returns questions but no answers.
- Anonymous request returns 401.
- Learner can submit answers; attempt is persisted; score is correct.
- Repeat with the same `attemptKey` returns the original attempt and does not duplicate XP.
- Learner B cannot read learner A's attempts or results.
- Draft quiz returns 404.
- Invalid/missing answers return 400 without creating an attempt.
- Course completion and dashboard reflect the approved rule.
- Existing S1 progress tests still pass.
- Teardown includes new collections in the correct order and preserves the exact
  `kaos_academy_test` guard.

#### Negative tests

- Incorrect quiz submissions (AC-006 negative path).
- Missing lesson/quiz data.
- Other learner's attempt/results.
- Duplicate attempt key with different answers.
- Quiz attached to unpublished content.
- Oversized or malformed payload.
- XP double-award attempt.
- Answer-key leakage scan of the GET response.

#### UI verification

- Inline lesson check on a mobile viewport.
- Course assessment route and retry.
- Keyboard-only completion.
- Screen-reader labels and feedback announcement.
- No color-only correctness.
- Loading, error, and offline/database-unavailable states.
- No regression to lesson reading, completion, or dashboard.

#### Acceptance mapping

| Criterion | S2 evidence |
|---|---|
| AC-005 | Functional/integration test: learner submits answers; attempt is stored |
| AC-006 | Unit test: exact score for known answers |
| AC-007 | Regression integration test: progress still updates after lesson completion |
| FR-005 | Quiz retrieval, submission, feedback, and attempts work |
| FR-006 | Existing progress persistence remains intact |
| FR-012 (partial) | XP ledger and minimal achievements, if approved |

#### Definition of Done for S2

S2 is done only when all of the following are true:

- The owner-approved assessment coverage is authored, validated, and seeded.
- The three PRD quiz endpoints exist and are authenticated.
- Server scoring is correct and unit-tested; AC-006 passes.
- Attempts persist and are ownership-scoped; AC-005 passes.
- Duplicate submissions are idempotent; no duplicate XP.
- Correct answers are not exposed before submission.
- Inline lesson checks and course assessments are usable on mobile and keyboard.
- Feedback is immediate, explanatory, and accessible.
- Course and dashboard completion follow the approved rule.
- XP/achievements, if included, are server-awarded and duplicate-safe.
- Existing S1 tests pass; new unit/integration/negative tests pass; typecheck and build pass.
- A database test run with `RUN_DB_TESTS=1` exits cleanly.
- No new dependency was added without approval.
- No PRD, engineering decision, or existing report was modified.
- An S2 implementation report records exact commands, results, and limitations.

### 7.10 Risks and blockers for S2

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Assessment content volume (22 lessons + 8 assessments) | High | High | Author Bitcoin 101 first; review every question; stage content without claiming coverage; owner may reduce scope explicitly |
| Course-completion rule ambiguity | Medium | Medium | Decide before implementation; do not silently change S1 semantics |
| XP/achievement scope creep | Medium | Medium | XP ledger + three achievements maximum; no badge engine; defer if P0 at risk |
| Anonymous preview quiz behavior | Low | Low | Show quiz, require sign-in to submit; no anonymous persistence |
| Answer-key leakage | Medium | High | Server-only keys; response tests; no answers in GET; code review |
| Duplicate XP under concurrency | Medium | Medium | Unique event key + transaction/conditional write; test concurrent retry |
| Mobile quiz UX | Medium | Medium | 360px design, large touch targets, keyboard test, no color-only feedback |
| Atlas test latency | High | Low | Opt-in DB tests; focused suite; no production DB |
| No client component-test framework | Medium | Low | Server tests cover scoring/AC-006; manual/browser checks for UI; add tooling only with approval |
| Schedule pressure | High | Medium | S2 is P0; defer P1 XP/achievements if needed; do not defer AC-005/AC-006 |

**Blockers:** There is no existing engineering decision that blocks S2. The only blockers are the
owner's S2 product decisions and the availability of content-authoring/review capacity. If the
owner does not approve assessment coverage or the completion rule, S2 implementation must not
start.

### 7.11 Decisions requiring owner approval before S2 implementation

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| **S2-OD-01** | Assessment coverage | (a) every published lesson + every course assessment; (b) Bitcoin 101 only; (c) a smaller explicit set | **(a)**, staged Bitcoin 101 first, because it satisfies §6 and makes completion meaningful |
| **S2-OD-02** | Course-completion rule | (a) all lessons complete; (b) all lessons + assessment passed | **(b)** if assessment coverage is complete; otherwise (a) with assessment shown separately |
| **S2-OD-03** | XP/achievements scope | (a) XP only; (b) XP + three achievements; (c) defer all P1 | **(b)** if P0 is on track; otherwise (a) or (c); FR-012 must not delay P0 |
| **S2-OD-04** | Preview quiz access | (a) show quiz, require sign-in to submit; (b) hide quiz from anonymous readers | **(a)**, with no anonymous persistence |
| **S2-OD-05** | Attempt idempotency | (a) client `attemptKey` + unique index; (b) server-issued attempt token; (c) append-only attempts with no idempotency | **(a)**, simplest and testable |
| **S2-OD-06** | New dependencies | (a) none; (b) add a client test framework | **(a)**; S2 needs no new runtime dependency; testing tooling is a separate approval |

No OD-001 decision is required for S2. No wallet or AI decision is required for S2.

---

## 8. Dependencies and implementation order

### 8.1 Dependency table

| Slice | Hard dependencies | External dependencies | Decisions required before start |
|---|---|---|---|
| S1 | — | Atlas | Completed |
| S2 | S1 | Atlas | S2-OD-01…06; confirm content scope |
| S3 | S1 shell | None for core; crypto library approval | D-08, D-10 |
| S4 | S1, S2 (quiz band if used) | OpenRouter free model/key | Z-01, P-05; provider/model approval |
| S5 | S1, wallet spike, D-02 | NWC relay, compatible wallet | D-11, D-02; D-01 for real invoice |
| S6a | S5, S2 readiness quiz | Receiving wallet for AC-013 evidence | D-01, D-03, D-05, D-06 |
| S6b | S6a, funded receiving wallet | Real wallet, relay, inbound liquidity, funds | D-01, D-03, D-06, P-01, P-02, Z-02 |
| S7 | All prior slices | Render/free host, Atlas, Git remote | D-07, OD-001, deployment/billing/Git approvals |

### 8.2 Critical path

```text
S1 → S2 → S5 → S6a → S6b → S7
              ↑
        wallet spike/D-02
S3 and S4 run in parallel after S1/S2 and must not delay S5–S7.
```

### 8.3 Implementation order and gates

1. **S2 first.** Complete assessment and feedback. Gate: AC-005/AC-006 and no S1 regression.
2. **S3 and S4 in parallel.** S3 has no backend dependency; S4 depends on S1 and optionally S2's
   quiz band. Gate: AC-008/AC-009 and AC-010/AC-011 respectively.
3. **Wallet spike before S5.** The spike is a time-boxed investigation, not a user-facing slice.
   It resolves D-01/D-02/D-05/D-06 evidence and must not be postponed.
4. **S5.** Connect/status/invoice literacy. Gate: AC-012/AC-016.
5. **S6a.** Payment logic and failure handling against fakes. Gate: AC-015; no AC-014 claim.
6. **S6b.** Real settlement. Gate: AC-013/AC-014/AC-015 with real evidence and documented funding.
7. **S7.** Stabilization, PWA, deployment, docs. Gate: AC-003/AC-017/AC-018 and the full demo.

### 8.4 Parallelism rules

- S3 may start immediately after S1 and can run alongside S2.
- S4 may start after S1; if it uses the quiz band, wait for S2's data contract.
- S5 may start after S1 and the wallet spike; it does not need S3 or S4.
- S6a must not start until S5's connection and invoice contract is stable.
- S6b must not start until S6a's state machine and real adapter seam are tested.
- S7 must not start until the feature slices are stable; otherwise deployment work will be redone.

### 8.5 External funding and service gates

- **Atlas:** free tier is sufficient for the MVP; no paid database is assumed.
- **OpenRouter:** free model is assumed; if unavailable, the tutor must degrade to a curated
  fallback. No paid AI spend is assumed.
- **Render:** free tier is assumed; cold starts and billing configuration must be verified before
  deployment. No paid hosting is assumed.
- **Wallet/relay/receiving wallet:** required for S5–S6b; no assumption that the owner or learners
  will fund real payments.
- **Real settlement funding:** required for S6b; if absent, stop at S6a and record a documented
  deviation. The MVP Definition of Done cannot be claimed without it.
- **Domain:** not required; a platform subdomain preserves the single origin. No domain purchase
  is assumed.
- **Git remote/push/deploy:** requires explicit owner approval at S7.

---

## 9. Security and testing strategy

### 9.1 Cross-cutting security baseline

The following controls are already present in S1 and must be preserved or extended by every later
slice:

- Server-side session identity; no client-supplied user id is trusted.
- Argon2id password hashing; generic authentication errors.
- Session regeneration on login/register; session destruction on logout.
- `HttpOnly`, `SameSite=Lax`, `Secure` in production, `__Host-` cookie in production.
- Zod validation at the edge; strict payloads; JSON-only mutations.
- Origin/host guard for mutations.
- Helmet/CSP; no `X-Powered-By`; safe error envelope with no stack traces.
- Auth rate limiting; structured logs with redaction.
- Published-only content queries.
- Bundle secret scan.
- Environment-based secrets; no hardcoded credentials.
- No secrets in reports, logs, or generated documentation.

### 9.2 Per-slice security focus

| Slice | Primary security focus |
|---|---|
| S2 | Answer-key confidentiality, server-only scoring, ownership, attempt idempotency, no duplicate XP, accessible feedback |
| S3 | No real keys/seeds, no network calls, simulation labeling, no misleading QR/address |
| S4 | API key server-side, prompt injection, input/token limits, rate limits, no PII, safe refusal, no payment/wallet claims |
| S5 | NWC bearer secret never logged/bundled/persisted unencrypted; minimum permissions; explicit consent; relay CSP |
| S6a | No auto-pay, fixed amount/cap, idempotency, receiver-side verification, no mock-success path, no secret logging |
| S6b | Real-money consent, recipient disclosure, amount cap, settlement verification, no seed/private key, no false success |
| S7 | Production secrets, cookie flags, `trust proxy`, CSP, dependency audit, no auth/payment caching, public-repo secret scan |

### 9.3 Testing strategy by layer

| Layer | Scope | Evidence |
|---|---|---|
| Unit | Progress maths, quiz scoring, completion logic, payment state transitions, invoice/amount validation, prompt filters | Node test runner; pure functions; exact expected outputs |
| Integration | Auth/database, course retrieval, progress persistence, quiz attempts, AI requests, wallet connection, invoice creation, payment verification | In-process Express app + Atlas test DB for DB tests; provider/wallet mocks where external |
| Negative | Invalid login, missing lesson/quiz, incorrect quiz answers, AI provider failure, wallet disconnection, invalid invoice, rejected payment, network interruption | Explicit test cases; no generic "something went wrong" |
| UI/manual | Mobile responsive, keyboard, screen reader, color independence, loading/error/offline states | Device/browser checklist with recorded viewport/device |
| End-to-end | Register → lesson → quiz → playground → tutor → wallet connect → guided payment → verify | Primary demo journey; real payment only in S6b |
| Security review | Secrets, logs, bundles, headers, ownership isolation, rate limits | Scans and targeted tests |

### 9.4 Database-test discipline

- Database tests are opt-in: `RUN_DB_TESTS=1` and `MONGODB_URI`.
- They run against `${MONGODB_DB}_test`, currently `kaos_academy_test`.
- The teardown guard must remain exact and fail-closed.
- New collections introduced by S2 must be added to teardown in dependency-safe order:
  attempts, XP/achievements, quizzes, progress, sessions, users, courses, lessons (exact order to
  be finalized with the models).
- No test may write to the production `kaos_academy` database.
- Atlas latency is high on this environment; a focused database suite is preferable to repeatedly
  running the full suite during development.

### 9.5 Evidence rules

- A feature is not complete because its interface exists.
- A quiz is not complete because a form renders; server scoring and persistence must be tested.
- A simulation is not complete unless it is visibly labelled and makes no real network call.
- A tutor is not complete unless it is grounded, safe, and degrades honestly.
- A wallet connection is not complete unless the wallet answered; a posted alias is not proof.
- A payment is not complete unless the receiver confirms settlement; a successful HTTP response is
  not payment success.
- No mock payment result may be presented as real.
- No user reach, impact, or performance statistic may be invented.
- Mobile and accessibility claims require a recorded check, not an assumption.

### 9.6 Current test commands and limitations

Commands rechecked in this planning session:

```bash
cd ~/kaos-bitcoin-academy
npm test
npm run typecheck
```

Observed:

- `npm test`: 28 passed, 0 failed, database suite skipped.
- `npm run typecheck`: server and client passed.
- The database suite was not rerun because it writes to the test database and this phase is
  read-only planning. The prior 7/7 and 35/35 results remain documented evidence.
- No mobile-device test, deployment test, wallet test, AI test, or real payment test was performed.

---

## 10. Unresolved decisions

### 10.1 Existing engineering decisions

| ID | Subject | Status / effect | Blocks |
|---|---|---|---|
| **OD-001** | Documentation directory structure | **Open**; do not create `docs/` until resolved; root documents remain canonical | S7 documentation completeness |
| **D-01** | Academy receiving-wallet architecture | Pending; required for real invoice and settlement | S5 real invoice, S6a AC-013, S6b |
| **D-02** | NWC credential custody | Pending; recommended browser-held, memory-only | S5 |
| **D-03** | Learner payment/funding model | Pending; direction and consent unknown | S6a/S6b |
| **D-04** | Session/deployment topology | Single-origin is reflected in S1; preserve it | S2/S7 if changed |
| **D-05** | LNbits role/fallback | Pending; receiving complement, not an FR-009 substitute | S6 |
| **D-06** | Wallet acceptance-testing environment | Pending; determines AC-014 evidence bar | S6 |
| **D-07** | Offline behavior | Pending; recommended read-only cache | S7 |
| **D-08** | Mnemonic display in playground | Pending; recommended none | S3 |
| **D-09 / P-04** | Curriculum scope at submission | Current code reflects Bitcoin 101 complete + first modules; confirm formal approval | S2 content scope |
| **D-10** | Dependency batch | Pending for S3–S5; no S2 dependency | S3–S5 |
| **D-11** | Wallet validation spike | Pending; run before S5 | S5 |
| **D-12** | OD-001 documentation structure | Same as OD-001 | S7 |
| **D-13** | Schedule re-baseline | Planning issue, not a technical decision | Whole roadmap |
| **D-14** | Referenced in reports but not defined in the inspected register | No scope assigned here; do not infer | Unknown |
| **D-15** | Start implementation | S1 was authorized; S2 requires a new authorization | S2 |

D-04 is not reopened by this report. The S1 implementation already uses the single-origin
topology; S2 must preserve it.

### 10.2 Product decisions from the existing reports

| ID | Subject | Status / effect | Blocks |
|---|---|---|---|
| **P-01** | Payment recipient | Pending; required before S6b | S6b |
| **P-02** | Amount and funding | Pending; no funding commitment made | S6b |
| **P-03** | Preview without account | Applied in S1 (one preview lesson) | — |
| **P-04** | Curriculum depth | Reflected in S1; confirm | S2 content |
| **P-05** | Tutor progress access | Pending; recommended banded summary | S4 |
| **P-06** | Community partner | Not now | S6b only if option B chosen |
| **Z-01** | Free-model operating policy | Pending; default free model, cap, fallback, training opt-out | S4 |
| **Z-02** | AC-014 funding path | Pending; sponsor vs learner-funded vs documented deviation | S6b |

### 10.3 New S2 decisions

See §7.11. The owner must approve S2-OD-01 through S2-OD-06 before implementation. The report
does not choose them silently; it records recommendations.

### 10.4 Decisions required before later slices

- **S3:** D-08, D-10.
- **S4:** Z-01, P-05, provider/model approval.
- **S5:** D-11, D-02, D-01 (for real invoice), D-05, D-06.
- **S6a/S6b:** D-01, D-03, D-05, D-06, P-01, P-02, Z-02, funding/recipient.
- **S7:** D-07, OD-001, Git remote/push approval, deployment approval, hosting billing
  verification.

### 10.5 No silent resolution

No decision above was resolved by this report. Recommendations are explicitly marked as
recommendations. OD-001 remains Open. The PRD remains authoritative.

---

## 11. Risks and blockers

### 11.1 Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Slice |
|---|---|---|---|---|---|
| R1 | Real settlement is unfunded or has no receiving wallet | High | High | Owner chooses sponsor/learner-funded/documented deviation; stop at S6a if unresolved | S6b |
| R2 | Wallet compatibility, NWC onboarding, or relay failure | High | High | Run the spike early; test a real wallet; keep LNbits alternative; honest `unknown` state | S5–S6b |
| R3 | Assessment content authoring overruns | High | High | Bitcoin 101 first; review every question; stage coverage; owner may reduce scope explicitly | S2 |
| R4 | Free AI model unavailable or rate-limited | High | Medium | Model chain, curated fallback, per-learner/global caps, demo reserve | S4 |
| R5 | Render cold start or billing overage | Medium | High | Warm-up, skeleton UI, verify billing controls, video backup; no paid resource without approval | S7 |
| R6 | Atlas pause, latency, or data loss | Medium | High | Pre-demo check; manual export; text-only content; opt-in tests | All |
| R7 | OD-001 blocks documentation structure | Medium | Medium | Keep root docs canonical; resolve before creating `docs/` | S7 |
| R8 | No Git remote or deployment approval | Medium | Medium | Separate explicit approval; secret scan before push | S7 |
| R9 | Course-completion rule ambiguity changes S1 behavior | Medium | Medium | Decide S2-OD-02 before coding; test both lesson and assessment states | S2 |
| R10 | Answer-key leakage or duplicate XP | Medium | High | Server-only keys, response tests, unique event key, concurrency test | S2 |
| R11 | Mobile/accessibility evidence is missing | Medium | Medium | Record device/viewport checks; keyboard and screen-reader pass | S1/S7 |
| R12 | Schedule pressure compresses P0 | High | Medium | Critical path, parallel S3/S4, defer P1/P2, no scope creep | All |
| R13 | Hosting overage becomes billable despite "free" tier | Low–Medium | High | Owner verifies billing configuration and spending controls before deployment | S7 |
| R14 | Learner mistakes simulation or mock payment for real money | Medium | High | Mandatory labels, no QR, explicit disclosure, no mock-success path | S3/S6a |
| R15 | Secrets leak through logs, bundles, or public repo | Low–Medium | High | Redaction, bundle scan, repo scan, no secrets in reports | All |

### 11.2 Blockers

- **S2:** No existing engineering decision blocks S2. The blockers are the owner's S2 product
  decisions and content-authoring/review capacity.
- **S5/S6:** Wallet spike, D-01/D-02/D-05/D-06, and a real receiving wallet are hard external
  dependencies.
- **S6b:** Funding and a real settlement path are hard blockers. There is no engineering workaround
  that satisfies AC-014 and the "no mock payment results" clause.
- **S7:** OD-001, Git remote/push approval, and deployment/billing approval are required.

### 11.3 Stop conditions

Implementation must stop and return to the owner if:

- The PRD and existing engineering records materially conflict.
- A requirement cannot be mapped confidently.
- The implementation differs significantly from the current reports without explanation.
- An S2 task requires an unresolved decision (especially S2-OD-01/02/03).
- A change to S1 progress or completion semantics is needed without approval.
- A real payment is required but funding/recipient is unresolved.
- A secret would be exposed or a production database would be touched.
- A new dependency is needed without approval.
- A deployment, Git push, or remote creation is requested without explicit approval.

---

## 12. Definition of Done for every proposed slice

### 12.1 Slice-level Definition of Done

| Slice | Definition of Done |
|---|---|
| **S1** | Auth, catalogue, lesson reader, preview, idempotent completion, progress, and dashboard pass integration tests; no secrets exposed; typecheck/build pass; AC-003 mobile evidence recorded; no regressions. Current status: implementation complete; AC-001/002/004/007 verified; AC-003 evidence outstanding. |
| **S2** | Approved assessment content seeded and validated; three PRD quiz endpoints work; server scoring correct; attempts persist and are ownership-scoped; duplicate attempts idempotent; answers not leaked; accessible inline checks and course assessment; approved completion rule reflected; AC-005/AC-006 pass; AC-007 regression passes; typecheck/build and database suite pass; no new unapproved dependency. |
| **S3** | Six documented simulations work; every simulation visibly labelled; no real keys/seeds/transactions; no network calls; mobile and keyboard usable; AC-008/AC-009 evidence recorded; dependency and mnemonic decisions approved. |
| **S4** | Lesson-scoped tutor works with curated context; safe refusal for unsupported asks; provider-down fallback; rate/token caps; no secret exposure; adversarial set passes; AC-010/AC-011 pass; core learning path works without the tutor. |
| **S5** | Compatible wallet connects and is proven live by a wallet response; capabilities/status shown honestly; disconnect works; invoice inspection is labelled correctly; no secret in logs/bundles; AC-012/AC-016 pass; no real payment claimed. |
| **S6a** | Full guided payment flow works against a fake adapter; all states and failure messages correct; receipts derive from verified fake data only; AC-015 demonstrated with fakes; real adapter isolated/disabled; no AC-013/AC-014 claim. |
| **S6b** | Real invoice handled; real guided payment completed and receiver-verified; amount/hash match; honest receipt; negative states correct; AC-013/AC-014/AC-015 pass with real evidence; funding/recipient documented; no mock result. |
| **S7** | Public URL works; PWA installable with honest read-only offline behavior; AC-003 mobile evidence; AC-017/AC-018 pass; README/setup/architecture/security/wallet/future docs complete; primary E2E journey passes; final test report and handover produced; no secrets in public repo. |

### 12.2 MVP Definition of Done against PRD §25

| PRD §25 clause | Current status | Closing slice |
|---|---|---|
| The public application works | Not met; no deployment | S7 |
| A beginner can complete the introductory learning journey | Partially met; reading/completion/dashboard work; quizzes absent | S2 (and S3/S4 for the full journey) |
| Lessons and quiz progress persist | Lessons yes; quizzes no | S2 |
| The Bitcoin playground provides functional educational demonstrations | Not met | S3 |
| The AI tutor works with contextual educational content | Not met | S4 |
| An actual Lightning wallet integration is operational | Not met | S5 |
| A guided payment can be completed and verified | Not met | S6b |
| Critical security checks pass | S1 baseline passes; AI/wallet/payment checks pending | S2–S7 |
| The repository and documentation are publicly accessible | Not met; no remote, no README, empty docs | S7 |
| A complete demonstration can be performed without relying on mock payment results | Not met | S6b + S7 |

### 12.3 Final acceptance rule

The MVP is not complete until S6b provides real payment evidence and S7 provides public
deployment/documentation. A deployed partial MVP is useful and honest, but it is not the PRD
Definition of Done. No mock payment result, simulated wallet, or fake settlement may be presented
as satisfying AC-013/AC-014.

---

## 13. Recommendations requiring owner approval

### 13.1 Immediate recommendations for S2

1. **Approve the S2 scope in principle** but do not authorize implementation until the decisions
   below are answered.
2. **Approve S2-OD-01 (assessment coverage).** Recommended: every published lesson gets 2–3
   knowledge checks and every published course gets one assessment, with Bitcoin 101 authored and
   reviewed first. This is the only coverage that satisfies §6 and makes course completion
   meaningful.
3. **Approve S2-OD-02 (course-completion rule).** Recommended: all published lessons complete
   **and** the course assessment passed. If assessment coverage is reduced, use lesson-only
   completion and show the assessment separately.
4. **Approve S2-OD-03 (XP/achievements).** Recommended: XP ledger plus three minimal achievements,
   with no badge engine; defer P1 if P0 is at risk.
5. **Approve S2-OD-04 (preview quiz).** Recommended: show the quiz in the preview lesson but
   require sign-in to submit; no anonymous persistence.
6. **Approve S2-OD-05 (attempt idempotency).** Recommended: client-generated `attemptKey` plus a
   unique compound index.
7. **Approve S2-OD-06 (no new dependencies).** Recommended: no new runtime dependency for S2; if
   client component testing is wanted, approve a separate testing-tool decision.
8. **Confirm D-09/P-04** (Bitcoin 101 complete + first modules of 02–08) if it is not already
   formally recorded. Do not expand the curriculum silently.
9. **Authorize a short S1 AC-003 mobile/responsive check** before describing S1 as fully accepted.
   This is verification, not a feature change.

### 13.2 Recommendations for later slices

- **S3:** Approve D-08 (no mnemonic display) and the exact dependency batch (D-10) before coding.
- **S4:** Approve Z-01 (free-model policy, cap, fallback, training opt-out), P-05 (banded progress
  summary), and the provider/model.
- **S5:** Run the wallet spike first; resolve D-01, D-02, D-05, D-06; do not build the wallet UI on
  assumptions.
- **S6a:** Authorize logic and fake-adapter work only after S5's contract is stable; do not claim a
  real payment.
- **S6b:** Decide the recipient, amount, funding source, and acceptance environment before
  scheduling. If no funding exists, record a documented deviation and do not claim AC-014.
- **S7:** Resolve OD-001; approve the Git remote/push and deployment separately; verify hosting
  billing controls; keep the free-first constraint.

### 13.3 What this report does not authorize

This report does **not** authorize:

- S2 implementation or any application/source-code change.
- Dependency installation or framework changes.
- Git staging, committing, branching, remote creation, pushing, or history rewriting.
- Deployment or external service provisioning.
- Any modification to `PRD.md`, `ENGINEERING-DECISIONS.md`, existing reports, or `.gitignore`.
- Any real wallet connection, AI request, or payment.
- Any resolution of OD-001 or another open decision.

### 13.4 Planning conclusion

S1 provides a credible, tested learning spine. The remaining work is substantial but separable:
S2 completes assessment, S3 adds safe experimentation, S4 adds grounded assistance, S5–S6b add
wallet literacy and a verified payment, and S7 turns the result into a public, documented MVP.
The project is ready for an S2 scope decision, not for unapproved implementation.

The PRD remains the sole authority. Where this report recommends a product interpretation, it is
marked as proposed and requires owner approval.

---

## 14. Report delivery and verification

This is a new report. The project destination did not exist before creation, so no existing report
was overwritten.

Project report:

```text
~/kaos-bitcoin-academy/reports/S2-PLANNING-AND-ROADMAP-REPORT.md
```

Device-storage destination:

```text
~/storage/shared/Download/KAOS-Bitcoin-Academy/reports/S2-PLANNING-AND-ROADMAP-REPORT.md
```

The destination directory exists. The shared-storage copy is made only after the project report is
complete, without overwriting an existing file. Both copies are verified with `cmp` and SHA-256.
The exact file size, hashes, comparison result, and final Git status are reported in the handover.

No application code, test, configuration, dependency, PRD, engineering decision, existing report,
or `.gitignore` rule was changed in producing this report.

