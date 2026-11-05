# S2 Audit Extraction — Implementation-Relevant Summary

Read `reports/S2-PRE-IMPLEMENTATION-AUDIT-REPORT.md` in full (1,528 lines; 89,671 bytes). Read-only: no files, DB, or Git state changed. The owner approvals in the task are treated as authoritative; the audit itself predates them. I distinguish: **Approved** = your supplied decisions/policy; **Report** = audit evidence/recommendation; **Open** = not explicitly settled.

## 1. Approved decisions already settled

| ID | Decision | Effect |
|---|---|---|
| S2-OD-01 | 2–3 knowledge checks per published lesson and one assessment per published course; author Bitcoin 101 first, then all 8 courses/22 lessons. | Content scope fixed; no curriculum expansion. |
| S2-OD-02 | Course completion requires all published lessons complete **and** the course assessment passed; lesson completion remains independent and idempotent. | Changes S1 course/dashboard completion semantics. |
| S2-OD-03 | Include server-awarded XP ledger and three minimal achievements; duplicate submissions must not double-award XP; defer gamification if essential S2 work is threatened. | XP/achievements are in scope but deferrable; amounts/definitions are not fixed by this decision. |
| S2-OD-04 | Anonymous visitors may read the preview lesson and see its questions, but must sign in to submit; never persist anonymous attempts or progress. | Creates the public-preview quiz exception. |
| S2-OD-05 | Client-generated `attemptKey`; unique `{userId, quizId, attemptKey}`; retries return the original result; reused keys with different answers must not create another attempt or duplicate XP. | Defines idempotency and concurrency requirements. |
| S2-OD-06 | No new dependencies; reuse the existing stack and testing setup. | No package/lockfile changes. |

Also settled by the owner’s supplied access policy:

- Anonymous GET for the published preview quiz: **200**.
- Anonymous GET for a published non-preview quiz: **401**.
- Draft/orphan quiz: **404**.
- Anonymous attempt submission: **401**.
- Anonymous results retrieval: **401**.

The owner also confirmed the existing **8-course, 22-lesson** curriculum must remain unchanged, and explicitly authorized S2 implementation.

**C-01 resolution:** The planning report’s statement that `requireAuth` applies to all quiz routes is superseded. Use `requireDb` only on `GET /api/quizzes/:quizId`, enforce preview eligibility in the handler, and apply `requireAuth` to `POST /attempts` and `GET /results`. Do not edit the planning report; record the resolved contract in the implementation report, code, and tests.

**Important limits of the approvals:** S2-OD-03 does not set XP amounts or exact achievement definitions. S2-OD-01 does not set assessment question counts. S2-OD-02 does not decide whether a learner may attempt an assessment before finishing lessons.

## 2. Remaining owner confirmations

| # | Item | Audit position | Covered by approved decision? | Still needs owner? | Recommended default | Report section |
|---|---|---|---|---|---|---|
| 1 | Anonymous non-preview GET | Return 401; draft/orphan 404; anonymous POST/results 401. | Yes, supplied access policy | No | Settled | §5.2, §14.3(1) |
| 2 | XP amounts and sources | 10 for lesson-check first pass, 25 for assessment first pass, 50 for course completion; first pass only; no completion-click XP. | Partial: S2-OD-03 requires XP but not amounts. | **Yes** | **10 / 25 / 50** | §8.4, §14.3(2) |
| 3 | Achievement definitions | `first-check`, `first-assessment`, `first-course`. | Partial: S2-OD-03 requires three minimal achievements, not exact definitions. | **Yes** | Same three slugs/criteria | §8.5, §14.3(3) |
| 4 | XP backfill | Do not retroactively award XP/achievements for S1 lesson completions. XP starts with S2 quiz passes. If existing progress must earn rewards, use a separate approved one-time, idempotent script. | No | **Yes** | **None** | §8.6, §14.3(4) |
| 5 | Assessment access gate | A signed-in learner may attempt a course assessment before finishing lessons; completion still requires both lessons and assessment. Alternative: require all lessons first. | Partial: S2-OD-02 fixes completion, not the attempt gate. | **Yes** | **No lesson prerequisite** | §8.2, §14.3(5) |
| 6 | Assessment question counts | Bitcoin 101: 8 questions; courses 02–08: 5 each. Total 43 assessment questions. | No. S2-OD-01 fixes one assessment per course and 2–3 questions per lesson, not assessment counts. | **Yes** | **8 / 5** | §10.1, §14.3(6) |
| 7 | Content reviewer | A qualified human must review technical correctness, ambiguity, distractor quality, and lesson alignment. Automated validation cannot judge semantics. | No | **Yes** | Owner must assign a reviewer | §10.5, §14.3(7) |
| 8 | Transaction use | Use a Mongoose transaction for attempt + XP event + achievement when XP is enabled; unique indexes remain the final guard. Fall back to idempotent writes if transaction support is operationally awkward. | No | **Yes** | **Transaction with idempotent fallback** | §7.5, §14.3(8) |
| 9 | Dashboard `resume` shape | Preserve the existing lesson resume object and add an assessment sibling, **or** introduce a typed action. The report does not choose one. | No | **Yes**, though the report says implementation may choose and must update client/tests consistently | **No single default specified** | §14.3(9) |
| 10 | Stale quiz handling | Quizzes no longer present in authored content become `status: "draft"`; never delete them, so attempt history survives. | No | **Yes** | **Draft, do not delete** | §7.6, §14.3(10) |
| 11 | Anonymous course-detail assessment display | Show assessment title/count and a sign-in CTA, but no learner status. Alternative: hide the assessment entirely from anonymous visitors. | No | **Yes** | **Show metadata + sign-in CTA** | §14.3(11) |
| 12 | Feedback in results | Include per-question feedback/explanations for the learner’s own submitted attempts so the results view can explain answers. | No | **Yes** | **Include for own attempts** | §6.4, §14.3(12) |
| 13 | Test DB and production seeding | Database tests may write only to `kaos_academy_test`; production seeding requires separate approval. | S2 implementation is authorized, but DB-write authorization is not explicit in the supplied context. | **Yes, operational confirmation** | Confirm exact test DB and separate production-seed approval | §12.5, §15.2, Appendix B |

## 3. Recommended defaults

These are **audit recommendations**, not silently applied requirements. The access-policy items are now owner-approved; the rest remain defaults unless the owner confirms them.

### XP — exact audit recommendation

| Event | XP | Event key | Award rule |
|---|---:|---|---|
| Lesson knowledge-check first pass | 10 | `lesson-check-pass:<quizSlug>` | First time the learner passes that lesson check |
| Course assessment first pass | 25 | `course-assessment-pass:<quizSlug>` | First time the learner passes that assessment |
| Course completion | 50 | `course-complete:<courseSlug>` | First time all published lessons are complete **and** the assessment is passed |

Rules from §8.4:

- Only the first pass awards XP. Retakes, replays, and duplicate submissions never double-award.
- The server computes the amount; the client never sends XP, score, correctness, or pass status.
- Total XP is the sum of the learner’s `XpEvent` records; no denormalized counter is required at S2 scale.
- Do **not** award XP merely for `POST /api/progress/lessons/:lessonId/complete`. That would reward a click rather than demonstrated understanding.
- If the owner wants a lesson-completion milestone, the report says to use an achievement with explicit approval and record the PRD trade-off.
- If XP/achievements are deferred under S2-OD-03, omit the fields or return zero/empty values consistently. The report does not mandate which.

### Achievements — exact audit recommendation

| Slug | Title | Criteria |
|---|---|---|
| `first-check` | First Check | Pass any lesson knowledge check |
| `first-assessment` | Assessment Passed | Pass any course assessment |
| `first-course` | Course Finisher | Complete any course under the S2-OD-02 rule |

Awarding is server-side and idempotent via the unique `{userId, achievementSlug}` index. The dashboard lists earned achievements and dates. No badge engine, leaderboard, streak, or points shop is added. The planning report’s illustrative “first lesson complete” achievement is intentionally not used because it rewards a completion click; using it would require separate approval and a PRD-fit note.

### Backfill and migration — exact audit recommendation

- **No retroactive XP or achievements** for S1 lesson completions.
- XP begins with S2 quiz passes.
- No data migration is required for existing progress. Course completion is computed from existing lesson progress plus new assessment attempts.
- There is no stored course-completion record to migrate.
- Existing users, progress, courses, and lessons must not be deleted by seeding.
- Seeding should upsert quizzes and achievements by stable slug, assert **30 quizzes** and **3 achievements**, and mark stale quizzes draft rather than delete them.
- If the owner expects existing S1 progress to produce XP or a “first lesson” achievement, a separate one-time backfill must be approved, idempotent, run only against the intended database, and documented.

### Question counts and passing scores — exact audit recommendation

- 22 lesson knowledge checks, each with **2–3 questions**.
- 8 course assessments: Bitcoin 101 with **8**, courses 02–08 with **5 each**.
- Lesson-check questions: **44–66**; assessment questions: **43**; total **87–109**.
- Passing score: **67** for lesson checks; **80** for course assessments.
- A 2-question lesson check therefore requires both correct; a 3-question check requires at least 2.
- Content validation range: lesson quizzes **2–3** questions; course assessments **5–8** questions.
- The exact 8/5 assessment distribution is a recommendation. S2-OD-01 only fixes one assessment per course and 2–3 questions per lesson.

### Transactions — exact audit recommendation and reasoning

**Observed:** The configured Atlas deployment is a replica set, reports MongoDB `8.0.36`, `maxWireVersion` 25, and a writable primary. It advertises transaction support. **No transaction was executed during the audit.**

**Recommendation:**

- Use a Mongoose session transaction for the new attempt + XP event + achievement award when XP is enabled, so a successful attempt and its reward remain consistent.
- Keep unique indexes as the final correctness guard.
- If the transaction fails, return a safe error; the client can retry the same `attemptKey`.
- For lesson completion, the existing progress write is already idempotent. Award course-completion rewards after the progress write and assessment check. If the reward write fails, progress remains correct and a later retry can repair the reward through the unique event key.
- Do not make S1 progress depend on the XP layer.
- Fallback if transactions prove unsuitable: attempt first, then `XpEvent` upsert, then `UserAchievement` upsert. This can leave a temporary missing reward after a crash but cannot create duplicate attempts or duplicate XP. Document the fallback if used.
- No new dependency is required for either approach.

### Other recommended defaults

- Public quiz DTO must exclude `correctOptionId`, `explanation`, score, pass flag, and XP before submission.
- `Cache-Control: private, no-store` on quiz GET, attempt POST, and results GET. `Vary: Cookie` is “consider,” not mandatory.
- Attempt limiter: suggested **30 attempts per 10 minutes per IP** in production; **1000** in test mode, following the existing auth limiter pattern.
- Results sorted newest first; a small cap such as **20** is acceptable, but the report does **not** mandate an exact cap. Document it if used.
- Strict attempt body: `attemptKey` UUID, max 64 chars; `answers` 1–50 items; exactly one answer per question; no duplicates, unknowns, or missing answers; unknown fields rejected.
- Quiz IDs: stable slug is primary; a 24-character ObjectId may also be accepted for consistency with existing course/lesson helpers.
- No new dependencies, no new environment variables, and no `docs/` directory; `OD-001` remains open.

## 4. Implementation sequence

From §15.1, with the Phase 0 authorization now supplied by the owner:

1. **Phase 0 — Authorization and confirmations.** Owner authorization is now present. The §14.3 confirmations and DB-write/production-seed approvals remain.
2. **Phase 1 — Content schema and Bitcoin 101.** Add quiz/achievement types and helpers; add validation and coverage assertions; author Bitcoin 101’s 8 lesson checks and 8-question assessment; run unit/content tests; do not seed production.
3. **Phase 2 — Server quiz core.** Add models/indexes, pure scoring/DTO library, quiz routes with preview access, auth, validation, idempotency, rate limit, safe errors; add unit and DB integration tests for Bitcoin 101.
4. **Phase 3 — Server integration.** Extend lesson/course/dashboard/progress responses; implement assessment-aware completion and resume; preserve S1 progress idempotency/ownership; add regression tests.
5. **Phase 4 — Client core.** Add quiz types/hooks, reusable quiz component, standalone quiz page, inline lesson check, course assessment card, dashboard status; manually verify anonymous and authenticated flows.
6. **Phase 5 — Bitcoin 101 end-to-end gate.** Seed the test database; run the full Bitcoin 101 journey; verify no answer-key leakage and no duplicate attempt/XP; only then expand content.
7. **Phase 6 — Remaining content.** Author courses 02–08 checks and assessments; validate 22 + 8 coverage; review and sign off each course; rerun tests/manual checks.
8. **Phase 7 — XP and achievements.** Add ledger/achievement seeding and award logic, dashboard display, idempotency tests. If this threatens P0, stop and report deferral under S2-OD-03.
9. **Phase 8 — Final verification.** Run `npm test`, `npm run typecheck`, and the opt-in DB suite; perform accessibility/mobile and S1 regression checks; update the S2 implementation report with exact commands/results.

## 5. File change map

### 5.1 New files

**Server**

- `server/src/models/Quiz.ts`
- `server/src/models/QuizAttempt.ts`
- `server/src/models/XpEvent.ts`
- `server/src/models/Achievement.ts`
- `server/src/models/UserAchievement.ts`
- `server/src/lib/quiz.ts` — pure scoring, canonicalization, public/feedback DTOs
- `server/src/lib/rewards.ts` — XP/achievement helpers, course-completion reward evaluation
- `server/src/schemas/quiz.ts` — strict Zod attempt schema and route-param helpers
- `server/src/routes/quizzes.ts` — GET/POST/results, preview access, idempotency, rate limiter
- `server/src/content/quizzes/index.ts` — aggregates per-course quiz files
- `server/src/content/quizzes/01-bitcoin-101.ts`
- `server/src/content/quizzes/02-money-and-bitcoin.ts`
- `server/src/content/quizzes/03-how-bitcoin-works.ts`
- `server/src/content/quizzes/04-bitcoin-wallets.ts`
- `server/src/content/quizzes/05-using-bitcoin.ts`
- `server/src/content/quizzes/06-lightning-network.ts`
- `server/src/content/quizzes/07-staying-safe.ts`
- `server/src/content/quizzes/08-beyond-bitcoin.ts`
- `server/src/content/achievements.ts`
- `server/test/quiz.test.ts`

**Client**

- `client/src/components/Quiz.tsx`
- `client/src/pages/Quiz.tsx`

### 5.2 Modified files

**Server**

- `server/src/app.ts` — mount `/api/quizzes`; preserve middleware order.
- `server/src/db.ts` — add new models to `ensureIndexes()`.
- `server/src/content/types.ts` — add quiz/achievement seed types and helpers.
- `server/src/content/index.ts` — import/export quizzes; extend `validateContent()` with quiz coverage/reference/structure checks.
- `server/src/seed/seedContent.ts` — upsert quizzes/achievements; assert 30/3; mark stale quizzes draft; extend `SeedResult`.
- `server/src/routes/lessons.ts` — attach quiz summary to lesson detail.
- `server/src/routes/courses.ts` — attach assessment summary and `complete`; use assessment-aware predicate.
- `server/src/routes/dashboard.ts` — assessment status, course completion count, XP/achievements, assessment-aware resume, improved `isNewLearner`.
- `server/src/routes/progress.ts` — after lesson completion, evaluate course-completion rewards; preserve idempotent progress behavior.
- `server/src/lib/progress.ts` — add `isCourseComplete` and next-action helper; keep existing summaries compatible.
- `server/test/content.test.ts` — quiz validation/coverage assertions.
- `server/test/db.integration.test.ts` — quiz/XP/achievement flows; extend teardown; preserve exact guard.
- `server/test/http.test.ts` — optional DB-unavailable quiz-route assertions.

**Client**

- `client/src/App.tsx` — add public `/quizzes/:slug` route; do not wrap in `ProtectedRoute`; page handles 401/404/503.
- `client/src/lib/types.ts` — quiz/question/option/attempt/feedback/results/assessment/XP/achievement types.
- `client/src/lib/queries.ts` — `useQuiz`, `useQuizResults`, `useSubmitQuizAttempt`; invalidation.
- `client/src/pages/Lesson.tsx` — inline quiz after body, before completion panel; anonymous preview behavior.
- `client/src/pages/CourseDetail.tsx` — assessment card/status; replace “Course complete” with `complete`; assessment-aware action.
- `client/src/pages/Dashboard.tsx` — assessment status, completion count, XP/achievements, assessment-aware resume.

### 5.3 Explicitly unchanged

- `PRD.md`, `PRD-ORIGINAL.txt`, `PRD.txt`, `PRD-SHA256.txt`, `PRD-MD-SHA256.txt`.
- `AGENTS.md`, `ENGINEERING-DECISIONS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `IMPLEMENTATION-PLAN.md`, `TEST-REPORT.md`.
- Existing reports under `reports/`.
- `package.json` files, lockfiles, `tsconfig.json` files, `vite.config.ts`.
- `server/src/config.ts`, `index.ts`, `logger.ts`, `errors.ts`.
- `server/src/middleware/auth.ts`, `errors.ts`, `origin.ts`, `validate.ts` unless a small helper is justified.
- `server/src/lib/http.ts`, `password.ts`.
- Existing `User`, `Course`, `Lesson`, `Progress` schemas; no schema changes required for S2.
- `server/src/routes/auth.ts`.
- `client/src/components/Layout.tsx`, `ProgressBar.tsx`, `ProtectedRoute.tsx`, `SectionRenderer.tsx`.
- `client/src/pages/Home.tsx`, `Catalogue.tsx`, `Login.tsx`, `Register.tsx`, `NotFound.tsx`.
- `client/src/index.css`, `client/src/lib/api.ts`, `client/src/lib/config.ts`.
- `.gitignore`.

No dependency or configuration changes. Reuse `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, and existing config. Do not create `docs/`; `OD-001` remains open.

### 5.4 API contract recommendations

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/quizzes/:quizId` | `requireDb` only; public only for published preview lesson quiz; auth otherwise | Questions/options only; never answers/explanations |
| POST | `/api/quizzes/:quizId/attempts` | `requireDb`, `requireAuth`, rate-limited | Validate, score, persist idempotent attempt, return feedback/rewards |
| GET | `/api/quizzes/:quizId/results` | `requireDb`, `requireAuth` | Session user’s attempts and best result only |

**GET rules**

- Authenticated users may read any published quiz attached to published content.
- Anonymous users may read only a published `kind: "lesson"` quiz whose lesson is the published preview lesson and whose course is published.
- Anonymous non-preview: `401 UNAUTHORIZED`.
- Missing, draft, orphaned, draft-lesson, or draft-course quiz: `404 NOT_FOUND`.
- Public DTO: `{ slug, kind, courseSlug, lessonSlug, title, passingScore, questionCount, version, questions: [{ id, prompt, scenario?, options: [{ id, text }] }] }`.
- Also return `viewer.authenticated` and `attemptSummary` (`null` for anonymous, or `{ attempts, bestPercent, passed, lastAttemptAt }` for the session user).
- Do not return `correctOptionId`, `explanation`, score, pass flag, or XP before submission.
- Anonymous preview must not query `QuizAttempt` at all.
- `Cache-Control: private, no-store`.

**POST rules**

Request: `{ attemptKey, answers: [{ questionId, optionId }] }`.

- `attemptKey`: required, UUID, max 64 chars.
- `answers`: 1–50, exactly one per quiz question, no duplicate/unknown/missing answers.
- Strict schema: reject or ignore `userId`, `score`, `correct`, `passed`, `xp`; never trust them.
- Canonicalize answers into quiz question order before scoring/persistence.
- New attempt: `201`; replay: `200` with `replayed: true`; same key + different canonical answers: `409 ATTEMPT_KEY_REUSED`.
- Response includes attempt key, replay flag, quiz slug, score/total/percent/passed, feedback, and optional `xpAwarded`/`totalXp`/`achievementsAwarded`.
- Feedback includes `questionId`, `selectedOptionId`, `correctOptionId`, `correct`, `explanation` only after scoring.
- If XP is deferred, omit reward fields or return consistent zero/empty values.
- `Cache-Control: private, no-store`.

**GET results rules**

- Only the session user’s attempts; sorted newest first.
- Returns `quizSlug`, `passed`, `bestPercent`, and attempts with score/total/percent/passed/completedAt/feedback.
- Feedback is allowed only because the attempts were already submitted.
- If the quiz is unpublished, return `404`; do not expose old attempts through this endpoint.
- A cap such as 20 is acceptable; the report does not mandate an exact cap.

**Error codes**

`400 VALIDATION_ERROR`; `401 UNAUTHORIZED`; `403 ORIGIN_NOT_ALLOWED`; `404 NOT_FOUND`; `409 ATTEMPT_KEY_REUSED`; `413` payload too large; `415 UNSUPPORTED_MEDIA_TYPE`; `429 RATE_LIMITED`; `503 DB_UNAVAILABLE`; `500 INTERNAL_ERROR`.

**Idempotency algorithm**

1. Validate route, session, quiz publication, payload.
2. Score canonical answers with the pure scoring function.
3. Look up `{userId, quizId, attemptKey}`.
4. If found: identical answers → stored result with `replayed: true`; different answers → `409`; never score again or award XP again.
5. If absent, create the attempt; unique index is the final guard.
6. On duplicate-key `11000`, fetch the original: same answers → `200` replay; different → `409`.
7. Award XP/achievements idempotently using unique event keys.
8. If XP is deferred, the attempt still persists and scoring/feedback still work.

**Existing response extensions**

- Lesson detail: add `quiz: { slug, title, questionCount, passingScore, attempts, bestPercent, passed }`; anonymous preview learner-specific fields should be `null` or omitted. Questions are fetched separately, not embedded.
- Course detail: add `complete` and `assessment: { slug, title, questionCount, passingScore, attempts, bestPercent, passed, requiredForCompletion }`; anonymous learner fields `null`.
- Dashboard: add `overall.coursesComplete`/`coursesTotal`, per-course `complete`/`assessment`, optional `xp`, `achievements`, and assessment-aware `resume`. Keep S1 lesson fields where possible.

### 5.5 Data model recommendations

Use explicit collection names: `quizzes`, `quiz_attempts`, `xp_events`, `achievements`, `user_achievements`.

**Quiz**

Fields: `slug` unique; `kind: "lesson" | "course"`; `courseSlug`; optional `lessonSlug` required for lesson quizzes; `title`; `passingScore` 1–100; `status: "published" | "draft"`; `version` starting at 1; `questions: [{ id, prompt, scenario?, explanation, options: [{ id, text }], correctOptionId }]`; timestamps.

Indexes: unique `{slug}`; `{kind, courseSlug}`; `{lessonSlug}`; `{status, kind}`.

**QuizAttempt**

Fields: `userId`, `quizId`, `quizSlug`, `quizVersion`, `courseSlug`, optional `lessonSlug`, `attemptKey`, canonical `answers: [{ questionId, selectedOptionId, correct }]`, `feedback` snapshot, `score`, `total`, `percent`, `passed`, `completedAt`, timestamps.

Indexes: unique `{userId, quizId, attemptKey}`; `{userId, quizSlug, completedAt: -1}`; `{userId, courseSlug, completedAt: -1}`.

**XpEvent**

Fields: `userId`, `eventKey`, `amount`, `source: "lesson_check_pass" | "course_assessment_pass" | "course_complete"`, `sourceId`, `createdAt`.

Indexes: unique `{userId, eventKey}`; `{userId, createdAt: -1}`.

**Achievement**

Fields: `slug`, `title`, `description`, `order`, `status`, `timestamps`; unique `{slug}`.

**UserAchievement**

Fields: `userId`, `achievementSlug`, `earnedAt`; unique `{userId, achievementSlug}`; `{userId, earnedAt: -1}`.

**Completion predicate**

`isCourseComplete(totalPublishedLessons, completedPublishedLessons, assessmentPassed) = totalPublishedLessons > 0 && completedPublishedLessons === totalPublishedLessons && assessmentPassed === true`.

`assessmentPassed` means at least one course-assessment `QuizAttempt` with `passed: true` for the session user.

The predicate must be used by course detail, dashboard, progress detail if it returns completion, lesson-completion reward evaluation, and assessment-pass reward evaluation. Course completion can occur lessons-first or assessment-first; `evaluateCourseCompletion(userId, courseSlug)` must check both after either action and be idempotent/concurrency-safe.

### 5.6 Security and idempotency requirements

- `req.session.userId` is the only identity source for attempts, results, XP, and achievements. No client user id is accepted.
- Strict attempt schema rejects/ignores forged score, pass, correctness, XP, and user id.
- Anonymous POST/results return 401; no anonymous write path.
- Anonymous preview GET must not create a session, write progress, write an attempt, or query learner-specific collections; `attemptSummary` is `null`.
- Never return raw Mongoose quiz documents; use the public DTO. Tests must scan GET JSON for `correctOptionId` and `explanation`.
- Results queries are scoped by `userId` and `quizId`; two-user isolation test required.
- Unique `{userId, quizId, attemptKey}` and duplicate-key handling prevent duplicate attempts; unique `{userId, eventKey}` and `{userId, achievementSlug}` prevent duplicate rewards.
- Existing `originGuard`, JSON-only mutation rule, SameSite session, 32 KB body limit, central error handler, and rate limiter remain in force.
- Do not log request bodies or answer keys. Safe errors must not reveal answers, stack traces, or database text.
- `Cache-Control: private, no-store` on GET/POST/results. Do not cache learner data in a service worker; S2 adds no PWA/service worker.

## 6. Testing and acceptance requirements

No S2 test has been run. The audit observed only the S1 baseline: `npm test` 28 passed / 0 failed, DB suite skipped by its opt-in guard; `npm run typecheck` passed for server and client.

### Unit tests — new `server/test/quiz.test.ts`

- `scoreQuiz`: all correct, all wrong, mixed.
- Exact pass boundary: 80% passes, 79% fails.
- One-question and multi-question quizzes.
- Duplicate question IDs, unknown question, unknown option, missing answer, extra answer.
- Zero-question guard.
- `isCourseComplete`: both conditions true; all lessons but no assessment; assessment but incomplete lessons; zero lessons; assessment-first then last lesson.
- XP event-key construction and idempotency helpers.
- Public DTO excludes `correctOptionId` and `explanation`.

### Content tests — extend `server/test/content.test.ts`

- 22 lesson quizzes and 8 course assessments.
- 2–3 questions per lesson quiz; 5–8 per course assessment.
- Unique quiz slugs, question IDs, option IDs.
- Every correct option exists; every explanation non-empty.
- Every lesson/course reference exists and matches.
- Duplicate/orphan/wrong-kind cases fail validation.
- Existing 8-course/22-lesson/1-preview assertions remain.

### Database integration tests — extend `server/test/db.integration.test.ts`

1. Seeding twice is idempotent; 30 quizzes and 3 achievements exist; indexes exist.
2. Anonymous preview lesson quiz GET: 200, questions/options only, `attemptSummary: null`, no answer key.
3. Anonymous non-preview GET: 401; draft quiz: 404; orphan quiz: 404.
4. Anonymous POST: 401 and no attempt created.
5. Authenticated GET: quiz plus own attempt summary.
6. Valid POST: one attempt, correct score/feedback, persisted.
7. Same key + same answers: 200 replay, no second attempt/XP.
8. Same key + different answers: 409, no second attempt/XP.
9. Concurrent same-key submissions: one attempt, no duplicate XP.
10. Learner B cannot see learner A’s attempts/results.
11. Invalid payloads return 400: missing/duplicate answer, unknown question/option, extra `userId`/`score`.
12. Course completion: lessons-only false; assessment-only false; both true; course detail/dashboard agree.
13. XP/achievements: first lesson-check pass = 10 XP + `first-check`; repeat = nothing; first assessment pass = 25 XP + `first-assessment`; course completion = 50 XP + `first-course`; duplicates/concurrency do not double-award.
14. Existing S1 flows still pass: registration, login, catalogue, preview, lesson-completion idempotency, dashboard.
15. Quiz routes return 503 when DB unavailable.
16. Quiz GET/results/POST carry `Cache-Control: private, no-store`.

### Manual UI verification

No client component-test framework exists, and S2-OD-06 forbids adding one. Record viewport, browser, and steps for:

- Anonymous preview: questions visible, submit disabled, sign-in CTA, no POST in network panel.
- Authenticated lesson check: submit, score/pass/feedback, retry, keyboard-only.
- Course assessment: passing score and gating statement visible; pass/fail; results/retry.
- Course detail: all lessons complete but assessment pending does **not** show “Course complete”; assessment link appears.
- Dashboard: assessment status, completion count, resume assessment when appropriate, XP/achievements when enabled.
- 360 px: no horizontal scroll; readable prompts/options; adequate touch targets.
- Screen reader/live region: score/feedback announced; focus moves to result.
- Error states: 401, 404, 503, validation error, rate limit.
- S1 regression: home, catalogue, course detail, lesson completion, login/register/logout.
- AC-003 remains an outstanding S1 mobile-evidence item; S2 must not claim it satisfied unless the responsive test is actually performed.

### Acceptance mapping

- AC-005: DB integration test that POST creates an attempt and returns feedback.
- AC-006: unit tests for exact scoring, pass boundary, invalid inputs; integration test for persisted score.
- AC-007: existing S1 integration test still passes, plus regression assertion after S2 changes.
- FR-005: routes, UI, tests.
- FR-012: DB tests for ledger/awards if XP is implemented.
- S2-OD-02: unit predicate + integration tests + manual UI check.
- S2-OD-04: access-matrix tests + manual anonymous check.
- S2-OD-05: same-key, different-answer, concurrent tests.
- PRD §25: DB integration tests with teardown.

### Commands and evidence rules

- `npm test` for non-DB suite.
- `npm run typecheck` for both packages.
- `RUN_DB_TESTS=1 npm test` for Atlas suite, only after DB-write authorization.
- DB target must be exactly `kaos_academy_test`; do not run against `kaos_academy`.
- Do not claim DB tests passed unless they actually ran and output is recorded. A skipped test is skipped, not passed.

### Teardown requirements

Preserve the existing fail-closed guard requiring the connected database name to be exactly `kaos_academy_test`. Use collection `deleteMany`, not `dropDatabase`. Delete in this order:

1. `user_achievements`
2. `xp_events`
3. `quiz_attempts`
4. `achievements`
5. `quizzes`
6. `progresses`
7. `sessions`
8. `users`
9. `courses`
10. `lessons`

If a collection does not exist yet, `deleteMany` on the registered Mongoose model collection is still safe.

### S1 behavior that must not regress

- Registration, login, logout, catalogue, preview access, lesson completion, and dashboard.
- `POST /api/progress/lessons/:lessonId/complete` remains idempotent: 200 when already completed, 201 when newly created; `$setOnInsert`; duplicate-key race treated as already completed; returns summary.
- Lesson completion remains independent of quiz completion, per S2-OD-02.
- `GET /api/lessons/:lessonId` remains public for the preview lesson and 401 for non-preview lessons.
- Existing S1 response fields should remain where possible to limit client churn.
- Dashboard recent lesson activity should not be removed; quiz/achievement activity may be added.
- The deliberate changes are course/dashboard completion semantics, resume priority, and `isNewLearner`; these must be updated consistently, not treated as regressions.
- AC-007 must still hold: progress updates after lesson completion.

## 7. Risks and unresolved issues

### Main risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Content authoring volume | 87–109 questions; report gives an illustrative 15–27 hours, not a measured commitment | Start Bitcoin 101; review checklist; use a small fixture so server integration is not blocked |
| Technical ambiguity | A scenario may have two defensible answers | Human review against lesson text; remove ambiguity rather than rely on explanations |
| S1 completion regression | Current UI equates “no next lesson” with course complete | Unit predicate tests, DB integration tests, manual course/dashboard checks |
| Answer-key leakage | Raw quiz docs contain correct options/explanations | Explicit public DTO; JSON scan tests; code review |
| Cross-user exposure | Attempts/results are sensitive | Session-scoped queries; two-user integration test |
| Idempotency race | Duplicate attempt/XP under retries/concurrency | Unique indexes, duplicate-key handling, concurrent test |
| XP delays P0 | Gamification is optional and deferrable | Implement after core; defer under S2-OD-03 if needed |
| Teardown breaks with new collections | DB suite could leave data or fail cleanup | Preserve exact guard; delete new collections in safe order |
| No client test framework | UI regressions may be missed | Manual browser checks; do not add a dependency |
| Transaction complexity | Transactions may add operational friction | Unique indexes as primary guarantee; documented idempotent fallback |
| Cache mixes learner data | Same URL varies by session | `private, no-store`; tests |
| Stale quiz remains published | Removed content could still be served | Seeder marks missing slugs draft; never delete attempts |
| In-memory rate limiter | Per-instance, resets on restart | Accept for single-instance hackathon; document limitation |
| AC-003 mobile evidence | S1 mobile acceptance is still outstanding | Perform S2 mobile checks, but do not claim AC-003 satisfied unless tested |

### Conflict status

- **C-01:** Planning report §7.4 line 857 requires `requireAuth` on all quiz routes; S2-OD-04 requires anonymous preview-question retrieval. **Resolved by owner policy:** `requireDb` only on GET; handler-level preview eligibility; `requireAuth` on POST/results. Do not edit the planning report; record the resolved contract in the implementation report, code, and tests.
- **C-02:** PRD Module D requires gamification to reward demonstrated understanding, not time spent. **Recommendation:** XP only for lesson-check pass, assessment pass, and course completion; no completion-click XP.
- **C-03:** PRD §10’s logical `Quiz.lessonId` versus course assessments. **Not a PRD conflict:** PRD says exact schemas are finalized during implementation; use `kind`, `courseSlug`, optional `lessonSlug`.
- **C-04:** “Achievement badges” versus three minimal achievements. **Owner-approved scope simplification.**
- **C-05:** S1 UI’s lesson-only completion versus S2-OD-02. **Approved behavior change;** no stored completion record to migrate.
- **C-06:** Dashboard `resume`/`isNewLearner` assume lessons only. **Derived regression risk;** update resume priority and include quiz attempts in new-learner status.

### What the report does not specify

- A single dashboard `resume` shape; it offers two alternatives and says implementation should choose.
- An exact results cap; it only gives “for example 20.”
- The identity of the content reviewer; the owner must assign one.
- Final XP amounts, achievement definitions, assessment counts, backfill policy, assessment gate, transaction preference, stale-quiz policy, anonymous course-detail display, and results-feedback policy; these are recommendations pending confirmation.
- Exact wording of quiz content; content is to be authored and reviewed.
- Exact XP display design or achievement badge visuals.
- Whether deferred XP fields should be omitted or returned as zero/empty; the report says either is acceptable if consistent.
- A production-seed authorization; this remains separate.
- AC-003 mobile acceptance; it remains an S1 evidence gap.

### Current evidence state

- Audit was read-only; no application code, tests, manifests, lockfiles, config, secrets, DB contents, PRD, existing reports, or `.gitignore` were modified.
- No S2 implementation, DB tests, transactions, seeding, builds, browser tests, or deployments were performed.
- S1 baseline observed: 28 tests passed, 0 failed; DB suite skipped by opt-in guard; typecheck passed for server and client.
- Atlas metadata observed as transaction-capable, but no transaction executed.
- Existing data counts observed: `users` 1, `courses` 8, `lessons` 22, `progresses` 2, `sessions` 1; quiz/XP/achievement records zero.

## 8. Exact questions that still need the owner’s answer

These are listed for extraction; I am not asking for answers in this task.

1. **XP amounts and sources:** Confirm **10 / 25 / 50** for lesson-check first pass, assessment first pass, and course completion, with **no XP for marking a lesson complete**? S2-OD-03 requires XP but does not fix amounts.
2. **Achievement definitions:** Confirm `first-check`, `first-assessment`, and `first-course` with the stated criteria, or replace one with the planning report’s “first lesson complete” milestone?
3. **Backfill:** Confirm **no retroactive XP/achievements** for existing S1 progress, or authorize a separate one-time, idempotent backfill script?
4. **Assessment access gate:** May a signed-in learner attempt a course assessment before finishing all lessons, or must all lessons be complete first? S2-OD-02 fixes completion, not the attempt gate.
5. **Assessment counts:** Confirm **Bitcoin 101 = 8** and **courses 02–08 = 5 each**? S2-OD-01 only fixes one assessment per course and 2–3 questions per lesson.
6. **Content reviewer:** Who is the qualified human reviewer for technical correctness, ambiguity, distractors, and lesson alignment?
7. **Transactions:** Use a transaction for attempt + reward with an idempotent fallback, or use idempotent writes only?
8. **Dashboard resume shape:** Preserve the existing lesson resume object and add an assessment sibling, or introduce a typed action? The report does not choose.
9. **Stale quizzes:** Confirm marking un-authored quizzes `draft` and never deleting them, or specify another retirement policy?
10. **Anonymous course-detail assessment display:** Show assessment title/count plus a sign-in CTA without learner status, or hide the assessment entirely from anonymous visitors?
11. **Feedback in results:** Include per-question feedback/explanations for the learner’s own submitted attempts, or keep results summary-only?
12. **Test database writes:** Authorize database tests to write only to `kaos_academy_test`? This is required before `RUN_DB_TESTS=1 npm test`.
13. **Production seeding:** Confirm that seeding the production database requires separate explicit approval after content review and test-database verification?

No files were changed, no implementation was started, and no S2 test result is claimed.
