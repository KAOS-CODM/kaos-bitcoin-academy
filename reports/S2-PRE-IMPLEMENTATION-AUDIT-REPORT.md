# S2 Pre-Implementation Audit Report

Project: KAOS Bitcoin Academy  
Phase: S2 pre-implementation audit  
Date: November 1, 2026  
Auditor: OpenCode read-only audit session  
Status: Audit complete. S2 has not been implemented. No application, test, manifest, lockfile, configuration, database, PRD, or existing report was modified.

## Evidence rules used in this report

This report separates four kinds of statement:

- **Observed**: directly seen in the repository, in a command output, or in read-only database metadata.
- **Derived**: a conclusion that follows directly from observed code or documents.
- **Recommendation**: a proposed implementation choice for owner review.
- **Unresolved**: a question that the owner or a later implementation task must settle.

`PRD.md` remains the sole authoritative product document. `reports/S2-PLANNING-AND-ROADMAP-REPORT.md` is the planning authority for S2 except where the owner's explicit S2 decisions supersede it. This audit does not edit either document.

---

## 1. Executive summary

**Observed:** S1 is a working, coherent baseline. The repository is on branch `main`, has 97 tracked files, no staged changes, no remote, and one untracked file: the S2 planning report. The S1 test suite reports 28 passing tests and 0 failures; the database-backed suite is skipped by its opt-in guard. The workspace typecheck passes for both server and client.

**Observed:** The current application has no quiz model, quiz content, quiz route, quiz client page, XP ledger, achievement model, or course-assessment concept. Course completion is currently inferred from lesson progress alone: the client treats `nextLessonSlug === null` as "Course complete". S2 must therefore add both assessment capability and a new completion predicate.

**Derived:** S2 can be built on the existing Express, Mongoose, Zod, React, React Query, and Tailwind stack without a new dependency. The required work is additive except for deliberate changes to course-completion and dashboard behavior approved in S2-OD-02.

**Observed:** The configured Atlas deployment is a replica set (cluster name withheld), reports MongoDB `8.0.36`, `maxWireVersion` 25, and a writable primary. The deployment therefore advertises transaction support. No transaction was executed during this audit.

**Observed:** Read-only collection counts in the configured database were: `users` 1, `courses` 8, `lessons` 22, `progresses` 2, `sessions` 1, and zero records in every quiz/XP/achievement collection. No personal data was read or reported.

**Derived:** There is one material contract conflict. The S2 planning report says `requireDb` and `requireAuth` must apply to **all** quiz routes (§7.4 item 7, line 857). The owner-approved S2-OD-04 says anonymous visitors may read the preview lesson and see its questions. Both cannot be true if `requireAuth` is mounted on `GET /api/quizzes/:quizId`.

**Recommendation:** Resolve the conflict by keeping only the public, published preview-lesson quiz readable without a session. Apply `requireDb` to all quiz routes; apply `requireAuth` to `POST /attempts` and `GET /results`; on `GET /:quizId`, enforce preview eligibility inside the handler. Draft or orphaned quizzes return 404. A published non-preview quiz requested anonymously returns 401. No anonymous attempt or progress is ever written.

**Derived:** The rest of the S2 architecture is implementable. The main risks are content-authoring volume, the S1 completion-semantics change, and unspecified XP amounts/achievement criteria. The proposed XP design rewards demonstrated understanding (quiz passes and course completion), not the act of pressing "Mark as complete", to respect PRD Module D.

**Verdict:** S2 is ready for an implementation decision. There is no architectural blocker. Implementation should not begin until the owner explicitly authorizes it and confirms the preview-GET contract and the XP/achievement defaults recorded in §14. The core P0 assessment work can proceed independently of the optional XP layer.

---

## 2. Actual repository, environment, and evidence state

### 2.1 Git and worktree

**Observed** on November 1, 2026:

```text
## main
?? reports/S2-PLANNING-AND-ROADMAP-REPORT.md
```

- Branch: `main`.
- No staged changes.
- No modified tracked files.
- No remote configured (`git remote -v` produced no output).
- Recent commits:
  - `41d37e7 docs: add pre-S2 Git initialization report`
  - `e7673e8 chore: expand gitignore for local artifacts`
  - `9512f9c chore: establish S1 project baseline`
- Tracked file count: 97.
- The S2 planning report is intentionally untracked at audit time.
- The audit report did not exist in the repository or the shared-storage destination before this report was created.

### 2.2 Document integrity

**Observed:**

- `PRD.md` SHA-256: `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`.
- `PRD-ORIGINAL.txt` SHA-256: `7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed`.
- `PRD-MD-SHA256.txt` records the same `PRD.md` hash and explains the one authorized appended "Final authority" section.
- `PRD.md` is 28,170 bytes; `PRD-ORIGINAL.txt` is 28,031 bytes.
- `ENGINEERING-DECISIONS.md` contains only `OD-001`, status **Open**, concerning a proposed `docs/` structure. It does not block S2.
- `ARCHITECTURE.md`, `CHANGELOG.md`, `IMPLEMENTATION-PLAN.md`, and `TEST-REPORT.md` are currently empty.

### 2.3 Commands actually run during this audit

**Observed:**

| Command | Result |
| --- | --- |
| `npm test` | 28 tests passed, 0 failed, 0 cancelled, 0 todo. The database-backed suite was skipped by its opt-in guard. |
| `npm run typecheck` | Passed for both `server` and `client`. |
| Read-only Atlas `hello` / `buildInfo` | Replica set (name withheld); writable primary; MongoDB `8.0.36`; `maxWireVersion` 25; logical session timeout 30 minutes. |
| Read-only collection counts | `users` 1, `courses` 8, `lessons` 22, `progresses` 2, `sessions` 1; quiz/XP/achievement collections absent or empty. |

**Not run during this audit:**

- `RUN_DB_TESTS=1 npm test`.
- Any transaction.
- Any seed or write operation.
- Any build that regenerates `dist/`.
- Any browser or mobile-device test.

No database test, transaction, browser test, or deployment is claimed as passed.

### 2.4 Environment

**Observed:** Node `v26.4.0`, npm `11.20.0`. The server requires Node `>=20`. The server is TypeScript with `NodeNext` modules; the client is React 19 with Vite and strict TypeScript. The server test command is `NODE_ENV=test node --import tsx --test test/*.test.ts`.

**Observed:** `server/.env` exists and is ignored by Git. Only its key names were inspected; no values are reproduced here. `server/.env.example` documents `NODE_ENV`, `PORT`, `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `APP_ORIGIN`, and `LOG_LEVEL`.

---

## 3. S1 baseline relevant to S2

### 3.1 Application shape

**Observed:**

- Single-origin Express application: `/api/*` JSON routes, then static `client/dist`, then SPA fallback for non-API GETs.
- Session authentication via `express-session` and `connect-mongo`; cookie is `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- `helmet` with a production CSP; `pino-http` request logging; 32 KB JSON body limit.
- CSRF-oriented `originGuard` on mutating methods: JSON content type for non-empty bodies, same-host or configured origin allowed.
- Central error handler returns `{ error: { code, message, details? } }` and does not expose stack traces.
- `requireDb` returns a controlled `503 DB_UNAVAILABLE` when Mongoose is not connected.
- `requireAuth` returns `401 UNAUTHORIZED` when `req.session.userId` is absent.

### 3.2 Existing data models and indexes

**Observed:**

| Model | Collection | Relevant fields | Indexes |
| --- | --- | --- | --- |
| `User` | `users` | `email`, `passwordHash` (`select:false`), `displayName`, timestamps | unique `users_email_unique` on `email` |
| `Course` | `courses` | `slug`, `title`, `description`, `level`, `order`, `status`, `estimatedMinutes`, embedded `modules` | unique `courses_slug_unique`; `courses_status_order` |
| `Lesson` | `lessons` | `slug`, `courseSlug`, `moduleSlug`, `title`, `summary`, `order`, `minutes`, `status`, `isPreview`, `objectives`, `sections` | unique `lessons_slug_unique`; `lessons_course_order`; `lessons_status_course`; partial unique `lessons_single_preview` |
| `Progress` | `progresses` | `userId`, `lessonSlug`, `courseSlug`, `completedAt`, timestamps | unique `progress_user_lesson_unique` on `{userId, lessonSlug}`; `progress_user_course`; `userId` index |
| Session store | `sessions` | connect-mongo managed | TTL index managed by connect-mongo |

**Observed:** `ensureIndexes()` calls `createIndexes()` for the four application models. It never calls `syncIndexes()` or drops indexes. New S2 models must be added there.

### 3.3 Existing API surface

**Observed:**

| Method | Route | Access | S2 relevance |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Unchanged. |
| POST | `/api/auth/register` | Public, DB, rate-limited | Unchanged. |
| POST | `/api/auth/login` | Public, DB, rate-limited | Unchanged. |
| POST | `/api/auth/logout` | Public/session | Unchanged. |
| GET | `/api/auth/me` | Public/session | Unchanged. |
| GET | `/api/courses` | Public, DB | Must add course assessment/completion summary. |
| GET | `/api/courses/:courseId` | Public, DB | Must add assessment summary and `complete`. |
| GET | `/api/courses/:courseId/lessons` | Public, DB | May remain lesson-only, or add quiz identifiers. |
| GET | `/api/lessons/:lessonId` | Public for preview; 401 otherwise | Must add inline quiz summary. |
| GET | `/api/progress` | Auth, DB | Unchanged except possible XP/course-completion additions. |
| GET | `/api/progress/:courseId` | Auth, DB | Must reflect assessment-aware completion if returned. |
| POST | `/api/progress/lessons/:lessonId/complete` | Auth, DB | Must remain idempotent; may evaluate course completion rewards. |
| GET | `/api/dashboard` | Auth, DB | Must add assessment, XP, achievements, and assessment-aware resume. |

**Observed:** There are no `/api/quizzes/*` routes, no `quizzes` router mounted in `app.ts`, and no quiz models.

### 3.4 Existing progress behavior

**Observed:**

- `POST /api/progress/lessons/:lessonId/complete` finds a published lesson by slug or ObjectId.
- It checks for an existing `{userId, lessonSlug}` record.
- If absent, it upserts with `$setOnInsert`; a duplicate-key race is treated as already completed.
- It returns `200` when the record already existed and `201` when newly created.
- It returns a `summary` from `summarizeCourse`.
- Ownership is enforced by the session-scoped `userId`; no client user id is trusted.
- Lesson completion is independent of any quiz. S2-OD-02 preserves that independence.

**Observed:** `summarizeCourse` returns `{ totalLessons, completedLessons, percent, nextLessonSlug }`. `summarizeOverall` aggregates lesson counts. Neither knows about assessments.

### 3.5 Existing course and dashboard completion behavior

**Observed:**

- `CourseDetail.tsx` shows "Course complete" when `progress.nextLessonSlug` is null, regardless of assessment.
- `Dashboard.tsx` shows "Complete" for a course when `course.nextLesson` is null, regardless of assessment.
- Dashboard `resume` selects the first course with a next lesson. If none exists, it shows "Every published lesson is complete."
- `isNewLearner` is `records.length === 0`, based only on lesson progress.

**Derived:** Under S2-OD-02, these three UI statements become incorrect for a learner who has completed all lessons but has not passed the course assessment. They must be changed to use the assessment-aware completion predicate. No stored course-completion record exists, so the change is computed, not migrated.

### 3.6 Existing content baseline

**Observed:**

- 8 courses: `01-bitcoin-101` through `08-beyond-bitcoin`.
- 22 lessons: Bitcoin 101 has 8 lessons across 4 modules; courses 02–08 each have 2 lessons in one module.
- Exactly one preview lesson: `btc101-what-is-bitcoin`.
- Content is authored in TypeScript under `server/src/content/courses/`.
- `validateContent()` checks duplicate course/lesson slugs, course modules, lesson references, objectives, sections, readable body content, preview count, and lesson/module membership.
- `seedContent()` is idempotent by slug, sets content to `published`, and asserts 8 courses, 22 lessons, and exactly 1 preview.
- There are no quiz sections in `LessonSection`; no quiz content exists.

### 3.7 Existing frontend surface

**Observed routes:** `/`, `/courses`, `/courses/:slug`, `/lessons/:slug`, `/login`, `/register`, `/dashboard` (protected), and `*`.

**Observed:** There is no quiz route, quiz page, quiz component, or quiz query. `useLesson`, `useCourse`, `useCourses`, `useDashboard`, and `useCompleteLesson` are the relevant existing hooks. Successful lesson completion invalidates `lesson`, `course`, `courses`, and `dashboard` queries.

### 3.8 Existing test and teardown state

**Observed:**

- `server/test/*.test.ts` covers content validation, HTTP middleware, password hashing, progress calculations, validation schemas, and static serving.
- The database suite is enabled only by `RUN_DB_TESTS=1` plus `MONGODB_URI`.
- Its database name is `${MONGODB_DB ?? 'kaos_academy'}_test`.
- Its teardown contains a fail-closed guard that refuses cleanup unless the connected database is exactly `kaos_academy_test`.
- The teardown uses collection `deleteMany`, not `dropDatabase`. The prior S1 teardown-correction report documents that the Atlas application user lacked `dropDatabase`; the current code preserves that correction.
- Current teardown deletes `Progress`, `sessions`, `User`, `Course`, and `Lesson`.
- There is no client component-test framework in the repository. S2-OD-06 forbids adding a new dependency.

---

## 4. Owner decisions and requirement mapping

### 4.1 Approved S2 decisions

**Observed from the owner's explicit decisions:**

| ID | Decision | S2 impact |
| --- | --- | --- |
| S2-OD-01 | 2–3 knowledge checks per published lesson and one assessment per published course; author Bitcoin 101 first, then cover all 8 courses/22 lessons. | Content scope is fixed. No curriculum expansion. 22 lesson quizzes plus 8 course assessments. |
| S2-OD-02 | Course completion requires all published lessons complete **and** the course assessment passed; lesson completion remains independent and idempotent. | Changes S1 course/dashboard completion semantics. Requires an assessment-aware predicate and UI. |
| S2-OD-03 | Include server-awarded XP ledger and three minimal achievements; duplicate submissions must not double-award XP; defer gamification if it threatens essential S2 work. | Adds XP/achievement models and award logic after core assessment. XP is deferrable. |
| S2-OD-04 | Anonymous visitors may read the preview lesson and see its questions, but must sign in to submit; never persist anonymous attempts or progress. | Creates the public-preview quiz exception and the main contract conflict in §5. |
| S2-OD-05 | Client-generated `attemptKey`; unique `{userId, quizId, attemptKey}`; retries return the original result; reused keys with different answers must not create another attempt or duplicate XP. | Defines idempotency and concurrency requirements. |
| S2-OD-06 | No new dependencies; reuse the existing stack and testing setup. | Use existing Express, Mongoose, Zod, React, React Query, `express-rate-limit`, and Node built-ins. |

### 4.2 PRD mapping

**Observed in `PRD.md`:**

| PRD reference | Requirement | S2 coverage |
| --- | --- | --- |
| FR-005 | Users can complete quizzes (P0). | Directly implemented by quiz retrieval, attempts, scoring, feedback, and results. |
| FR-012 | Users can earn XP and achievements (P1). | XP ledger and three achievements, subject to S2-OD-03 and owner confirmation of defaults. |
| Module D (§5.1) | Multiple-choice quizzes, scenario-based questions, immediate feedback, XP, achievement badges, course completion tracking, learning milestones. | S2 implements quizzes, feedback, completion, XP/achievements. No leaderboards or streak engine. |
| Module D rule | Gamification must reward demonstrated understanding, not merely time spent. | Recommendation: award XP for quiz/assessment passes and course completion, not for pressing "Mark as complete." See §8 and §14. |
| §6 | Each course should contain knowledge checks, a course assessment, and completion status. | S2 adds one quiz per lesson and one assessment per course. |
| §10 | Logical `Quiz` has `lessonId`; `QuizAttempt` has `userId`, `quizId`, `score`, `completedAt`; achievement entities exist. | PRD explicitly says exact schemas are finalized during implementation. S2 extends `Quiz` with `kind`, `courseSlug`, optional `lessonSlug`, version, status, and feedback. |
| §11 | Exact quiz endpoints: `GET /api/quizzes/:quizId`, `POST /api/quizzes/:quizId/attempts`, `GET /api/quizzes/:quizId/results`. | S2 must use these paths. |
| §13 | Protected user routes, server-side validation, safe errors, rate limiting, no cross-user learning-record exposure. | Covered in §11. |
| AC-005 | Learners can submit quiz answers. | Integration test required. |
| AC-006 | Quiz results are calculated correctly. | Unit test required. |
| AC-007 | Progress updates after lesson completion. | Regression integration test required. |
| §25 | Lessons and quiz progress persist. | Database integration test required before S2 completion. |

### 4.3 Planning report authority and supersession

**Observed:** The planning report's S2 sections are detailed and generally consistent with the owner decisions. The explicit owner decisions supersede the planning report where they differ. The main differences are:

1. Planning report §7.4 line 857 requires `requireAuth` on all quiz routes; S2-OD-04 requires anonymous preview-question retrieval. The owner decision governs.
2. The planning report's completion recommendation is lesson-only **or** assessment-gated; S2-OD-02 fixes it as assessment-gated.
3. The planning report's frontend section already says signed-out preview readers see the quiz and are invited to sign in before submitting, which is consistent with S2-OD-04.

**Recommendation:** Do not edit the planning report during implementation. Record the resolved contract in the S2 implementation report and in the code/tests.

---

## 5. Contract conflict: authenticated quiz routes versus anonymous preview questions

### 5.1 The exact conflict

**Observed:** Planning report §7.4, item 7 says:

```text
- `requireDb` and `requireAuth` on all quiz routes.
```

**Observed:** S2-OD-04 says anonymous visitors may read the preview lesson and see its questions, but must sign in to submit. Anonymous attempts or progress must never be persisted.

**Derived:** If `requireAuth` is mounted on `GET /api/quizzes/:quizId`, an anonymous visitor cannot retrieve the preview quiz questions, even though they can retrieve the preview lesson body. The lesson page cannot render the inline check as approved.

### 5.2 Proposed resolution

**Recommendation:** Treat the planning sentence as superseded by S2-OD-04 for the single public preview quiz. The contract is:

| Route | Middleware | Authorization rule |
| --- | --- | --- |
| `GET /api/quizzes/:quizId` | `requireDb` only | Authenticated users may read any published quiz attached to published content. Anonymous users may read only a published `kind: "lesson"` quiz whose lesson is the published preview lesson and whose course is published. All other anonymous requests return 401. Missing, draft, or orphaned quizzes return 404 for everyone. |
| `POST /api/quizzes/:quizId/attempts` | `requireDb`, `requireAuth` | Session user only. No anonymous attempt is created. |
| `GET /api/quizzes/:quizId/results` | `requireDb`, `requireAuth` | Session user only. Only that user's attempts are returned. |

This preserves the planning report's security intent for submissions and results while implementing the owner-approved preview read.

### 5.3 Access matrix

| Viewer | Quiz state | `GET /:quizId` | `POST /attempts` | `GET /results` |
| --- | --- | --- | --- | --- |
| Anonymous | Published lesson quiz for published preview lesson in published course | 200; questions/options only; `attemptSummary: null`; `viewer.authenticated: false` | 401; no write | 401 |
| Anonymous | Published lesson quiz for a non-preview lesson | 401 | 401 | 401 |
| Anonymous | Published course assessment | 401 | 401 | 401 |
| Anonymous | Draft quiz, missing quiz, draft lesson/course, or orphan | 404 | 401 (auth check runs before quiz lookup) | 401 (auth check runs before quiz lookup) |
| Authenticated | Published quiz attached to published content | 200; questions/options; own attempt summary | 201 new / 200 replay | 200; own attempts only |
| Authenticated | Draft/missing/orphan | 404 | 404 | 404 |

**Recommendation:** For a published non-preview quiz requested anonymously, return `401 UNAUTHORIZED` with a sign-in message. This matches the existing lesson route, which returns 401 for a published non-preview lesson. For draft or missing content, return `404 NOT_FOUND` so drafts are not disclosed.

### 5.4 Answer-key confidentiality

**Observed:** The planning report requires no correct-option indexes or explanations before submission.

**Recommendation:** Never return a raw Mongoose quiz document. Build an explicit public DTO:

```text
QuizPublic {
  slug, kind, courseSlug, lessonSlug, title,
  passingScore, questionCount, version,
  questions: [{ id, prompt, scenario?, options: [{ id, text }] }]
}
```

The DTO excludes `correctOptionId` and `explanation`. A test should serialize the GET response and assert that neither string appears anywhere in the JSON. Only `POST /attempts` (after scoring) and `GET /results` for the session user's own submitted attempts may include correctness and explanations.

### 5.5 Cache safety

**Recommendation:** Set `Cache-Control: private, no-store` on quiz GET, attempt POST, and results GET responses. The same URL returns different `attemptSummary` data depending on the session cookie. Without an explicit private/no-store policy, a shared cache or browser cache could mix learner-specific summaries. Public preview responses should also be private/no-store because the same URL is used by authenticated learners.

### 5.6 Why not split into a separate public endpoint

**Recommendation:** Do not add a fourth quiz endpoint. The PRD fixes the three paths. A conditional `GET` handler is simpler and keeps the API surface authoritative. The route should not use `requireAuth`; it should use `requireDb` and branch on `req.session.userId`.

---

## 6. Proposed API contract

### 6.1 Endpoint summary

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/quizzes/:quizId` | Public for published preview lesson quiz; auth otherwise; DB | Return quiz questions/options, never answers or explanations. |
| POST | `/api/quizzes/:quizId/attempts` | Auth; DB; rate-limited | Validate, score, persist an idempotent attempt, return feedback and optional rewards. |
| GET | `/api/quizzes/:quizId/results` | Auth; DB | Return only the session learner's attempts and best result. |

`quizId` should accept the stable quiz slug, and may also accept a 24-character ObjectId for consistency with the existing course/lesson route helpers. Slug is the primary identifier.

### 6.2 `GET /api/quizzes/:quizId`

**Proposed response (200):**

```json
{
  "quiz": {
    "slug": "btc101-what-is-bitcoin-check",
    "kind": "lesson",
    "courseSlug": "01-bitcoin-101",
    "lessonSlug": "btc101-what-is-bitcoin",
    "title": "Check your understanding",
    "passingScore": 67,
    "questionCount": 3,
    "version": 1,
    "questions": [
      {
        "id": "q1",
        "prompt": "Question text",
        "scenario": "Optional scenario text",
        "options": [
          { "id": "a", "text": "Option A" },
          { "id": "b", "text": "Option B" },
          { "id": "c", "text": "Option C" }
        ]
      }
    ]
  },
  "viewer": { "authenticated": false },
  "attemptSummary": null
}
```

For an authenticated learner, `attemptSummary` is either `null` or:

```json
{
  "attempts": 2,
  "bestPercent": 100,
  "passed": true,
  "lastAttemptAt": "2026-11-01T12:00:00.000Z"
}
```

Rules:

- No `correctOptionId`, `explanation`, score, pass flag, or XP amount is present before submission.
- `attemptSummary` is computed only from `{userId, quizId}`; no client user id is accepted.
- Anonymous preview requests must not query `QuizAttempt` at all.
- The response is `Cache-Control: private, no-store`.

### 6.3 `POST /api/quizzes/:quizId/attempts`

**Proposed request:**

```json
{
  "attemptKey": "8f14e45f-ea3a-4b7a-9c2f-2f6d3b1a9c11",
  "answers": [
    { "questionId": "q1", "optionId": "b" },
    { "questionId": "q2", "optionId": "a" },
    { "questionId": "q3", "optionId": "c" }
  ]
}
```

Validation requirements:

- `attemptKey`: required, UUID format, maximum 64 characters.
- `answers`: required array, 1–50 items, exactly one answer per quiz question, no duplicate `questionId`, no unknown question, no unknown option, no missing answer.
- Unknown fields are rejected (strict schema). In particular, `userId`, `score`, `correct`, `passed`, and `xp` are rejected or ignored; they are never trusted.
- The server canonicalizes answers into quiz question order before scoring and persistence.
- The body size is already limited to 32 KB by `express.json`.

**Proposed new-attempt response (201):**

```json
{
  "attemptKey": "8f14e45f-ea3a-4b7a-9c2f-2f6d3b1a9c11",
  "replayed": false,
  "quizSlug": "btc101-what-is-bitcoin-check",
  "score": 2,
  "total": 3,
  "percent": 67,
  "passed": true,
  "feedback": [
    {
      "questionId": "q1",
      "selectedOptionId": "b",
      "correctOptionId": "b",
      "correct": true,
      "explanation": "Explanation grounded in the lesson."
    }
  ],
  "xpAwarded": 10,
  "totalXp": 10,
  "achievementsAwarded": [
    { "slug": "first-check", "title": "First Check" }
  ]
}
```

**Idempotent replay response (200):** the same shape with `"replayed": true`, the original score/feedback, and no additional XP or achievement. If the XP/achievement layer is deferred, omit those fields or return zero/empty values consistently.

**Reused key with different answers (409):**

```json
{
  "error": {
    "code": "ATTEMPT_KEY_REUSED",
    "message": "This attempt key was already used with different answers. Start a new attempt."
  }
}
```

No second attempt is created and no XP is awarded. A same-key retry with identical answers returns the original result, which is the expected network-retry behavior.

### 6.4 `GET /api/quizzes/:quizId/results`

**Proposed response (200):**

```json
{
  "quizSlug": "btc101-what-is-bitcoin-check",
  "passed": true,
  "bestPercent": 100,
  "attempts": [
    {
      "attemptKey": "8f14e45f-ea3a-4b7a-9c2f-2f6d3b1a9c11",
      "score": 3,
      "total": 3,
      "percent": 100,
      "passed": true,
      "completedAt": "2026-11-01T12:00:00.000Z",
      "feedback": [
        {
          "questionId": "q1",
          "selectedOptionId": "b",
          "correctOptionId": "b",
          "correct": true,
          "explanation": "Explanation grounded in the lesson."
        }
      ]
    }
  ]
}
```

Rules:

- Only the session user's attempts are returned.
- Attempts are sorted newest first. A small cap (for example 20) is acceptable; if capped, document it in the response or API contract.
- `feedback` is included only because these attempts have already been submitted. It is not a pre-submission answer key.
- If the quiz has been unpublished, the route returns 404; existing attempts are not exposed through this endpoint.

### 6.5 Error behavior

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Malformed body, missing/duplicate/unknown answer, bad attempt key, unknown option. |
| 401 | `UNAUTHORIZED` | Anonymous attempt/results; anonymous non-preview quiz. |
| 403 | `ORIGIN_NOT_ALLOWED` | Existing origin guard rejects a cross-origin mutation. |
| 404 | `NOT_FOUND` | Missing/draft quiz, missing/draft lesson or course, orphan quiz. |
| 409 | `ATTEMPT_KEY_REUSED` | Same key with different canonical answers. |
| 413 | Payload too large | Existing Express limit; ensure it is handled by the error middleware. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Existing origin guard rejects non-JSON mutations with bodies. |
| 429 | `RATE_LIMITED` | Attempt limiter. |
| 503 | `DB_UNAVAILABLE` | Database not ready. |
| 500 | `INTERNAL_ERROR` | Unexpected failure; no stack trace or database text. |

### 6.6 Idempotency and concurrency algorithm

**Recommendation:**

1. Validate route, session, quiz publication, and payload.
2. Score the canonical answers with the pure scoring function.
3. Look up `{userId, quizId, attemptKey}`.
4. If found:
   - If canonical answers are identical, return the stored result with `replayed: true`.
   - If canonical answers differ, return 409 `ATTEMPT_KEY_REUSED`.
   - Do not score again, create a second attempt, or award XP again.
5. If absent, create the attempt. The unique index `{userId, quizId, attemptKey}` is the final guard.
6. If creation loses a race with duplicate key `11000`, fetch the original attempt:
   - Same answers: return 200 replay.
   - Different answers: return 409.
7. Award XP/achievements idempotently using unique event keys.
8. If the XP layer is deferred, the attempt still persists and scoring/feedback still work.

The stored attempt should include the canonical answers so the same-key/different-answers check is deterministic. A separate `answersHash` is optional; storing the canonical answer array is sufficient for S2's small quizzes.

### 6.7 Rate limiting

**Recommendation:** Add an `express-rate-limit` limiter to `POST /api/quizzes/:quizId/attempts`, reusing the existing dependency. Suggested production limit: 30 attempts per 10 minutes per IP; test limit: 1000, following the existing auth limiter pattern. The limiter should return the existing `429 RATE_LIMITED` JSON shape. It does not replace the unique index; it only reduces accidental and abusive floods.

### 6.8 Extension of existing responses

**Lesson detail (`GET /api/lessons/:lessonId`):** add:

```json
"quiz": {
  "slug": "btc101-what-is-bitcoin-check",
  "title": "Check your understanding",
  "questionCount": 3,
  "passingScore": 67,
  "attempts": 1,
  "bestPercent": 67,
  "passed": true
}
```

For anonymous preview, `attempts`, `bestPercent`, and `passed` should be `null`, or the whole `quiz` summary should omit learner-specific fields. The questions are fetched through the quiz endpoint, not embedded in the lesson response.

**Course detail (`GET /api/courses/:courseId`):** add:

```json
"complete": false,
"assessment": {
  "slug": "btc101-assessment",
  "title": "Bitcoin 101 assessment",
  "questionCount": 8,
  "passingScore": 80,
  "attempts": 1,
  "bestPercent": 75,
  "passed": false,
  "requiredForCompletion": true
}
```

For anonymous viewers, learner-specific fields should be `null`; the assessment's existence and title may still be shown so the sign-in path is clear.

**Dashboard (`GET /api/dashboard`):** add:

- `overall.coursesComplete` and `overall.coursesTotal` (keep existing lesson fields).
- Per-course `complete` and `assessment` status.
- `xp: { total, recent: [...] }` when the XP layer is enabled.
- `achievements: [{ slug, title, description, earnedAt }]`.
- Assessment-aware `resume`: when no lesson remains, resume the pending assessment rather than claiming all learning is complete.

The existing S1 fields should remain where possible to limit client churn. The exact `resume` shape may be extended with an `assessment` sibling; it must not break the existing lesson resume path.

---

## 7. Proposed data model and indexes

### 7.1 New collections

**Recommendation:** Use explicit collection names for the new models so the test teardown is deterministic:

| Model | Proposed collection | Purpose |
| --- | --- | --- |
| `Quiz` | `quizzes` | Authored lesson checks and course assessments. |
| `QuizAttempt` | `quiz_attempts` | Submitted attempts, scores, feedback snapshots, idempotency key. |
| `XpEvent` | `xp_events` | Append-only XP ledger. |
| `Achievement` | `achievements` | Seeded achievement definitions. |
| `UserAchievement` | `user_achievements` | Awards earned by a learner. |

The existing collections remain `users`, `courses`, `lessons`, `progresses`, and `sessions`.

### 7.2 `Quiz`

**Proposed fields:**

```text
Quiz {
  slug: string                  // unique, stable, lowercase
  kind: "lesson" | "course"
  courseSlug: string
  lessonSlug?: string           // required for kind "lesson"; absent for "course"
  title: string
  passingScore: number          // integer 1..100
  status: "published" | "draft"
  version: number               // starts at 1; bump when questions change
  questions: [{
    id: string                  // unique within quiz, e.g. "q1"
    prompt: string
    scenario?: string
    explanation: string         // never returned before submission
    options: [{ id: string, text: string }]
    correctOptionId: string
  }]
  createdAt, updatedAt
}
```

**Proposed indexes:**

- Unique `{ slug: 1 }`, name `quizzes_slug_unique`.
- `{ kind: 1, courseSlug: 1 }`, name `quizzes_kind_course`.
- `{ lessonSlug: 1 }`, name `quizzes_lesson`.
- `{ status: 1, kind: 1 }`, name `quizzes_status_kind`.

**Validation:** one published lesson quiz per published lesson; one published course assessment per published course; no orphan references; no quiz attached to draft content. Because the current seed model has no draft status, the seeder treats all authored content as published; publication status is also enforced at query time.

### 7.3 `QuizAttempt`

**Proposed fields:**

```text
QuizAttempt {
  userId: ObjectId
  quizId: ObjectId
  quizSlug: string
  quizVersion: number
  courseSlug: string
  lessonSlug?: string
  attemptKey: string
  answers: [{ questionId, selectedOptionId, correct: boolean }]
  feedback: [{ questionId, selectedOptionId, correctOptionId, correct, explanation }]
  score: number
  total: number
  percent: number
  passed: boolean
  completedAt: Date
  createdAt, updatedAt
}
```

**Proposed indexes:**

- Unique `{ userId: 1, quizId: 1, attemptKey: 1 }`, name `quiz_attempts_user_quiz_key_unique`.
- `{ userId: 1, quizSlug: 1, completedAt: -1 }`, name `quiz_attempts_user_quiz_recent`.
- `{ userId: 1, courseSlug: 1, completedAt: -1 }`, name `quiz_attempts_user_course_recent`.

**Why store feedback:** `GET /results` can show explanations for past attempts even if the quiz content is later edited. The feedback snapshot is returned only to the owning learner after submission. It is not an answer-key endpoint.

### 7.4 XP and achievements

**`XpEvent`:**

```text
XpEvent {
  userId: ObjectId
  eventKey: string              // stable, e.g. "lesson-check-pass:btc101-what-is-bitcoin-check"
  amount: number
  source: "lesson_check_pass" | "course_assessment_pass" | "course_complete"
  sourceId: string              // quiz slug or course slug
  createdAt: Date
}
```

Indexes: unique `{ userId: 1, eventKey: 1 }`, name `xp_events_user_key_unique`; `{ userId: 1, createdAt: -1 }`.

**`Achievement`:**

```text
Achievement {
  slug: string
  title: string
  description: string
  order: number
  status: "published" | "draft"
  createdAt, updatedAt
}
```

Index: unique `{ slug: 1 }`.

**`UserAchievement`:**

```text
UserAchievement {
  userId: ObjectId
  achievementSlug: string
  earnedAt: Date
}
```

Indexes: unique `{ userId: 1, achievementSlug: 1 }`; `{ userId: 1, earnedAt: -1 }`.

The achievement criteria live in server code, not in a generic rules engine. Three definitions are enough for S2.

### 7.5 Transactions and atomicity

**Observed:** The configured deployment is a replica set and reports transaction-capable metadata. No transaction was executed in this audit.

**Recommendation:** Use a Mongoose session transaction for the new attempt + XP event + achievement award when the XP layer is enabled. This keeps a successful attempt and its reward consistent. Keep the unique indexes as the final correctness guard. If a transaction fails, return a safe error; the client can retry the same `attemptKey`.

For lesson completion, the existing progress write is already idempotent. Award course-completion rewards after the progress write and after checking the assessment. If the reward write fails, the learner's progress is still correct and a later retry can repair the reward through the unique event key. Do not make S1 progress depend on the XP layer.

If transaction support proves operationally unsuitable during implementation, the fallback is idempotent writes: attempt first, then `XpEvent` upsert, then `UserAchievement` upsert. This can leave a temporary missing reward after a crash but cannot create duplicate attempts or duplicate XP. Document the fallback if used. No new dependency is required either way.

### 7.6 Seeding and migration

**Observed:** `seedContent()` is idempotent by slug, sets content published, and asserts counts. The configured database contains one user and two progress records; no quiz/XP/achievement records exist.

**Recommendation:**

- Extend `seedContent()` to upsert quizzes by stable slug and achievements by stable slug.
- Assert 30 quizzes (22 lesson checks + 8 course assessments) and 3 achievements.
- After upsert, mark quiz records whose slugs are no longer in the authored source as `status: "draft"` rather than deleting them. This hides stale quizzes without destroying attempt history.
- Do not delete users, progress, courses, or lessons.
- No data migration is required for existing progress. Course completion is computed from existing progress plus new attempts.
- If the owner wants retroactive XP, add a separate one-time, explicitly approved backfill script. Do not write rewards on ordinary GET requests.

### 7.7 Test teardown

**Observed:** The current teardown guard requires the connected database name to be exactly `kaos_academy_test` and uses `deleteMany`, not `dropDatabase`.

**Recommendation:** Extend the guard-preserving teardown to delete, in a safe order:

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

The exact guard must remain unchanged. Do not rely on `dropDatabase` privileges. If a collection does not exist yet, `deleteMany` on the Mongoose model collection is still safe after model registration.

---

## 8. Scoring, course completion, XP, and achievements

### 8.1 Pure scoring function

**Recommendation:** Add a pure function in `server/src/lib/quiz.ts`:

```text
scoreQuiz(quiz, submittedAnswers) -> {
  score, total, percent, passed, feedback
}
```

Rules:

- Input quiz is a validated definition with correct options and explanations.
- Input answers are canonical, one per question, with known question/option IDs.
- `score` is the count of correct answers.
- `total` is the number of questions.
- `percent` is `Math.round((score / total) * 100)`, or `0` for a zero-question quiz. A zero-question quiz should be rejected by content validation before it reaches scoring.
- `passed` is `percent >= passingScore`; an exact boundary passes.
- Feedback includes `questionId`, `selectedOptionId`, `correctOptionId`, `correct`, and `explanation`.
- The function never accepts a client score, pass flag, correctness flag, or XP amount.
- It should throw or return a validation failure for unknown questions/options, duplicates, or missing answers; the route should translate that to 400.

Unit tests must cover: all correct, all wrong, mixed, exact pass boundary, one question, duplicate answers, unknown question, unknown option, missing answer, extra answer, and zero questions.

### 8.2 Course completion predicate

**Recommendation:** Add a pure predicate:

```text
isCourseComplete(totalPublishedLessons, completedPublishedLessons, assessmentPassed) =
  totalPublishedLessons > 0 &&
  completedPublishedLessons === totalPublishedLessons &&
  assessmentPassed === true
```

`assessmentPassed` means at least one `QuizAttempt` for the course's `kind: "course"` quiz has `passed: true` for the session user.

This predicate must be used by:

- `GET /api/courses/:courseId` for `complete`.
- `GET /api/dashboard` for per-course `complete` and resume logic.
- `GET /api/progress/:courseId` if it returns completion status.
- `POST /api/progress/lessons/:lessonId/complete` when evaluating course-completion rewards.
- `POST /api/quizzes/:quizId/attempts` when a course assessment is passed.

**Observed S1 impact:** `CourseDetail.tsx` and `Dashboard.tsx` currently equate "no next lesson" with "course complete." Both must switch to `complete`. The dashboard resume must prefer a next lesson, then a pending assessment, and only then report that all available work is complete. `isNewLearner` should be based on no lesson progress **and** no quiz attempts, otherwise a learner whose first action is a quiz is mislabeled.

### 8.3 Completion trigger points

Course completion can occur in either order:

1. **Lessons first, then assessment:** the last lesson completion leaves the course incomplete; passing the assessment triggers completion rewards.
2. **Assessment first, then lessons:** passing the assessment leaves the course incomplete; completing the last lesson triggers completion rewards.

The shared `evaluateCourseCompletion(userId, courseSlug)` function must check both conditions after either action. It must be idempotent and safe under concurrent requests.

### 8.4 XP design

**Recommendation:** Award XP for demonstrated understanding, not for the completion button alone. This directly follows PRD Module D's rule.

| Event | Amount (proposed) | Event key | When |
| --- | --- | --- | --- |
| Lesson knowledge-check first pass | 10 | `lesson-check-pass:<quizSlug>` | First time a learner passes a lesson check. |
| Course assessment first pass | 25 | `course-assessment-pass:<quizSlug>` | First time a learner passes a course assessment. |
| Course completion | 50 | `course-complete:<courseSlug>` | First time all published lessons are complete and the assessment is passed. |

Rules:

- Only the first pass awards XP. Retakes and repeated submissions never double-award.
- The server computes the amount; the client never sends it.
- Total XP is the sum of the learner's `XpEvent` records. No denormalized counter is required at S2 scale.
- If the owner prefers a different amount, only the constants and tests change.
- Do **not** award XP merely for `POST /api/progress/lessons/:lessonId/complete`. That would reward a click, not demonstrated understanding. If the owner wants a lesson-completion milestone, record it as an achievement with explicit owner approval and document the PRD trade-off.

### 8.5 Achievement design

**Recommendation:** Three minimal, understanding-based achievements:

| Slug | Title | Criteria |
| --- | --- | --- |
| `first-check` | First Check | Pass any lesson knowledge check. |
| `first-assessment` | Assessment Passed | Pass any course assessment. |
| `first-course` | Course Finisher | Complete any course under the S2-OD-02 rule. |

Awarding is server-side and idempotent via the unique `{userId, achievementSlug}` index. The dashboard lists earned achievements and their dates. No badge engine, leaderboard, streak, or points shop is added.

The planning report's illustrative "first lesson complete" achievement is intentionally not used as the third achievement because it would reward a completion click. If the owner prefers it, it should be treated as a milestone separate from XP and its PRD fit should be recorded.

### 8.6 Backfill and existing learners

**Recommendation:** Do not retroactively award XP or achievements for S1 lesson completions. XP begins with S2 quiz passes. This avoids write-on-read behavior, avoids rewarding clicks, and keeps the existing one-user/two-progress dataset untouched.

**Unresolved:** If the owner expects existing S1 progress to produce XP or a "first lesson" achievement, a one-time backfill must be approved separately. It would need to be idempotent, run only against the intended database, and be documented. It is not part of the default S2 implementation.

### 8.7 Deferral rule

**Recommendation:** Implement in this order:

1. Quiz content/model/seeding.
2. Pure scoring and validation.
3. Quiz routes, ownership, idempotency, feedback.
4. Lesson/course/dashboard integration and assessment-aware completion.
5. Client quiz and completion UI.
6. XP ledger and three achievements.
7. Polish, accessibility, and manual verification.

If step 6 threatens the P0 assessment work, ship steps 1–5 and 7, and report XP/achievements as deferred under S2-OD-03. Do not let gamification block AC-005/AC-006 or the completion rule.

---

## 9. Frontend implementation plan

### 9.1 Routes and components

**Recommendation:**

- Add a public route `/quizzes/:slug` in `client/src/App.tsx`. Do not wrap it in `ProtectedRoute`, because the preview quiz must be viewable anonymously; the page handles 401/404/503 states itself.
- Add `client/src/pages/Quiz.tsx` for the standalone course-assessment/preview-quiz experience.
- Add `client/src/components/Quiz.tsx` as the reusable question form, submit state, score/pass result, feedback, and retry control.
- Add quiz types and query hooks to `client/src/lib/types.ts` and `client/src/lib/queries.ts`.
- Add the inline lesson check to `client/src/pages/Lesson.tsx` after the lesson body, before the completion panel.
- Add assessment status and an assessment link to `client/src/pages/CourseDetail.tsx`.
- Add assessment status, XP, achievements, and assessment-aware resume to `client/src/pages/Dashboard.tsx`.

### 9.2 Lesson page behavior

- Fetch the lesson as today.
- If `lesson.quiz` exists, fetch the quiz through `useQuiz(lesson.quiz.slug)`.
- Render the questions after the article body.
- Anonymous preview: show the questions and options, but disable submission and show a clear sign-in/create-account call to action. No POST is attempted. The page must not imply that anonymous answers are saved.
- Authenticated learner: allow submission; show loading, score, pass/fail, per-question correctness, explanations, and retry.
- Keep the existing "Mark as complete" panel independent. A learner can complete a lesson without passing its check, per S2-OD-02.
- If the quiz fetch fails with 401/404/503, show a compact inline message and do not break lesson reading.

### 9.3 Course assessment behavior

- Course detail shows the assessment card with title, question count, passing score, and whether it gates completion.
- Anonymous: show the card but route the action to sign-in with a `next` URL.
- Authenticated: link to `/quizzes/:assessmentSlug`.
- If all lessons are complete and the assessment is pending, the primary action is "Take the assessment", not "Course complete."
- If the assessment is passed but lessons remain, show "Assessment passed — finish the lessons."
- If both are complete, show "Course complete."
- The assessment page shows the passing score before submission, a clear "this gates course completion" statement, and the results/retry view.

### 9.4 Dashboard behavior

- Keep the overall lesson progress card and label it as lesson progress.
- Add "courses complete" as a separate count, not by redefining lesson percent.
- Resume card priority: next lesson, then pending assessment, then all available work complete.
- Course rows show lesson progress, assessment status, and completion status separately.
- XP card shows total XP and the three achievements when enabled. If XP is deferred, do not show an empty XP card.
- Recent activity may remain lesson-based; optionally add recent quiz passes/achievements, but do not remove existing S1 recent-lesson behavior.

### 9.5 Query and cache behavior

**Recommendation:** Add hooks:

- `useQuiz(slug)` -> `GET /quizzes/:slug`.
- `useQuizResults(slug, enabled)` -> `GET /quizzes/:slug/results`.
- `useSubmitQuizAttempt(slug)` -> `POST /quizzes/:slug/attempts`.

On successful submission, invalidate:

- `['quiz', slug]`
- `['quiz-results', slug]`
- `['lesson', lessonSlug]` when the quiz belongs to a lesson
- `['course']` and `['courses']`
- `['dashboard']`

Use the existing `ApiError` and `fieldErrors` patterns. Do not add a client state library or test framework.

### 9.6 Attempt key lifecycle

**Recommendation:**

- Generate `crypto.randomUUID()` when the quiz form is mounted or when a new attempt begins.
- Keep the same key while a submission is in flight or retrying after a network error.
- On success, show the result and keep the key for that result.
- If the learner edits answers for a new attempt, generate a new key.
- On `409 ATTEMPT_KEY_REUSED`, show the message and generate a new key only when the learner chooses to start a new attempt.
- Never send a score, pass flag, user id, or XP amount.

### 9.7 Accessibility and mobile

**Recommendation:**

- Use one `fieldset`/`legend` per question; radio inputs with visible labels.
- Provide an error summary with links to unanswered questions; the server remains authoritative.
- Announce score/pass/feedback in a polite live region; move focus to the result heading after submission.
- Use text ("Correct", "Incorrect") as well as color; do not rely on the amber/danger palette alone.
- Keep touch targets at least 44 px; avoid horizontal scrolling at 360 px; allow long prompts/options to wrap.
- Preserve the existing focus-visible outline and skip link.
- Respect the production CSP: no inline styles or inline scripts in the quiz UI.

### 9.8 No new dependencies

**Observed:** The client has React, React DOM, React Router, React Query, Vite, Tailwind, and TypeScript. There is no component-test framework.

**Recommendation:** Use only existing dependencies and browser APIs (`crypto.randomUUID`, native form controls, `aria-live`). Do not add a form library, state library, or test framework. UI verification is manual plus the existing server/static tests, as allowed by S2-OD-06.

---

## 10. Assessment content authoring and validation plan

### 10.1 Coverage and volume

**Observed:** The curriculum is fixed at 8 published courses and 22 published lessons. Exactly one lesson is the public preview.

**Recommendation:** Produce:

- 22 lesson knowledge checks, each with 2–3 questions.
- 8 course assessments: Bitcoin 101 with 8 questions; courses 02–08 with 5 questions each.

| Item | Count |
| --- | --- |
| Lesson checks | 22 |
| Lesson-check questions at 2 per lesson | 44 |
| Lesson-check questions at 3 per lesson | 66 |
| Course assessments | 8 |
| Assessment questions (8 + 7 × 5) | 43 |
| Total question range | 87–109 |

This is a content-authoring critical path, not a small UI task. At an illustrative 10–15 minutes per question for drafting, technical checking, and review, the workload is roughly 15–27 hours. That estimate is not measured and should not be presented as a delivery commitment.

### 10.2 Suggested question focus by lesson

**Recommendation:** Every question must be answerable from the named lesson's objectives and body text. The following table is a content plan, not authored quiz content. It keeps the questions inside the taught material and avoids inventing facts.

| Course | Lesson slug | Suggested 2–3 question focus |
| --- | --- | --- |
| 01 Bitcoin 101 | `btc101-money-problem` | Money as a set of promises; the three problems (purchasing power, movement, permission); Bitcoin as a partial attempt, not a universal solution. |
| 01 Bitcoin 101 | `btc101-what-is-bitcoin` | Shared ledger versus physical coin; nodes/miners/users; Bitcoin versus "bitcoin"; the 21 million cap as a rule, not a price promise. |
| 01 Bitcoin 101 | `btc101-no-company` | Who runs nodes, miners, and users; no single controller; decentralisation trade-offs; why "no company" does not mean no responsibility. |
| 01 Bitcoin 101 | `btc101-what-it-is-not` | The four common myths; pseudonymity versus anonymity; limitations; key loss and irreversibility. |
| 01 Bitcoin 101 | `btc101-keys` | Private key/address/control; self-custody versus custodial; seed phrase secrecy and backups. |
| 01 Bitcoin 101 | `btc101-scams` | The five scam patterns; urgency and secrecy; verifying through a channel you chose; why recovery promises are suspect. |
| 01 Bitcoin 101 | `btc101-what-you-can-do` | Realistic first uses; volatility and fees; starting small; separating learning from speculation. |
| 01 Bitcoin 101 | `btc101-recap` | The five core ideas; explaining Bitcoin's limits; mapping the next course to the learner's goals. |
| 02 Money and Bitcoin | `money-three-jobs` | Medium of exchange, unit of account, store of value; trade-offs; mobile money versus Bitcoin. |
| 02 Money and Bitcoin | `money-scarcity` | Scarcity and inflation; fixed supply versus stable purchasing power; why a capped supply is not a price guarantee. |
| 03 How Bitcoin Works | `how-ledger` | Block contents and hash links; why order matters; why rewriting old blocks is expensive. |
| 03 How Bitcoin Works | `how-transaction` | Inputs and outputs; signatures; fees; change; what a wallet actually broadcasts. |
| 04 Bitcoin Wallets | `wallets-keys` | Wallet stores keys, not bitcoin; key-to-address derivation; watch-only wallets; address reuse. |
| 04 Bitcoin Wallets | `wallets-seed` | What a seed phrase restores; common backup failures; passphrases; a safe backup routine. |
| 05 Using Bitcoin | `using-receive` | Confirmations; mempool waiting; risk of accepting unconfirmed value; address mistakes. |
| 05 Using Bitcoin | `using-fees` | Fee market; low-fee delays; replacement/acceleration concepts only as taught; urgency trade-offs. |
| 06 Lightning Network | `ln-scaling` | Block-space limits; what a second layer changes and does not change; on-chain settlement versus off-chain payments. |
| 06 Lightning Network | `ln-channels` | Channel state; inbound/outbound liquidity; invoice fields; expiry versus payment failure. |
| 07 Staying Safe | `safe-scams` | Scam structure; emotional levers; verification through a chosen channel. |
| 07 Staying Safe | `safe-checklist` | The five checks; test payments; what to do after a compromise; why urgency is a warning. |
| 08 Beyond Bitcoin | `beyond-nostr` | Protocol versus platform; key-pair identity; relays; what happens if a key is lost. |
| 08 Beyond Bitcoin | `beyond-next` | Four next directions; choosing a project; habits that keep learning safe. |

### 10.3 Course assessment design

**Recommendation:**

- Bitcoin 101: 8 scenario questions spanning all four modules. At least one question per module; no question that depends on untaught later courses.
- Courses 02–08: 5 scenario questions covering the first module's two lessons. Do not test material from modules that are not authored.
- Passing score: 80 for course assessments; 67 for lesson checks. A 2-question lesson check therefore requires both correct; a 3-question check requires at least 2.
- Questions should ask learners to apply a concept to a short situation, not merely recall a definition. Recall questions are acceptable for foundational terms, but scenario questions should dominate.
- Distractors must be plausible but clearly wrong to a learner who understood the lesson. Avoid trick wording, double negatives, "all of the above", and options that are true but do not answer the question.
- Explanations must be one or two sentences grounded in the lesson. They should explain why the correct option is correct and, where useful, why the selected distractor is wrong.
- Do not use current prices, current fee rates, specific wallet brands, regulatory claims, or security guarantees that the lesson does not teach.
- Do not ask learners to reveal a real seed phrase, private key, balance, or personal wallet detail. All scenarios are fictional.

### 10.4 Content validation rules

**Recommendation:** Extend `validateContent()` or add `validateQuizzes()` called by the seeder and tests. Reject:

- Duplicate quiz slugs.
- A quiz with no questions.
- A question with an empty prompt or empty explanation.
- Fewer than 3 or more than 4 options.
- Duplicate option IDs or duplicate option text within a question.
- A `correctOptionId` that does not match an option.
- Duplicate question IDs within a quiz.
- A lesson quiz without `lessonSlug`, or a course quiz with a `lessonSlug`.
- A `courseSlug` that does not exist.
- A `lessonSlug` that does not exist or does not belong to the declared course.
- A lesson quiz attached to a course/lesson that is not in the authored published set.
- More than one lesson quiz for the same lesson, or more than one course assessment for the same course.
- Wrong question counts: lesson quizzes must have 2–3; course assessments must have 5–8.
- A passing score outside 1–100.
- Missing coverage: not exactly 22 lesson quizzes and 8 course assessments.

The seeder should assert 30 quizzes and 3 achievements after seeding. The existing S1 assertions for 8 courses, 22 lessons, and 1 preview remain.

### 10.5 Review workflow

**Recommendation:** Author and review in this order:

1. **Bitcoin 101 first.** Draft its 8 lesson checks and 8-question assessment. This proves the schema, UI, and validation on the most complete course.
2. **Map each question to a lesson objective and a passage.** If a question cannot be traced to the lesson, remove it or rewrite it.
3. **Technical review.** The owner or a qualified reviewer checks correctness, ambiguity, distractor quality, and alignment with the lesson's stated limits. This is a human review; automated validation cannot judge semantic accuracy.
4. **Structural validation.** Run the content test and seeder validation.
5. **Seed the test database and play through.** Verify questions render, answers submit, scoring is correct, feedback is useful, and retries work.
6. **Mobile/keyboard check.** At 360 px, verify no horizontal scroll, readable prompts, usable radios, and visible focus.
7. **Sign off Bitcoin 101.** Then repeat for courses 02–08.
8. **Freeze content.** After review, content changes require a version bump and a fresh validation/seed pass.

### 10.6 Content risks

- **Unreviewed technical claims:** The existing lessons include careful limits (for example, fixed supply is not a price guarantee). Questions must preserve those limits rather than flattening them into hype.
- **Ambiguous scenarios:** A scenario can accidentally have two defensible answers. Review must remove ambiguity, not rely on an explanation to rescue it.
- **Coverage drift:** If a lesson is renamed or removed, its quiz becomes orphaned. Validation must fail rather than silently publish an orphan.
- **Assessment overreach:** Courses 02–08 currently contain only their first module. Assessments must not test the rest of the course title.
- **Authoring bottleneck:** 87–109 questions is the largest S2 workload. Starting with Bitcoin 101 reduces integration risk but does not reduce the total review effort.

---

## 11. Security and privacy assessment

### 11.1 Threat and control table

| Risk | Control | Verification |
| --- | --- | --- |
| Client submits its own score/pass/XP | Server scores from the quiz definition; request schema rejects or ignores score/pass/XP/user id. | Unit and integration tests with forged fields. |
| Answer key leaks before submission | Explicit public DTO; never return raw quiz docs; tests scan GET JSON for `correctOptionId` and `explanation`. | API test. |
| One learner reads another's attempts | Every attempt/results query is scoped by `req.session.userId`; no client user id. | Two-user integration test. |
| Anonymous attempt persisted | `requireAuth` on POST; handler checks session; no write path for anonymous. | Anonymous POST test and count assertion. |
| Anonymous reads a non-preview quiz | Handler checks quiz kind, lesson `isPreview`, and published course/lesson status. | Access-matrix tests. |
| Draft content exposed | Query filters `status: "published"` on quiz, lesson, and course; missing/draft returns 404. | Draft quiz/lesson/course tests. |
| Duplicate retry creates two attempts | Unique `{userId, quizId, attemptKey}`; duplicate-key race handled. | Same-key and concurrent-key tests. |
| Duplicate XP | Unique `{userId, eventKey}`; idempotent upsert; first pass only. | Repeated pass test and ledger count. |
| Duplicate achievement | Unique `{userId, achievementSlug}`; idempotent upsert. | Repeated pass/course completion test. |
| Attempt flooding | Existing `express-rate-limit`; POST limiter; 32 KB body cap. | Limiter unit/config check; manual 429 check if practical. |
| CSRF on attempt POST | Existing `originGuard`; JSON-only mutations; SameSite=Lax session. | Existing origin tests plus quiz POST origin test. |
| Cache mixes learner summaries | `Cache-Control: private, no-store` on quiz GET/results/POST. | Header assertion in integration test. |
| Stack traces/database text in errors | Existing central error handler; route-specific AppError; no raw error body. | Negative tests. |
| XSS through question/option text | React escapes text; no `dangerouslySetInnerHTML`; content is plain strings. | Code review and manual UI check. |
| Logs contain answers or secrets | Do not log request bodies; pino redaction already covers cookies/secrets; optionally add `*.answers` redaction. | Code review; no body logging. |
| Session fixation | Existing regeneration on login/register; unchanged. | Existing auth tests. |
| Database unavailable | `requireDb` returns 503 for quiz routes. | HTTP test with DB down. |

### 11.2 Answer-key handling details

- `GET` returns only question IDs, prompts, scenarios, option IDs, and option text.
- The `correctOptionId` and `explanation` live in the quiz document but are not part of the public DTO.
- `POST` returns correctness and explanations only after a successful attempt is persisted.
- `GET results` returns feedback only for the session user's own attempts.
- A learner can share answers after passing; that is unavoidable and not a confidentiality failure. The requirement is not to reveal them before submission.
- Do not put the answer key in client-side JavaScript bundles, query caches, or logs.

### 11.3 Ownership and identity

- `req.session.userId` is the only identity source for attempts, results, XP, and achievements.
- No route accepts a user id in the body or query.
- The attempt schema is strict; a `userId` field is rejected or ignored, never trusted.
- Results are filtered by `userId` and `quizId`; a learner cannot enumerate another learner's attempts.
- Dashboard and course/lesson responses compute learner-specific status only from the session user.

### 11.4 Anonymous preview privacy

- Anonymous preview GET must not create a session, write progress, write an attempt, or query learner-specific collections.
- The response may set no session cookie because `saveUninitialized: false` is already configured.
- Anonymous GET should not include a fake `attemptSummary` that could be mistaken for saved data. `null` is explicit.
- The UI must state that anonymous answers are not saved and that sign-in is required to submit.

### 11.5 Rate limiting and abuse

- Reuse `express-rate-limit`; do not add Redis or another dependency.
- The in-memory limiter resets on process restart and is per-instance. For the hackathon single-instance deployment this is acceptable. Document the limitation if production scales horizontally.
- Use the existing test-mode high limit so the DB suite is not flaky.
- Rate-limit POST attempts, not GET reads. If GET abuse becomes a concern, add a broader API limiter later; do not overcomplicate S2.

### 11.6 Caching and headers

**Recommendation:** Set `Cache-Control: private, no-store` on:

- `GET /api/quizzes/:quizId` (because the same URL varies by session),
- `POST /api/quizzes/:quizId/attempts`,
- `GET /api/quizzes/:quizId/results`.

Also consider `Vary: Cookie` for the quiz GET. Do not cache learner-specific data in the service worker; S2 does not add a PWA/service worker.

### 11.7 Safe error messages

- Do not return the correct answer in a validation error.
- Do not return database error text, stack traces, or query details.
- For duplicate key races, return the original result or `409 ATTEMPT_KEY_REUSED`, not the raw Mongo error.
- For a missing/draft quiz, return a generic "Quiz not found" 404.
- For a non-preview anonymous quiz, return "Sign in to continue" 401.

---

## 12. Testing and acceptance plan

### 12.1 Unit tests

**New `server/test/quiz.test.ts`:**

- `scoreQuiz` all correct, all wrong, mixed.
- Exact pass boundary (for example 80% passes; 79% fails).
- One-question and multi-question quizzes.
- Duplicate question IDs, unknown question, unknown option, missing answer, extra answer.
- Zero-question guard.
- `isCourseComplete`:
  - all lessons complete + assessment passed = true;
  - all lessons complete + assessment not passed = false;
  - incomplete lessons + assessment passed = false;
  - zero lessons = false;
  - assessment passed before lessons, then last lesson completes = true.
- XP event key construction and idempotency helpers (pure parts).
- Public DTO excludes `correctOptionId` and `explanation`.

**Extend `server/test/content.test.ts`:**

- 22 lesson quizzes and 8 course assessments.
- 2–3 questions per lesson quiz; 5–8 per course assessment.
- Unique quiz slugs, question IDs, option IDs.
- Every correct option exists; every explanation is non-empty.
- Every lesson/course reference exists and matches.
- Duplicate/orphan/wrong-kind cases fail validation.
- Existing 8-course/22-lesson/1-preview assertions remain.

### 12.2 Database integration tests

**Recommendation:** Extend `server/test/db.integration.test.ts` because it already has the correct `kaos_academy_test` guard, fixtures, and teardown. Add new collections to the guard-preserving cleanup. Add tests for:

1. Seeding twice is idempotent; 30 quizzes and 3 achievements exist; indexes exist.
2. Anonymous preview lesson quiz GET returns 200, questions/options only, `attemptSummary: null`, no answer key.
3. Anonymous non-preview quiz GET returns 401; draft quiz returns 404; orphan quiz returns 404.
4. Anonymous POST attempt returns 401 and creates no attempt.
5. Authenticated GET returns the quiz and own attempt summary.
6. Valid POST creates one attempt, returns correct score/feedback, and persists it.
7. Same `attemptKey` + same answers returns 200 replay and does not create a second attempt or XP.
8. Same `attemptKey` + different answers returns 409 and does not create a second attempt or XP.
9. Concurrent same-key submissions produce one attempt and no duplicate XP.
10. Learner B cannot see learner A's attempts/results; B's GET results returns only B's records.
11. Invalid payloads (missing answer, duplicate answer, unknown question/option, extra `userId`/`score`) return 400.
12. Course completion:
    - all lessons complete, assessment not passed -> false;
    - assessment passed, lessons incomplete -> false;
    - both -> true;
    - course detail/dashboard reflect the same predicate.
13. XP/achievements:
    - first lesson-check pass awards 10 XP and `first-check`;
    - repeat pass awards nothing;
    - first course assessment pass awards 25 XP and `first-assessment`;
    - course completion awards 50 XP and `first-course`;
    - duplicate/concurrent submissions do not double-award.
14. Existing S1 flows still pass: registration, login, catalogue, preview, lesson completion idempotency, dashboard.
15. Quiz routes return 503 when the database is unavailable.
16. Quiz GET/results/POST responses carry `Cache-Control: private, no-store`.

### 12.3 Manual UI verification

No client component-test framework exists, and S2-OD-06 forbids adding one. Perform manual checks and record the exact viewport, browser, and steps:

- Anonymous preview lesson: questions visible; submit disabled; sign-in CTA; no POST in the network panel.
- Authenticated lesson check: answer all, submit, see score/pass/feedback; retry; keyboard-only.
- Course assessment: open from course detail; passing score and gating statement visible; pass/fail; results/retry.
- Course detail: all lessons complete but assessment pending does **not** show "Course complete"; assessment link appears.
- Dashboard: assessment status, completion count, resume assessment when appropriate, XP/achievements when enabled.
- 360 px viewport: no horizontal scroll; readable prompts/options; touch targets adequate.
- Screen-reader/live-region behavior: score/feedback announced; focus moves to result.
- Error states: 401, 404, 503, validation error, rate limit.
- S1 regression: home, catalogue, course detail, lesson completion, login/register/logout.
- AC-003 remains an outstanding S1 mobile-evidence item. S2 should verify its new UI at mobile widths, but must not claim AC-003 is satisfied unless the responsive test is actually performed.

### 12.4 Acceptance mapping

| Criterion | S2 evidence |
| --- | --- |
| AC-005 Learners can submit quiz answers | DB integration test: POST creates an attempt and returns feedback. |
| AC-006 Quiz results are calculated correctly | Unit tests for exact scoring, pass boundary, invalid inputs; integration test for persisted score. |
| AC-007 Progress updates after lesson completion | Existing S1 integration test must still pass; add a regression assertion after S2 changes. |
| FR-005 Quizzes | Routes, UI, tests. |
| FR-012 XP/achievements | DB tests for ledger and awards, if the XP layer is implemented. |
| S2-OD-02 completion | Unit predicate + integration tests + UI manual check. |
| S2-OD-04 preview | Access-matrix tests + manual anonymous check. |
| S2-OD-05 idempotency | Same-key, different-answer, concurrent tests. |
| §25 lessons and quiz progress persist | DB integration tests with teardown. |

### 12.5 Commands and evidence rules

- `npm test` for the non-DB suite.
- `npm run typecheck` for both packages.
- `RUN_DB_TESTS=1 npm test` for the Atlas suite, only after the owner authorizes database writes to `kaos_academy_test`.
- Do not claim the DB suite passed unless it actually ran and the output is recorded.
- Do not run DB tests against `kaos_academy`; the guard must remain exact.
- If a test is skipped, report it as skipped, not passed.

---

## 13. File-by-file proposed change map

This map is a plan, not an implemented change. No file below was modified by this audit.

### 13.1 New server files

| Path | Purpose |
| --- | --- |
| `server/src/models/Quiz.ts` | Quiz schema, embedded questions/options, status, version, indexes. |
| `server/src/models/QuizAttempt.ts` | Attempt schema, answers/feedback snapshot, score, idempotency fields, indexes. |
| `server/src/models/XpEvent.ts` | Append-only XP ledger and unique event key. |
| `server/src/models/Achievement.ts` | Seeded achievement definitions. |
| `server/src/models/UserAchievement.ts` | Per-learner achievement awards. |
| `server/src/lib/quiz.ts` | Pure scoring, canonicalization, public DTO, feedback DTO. |
| `server/src/lib/rewards.ts` | XP/achievement award helpers, course-completion reward evaluation. |
| `server/src/schemas/quiz.ts` | Strict Zod attempt schema and any route-param helpers. |
| `server/src/routes/quizzes.ts` | Quiz GET/POST/results routes, preview access, idempotency, rate limiter. |
| `server/src/content/quizzes/index.ts` | Aggregates per-course quiz files; exports `quizzes`. |
| `server/src/content/quizzes/01-bitcoin-101.ts` | Bitcoin 101 lesson checks and 8-question assessment. |
| `server/src/content/quizzes/02-money-and-bitcoin.ts` | Course 02 lesson checks and assessment. |
| `server/src/content/quizzes/03-how-bitcoin-works.ts` | Course 03 lesson checks and assessment. |
| `server/src/content/quizzes/04-bitcoin-wallets.ts` | Course 04 lesson checks and assessment. |
| `server/src/content/quizzes/05-using-bitcoin.ts` | Course 05 lesson checks and assessment. |
| `server/src/content/quizzes/06-lightning-network.ts` | Course 06 lesson checks and assessment. |
| `server/src/content/quizzes/07-staying-safe.ts` | Course 07 lesson checks and assessment. |
| `server/src/content/quizzes/08-beyond-bitcoin.ts` | Course 08 lesson checks and assessment. |
| `server/src/content/achievements.ts` | Three achievement definitions. |
| `server/test/quiz.test.ts` | Pure scoring, completion predicate, DTO, XP-key unit tests. |

### 13.2 Modified server files

| Path | Proposed change |
| --- | --- |
| `server/src/app.ts` | Mount `app.use('/api/quizzes', quizzesRouter)`. Preserve middleware order. |
| `server/src/db.ts` | Add `Quiz`, `QuizAttempt`, `XpEvent`, `Achievement`, `UserAchievement` to `ensureIndexes()`. |
| `server/src/content/types.ts` | Add `QuizSeed`, `QuizQuestionSeed`, `QuizOptionSeed`, `AchievementSeed` and authoring helpers. |
| `server/src/content/index.ts` | Import quizzes; extend `validateContent()` with quiz coverage/reference/structure checks; export `quizzes`. |
| `server/src/seed/seedContent.ts` | Upsert quizzes and achievements; assert 30 quizzes and 3 achievements; mark stale quizzes draft; extend `SeedResult`. |
| `server/src/routes/lessons.ts` | Attach quiz summary (slug/title/question count/passing score/own attempt summary) to lesson detail. |
| `server/src/routes/courses.ts` | Attach assessment summary and `complete`; use assessment-aware predicate. |
| `server/src/routes/dashboard.ts` | Add assessment status, completion count, XP/achievements, assessment-aware resume, improved `isNewLearner`. |
| `server/src/routes/progress.ts` | After lesson completion, evaluate course completion rewards; preserve idempotent progress behavior. |
| `server/src/lib/progress.ts` | Add `isCourseComplete` and any next-action helper; keep existing summaries compatible. |
| `server/test/content.test.ts` | Add quiz validation/coverage assertions. |
| `server/test/db.integration.test.ts` | Add quiz/XP/achievement flows; extend teardown with new collections; preserve exact guard. |
| `server/test/http.test.ts` | Optionally add DB-unavailable quiz-route assertions. |

### 13.3 New client files

| Path | Purpose |
| --- | --- |
| `client/src/components/Quiz.tsx` | Reusable question form, submit/result/feedback/retry UI. |
| `client/src/pages/Quiz.tsx` | Standalone quiz route for course assessments and preview quiz. |

### 13.4 Modified client files

| Path | Proposed change |
| --- | --- |
| `client/src/App.tsx` | Add `/quizzes/:slug` route (public; page handles auth). |
| `client/src/lib/types.ts` | Add quiz, question, option, attempt, feedback, results, assessment, XP, achievement types. |
| `client/src/lib/queries.ts` | Add `useQuiz`, `useQuizResults`, `useSubmitQuizAttempt`; invalidate quiz/lesson/course/dashboard. |
| `client/src/pages/Lesson.tsx` | Render inline quiz after lesson body; preserve independent completion panel; handle anonymous preview. |
| `client/src/pages/CourseDetail.tsx` | Show assessment card/status; replace "Course complete" with `complete`; assessment-aware action. |
| `client/src/pages/Dashboard.tsx` | Show assessment status, course completion count, XP/achievements, assessment-aware resume. |

### 13.5 Explicitly unchanged

- `PRD.md`, `PRD-ORIGINAL.txt`, `PRD.txt`, `PRD-SHA256.txt`, `PRD-MD-SHA256.txt`.
- `AGENTS.md`, `ENGINEERING-DECISIONS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `IMPLEMENTATION-PLAN.md`, `TEST-REPORT.md`.
- Existing reports under `reports/`.
- `package.json` files, `package-lock.json` files, `tsconfig.json` files, `vite.config.ts`.
- `server/src/config.ts`, `server/src/index.ts`, `server/src/logger.ts`, `server/src/errors.ts`.
- `server/src/middleware/auth.ts`, `errors.ts`, `origin.ts`, `validate.ts` (unless a small helper is justified).
- `server/src/lib/http.ts`, `password.ts`.
- `server/src/models/User.ts`, `Course.ts`, `Lesson.ts`, `Progress.ts` (no schema changes required for S2).
- `server/src/routes/auth.ts`.
- `client/src/components/Layout.tsx`, `ProgressBar.tsx`, `ProtectedRoute.tsx`, `SectionRenderer.tsx`.
- `client/src/pages/Home.tsx`, `Catalogue.tsx`, `Login.tsx`, `Register.tsx`, `NotFound.tsx`.
- `client/src/index.css` (existing focus styles are sufficient; add classes in components if needed).
- `client/src/lib/api.ts`, `config.ts`.
- `.gitignore`.

### 13.6 Dependency and configuration impact

**Observed:** No new runtime or development dependency is required. The server already has `express-rate-limit`, `zod`, `mongoose`, and Node built-ins; the client has React, React Query, and browser `crypto.randomUUID`.

**Recommendation:** Do not change `package.json` or lockfiles. Do not add environment variables. Reuse `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, and existing config. Do not create a `docs/` directory; OD-001 remains open.

---

## 14. Conflicts, risks, unresolved questions, and recommendations

### 14.1 Conflicts

| ID | Conflict | Status and proposed resolution |
| --- | --- | --- |
| C-01 | Planning report §7.4 line 857 requires `requireAuth` on all quiz routes; S2-OD-04 requires anonymous preview-question retrieval. | **Resolved by owner decision.** Use `requireDb` only on GET; handler-level preview eligibility; `requireAuth` on POST/results. See §5. |
| C-02 | PRD Module D says gamification must reward demonstrated understanding, not time spent; a lesson-completion XP award would reward a click. | **Recommendation:** XP only for lesson-check pass, course-assessment pass, and course completion. Do not award XP for the completion button. If the owner wants lesson-completion XP, record the trade-off explicitly. |
| C-03 | PRD §10 logical `Quiz` has `lessonId`; S2 needs course assessments not tied to a lesson. | **Not a PRD conflict.** PRD §10 says exact schemas are finalized during implementation. Use `kind`, `courseSlug`, and optional `lessonSlug`. |
| C-04 | PRD says "achievement badges"; owner approved three minimal achievements and deferral if risky. | **Owner-approved scope simplification.** Implement three definitions, no badge engine, no leaderboards. |
| C-05 | S1 UI equates "no next lesson" with "course complete"; S2-OD-02 requires the assessment. | **Approved behavior change.** Replace with the assessment-aware predicate; no stored completion record to migrate. |
| C-06 | Existing dashboard `resume` and `isNewLearner` assume lessons only. | **Derived regression risk.** Update resume priority and base new-learner status on lessons plus attempts. |

### 14.2 Risks

| Risk | Likelihood / impact | Mitigation |
| --- | --- | --- |
| Content authoring is larger than expected (87–109 questions). | High / high | Start Bitcoin 101; use a review checklist; do not let content review block server integration on a small fixture. |
| Technical ambiguity in questions. | Medium / high | Human technical review against lesson text; reject questions that need outside facts. |
| S1 completion regression. | Medium / high | Unit predicate tests, DB integration tests, manual course/dashboard checks. |
| Answer-key leakage through raw docs. | Medium / high | Explicit DTO; JSON scan tests; code review. |
| Cross-user attempt exposure. | Low / high | Session-scoped queries; two-user tests. |
| Idempotency race creates duplicate attempt/XP. | Medium / high | Unique indexes, duplicate-key handling, concurrent test. |
| XP layer delays P0. | Medium / medium | Implement after core; defer under S2-OD-03 if needed. |
| DB test teardown breaks with new collections. | Medium / medium | Preserve guard; delete new collections in safe order; run the opt-in suite. |
| No client test framework. | Known / medium | Manual browser checks; do not add a dependency without approval. |
| Transactions add complexity. | Medium / medium | Use unique indexes as primary guarantee; transaction only for attempt+reward; documented fallback. |
| Cache mixes learner data. | Low / high | `private, no-store` headers; tests. |
| Stale quiz remains published after content removal. | Low / medium | Seeder marks missing slugs draft; do not delete attempts. |
| Rate limiter is in-memory. | Known / low | Accept for single-instance hackathon; document. |

### 14.3 Unresolved questions for owner confirmation

1. **Preview GET status for published non-preview quizzes.** Proposed: 401, matching the lesson route. Alternative: 404 to avoid revealing existence. This is a contract choice, not a product scope change.
2. **XP amounts and sources.** Proposed: 10 for lesson-check first pass, 25 for course-assessment first pass, 50 for course completion. No XP for lesson-completion click. Confirm or replace.
3. **Achievement definitions.** Proposed: `first-check`, `first-assessment`, `first-course`. Confirm or replace the planning report's illustrative "first lesson complete" milestone.
4. **XP backfill.** Proposed: none. Existing S1 progress does not retroactively earn XP. If the owner expects backfill, approve a separate one-time script.
5. **Assessment access gate.** Proposed: a signed-in learner may attempt a course assessment before finishing lessons; course completion still requires both. Alternative: require all lessons before the assessment. This affects UX, not the completion predicate.
6. **Assessment question counts.** Proposed: Bitcoin 101 8 questions; courses 02–08 5 questions each. Confirm if a different distribution is desired.
7. **Content reviewer.** The audit cannot identify a qualified technical reviewer. The owner must assign one before content is published.
8. **Transaction use.** Proposed: use a transaction for attempt+reward because the deployment supports it; fallback to idempotent writes if implementation friction is high. Confirm the preference.
9. **Dashboard `resume` shape.** Proposed: preserve the lesson resume object and add an assessment sibling, or introduce a typed action. The implementation should choose one and update the client/tests consistently.
10. **Stale quiz handling.** Proposed: mark quizzes not present in authored content as draft, never delete. Confirm if a different content-retirement policy is desired.
11. **Anonymous course-detail assessment display.** Proposed: show the assessment title/count and a sign-in CTA, but no learner status. Confirm if the assessment should be completely hidden from anonymous visitors.
12. **Feedback in results.** Proposed: include per-question feedback for the learner's own submitted attempts so the results view can show explanations. Confirm if results should be summary-only.

### 14.4 Recommended decisions

If the owner wants a single default set for implementation, use:

- Preview non-preview anonymous GET: **401**.
- XP: **10 / 25 / 50**, first pass only, no completion-click XP.
- Achievements: **first-check / first-assessment / first-course**.
- Backfill: **none**.
- Assessment gate: **no lesson prerequisite**; completion still requires both.
- Assessment counts: **8 / 5**.
- Transactions: **use for attempt+reward, with idempotent fallback**.
- Results feedback: **include for own attempts**.
- Stale quizzes: **draft, do not delete**.

These are recommendations, not silently applied requirements. The owner should confirm them before the affected implementation work.

---

## 15. Implementation sequence and readiness statement

### 15.1 Proposed sequence

**Phase 0 — Authorization and confirmations**

- Owner authorizes S2 implementation.
- Owner confirms the unresolved items in §14.3, or accepts the recommended defaults in §14.4.
- Confirm the database target for tests is `kaos_academy_test` and no production writes are authorized without a separate decision.

**Phase 1 — Content schema and Bitcoin 101 content**

- Add quiz/achievement types and helpers.
- Add quiz validation and coverage assertions.
- Author Bitcoin 101's 8 lesson checks and 8-question assessment.
- Run unit/content tests. Do not seed production.

**Phase 2 — Server quiz core**

- Add models and indexes.
- Add pure scoring/DTO library.
- Add quiz routes with preview access, auth, validation, idempotency, rate limit, and safe errors.
- Add unit tests and DB integration tests for Bitcoin 101.
- Run the opt-in test database suite only after authorization.

**Phase 3 — Server integration**

- Extend lesson, course, dashboard, and progress responses.
- Implement the assessment-aware completion predicate and resume logic.
- Preserve S1 progress idempotency and ownership.
- Add regression tests.

**Phase 4 — Client core**

- Add quiz types/hooks.
- Add reusable quiz component and standalone quiz page.
- Add inline lesson check, course assessment card, and dashboard status.
- Manual anonymous preview and authenticated flow checks.

**Phase 5 — Bitcoin 101 end-to-end gate**

- Seed the test database.
- Complete the full Bitcoin 101 journey: register, read preview anonymously, sign in, complete lessons, take checks, take assessment, see course completion, retry.
- Verify no answer-key leakage and no duplicate attempt/XP.
- Only then expand content.

**Phase 6 — Remaining content**

- Author courses 02–08 checks and assessments.
- Validate coverage (22 + 8).
- Review and sign off each course.
- Re-run tests and manual checks.

**Phase 7 — XP and achievements**

- Add ledger/achievement seeding and award logic.
- Add dashboard display.
- Test idempotency and deferral criteria.
- If this phase threatens P0, stop and report the deferral under S2-OD-03.

**Phase 8 — Final verification**

- `npm test`.
- `npm run typecheck`.
- `RUN_DB_TESTS=1 npm test` with the exact test database guard.
- Manual accessibility/mobile checks.
- S1 regression checks.
- Update the S2 implementation report with exact commands and results.

### 15.2 Gates and stop points

- Do not write production data during implementation without explicit approval.
- Do not seed the production database until content review and test-database verification are complete.
- Do not claim AC-005/AC-006/AC-007 passed until the relevant tests actually run.
- Do not claim AC-003 mobile acceptance from S2 alone; it remains an outstanding S1 evidence item until the responsive test is performed.
- Do not mark S2 complete if the course-completion rule is lesson-only, if answer keys leak, or if duplicate attempts/XP are possible.

### 15.3 Readiness statement

**Observed:** S1 is stable enough to extend. The existing architecture, session model, database connection, content seeding, error handling, and test teardown provide the needed spine. There is no need for a new framework or dependency.

**Derived:** S2 is technically ready for implementation. The only blocking contract inconsistency is the planning report's `requireAuth`-on-all-quiz-routes sentence, which is resolved by S2-OD-04 and the proposed conditional GET contract. The remaining items are owner choices and content-review work, not architectural blockers.

**Recommendation:** Treat S2 as **ready for separate implementation authorization**, not as already authorized. The owner should confirm §14.3/§14.4, then authorize Phase 1. This audit does not implement S2, does not modify application code, and does not claim any S2 test passed.

---

## Appendix A. Observed command evidence

```text
$ git status --short --branch
## main
?? reports/S2-PLANNING-AND-ROADMAP-REPORT.md

$ npm test
ℹ tests 28
ℹ suites 1
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

$ npm run typecheck
server: tsc -p tsconfig.json --noEmit   (passed)
client: tsc -p tsconfig.json --noEmit   (passed)

$ read-only Atlas metadata
{"setName":"[redacted]","isWritablePrimary":true,"maxWireVersion":25,"logicalSessionTimeoutMinutes":30}
{"version":"8.0.36"}

$ read-only collection counts
{"users":1,"courses":8,"lessons":22,"progresses":2,"sessions":1,"quizzes":0,"quizattempts":0,"xp_events":0,"achievements":0,"user_achievements":0}
```

The database suite was skipped by `RUN_DB_TESTS` not being set. No DB test result is claimed. The count probe checked `quizzes`, `quizattempts` (the default Mongoose pluralization), `xp_events`, `achievements`, and `user_achievements`; all were absent or empty. The proposed explicit collection names are in §7 and do not exist yet.

## Appendix B. Proposed owner confirmation checklist

- [ ] Authorize S2 implementation separately from this audit.
- [ ] Confirm the conditional public preview quiz GET contract.
- [ ] Confirm 401 vs 404 for anonymous non-preview quiz GET.
- [ ] Confirm XP amounts (proposed 10/25/50) and no completion-click XP.
- [ ] Confirm three achievement definitions.
- [ ] Confirm no XP backfill, or authorize a separate backfill.
- [ ] Confirm assessment access gate (proposed none) and question counts (8/5).
- [ ] Assign a technical content reviewer.
- [ ] Confirm transaction preference (transaction with idempotent fallback).
- [ ] Confirm test-database writes are authorized only to `kaos_academy_test`.
- [ ] Confirm production seeding requires a separate approval.

## Appendix C. Audit boundary statement

This audit was read-only with respect to application code, tests, manifests, lockfiles, configuration, secrets, database contents, PRD, existing reports, and `.gitignore`. It created only this report. It did not stage, commit, push, branch, initialize a remote, seed, deploy, or install dependencies. It did not run the database-backed test suite or any transaction. The shared-storage copy, if delivered, is a convenience copy; the repository report remains authoritative.

