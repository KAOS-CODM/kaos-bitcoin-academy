# Read-only S2 acceptance audit — KAOS Bitcoin Academy

**Verdict: NOT ACCEPTED YET.** The core S2 implementation is largely present and many requirements pass by source inspection and existing tests. Acceptance is blocked by four substantive issues and several verification gaps:

1. The seeder automatically drafts stale **achievements**, although the approved decision covers stale **quizzes** only.
2. A concurrent final-lesson completion and assessment pass can miss the course-completion reward.
3. Concurrent same-key attempts with different answers can return a `200` replay instead of `409 ATTEMPT_KEY_REUSED`.
4. The saved-attempt history UI does not show the per-question feedback the API returns.
5. The final database suite has not run against the exact current code, and no browser/accessibility/mobile verification exists.

No files, tests, configuration, reports, database records, or Git state were modified during this audit. I did not run tests, builds, seeders, database commands, or deployments.

---

## 1. Scope, method, and constraints

**Performed:**

- Inspected the actual working tree, source, tests, content, implementation report, planning/audit reports, and build artifacts.
- Verified checksums, Git state, test definitions, index definitions, route ordering, reward logic, and client rendering paths.
- Confirmed the shared-storage implementation-report copy is byte-identical to the repository copy.
- Searched for raw logs, test-result files, coverage files, and deployment evidence.

**Not performed:**

- No database tests, seeders, production commands, dependency installs, builds, or test runs.
- No browser, keyboard-only, screen-reader, Lighthouse, 360px mobile, or deployment verification.
- No human subject-matter review of quiz content.
- No modification of `PRD.md`, `PRD-ORIGINAL.txt`, `PRD.txt`, reports, source, tests, or configuration.

**No raw logs were found.** The only execution evidence is the implementation report itself.

---

## 2. Repository and working-tree state

| Item | Result |
|---|---|
| Branch / HEAD | `main` / `41d37e7` |
| Tracked modified files | 18 |
| Staged files | 0 |
| Untracked files | 28 |
| `git diff --check` | Clean |
| Package manifest / lockfile changes | None |
| `.env.example` changes | None |
| Production seed / deployment | No evidence of either |
| S2 implementation committed | No — all S2 changes remain uncommitted |

The 18 tracked modifications match the implementation report’s list. The untracked set includes the S2 files plus `S2-SUMMARY.md`, the planning/audit reports, and an additional `reports/DNS-MONGODB-INSPECTION-REPORT.md` that is not listed in the implementation report’s new-file list.

No secrets, connection strings, tokens, or credentials were read into or exposed in this report.

---

## 3. PRD integrity — baseline conflict

The supplied baseline checksum was:

```text
1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d
```

Actual checksums:

| File | SHA-256 | Size |
|---|---|---:|
| `PRD.md` | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | 28,170 bytes |
| `PRD-ORIGINAL.txt` | `7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed` | 28,031 bytes |
| `PRD.txt` | `80f7f293030ec9cb8429811b74233d1906500c11b47c9a214a6521db3884d873` | 28,025 bytes |

**Result: the supplied baseline matches `PRD.md`, not `PRD.txt`.**

- `PRD-MD-SHA256.txt` confirms `PRD.md` is authoritative and records the authorized six-line “Final authority” append that makes it differ from `PRD-ORIGINAL.txt`.
- `PRD-SHA256.txt` records `PRD.txt` as archived, superseded, and not authoritative; its recorded checksum is the actual `80f7...` value.
- Therefore the instruction “verify `PRD.txt` against `1e73...`” cannot pass without contradicting the project’s own document-role records.

**Status: NEEDS OWNER CONFIRMATION — baseline/document-role issue, not evidence that the authoritative PRD was altered.** I did not reconcile or modify any PRD file.

---

## 4. Implementation report integrity

| Copy | Size | SHA-256 |
|---|---:|---|
| `reports/S2-IMPLEMENTATION-REPORT.md` | 17,463 bytes | `7a0856bdaddcdf7f627e79f59f3b0594d4c221d3088ea69e34dd18ed68745c13` |
| `~/storage/shared/Download/KAOS-Bitcoin-Academy/reports/S2-IMPLEMENTATION-REPORT.md` | 17,463 bytes | Same |

`cmp` exited `0`; the copies are byte-identical.

The report states:

- Typecheck passed for server and client — `reports/S2-IMPLEMENTATION-REPORT.md:128-136`.
- Production build passed — `:138-154`.
- Non-database suite: 47/47 passing — `:156-174`.
- Database suite: 10/10 passing in an earlier run — `:178-198`.
- Final database retry failed at Atlas with `MongooseServerSelectionError`, `ReplicaSetNoPrimary`, and an 8-second selection timeout; no test body ran — `:198`.
- Different-key concurrency assertion was added after the successful run and has not run against Atlas — `:210`.
- Manual browser, accessibility, mobile, and keyboard checks were not performed — `:234-241`.

**Report-integrity issues:**

- The approved-decision table says stale **quizzes** become draft — `reports/S2-IMPLEMENTATION-REPORT.md:40`.
- The implementation summary says stale **quizzes and achievements** become draft — `:98`. That is inconsistent with the approved scope.
- The report says non-database reward tests cover the transaction duplicate-key logic — `:210` and `:275`. They actually test only the helper functions with mocked duplicate-key errors, not the route transaction/retry loop (`server/test/rewards.test.ts:18-57`).
- The access table says anonymous draft/missing/orphan attempt/results are “404/401 by route order” — `:251`. In code, `requireAuth` runs before quiz lookup, so anonymous attempt/results are always `401`, not `404` (`server/src/routes/quizzes.ts:174-175`, `:337`).

No raw typecheck, build, or test logs were found.

---

## 5. Owner-decision compliance summary

| Approved decision | Status | Evidence |
|---|---|---|
| 30 quizzes: 22 lesson checks, 8 assessments; 87 questions | **PASS** | Source counts and `server/test/quiz-content.test.ts:12-44` |
| Lesson checks pass at 67%; assessments at 80% | **PASS** | `server/src/content/quizzes/01-bitcoin-101.ts` content; tests at `server/test/quiz-content.test.ts:29,42` |
| XP: lesson-check pass 10, assessment pass 25, course completion 50 | **PASS** | `server/src/lib/rewards.ts:14-18` |
| Achievements: `first-check`, `first-assessment`, `first-course` | **PASS** | `server/src/content/achievements.ts:3-21` |
| Course complete only when all published lessons complete and assessment passed | **PASS sequentially; concurrency gap** | `server/src/lib/progress.ts:21-31`; sequential test `server/test/db.integration.test.ts:666-938` |
| Preview exception only for quiz retrieval; anonymous attempts/results 401 | **PASS** | `server/src/routes/quizzes.ts:99-100,174-175,337`; DB tests `:420-449` |
| `attemptKey` idempotency; same key + same answers replays; different answers 409 | **PARTIAL** | Sequential path correct; concurrent different-answer path can return 200 — see §9 |
| Stale quizzes retired to `draft`; attempts preserved; no deletion | **PASS by source; no test** | `server/src/seed/seedContent.ts:103-106` |
| Stale achievements retired automatically | **NEEDS OWNER DECISION — not approved** | `server/src/seed/seedContent.ts:124-127` |
| Database tests only against `kaos_academy_test`; fail closed; `deleteMany` only | **PASS by source; exact run not verified** | `server/test/db.integration.test.ts:22-28,67-89,120-143` |
| No new dependencies or environment variables | **PASS** | No manifest/lockfile/config diff |
| No out-of-scope S3-S7, paywall, wallet, AI tutor, adaptive quiz, or free-text evaluation | **PASS by source search** | No implementation references found |
| Human subject-matter content review | **NOT VERIFIED** | Report says deferred — `reports/S2-IMPLEMENTATION-REPORT.md:227-232` |
| Browser, accessibility, mobile, keyboard, deployment | **NOT VERIFIED** | Report says not performed — `:234-241` |

---

## 6. Content audit

### Counts and structure

| Metric | Result |
|---|---|
| Courses | 8 |
| Lessons | 22 |
| Preview lessons | 1 — `btc101-what-is-bitcoin` |
| Lesson checks | 22 |
| Course assessments | 8 |
| Total quizzes | 30 |
| Total questions | 87 |
| Lesson-check questions | 44 — 22 checks × 2 |
| Assessment questions | 43 — Bitcoin 101 has 8; courses 02-08 have 5 each |
| Bitcoin 101 questions | 24 — 8 checks × 2 + 8 assessment |
| Each of courses 02-08 | 9 — 2 checks × 2 + 5 assessment |

Evidence:

- `server/test/quiz-content.test.ts:12-44` verifies 30/22/8, three achievements, one check per lesson, one assessment per course, 67/80 thresholds, and 8/5 assessment counts.
- `server/test/content.test.ts:20-39` verifies 8 courses, 8 Bitcoin 101 lessons, one preview, and two authored lessons plus one module for each later course.
- `server/src/content/index.ts:258-281` asserts 22 lesson quizzes, 8 assessments, 30 total, and 3 achievements.
- `server/src/seed/seedContent.ts:155-161` asserts exactly 30 published quizzes and 3 published achievements after seeding.

### Question quality checks

- Unique quiz slugs, question IDs, option IDs, and non-empty explanations: `server/test/quiz-content.test.ts:47-70`.
- 3–4 options per question, unique option text, and correct-answer references: `server/src/content/index.ts:180-235`.
- All 87 correct answers are in positions 0, 1, or 2, with exact distribution **29 / 29 / 29**. The test only requires a spread of at most 3 (`server/test/quiz-content.test.ts:72-85`); the exact 29/29/29 figure was verified by a read-only source scan and matches the report’s claim.
- Course assessments do not make the correct answer the uniquely longest option: `server/test/quiz-content.test.ts:87-101`.

### Content limitations

- The optional `scenario` field exists in the type and UI (`server/src/content/types.ts:67-73`, `client/src/components/Quiz.tsx:139-143`), but **no authored question sets `scenario:`** — zero occurrences across 87 questions. Scenario framing appears to be embedded in prompt text instead. If the owner expects a distinct scenario presentation, that content/UI path is unused and unverified.
- The AI content review is report-only; no independent human review or item analysis exists. The report itself calls this a limitation — `reports/S2-IMPLEMENTATION-REPORT.md:227-232`.
- No unpublished or future curriculum content is included in the authored set; all 30 quizzes reference the 8 published courses and 22 lessons.

---

## 7. Quiz access and learner isolation

| Case | Observed | Evidence | Status |
|---|---|---|---|
| Anonymous GET published preview quiz | `200`, public DTO, no answer keys/explanations | DB test `server/test/db.integration.test.ts:420-435`; `server/src/routes/quizzes.ts:99-100` | PASS |
| Anonymous GET published non-preview quiz | `401` | DB test `:437-438` | PASS |
| Anonymous GET draft quiz | `404` | DB test `:476-477`; source `quizzes.ts:62-68` | PASS |
| Anonymous GET orphan quiz | `404` | DB test `:478-479`; source `quizzes.ts:78-96` | PASS |
| Anonymous GET missing quiz | `404` | Source `quizzes.ts:67-68`; no direct test | PASS by source |
| Authenticated GET preview/non-preview quiz | `200` | DB test `:498-505`; source | PASS |
| Authenticated GET draft/missing/orphan quiz | `404` | Source; no direct test | PASS by source |
| Anonymous POST attempt | `401` | DB test `:441-446`; `quizzes.ts:174-175` | PASS |
| Anonymous GET results | `401` | DB test `:448-449`; `quizzes.ts:337` | PASS |
| Authenticated POST attempt/results | Allowed | DB test `:507-663` | PASS |
| Cross-learner result access | Bob sees zero attempts, not Carol’s | DB test `:660-663` | PASS |
| Database unavailable | Controlled `503 DB_UNAVAILABLE` | `server/test/http.test.ts:19-50` | PASS |

**Route-order nuances:**

- When the database is unavailable, `requireDb` short-circuits before `requireAuth`, so anonymous attempts/results return `503`, not `401`. That is a controlled degradation, not the normal DB-ready matrix.
- `setQuizCacheHeaders` is inside the handlers (`quizzes.ts:161,179,338`). Middleware-generated `401`/`503` responses therefore do not receive `private, no-store` or `Vary: Cookie`. The tested `200`/`201`/results responses do (`db.integration.test.ts:422-423,513,649`). Low risk, but not fully consistent.

No answer-key leakage was found:

- Public DTO omits `correctOptionId` and `explanation` — `server/src/lib/quiz.ts:140-167`.
- Unit test — `server/test/quiz.test.ts:150-157`.
- DB test checks the public preview response does not contain answer keys — `server/test/db.integration.test.ts:424-426`.
- Results/feedback are scoped to the session user — `quizzes.ts:337-362`; cross-user test `:660-663`.
- Other routes select `questions` only to count them and do not return question content — `courses.ts:150-152`, `lessons.ts:45-52`, `dashboard.ts:21-23`, `progress.ts:64-66`.

---

## 8. Scoring, feedback, and saved results

### Scoring

- Scoring is server-side only: `server/src/lib/quiz.ts:84-139`.
- Client-supplied scores are rejected by strict Zod schema: `server/src/schemas/quiz.ts:3-18`.
- Missing, duplicate, unknown-question, unknown-option, and incomplete submissions are rejected — `quiz.ts:92-109`; tests `server/test/quiz.test.ts:108-146`.
- Passing-boundary behavior is correct — `server/test/quiz.test.ts:90-106`.
- Submitted answer order is normalized to quiz order — `quiz.test.ts:76-87`.

### Immediate feedback

- The result panel shows score, pass/fail, XP, achievements, and per-question correct/incorrect plus explanation — `client/src/components/Quiz.tsx:177-183,204-228`.
- The result panel is focusable, `role="status"`, and `aria-live="polite"` — `Quiz.tsx:204-210`.
- Error states use `role="alert"` — `Quiz.tsx:190-202`.

### Saved results

The backend does return saved feedback:

- Results endpoint returns up to 20 attempts with `feedback` — `server/src/routes/quizzes.ts:337-360`.
- Test verifies each saved attempt has two feedback entries — `server/test/db.integration.test.ts:647-658`.
- Client type includes `feedback: QuizFeedback[]` — `client/src/lib/types.ts:254-266`.

**FAIL / PARTIAL — the saved-attempt history UI ignores it.**

- `client/src/pages/Quiz.tsx:128-140` renders only score, total, percent, pass/fail, and date.
- It does not render `attempt.feedback`, the selected answer, the correct answer, correctness, or the explanation.
- Therefore “authenticated users may see their own saved results, including selected answer, correct answer, correctness, explanation” is only satisfied for the immediate result screen, not for saved attempt history.

Additional saved-results caveats:

- Feedback stores IDs, not question prompt or option text (`server/src/models/QuizAttempt.ts:45-53`). A standalone history view would need the current quiz to map IDs to labels.
- Retired quizzes preserve attempt rows, but `findAccessibleQuiz` requires `status: 'published'` (`quizzes.ts:62-65`), so results for a retired quiz return `404`. Data is preserved, but learners cannot review it. If the owner expects review after retirement, this needs an explicit decision.

### Source-level accessibility gap

Correct-answer highlighting is color-only:

- `client/src/components/Quiz.tsx:147-160` adds amber styling for the correct option and danger styling for a wrong selection, but the option label has no textual or `aria` indicator saying “correct answer” or “your answer.”
- The separate feedback block says “Correct”/“Not quite” (`:177-183`), but it is not associated with the correct option itself.
- This is a source-level observation, not a screen-reader test. A manual accessibility check is still required.

### Minor correctness issue

`canonicalAnswersEqual` is order-sensitive:

- `server/src/lib/quiz.ts:169-179` compares by array index.
- The test title says “ignores submitted order” (`server/test/quiz.test.ts:159`), but the test only supplies identical order; it never tests reordered input.
- Current routes canonicalize submitted answers, so client order is normalized. The risk is replaying a stored attempt after quiz question order changes: stored answers may be in the old order and be treated as different. Low risk, but the test name overstates coverage.

### Minor client issue

`newAttemptKey` falls back to a non-UUID string:

- `client/src/components/Quiz.tsx:15-19` uses ``${Date.now()}-${Math.random()...}`` if `crypto.randomUUID` is unavailable.
- The server schema requires a UUID (`server/src/schemas/quiz.ts:5`), so that fallback causes `400` in browsers without `crypto.randomUUID` (for example, some non-secure-context LAN deployments).

---

## 9. Idempotency, concurrency, and transactions

### Unique indexes — present

| Guard | Evidence |
|---|---|
| `{userId, quizId, attemptKey}` unique | `server/src/models/QuizAttempt.ts:76-79` |
| XP event key per user unique | `server/src/models/XpEvent.ts:30-33` |
| User achievement `{userId, achievementSlug}` unique | `server/src/models/UserAchievement.ts:18-21` |
| Progress `{userId, lessonSlug}` unique | `server/src/models/Progress.ts:22-26` |
| Quiz slug unique | `server/src/models/Quiz.ts:74` |

### What passes

- Sequential same-key replay returns the original result and no extra XP — `server/test/db.integration.test.ts:554-575`.
- Sequential different answers with the same key return `409 ATTEMPT_KEY_REUSED` — `:569-575`; source `quizzes.ts:197-214`.
- Concurrent same-key, same-answer requests return `200`/`201`, one attempt, one XP event, one achievement — `:577-600` (earlier successful DB run).
- Different-key concurrent passing attempts have a retry assertion — `:602-625`.
- The transaction wraps attempt, XP, and achievement writes — `quizzes.ts:217-314`.
- Duplicate-key errors inside a session are propagated so the caller can retry — `server/src/lib/rewards.ts:50-105`; unit tests `server/test/rewards.test.ts:18-57`.

### Finding 9.1 — same-key concurrent different answers can return `200` instead of `409`

- The outer pre-check compares answers correctly — `quizzes.ts:197-214`.
- Inside the transaction, however, if `current` exists, it is assigned and the callback returns without comparing answers — `quizzes.ts:249-251`.
- After the transaction breaks, the route responds `200` with the stored attempt — `quizzes.ts:321-333`.
- Interleaving: a concurrent request inserts the same key with different answers before this transaction’s `findOne`; this request then sees `current`, returns it, and never executes the 409 comparison.
- The DB test covers sequential different answers (`:569-575`) and concurrent same answers (`:577-600`), but **not concurrent different answers with the same key**.

**Status: FAIL.** Add the answer comparison to the in-transaction `current` branch and add a concurrent different-answer test.

### Finding 9.2 — course-completion reward can be missed under a final-lesson/assessment race

- Lesson completion writes progress, then calls `evaluateCourseCompletion` outside a transaction — `server/src/routes/progress.ts:118-169`.
- Assessment pass calls `awardQuizPassRewards`, which calls `evaluateCourseCompletion` inside the attempt transaction — `server/src/lib/rewards.ts:268`.
- Problem interleaving:
  - Assessment transaction reads progress before the final lesson progress commits → sees incomplete.
  - Final lesson completion reads assessment attempts before the assessment transaction commits → sees no pass.
  - Neither evaluates completion as true; no 50 XP and no `first-course`.
- There is no reconciliation loop. A later retry of Mark as Complete can catch up, but nothing guarantees one.
- The sequential test covers assessment-first and lessons-first correctly — `server/test/db.integration.test.ts:666-938` — but not concurrent final lesson + assessment.

**Status: FAIL / acceptance blocker.** Add an explicit completion reconciliation after both event types, or a transactional/outbox approach that cannot miss the transition. Add a concurrency test that starts the final lesson completion and assessment pass together and asserts exactly one course-completion XP event and one `first-course` award.

### Finding 9.3 — different-key concurrency is not verified against exact current code

- The test exists at `server/test/db.integration.test.ts:602-625`.
- The implementation report says it was added later and has not run against Atlas — `reports/S2-IMPLEMENTATION-REPORT.md:210`.
- The four non-database reward tests mock `updateOne` to throw duplicate-key errors; they do not exercise the route transaction, the retry loop, or the `withTransaction` behavior — `server/test/rewards.test.ts:18-57`.

**Status: NOT VERIFIED.** The report’s statement that those tests cover the transaction duplicate-key logic is inaccurate.

### Finding 9.4 — transaction fallback is not implemented

- The route uses `session.withTransaction` — `quizzes.ts:235`.
- The report says no fallback exists because the current Atlas target supports transactions — `reports/S2-IMPLEMENTATION-REPORT.md:350`.
- The approved decision was “transaction with idempotent fallback if operationally unsuitable.”

**Status: CONDITIONAL / NOT VERIFIED.** If the production deployment cannot support transactions, attempt creation fails rather than falling back. This must be confirmed before deployment.

---

## 10. XP, achievements, and course completion

### XP and achievements

| Event | Amount | Evidence |
|---|---:|---|
| Lesson-check first pass | 10 XP | `server/src/lib/rewards.ts:14-18,232-247` |
| Assessment first pass | 25 XP | `:14-18,248-266` |
| Course completion | 50 XP | `:14-18,199-210` |
| Lesson completion alone | 0 XP | `server/src/routes/progress.ts:157-169`; `rewards.ts:186` |

- `first-check` is awarded on a passing lesson check — `db.integration.test.ts:525-536`.
- `first-assessment` and `first-course` are awarded on a passing assessment that completes the course — `:872-878`.
- Assessment-first, then final lesson, awards 50 XP and `first-course` — `:796-803`.
- Repeat passes do not re-award XP or achievements — `:900-937`.
- Dashboard exposes XP and earned achievements — `server/src/routes/dashboard.ts:121-143`; client `Dashboard.tsx:80,203-220`.

**Course-completion-on-final-lesson nuance:** The final Mark as Complete can return 50 XP, but only when the course-completion predicate is already satisfied. This is course-completion XP, not lesson-completion XP. The test at `db.integration.test.ts:785-803` explicitly covers that case. This is consistent with the approved rule, but it should be described precisely in any acceptance sign-off.

### Stale-content retirement

- Stale **quizzes** are marked `draft`, never deleted — `server/src/seed/seedContent.ts:103-106`.
- Attempts are not deleted; there is no delete path in the seeder.
- No test specifically creates a stale quiz and verifies its attempts survive. This is **PASS by source, NOT VERIFIED by test**.

### Finding 10.1 — stale achievements are auto-drafted without approval

- Implementation: `server/src/seed/seedContent.ts:124-127` runs `AchievementModel.updateMany` and sets every achievement not present in authored content to `draft`.
- Approved decision: stale **quizzes** become draft; no equivalent approval exists for achievements — `reports/S2-IMPLEMENTATION-REPORT.md:40`, `S2-SUMMARY.md:43`, `reports/S2-PRE-IMPLEMENTATION-AUDIT-REPORT.md:726`.
- The implementation report contradicts itself: `:40` says stale quizzes only, while `:98` says stale quizzes/achievements.
- This would affect production data if the seeder is run: existing achievement definitions outside the three authored achievements would be drafted.

**Status: NEEDS OWNER DECISION.** Either remove stale-achievement retirement or obtain explicit approval and document its effect before any production seed.

### No retroactive S1 rewards

No migration or backfill exists. XP and achievements begin with S2 events. This matches the approved no-backfill decision. Report: `reports/S2-IMPLEMENTATION-REPORT.md:352`.

### Minor auditability risk

`server/src/seed/seedContent.ts:85` always writes `version: 1`. Attempts record `quizVersion`, but content revisions are not versioned, so the field is not a reliable content-revision identifier. Low risk, but worth noting for historical attempt auditing.

---

## 11. API robustness, security, and draft-content handling

### Passes

- No answer-key leakage in public DTOs — `server/src/lib/quiz.ts:140-167`; tests `quiz.test.ts:150-157`, `db.integration.test.ts:424-426`.
- Results/feedback owner-scoped — `quizzes.ts:337-362`; cross-user test `:660-663`.
- Controlled `503` when DB unavailable — `http.test.ts:19-50`.
- Unknown API endpoints return JSON `404` — `http.test.ts:52-60`.
- Cross-origin mutations rejected — existing `http.test.ts:62+`.
- Cache headers on successful quiz responses — `quizzes.ts:109-110`; tests `:422-423,513,649`.
- Rate limiter is applied after authentication — `quizzes.ts:25-35,175-176`.
- No new dependencies, environment variables, package changes, or `.env.example` changes.
- No client bundle evidence of server secrets; static test exists but was not rerun — `server/test/static.test.ts:29-49`.

### Finding 11.1 — malformed JSON returns `500`, not `400`, and may log the raw body

- Body parser: `server/src/app.ts:67`.
- Error handler handles `AppError`, `ZodError`, Mongoose `CastError`, and duplicate key, but not body-parser `SyntaxError` — `server/src/middleware/errors.ts:22-66`.
- It falls through to `logger.error({ err: error, ... })` and `500` — `:68-71`.
- Body-parser parse errors can carry the raw body in the error object. Logger redaction covers passwords, cookies, authorization, and secrets, but not `err.body` or a raw request body — `server/src/logger.ts:8-20`.

**Status: source-level defect / low-to-medium risk.** Add a `SyntaxError`/`entity.parse.failed` branch returning `400`, and ensure raw bodies are not logged. Add a malformed-JSON test.

### Finding 11.2 — lesson completion does not verify the parent course is published

- `progressRouter.post('/lessons/:lessonId/complete')` checks only lesson status — `server/src/routes/progress.ts:105-113`.
- The lesson detail route checks the course is published — `server/src/routes/lessons.ts:37,55-57`.
- The quiz route checks the course is published — `server/src/routes/quizzes.ts:71-80`.
- A published lesson attached to a draft course can therefore be completed via the progress API. It will not earn course-completion XP because `evaluateCourseCompletion` requires a published course, but a progress record is written and can appear in dashboard “recent” fallback data (`dashboard.ts:107-119`).

**Status: minor draft-content inconsistency / untested case.** Add a parent-course status check and a test.

### Finding 11.3 — production seeding has no code-level environment guard

- `server/src/seed/run.ts:6-20` connects to whatever `MONGODB_URI`/`MONGODB_DB` points to and seeds it.
- Production seeding is a process-control decision, not a code-enforced guard.
- Combined with the unapproved stale-achievement drafting, this is a reason not to run the seeder against production yet.

### Finding 11.4 — cache headers are missing on middleware-generated 401/503/429

- `setQuizCacheHeaders` is called inside the route handler — `quizzes.ts:161,179,338`.
- `requireDb`, `requireAuth`, and `attemptLimiter` run before the handler; their `503`/`401`/`429` responses do not receive `private, no-store` or `Vary: Cookie`.
- Successful responses are covered by tests; failure responses are not.

**Status: low risk / test gap.**

---

## 12. Frontend behavior and accessibility

### Implemented

- Public quiz route: `client/src/App.tsx:22`.
- Quiz page with authenticated attempt history: `client/src/pages/Quiz.tsx:14-141`.
- Reusable runner with radio groups, fieldset/legend, disabled guest inputs, result feedback, retry, and 409 recovery: `client/src/components/Quiz.tsx:22-273`.
- Inline lesson checks: `client/src/pages/Lesson.tsx:168-188`.
- Course assessment card with question count, pass mark, learner status, and sign-in CTA: `client/src/pages/CourseDetail.tsx:113-148`.
- Dashboard assessment-aware resume, course assessment status, XP, and achievements: `client/src/pages/Dashboard.tsx:87-112,156-196,203-220`.
- Error states for 401, 404, 429, and 503: `client/src/pages/Quiz.tsx:28-51`.
- 409 recovery rotates the attempt key: `client/src/components/Quiz.tsx:60-66`.

### Gaps

1. **Saved attempt history does not render feedback** — see §8. `Quiz.tsx:128-140`.
2. **Correct-answer indication is color-only** — see §8. `Quiz.tsx:147-160`.
3. **No client test framework** — `client/package.json` has no test script; all frontend behavior is source-inspection only.
4. **No manual browser, keyboard-only, screen-reader, Lighthouse, or 360px mobile evidence** — report `:234-241`.
5. **Fallback attempt key is not a UUID** — see §8. `Quiz.tsx:15-19`.

The result panel’s focus management and live region are good source-level accessibility measures, but they do not substitute for an actual assistive-technology test.

---

## 13. Test evidence matrix

| Check | Definitions / evidence | Exact current code? | Status |
|---|---|---|---|
| Typecheck | Report says server + client passed — `reports/S2-IMPLEMENTATION-REPORT.md:128-136` | Not rerun; no raw log | **Report-only** |
| Production build | Report says passed — `:138-154`; build artifacts exist from Nov 1 | Not rerun; artifacts are not proof of current source | **Report-only** |
| Non-database suite | 47/47 per report — `:156-174` | Not rerun; no raw log | **Report-only** |
| Database suite | 10/10 in earlier run — `:178-198` | Final changes not run; Atlas failure at `:198` | **NOT VERIFIED** |
| Different-key concurrency assertion | `db.integration.test.ts:602-625` | Report says not run — `:210` | **NOT VERIFIED** |
| DB target guard / cleanup | `db.integration.test.ts:22-28,67-89,120-143` | Source inspected; no DB run | **PASS by source** |
| Client tests | No test script in `client/package.json` | None exist | **NOT VERIFIED** |
| Browser / keyboard / screen reader / Lighthouse / 360px | Report says not performed — `:234-241` | None | **NOT VERIFIED** |
| Deployment | No evidence | None | **NOT VERIFIED** |
| Human content review | Report says deferred — `:227-232` | None | **NOT VERIFIED** |

The 47 non-database tests are consistent with 57 test definitions minus the 10 database tests skipped by the `describe(..., { skip })` guard. The 10 database tests are the ones not counted in the report’s 47.

### Important untested cases

- Concurrent same-key attempts with **different** answers.
- Concurrent final lesson completion + assessment pass.
- Stale quiz retirement preserving attempts.
- Stale achievement retirement behavior (also unapproved).
- Progress completion for a published lesson in a draft course.
- Malformed JSON request handling.
- Rate-limit `429` behavior.
- Cache headers on `401`/`503`/`429`.
- Saved-results history rendering feedback.
- Screen-reader/keyboard access to correct-answer state.
- Human subject-matter correctness of all 87 questions.

---

## 14. Findings, blockers, and next actions

### Findings table

| # | Finding | Severity | Status | Evidence |
|---|---|---|---|---|
| 1 | Seeder auto-drafts stale **achievements** without approval | High | **NEEDS OWNER DECISION** | `seedContent.ts:124-127`; report `:40` vs `:98`; `S2-SUMMARY.md:43` |
| 2 | Course-completion reward can be missed under final-lesson/assessment race | High | **FAIL** | `progress.ts:163-169`; `rewards.ts:268`; no concurrency test |
| 3 | Same-key concurrent different answers can return `200` instead of `409` | Medium | **FAIL** | `quizzes.ts:249-251`; no test |
| 4 | Saved-attempt history does not render per-question feedback | Medium | **FAIL / PARTIAL** | `Quiz.tsx:128-140`; API feedback at `quizzes.ts:347-360` |
| 5 | Exact-code database suite not run; final Atlas retry failed | High verification | **NOT VERIFIED** | Report `:198,210,345` |
| 6 | Correct-answer indication is color-only | Medium accessibility | **Source-level gap** | `Quiz.tsx:147-160` |
| 7 | Lesson completion does not verify parent course is published | Low/Medium | **FAIL** | `progress.ts:105-113` vs `lessons.ts:37,55-57` |
| 8 | Malformed JSON returns `500` and may log raw body | Low/Medium | **Source-level defect** | `app.ts:67`; `errors.ts:68-71`; `logger.ts:8-20` |
| 9 | Fallback attempt key is not a UUID | Low | **FAIL** | `Quiz.tsx:15-19`; `schemas/quiz.ts:5` |
| 10 | `canonicalAnswersEqual` is order-sensitive; test title overstates | Low | **Test/claim mismatch** | `quiz.ts:169-179`; `quiz.test.ts:159` |
| 11 | Report overstates concurrency coverage and access-table precision | Medium documentation | **FAIL (report accuracy)** | Report `:210,251,275` |
| 12 | `PRD.txt` baseline checksum mismatch | Baseline/admin | **NEEDS OWNER CONFIRMATION** | Checksums above |
| 13 | `scenario` field unused by all 87 questions | Low content note | **NOT VERIFIED / note** | `types.ts:67-73`; `Quiz.tsx:139-143`; 0 authored uses |
| 14 | No client tests or manual browser/accessibility/mobile evidence | Verification | **NOT VERIFIED** | `client/package.json`; report `:234-241` |

### Acceptance blockers

Do not mark S2 accepted until these are resolved or explicitly waived:

1. **Owner decision on stale achievements.** Remove automatic achievement drafting or approve it explicitly and document production impact.
2. **Fix the course-completion race.** Ensure exactly one 50 XP event and one `first-course` award when the final lesson and assessment pass concurrently.
3. **Fix the same-key concurrent different-answer path.** Return `409 ATTEMPT_KEY_REUSED` consistently, including inside the transaction.
4. **Render saved feedback in attempt history**, or explicitly narrow the requirement to immediate results only.
5. **Run the exact current code’s typecheck, build, non-database suite, and database suite**, with logs, against `kaos_academy_test`.
6. **Complete manual browser, keyboard, screen-reader, and 360px checks**; deployment remains separately unverified.

### Recommended next actions, in order

1. Obtain owner decision on stale-achievement retirement.
2. Fix the course-completion race and add a concurrent final-lesson/assessment test.
3. Fix the same-key concurrent different-answer branch and add a test.
4. Implement saved-attempt feedback rendering, including selected/correct answer labels and explanations; add a client test or document the manual check.
5. Add accessible text/`aria` labeling for correct/selected answers.
6. Add parent-course status checking to lesson completion.
7. Map body-parser JSON errors to `400` and prevent raw-body logging; add a malformed-JSON test.
8. Replace the non-UUID attempt-key fallback with a valid UUID strategy.
9. Make `canonicalAnswersEqual` order-insensitive and correct the misleading test.
10. Rerun exact-code verification and capture raw logs; do not seed production until the stale-achievement decision and database checks are complete.
11. Correct the implementation report’s stale-achievement and concurrency-coverage claims.
12. Resolve the `PRD.txt` vs `PRD.md` baseline conflict with the owner; do not reconcile the files automatically.

**No files were changed. I will not modify source, tests, documentation, reports, Git state, or databases without explicit owner approval.**
