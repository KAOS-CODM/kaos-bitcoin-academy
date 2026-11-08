# S2 Actual Application Acceptance Verification

**Project:** KAOS Bitcoin Academy  
**Repository:** `/data/data/com.termux/files/home/kaos-bitcoin-academy`  
**Verification date:** 2026-11-07  
**Mode:** Strictly read-only inspection and verification  
**Report status:** Final verification report  
**Overall S2 verdict:** **FAIL — S2 is not accepted in the actual application**

---

## 1. Executive summary and overall verdict

The actual KAOS Bitcoin Academy application is running locally and is connected to the main database, `kaos_academy`. Its course catalogue and lesson content are present and correct, but the S2 quiz, assessment, and achievement content is **not present in the main application database**.

The main database contains:

- 8 courses, matching the authored source
- 22 lessons, matching the authored source
- **0 quizzes** instead of 30
- **0 questions** instead of 87
- **0 achievement definitions** instead of 3
- 0 quiz attempts
- 0 XP events
- 0 user-achievement awards

The live API confirms the same state:

- The catalogue returns all 8 courses, but every course assessment is `null`.
- Course detail returns lessons, but `assessment` is `null`.
- The preview lesson returns `quiz: null`.
- Known authored quiz and assessment endpoints return `404 NOT_FOUND`.
- The main application therefore cannot expose the intended quiz or assessment interfaces, cannot score attempts, cannot save feedback, cannot award S2 XP, and cannot award S2 achievements.

The isolated `kaos_academy_test` database **does** contain the seeded S2 content: 30 quizzes, 87 questions, 3 achievements, and S2 test activity. That test data is not evidence that the main application is ready, and it is not used here as proof of main-application acceptance.

**Acceptance result by criterion:**

- PASS: S2-01, S2-02
- FAIL: S2-03, S2-04, S2-05, S2-10, S2-12, S2-14
- PARTIAL: S2-06, S2-07, S2-08, S2-09, S2-11, S2-13
- Overall: **FAIL / NOT ACCEPTED**

**Most likely root cause:** The main database was seeded with the S1 course/lesson content but not with the later S2 quiz/assessment/achievement content. The evidence is consistent with the S2 seeder having been applied only to `kaos_academy_test`. The main database’s empty `quizzes` and `achievements` collections are not a UI defect; they are missing content records.

**Consequence:** S3 must not begin until the main application has the S2 content and the remaining browser-level acceptance checks pass. No seeder, write, repair, or deployment was performed during this verification.

---

## 2. Actual application environment identification

### 2.1 Running processes

At verification time, the project’s development process was already running. It was not started, stopped, or restarted by this verification.

| Component | Evidence | State |
|---|---|---|
| Root development launcher | `npm run dev`, PID 15865 | Running |
| Development orchestrator | `node scripts/dev.mjs`, PID 15880 | Running |
| Backend | `tsx watch src/index.ts`, PIDs 15913/15931 | Running |
| Frontend | Vite, PID 15911 | Running |
| Backend port | `http://127.0.0.1:4000/api/health` | `200`, `{"status":"ok","db":"up"}` |
| Frontend port | `http://127.0.0.1:5173` | `200` |
| Isolated server port | `http://127.0.0.1:4100` | Refused / not running |

The backend process working directory is `/data/data/com.termux/files/home/kaos-bitcoin-academy/server`.

### 2.2 Configuration and database selection

The server loads `server/.env` through `dotenv/config` in `server/src/config.ts`.

The relevant non-secret configuration values are:

| Setting | Value |
|---|---|
| `NODE_ENV` | `development` |
| `PORT` | `4000` |
| `MONGODB_DB` | `kaos_academy` |
| `APP_ORIGIN` | `http://localhost:5173` |

The configured MongoDB URI path also resolves to the database name `kaos_academy`. The live connection’s `db.databaseName` was independently read as `kaos_academy`, and a read-only `ping` succeeded. The main database identity is therefore established from configuration and connection evidence, not guessed from its name.

No database URI, username, password, session secret, cookie, or API credential is reproduced in this report.

### 2.3 Frontend-to-backend connection

- The client API helper uses relative `/api` requests with `credentials: 'include'` (`client/src/lib/api.ts`).
- The Vite development server proxies `/api` to `http://localhost:4000` (`client/vite.config.ts`).
- The backend health endpoint reports the database as up.
- The React application includes routes for `/courses`, `/courses/:slug`, `/lessons/:slug`, `/quizzes/:slug`, and `/dashboard` (`client/src/App.tsx`).

This establishes that the local frontend is wired to the local backend and the main database. It does **not** establish that the rendered UI works, because no browser was available.

### 2.4 Databases referenced by the project

| Database | Role | Evidence |
|---|---|---|
| `kaos_academy` | Main application database | `server/.env` `MONGODB_DB`; URI path; live `db.databaseName`; live API data |
| `kaos_academy_test` | Isolated guarded integration-test database | `server/test/db.integration.test.ts` derives `${MONGODB_DB}_test` and explicitly refuses to write unless the connected name is `kaos_academy_test` |
| Other databases | None identified in project configuration or source | No other project database name was found in the inspected configuration and source |

The isolated test database was inspected read-only for comparison only. It was not used as evidence of main-application readiness.

### 2.5 Public deployment status

No evidence of a public deployment was found:

- No Git remote is configured.
- No `render.yaml`, `vercel.json`, `netlify.toml`, `fly.toml`, or `Dockerfile` deployment marker was found at the repository top level.
- No `RENDER_EXTERNAL_URL` setting was present in the inspected environment keys.
- The only reachable application was local: backend `127.0.0.1:4000`, frontend `127.0.0.1:5173`.

This verification therefore concerns the local application only. No external deployment was tested or changed.

### 2.6 Browser availability

No browser-based verification was possible:

- The desktop browser tool reported: `[browser.disconnected] No desktop browser is connected to this session.`
- No local `chromium`, `chromium-browser`, `google-chrome`, `google-chrome-stable`, or `firefox` binary was found.
- Vite returned `200` for the application shell and source modules, but that only proves the development server is serving files. It does not prove React rendering, browser behavior, keyboard behavior, screen-reader behavior, or mobile layout.

Frontend findings below are therefore explicitly labelled as **source-level**, not browser-verified.

---

## 3. Main database identity, without credentials

**Main database:** `kaos_academy`

Evidence:

1. `server/.env` sets `MONGODB_DB=kaos_academy`.
2. The configured connection URI’s path component is `kaos_academy`.
3. A read-only MongoDB client connected with the configured URI and `MONGODB_DB`; `db.databaseName` returned `kaos_academy`; `ping` succeeded with `ok: 1`.
4. The live backend on port `4000` returned the same course/lesson data that was read directly from `kaos_academy`.
5. The backend process working directory is the project’s `server` directory, where `server/.env` is loaded.

The main database contains these collections:

`achievements`, `courses`, `lessons`, `progresses`, `quiz_attempts`, `quizzes`, `sessions`, `user_achievements`, `users`, `xp_events`.

No credentials, connection string, host name, or secret value is included in this report.

---

## 4. Main database collection counts and content comparison

### 4.1 Expected versus actual content

Authored source counts were computed from `server/src/content/index.ts` and its imports. Stored counts were read directly from `kaos_academy`.

| Content | Expected | Actual in `kaos_academy` | Result |
|---|---:|---:|---|
| Courses | 8 | 8 | Match |
| Lessons | 22 | 22 | Match |
| Lesson quizzes | 22 | 0 | **Missing 22** |
| Course assessments | 8 | 0 | **Missing 8** |
| Total quizzes | 30 | 0 | **Missing 30** |
| Total questions | 87 | 0 | **Missing 87** |
| Approved achievements | 3 | 0 | **Missing 3** |

### 4.2 Status distribution

| Collection | Published | Draft | Other |
|---|---:|---:|---|
| Courses | 8 | 0 | 0 |
| Lessons | 22 | 0 | 0 |
| Quizzes | 0 | 0 | 0 |
| Achievements | 0 | 0 | 0 |

- Preview lessons: 1 (`btc101-what-is-bitcoin`).
- All stored courses and lessons are published.
- There are no quiz or achievement records to be published or drafted.

### 4.3 Courses and lessons: content comparison

The stored course and lesson documents were compared field-by-field against the authored source, excluding Mongo-only `_id` and timestamps.

Result:

- Course field mismatches: **0**
- Lesson field mismatches: **0**
- Missing course slugs: **none**
- Extra course slugs: **none**
- Missing lesson slugs: **none**
- Extra lesson slugs: **none**
- Lesson-to-course association problems: **none**
- Lesson-to-module association problems: **none**
- Lesson `courseSlug` values differing from authored source: **none**

All eight authored courses exist and match their authored titles, descriptions, levels, order, estimated minutes, and module definitions. All 22 authored lessons exist and match their authored course, module, title, summary, order, minutes, preview flag, objectives, and section content.

This confirms S2-01 and S2-02 at the database-content level.

### 4.4 Lesson quizzes and course assessments

All 30 authored quiz records are missing. The missing authored slugs are:

**Bitcoin 101 (9 quizzes):**
- `btc101-money-problem-check`
- `btc101-what-is-bitcoin-check`
- `btc101-no-company-check`
- `btc101-what-it-is-not-check`
- `btc101-keys-check`
- `btc101-scams-check`
- `btc101-what-you-can-do-check`
- `btc101-recap-check`
- `btc101-assessment`

**Course 02 (3 quizzes):**
- `money-three-jobs-check`
- `money-scarcity-check`
- `money-bitcoin-assessment`

**Course 03 (3 quizzes):**
- `how-ledger-check`
- `how-transaction-check`
- `how-bitcoin-works-assessment`

**Course 04 (3 quizzes):**
- `wallets-keys-check`
- `wallets-seed-check`
- `bitcoin-wallets-assessment`

**Course 05 (3 quizzes):**
- `using-receive-check`
- `using-fees-check`
- `using-bitcoin-assessment`

**Course 06 (3 quizzes):**
- `ln-scaling-check`
- `ln-channels-check`
- `lightning-network-assessment`

**Course 07 (3 quizzes):**
- `safe-scams-check`
- `safe-checklist-check`
- `staying-safe-assessment`

**Course 08 (3 quizzes):**
- `beyond-nostr-check`
- `beyond-next-check`
- `beyond-bitcoin-assessment`

Because there are no stored quizzes:

- There are no stored lesson-quiz associations.
- There are no stored assessment-to-course associations.
- There are no stored questions.
- There are no stored passing-score configurations.
- There is no stored correct-answer data for the server to use.
- There is no stored quiz content for a public API to omit or expose.

### 4.5 Achievements

The three authored achievement definitions are:

| Slug | Title | Description | Order |
|---|---|---|---:|
| `first-check` | First Check | Pass any lesson knowledge check. | 1 |
| `first-assessment` | Assessment Passed | Pass any course assessment. | 2 |
| `first-course` | Course Finisher | Complete a course by finishing its lessons and passing its assessment. | 3 |

All three are authored and the reward logic references them, but **none exist in `kaos_academy`**. There are no stale or unexpected achievement definitions in the main database because the collection is empty.

### 4.6 Learner-related aggregates

These are aggregate counts only. No learner names, emails, passwords, session identifiers, or other personal information were read or printed.

| Collection | Count in `kaos_academy` |
|---|---:|
| `users` | 1 |
| `progresses` | 6 |
| `quiz_attempts` | 0 |
| `xp_events` | 0 |
| `user_achievements` | 0 |
| `sessions` | 1 |

Progress records by course:

| Course slug | Progress records |
|---|---:|
| `01-bitcoin-101` | 4 |
| `06-lightning-network` | 2 |

There are no quiz attempts, XP events, or user-achievement awards in the main database. Consequently, there is no main-application S2 learner activity to verify for saved feedback, XP totals, achievement history, or course completion.

### 4.7 Stale records

- Stale or unexpected quiz records: **none** (collection empty).
- Stale or unexpected achievement records: **none** (collection empty).
- Stale or unexpected course records: **none**.
- Stale or unexpected lesson records: **none**.

The existing course/lesson records are not stale; they match the authored source. The S2 records are simply absent.

---

## 5. API verification results

All requests were safe `GET` requests. No cookies were supplied, no session was created, no quiz attempt was submitted, no lesson was completed, and no reward calculation was triggered.

| Endpoint | Status | Result |
|---|---:|---|
| `GET /api/health` | 200 | `{"status":"ok","db":"up"}` |
| `GET /api/auth/me` | 200 | No authenticated user |
| `GET /api/courses` | 200 | 8 courses; 0 course assessments present |
| `GET /api/courses/01-bitcoin-101` | 200 | 4 modules; 8 lessons; `assessment: null` |
| `GET /api/courses/01-bitcoin-101/lessons` | 200 | 8 lessons |
| `GET /api/lessons/btc101-what-is-bitcoin` | 200 | Preview lesson; `quiz: null`; viewer unauthenticated |
| `GET /api/lessons/btc101-money-problem` | 401 | Guest correctly blocked from non-preview lesson |
| `GET /api/quizzes/btc101-what-is-bitcoin-check` | 404 | `NOT_FOUND`: `Quiz not found` |
| `GET /api/quizzes/btc101-assessment` | 404 | `NOT_FOUND`: `Quiz not found` |
| `GET /api/dashboard` | 401 | Authentication required |
| `GET /api/progress` | 401 | Authentication required |
| `GET /api/progress/01-bitcoin-101` | 401 | Authentication required |

### 5.1 What the API proves

- The main backend is operating and connected to the main database.
- The catalogue and lesson endpoints serve the stored course/lesson content.
- The guest restriction for non-preview lessons is active.
- The dashboard and progress endpoints require authentication.
- There is no live lesson quiz and no live course assessment to serve.

### 5.2 What the API cannot prove

Because no quiz exists in the main database, the following could not be verified through the live main application:

- Public quiz response structure with real questions and options.
- Absence of `correctOptionId` and `explanation` from a live public quiz response.
- Guest access to a preview lesson quiz.
- Authenticated access to a non-preview quiz.
- Quiz scoring through the live API.
- Saved-attempt feedback through the live results endpoint.
- XP and achievement awards through the live attempt endpoint.

Source-level evidence exists for these behaviors, and prior automated tests are recorded in earlier reports, but those are not a substitute for live main-application evidence. No test suite was run during this verification.

### 5.3 Public quiz DTO source evidence

`server/src/lib/quiz.ts` defines `toPublicQuiz()` and deliberately maps only:

- quiz slug, kind, course slug, optional lesson slug
- title, passing score, question count, version
- question id, prompt, optional scenario, and option id/text

It does not include `correctOptionId` or `explanation`. `server/test/quiz.test.ts` contains a unit test asserting that the public DTO omits answer keys and explanations. This is implementation evidence only, because no live quiz exists in the main database to inspect.

---

## 6. Frontend verification results

### 6.1 Server-level frontend availability

Vite returned `200` and the title `KAOS Bitcoin Academy` for:

- `/`
- `/courses`
- `/courses/01-bitcoin-101`
- `/lessons/btc101-what-is-bitcoin`
- `/quizzes/btc101-what-is-bitcoin-check`

Vite also returned `200` for the source modules:

- `/src/main.tsx`
- `/src/pages/Lesson.tsx`
- `/src/pages/CourseDetail.tsx`
- `/src/components/Quiz.tsx`

These results prove that Vite is serving the SPA shell and source modules. They do **not** prove that React rendered successfully or that any quiz/assessment interface appeared.

### 6.2 Browser verification status

Browser verification was unavailable:

- No desktop browser was connected to the session.
- No local browser binary was found.
- No browser automation was used.

Therefore the following are **not verified through the actual website interface**:

- Rendered course catalogue and course pages.
- Rendered lesson quiz entry points.
- Rendered course assessment entry points.
- Rendered quiz questions and options.
- Rendered saved-attempt feedback.
- Rendered dashboard progress, XP, and achievements.
- Keyboard-only operation.
- Screen-reader and semantic accessibility behavior.
- 360 px / mobile layout behavior.
- Any runtime JavaScript errors.

### 6.3 Source-level frontend wiring

The source shows that the intended UI components exist and are connected to the API:

- `client/src/lib/api.ts` calls relative `/api` paths.
- `client/vite.config.ts` proxies `/api` to the backend on port `4000`.
- `client/src/lib/queries.ts` maps:
  - courses to `/courses`
  - course detail to `/courses/:slug`
  - lesson detail to `/lessons/:slug`
  - dashboard to `/dashboard`
  - quizzes to `/quizzes/:slug`
  - quiz attempts and results to the corresponding quiz endpoints
- `client/src/App.tsx` routes `/courses`, `/courses/:slug`, `/lessons/:slug`, `/quizzes/:slug`, and protected `/dashboard`.

### 6.4 Why the actual website cannot expose S2 interfaces

The frontend is conditional on the missing data:

- `client/src/pages/CourseDetail.tsx` sets `assessmentHref` only when `assessment` is non-null. The live course API returns `assessment: null` for every course, so no assessment entry point can be rendered.
- `client/src/pages/Lesson.tsx` derives the quiz from `lessonQuery.data?.quiz?.slug`. The live lesson API returns `quiz: null` for the preview lesson, so no lesson quiz entry point can be rendered.
- `client/src/pages/Quiz.tsx` renders a quiz only after `useQuiz(slug)` succeeds. The two tested authored quiz slugs return `404 NOT_FOUND`, so direct navigation to those quiz routes reaches the “Quiz not found” state.
- `client/src/components/Quiz.tsx` contains the quiz runner, answer selection, submission, result, XP, achievement, and feedback UI. Its presence in source does not make the missing database content appear.
- `client/src/pages/Dashboard.tsx` renders `xp.total` and the `achievements` array from the dashboard response. The main database has 0 XP events and 0 achievement definitions, and no authenticated browser session was available to inspect the rendered dashboard.

### 6.5 Frontend conclusion

S2-12 fails in the actual application: the intended quiz and assessment interfaces are not exposed because their content is absent. S2-13 is partial: the dashboard is source-wired to the intended API data, but the actual authenticated dashboard could not be browser-verified and the main database has no XP or achievement records to display.

---

## 7. XP, achievements, and progress implementation findings

### 7.1 XP amounts and sources

`server/src/lib/rewards.ts` defines:

| Source | XP |
|---|---:|
| Lesson knowledge-check pass | 10 |
| Course assessment pass | 25 |
| Course completion | 50 |

### 7.2 XP idempotency

`awardXp()` performs an upsert on `{ userId, eventKey }` with `$setOnInsert`. The main database has a unique index:

`xp_events_user_key_unique` on `{ userId: 1, eventKey: 1 }`

A duplicate key without a transaction session is treated as an idempotent no-op. With a transaction session, the duplicate is propagated so the caller can retry and observe the existing event. This design is implemented in source, and prior tests cover the duplicate-key behavior.

### 7.3 Achievement idempotency

`awardAchievement()` performs an upsert on `{ userId, achievementSlug }` with `$setOnInsert`. The main database has a unique index:

`user_achievements_user_slug_unique` on `{ userId: 1, achievementSlug: 1 }`

Duplicate-key handling matches the XP behavior. The achievement definitions themselves are missing from the main database, so no new S2 achievement can be referenced or displayed there.

### 7.4 Dashboard totals

`getXpTotal()` aggregates `xp_events` for the user. `getEarnedAchievements()` reads `user_achievements` and joins them to `achievements` definitions. The dashboard route returns both `xp.total` and `achievements`.

In the main database:

- `xp_events` = 0
- `user_achievements` = 0
- `achievements` definitions = 0

Therefore the actual dashboard would show 0 XP and no earned achievements, not because the display logic is absent, but because the S2 data and activity are absent.

### 7.5 Lesson completion and course completion

`server/src/lib/progress.ts` implements:

- course progress from published lessons
- next-lesson selection in course order
- course completion only when all published lessons are complete and the course assessment was passed

`server/src/lib/rewards.ts` evaluates course completion and awards the 50 XP event and `first-course` achievement idempotently. `server/src/routes/quizzes.ts` and `server/src/routes/progress.ts` both perform post-commit reconciliation so the final lesson/assessment race is closed.

The main database has 6 progress records, but there are no quizzes or assessments. Course completion cannot occur in the actual application until the assessment content exists and is passed. No live course-completion flow was verified.

### 7.6 Evidence classification

| Area | Source implemented | Prior automated tests recorded | Verified in main database | Verified in live API | Verified in browser |
|---|---|---|---|---|---|
| Quiz scoring | Yes | Yes (non-DB unit tests; prior DB suite) | No quizzes | No | No |
| Saved feedback | Yes | Yes (prior DB suite) | 0 attempts | No | No |
| XP awarding | Yes | Yes (prior DB suite) | 0 events | No | No |
| Achievement criteria | Yes | Yes (prior DB suite) | 0 definitions/awards | No | No |
| Course completion | Yes | Yes (prior DB suite) | 6 progress, no assessment | No | No |
| Dashboard wiring | Yes | Yes (prior DB suite) | No XP/achievements | 401 unauthenticated | No |

Prior test evidence referenced from the repository’s earlier reports is historical. No tests were run during this verification, and prior results are not presented as fresh execution evidence.

---

## 8. S2-01 through S2-14 acceptance matrix

Only the permitted verdicts are used: PASS, FAIL, BLOCKED, PARTIAL.

| ID | Acceptance requirement | Verdict | Basis |
|---|---|---|---|
| S2-01 | Eight expected courses are present in the main application database. | **PASS** | 8 stored; 8 authored; no missing/extra; all published; fields match |
| S2-02 | All 22 expected lessons are present and correctly associated. | **PASS** | 22 stored; 22 authored; all published; 1 preview; associations valid; fields match |
| S2-03 | All 22 lesson quizzes are available. | **FAIL** | 0 stored lesson quizzes; 22 authored missing; live preview lesson returns `quiz: null` |
| S2-04 | All eight course assessments are available. | **FAIL** | 0 stored course assessments; live course API returns `assessment: null` |
| S2-05 | The 30 quizzes and 87 questions match authored source definitions. | **FAIL** | 0 quizzes; 0 questions; all 30 authored slugs missing |
| S2-06 | Public quiz APIs do not expose correct-answer keys. | **PARTIAL** | Source DTO omits keys/explanations and a unit test exists; no live main quiz exists to inspect |
| S2-07 | Quiz scoring is implemented correctly. | **PARTIAL** | Source scorer and prior tests exist; no live main quiz or attempt to exercise |
| S2-08 | Saved quiz-attempt feedback is implemented and available. | **PARTIAL** | Source results/DTO/UI exist; main DB has 0 attempts and no quizzes; no browser check |
| S2-09 | XP awarding and idempotency are implemented correctly. | **PARTIAL** | Source and unique indexes exist; main DB has 0 XP events and no live attempt |
| S2-10 | The three approved achievements exist and their criteria are implemented. | **FAIL** | Criteria logic exists, but 0 achievement definitions exist in the main database |
| S2-11 | Course completion and progress reconciliation are implemented correctly. | **PARTIAL** | Source and prior tests exist; main DB has 6 progress records but no assessments; not live-verified |
| S2-12 | The actual website exposes the intended quiz and assessment interfaces. | **FAIL** | UI is conditional on missing data; live APIs return `null`/`404`; no browser rendering |
| S2-13 | The dashboard and achievement interfaces are connected to the intended data. | **PARTIAL** | Source wiring exists; no authenticated browser check; main DB has no XP/achievements |
| S2-14 | No outstanding critical defect prevents S2 acceptance. | **FAIL** | Missing all 30 quizzes, 87 questions, and 3 achievement definitions is critical |

**Summary:** 2 PASS, 6 FAIL, 6 PARTIAL, 0 BLOCKED.  
**Overall verdict:** **FAIL — S2 is not accepted.**

The PARTIAL verdicts are not converted to PASS. They reflect implemented source or prior tests without sufficient evidence from the actual main application.

---

## 9. Evidence supporting every verdict

### S2-01 — PASS

- Direct read-only count in `kaos_academy`: 8 courses.
- Authored source: 8 courses.
- No missing course slugs and no extra course slugs.
- All 8 stored courses have `status: published`.
- Field-by-field comparison of authored course fields found 0 mismatches.
- Live `GET /api/courses` returned 8 courses.

### S2-02 — PASS

- Direct read-only count in `kaos_academy`: 22 lessons.
- Authored source: 22 lessons.
- No missing lesson slugs and no extra lesson slugs.
- All 22 stored lessons have `status: published`.
- Exactly 1 lesson is a preview lesson.
- Every lesson’s `courseSlug` and `moduleSlug` resolves correctly.
- Field-by-field comparison of authored lesson fields found 0 mismatches.
- Live `GET /api/courses/01-bitcoin-101` returned 8 lessons in 4 modules.

### S2-03 — FAIL

- Direct read-only count of `kind: 'lesson'` quizzes in `kaos_academy`: 0.
- Authored lesson quizzes: 22.
- All 22 authored lesson-quiz slugs are missing.
- Live `GET /api/lessons/btc101-what-is-bitcoin` returned `quiz: null`.
- Live `GET /api/quizzes/btc101-what-is-bitcoin-check` returned `404 NOT_FOUND`.
- There is no lesson-quiz content for the actual application to serve.

### S2-04 — FAIL

- Direct read-only count of `kind: 'course'` quizzes in `kaos_academy`: 0.
- Authored course assessments: 8.
- All 8 authored assessment slugs are missing.
- Live `GET /api/courses` returned `assessment: null` for every one of the 8 courses.
- Live `GET /api/courses/01-bitcoin-101` returned `assessment: null`.
- Live `GET /api/quizzes/btc101-assessment` returned `404 NOT_FOUND`.

### S2-05 — FAIL

- Direct read-only count of all quizzes in `kaos_academy`: 0.
- Direct read-only count of all stored questions: 0.
- Authored total: 30 quizzes and 87 questions.
- All 30 authored quiz slugs are missing.
- No stored quiz exists whose questions or passing scores could be compared with authored definitions.

### S2-06 — PARTIAL

- `server/src/lib/quiz.ts` `toPublicQuiz()` explicitly maps only public fields and omits `correctOptionId` and `explanation`.
- `server/test/quiz.test.ts` contains a test asserting that the public DTO does not include answer keys or explanations.
- Prior test reports record non-database unit-test success.
- No quiz exists in `kaos_academy`, so no live public quiz response could be inspected in the actual application.
- Therefore the source-level implementation is present, but the live main-application guarantee is not established.

### S2-07 — PARTIAL

- `server/src/lib/quiz.ts` implements `scoreQuiz()` with passed/total/percent calculation and passing-threshold comparison.
- `server/test/quiz.test.ts` covers correct/incorrect/mixed scoring, the passing boundary, invalid answers, and zero-question rejection.
- Prior test reports record unit-test success.
- No quiz exists in `kaos_academy`, so no live main-application scoring request could be performed.
- Therefore implementation is present, but actual-application scoring is not established.

### S2-08 — PARTIAL

- `server/src/routes/quizzes.ts` stores `feedback` on quiz attempts and returns it from the attempt and results responses.
- `client/src/pages/Quiz.tsx` contains the saved-attempt feedback renderer.
- `client/src/lib/queries.ts` wires the results query.
- Prior DB tests recorded in earlier reports covered saved feedback.
- Main database: 0 quiz attempts and no quizzes, so there is no saved attempt to inspect or render.
- No browser was available to verify the saved-feedback UI.
- Therefore implementation is present, but availability in the actual application is not established.

### S2-09 — PARTIAL

- `server/src/lib/rewards.ts` implements `awardXp()` with `$setOnInsert` and duplicate-key handling.
- The main database has the unique index `xp_events_user_key_unique` on `{ userId, eventKey }`.
- Prior tests cover duplicate-key idempotency.
- Main database: 0 XP events and 0 quiz attempts.
- No live main-application pass could be performed without writing data.
- Therefore implementation and indexes are present, but live XP awarding is not established.

### S2-10 — FAIL

- Authored source: 3 achievements (`first-check`, `first-assessment`, `first-course`).
- Main database: 0 achievements, 0 published, 0 draft.
- Reward logic references the three slugs and implements their criteria.
- Criteria implementation alone does not satisfy the requirement that the three approved definitions exist.
- Therefore the requirement fails.

### S2-11 — PARTIAL

- `server/src/lib/progress.ts` implements course progress, next-lesson selection, and the completion predicate.
- `server/src/lib/rewards.ts` implements completion XP and `first-course` award.
- `server/src/routes/quizzes.ts` and `server/src/routes/progress.ts` contain post-commit reconciliation.
- Prior DB tests recorded in earlier reports covered assessment-first, lesson-first, and concurrent completion behavior.
- Main database: 6 progress records, but 0 assessments and 0 attempts, so completion cannot occur.
- No live completion flow was verified.
- Therefore implementation is present, but actual-application completion is not established.

### S2-12 — FAIL

- `client/src/App.tsx` has a `/quizzes/:slug` route and `client/src/components/Quiz.tsx` has quiz UI.
- `client/src/pages/CourseDetail.tsx` only exposes an assessment link when `assessment` is non-null.
- `client/src/pages/Lesson.tsx` only exposes a quiz when `lesson.quiz` is non-null.
- Live course APIs return `assessment: null`.
- Live preview lesson API returns `quiz: null`.
- Known authored quiz/assessment endpoints return `404`.
- Browser verification was unavailable.
- The actual website therefore cannot expose the intended S2 quiz and assessment interfaces.

### S2-13 — PARTIAL

- `client/src/pages/Dashboard.tsx` reads `xp` and `achievements` from the dashboard response and renders progress, XP, achievements, and recent lessons.
- `client/src/lib/queries.ts` requests `/dashboard`.
- `server/src/routes/dashboard.ts` queries XP totals, earned achievements, progress, attempts, and assessments.
- Main database has 0 XP events and 0 achievement definitions/awards; the dashboard request requires authentication.
- No authenticated browser session was available, so rendered dashboard behavior was not verified.
- Therefore source wiring is established, but actual data-connected UI behavior is not fully established.

### S2-14 — FAIL

- The main application is missing all 30 authored quizzes, all 87 questions, and all 3 achievement definitions.
- The live API returns null quiz/assessment metadata and 404 for known quiz endpoints.
- These are critical S2 content defects, not cosmetic issues.
- S2 cannot be accepted while the actual application lacks the core S2 learner features.

---

## 10. Differences between the main application and the isolated test environment

| Evidence | Main application | Isolated test environment |
|---|---|---|
| Database | `kaos_academy` | `kaos_academy_test` |
| Backend | Running on `127.0.0.1:4000` | `127.0.0.1:4100` not running |
| Frontend | Running on `127.0.0.1:5173` | No separate frontend process observed |
| Courses | 8 | 8 |
| Lessons | 22 | 22 |
| Quizzes | **0** | **30** (22 lesson, 8 course) |
| Quiz statuses | None | 30 published |
| Achievement definitions | **0** | **3 published** |
| Progress records | 6 | 1 |
| Quiz attempts | 0 | 6 |
| XP events | 0 | 3 |
| User achievement awards | 0 | 2 |
| Users | 1 | 3 |
| Sessions | 1 | 4 |

The isolated database was inspected read-only and only for comparison. Its 30 quizzes, 3 achievements, attempts, XP events, and user achievements are **not** evidence that the main application is ready. The main application is the acceptance target, and it lacks those records.

The isolated application server on port `4100` was not running, so no isolated live API or frontend verification was used. The isolated database’s existing state is consistent with prior S2 test activity, but that does not change the main-application finding.

---

## 11. Outstanding blockers and defects

### P0 blockers

1. **All S2 quiz content is missing from the main database.**
   - 0 of 22 lesson quizzes.
   - 0 of 8 course assessments.
   - 0 of 30 quizzes.
   - 0 of 87 questions.
   - Live lesson and course APIs return null quiz/assessment metadata.

2. **All S2 achievement definitions are missing from the main database.**
   - 0 of 3 approved definitions.
   - No achievement can be awarded or displayed in the actual application even though reward logic references the slugs.

3. **The actual website cannot expose the intended quiz/assessment interfaces.**
   - The UI is conditional on quiz/assessment data.
   - Known authored quiz routes return 404.
   - The actual application therefore fails the S2 learner journey.

4. **Critical acceptance criterion S2-14 fails.**
   - The missing content is a critical defect, not a documentation gap.

### P1 verification blockers

1. **No browser was available.**
   - No desktop browser session.
   - No local browser binary.
   - Rendered UI, keyboard behavior, screen-reader semantics, and mobile/360 px layout remain unverified.

2. **No authenticated main-application dashboard verification.**
   - `/api/dashboard` returned 401 for an anonymous request.
   - No learner account was used to create a session.
   - No browser session was available.

3. **No main-application S2 learner activity exists to verify.**
   - 0 attempts, 0 XP events, 0 user achievements.
   - Saved feedback, XP increments, achievement awards, and course completion cannot be observed in the actual application.

4. **Live quiz security behavior cannot be inspected.**
   - No quiz exists to request.
   - The public DTO and scoring behavior remain source/prior-test evidence only.

### Residual source concerns (not the primary S2 blocker)

- `server/test/quiz.test.ts` contains a test title saying canonical answer comparison “ignores submitted order,” while `canonicalAnswersEqual()` compares answers by array index and is order-sensitive. The test does not actually exercise reversed order. This is a test-description/coverage gap; the client currently submits answers in quiz order, so it is not the main acceptance blocker.
- Quiz option selection is communicated with color and border styling; no separate text or icon state is provided for the selected state. This is an accessibility concern that should be checked in the browser acceptance pass.
- These concerns do not change the primary finding that the main database is missing the S2 content.

### Environment limitation

- The application is local-only at verification time; no public deployment was found or tested.
- The isolated server on `127.0.0.1:4100` was down, although the isolated database was reachable read-only.

---

## 12. Exact actions required to reach S2 acceptance

No action below was performed during this verification. Each write or deployment step requires explicit owner approval.

1. **Approve and perform an S2 content seed for the main database.**
   - Target: `kaos_academy`.
   - Tool: the project’s existing idempotent seeder, `npm run seed` (which runs `server/src/seed/run.ts` and `seedContent()`).
   - The seeder sets courses/lessons to published, creates/updates 30 quizzes as published, and creates/updates 3 achievements as published.
   - Do not run `server/test/db.integration.test.ts`, any cleanup script, or any `dropDatabase` operation.
   - Take an approved backup/snapshot or otherwise preserve the current main data before the seed.
   - Do not run this until the owner explicitly approves the write.

2. **Verify the main database after the seed, read-only.**
   - Courses: 8, all published.
   - Lessons: 22, all published, 1 preview.
   - Lesson quizzes: 22, all published and correctly associated.
   - Course assessments: 8, all published and correctly associated.
   - Total quizzes: 30.
   - Total questions: 87.
   - Achievement definitions: 3, all published with the approved slugs.
   - No stale/extra quiz or achievement definitions.

3. **Verify the live main API after the seed.**
   - `GET /api/courses` shows non-null assessment metadata for all 8 courses.
   - `GET /api/courses/01-bitcoin-101` shows the assessment summary.
   - `GET /api/lessons/btc101-what-is-bitcoin` shows the preview quiz summary.
   - `GET /api/quizzes/btc101-what-is-bitcoin-check` returns questions and options, and does not contain `correctOptionId` or `explanation`.
   - A non-preview lesson quiz returns 401 for a guest.
   - A course assessment returns 401 for a guest.
   - No live response exposes answer keys.

4. **Perform browser acceptance with an owner-approved, non-destructive test channel.**
   - Use a dedicated acceptance account or another owner-approved method; do not use the existing learner account for answer submission or progress changes without explicit approval.
   - Verify the catalogue, course pages, lesson quiz entry point, quiz questions/options, assessment entry point, saved-attempt feedback, XP display, achievement display, and dashboard progress.
   - Verify keyboard-only operation, screen-reader semantics, 360 px layout, and visible selected-state indication.
   - If the desktop browser tool becomes available, use it non-destructively; if not, the owner must provide a browser channel or accept that S2-12/S2-13 remain unverified.

5. **Verify XP, achievements, saved feedback, and course completion in the main application.**
   - Use an approved test account and approved test data.
   - Confirm lesson-check pass awards 10 XP and `first-check`.
   - Confirm assessment pass awards 25 XP and `first-assessment`.
   - Confirm course completion awards 50 XP and `first-course`.
   - Confirm duplicate/replayed attempts do not double-award XP or achievements.
   - Confirm saved feedback is returned and rendered.
   - Confirm course completion requires all published lessons plus a passed assessment.

6. **Re-run the S2 acceptance matrix.**
   - Convert PARTIAL or FAIL only on direct evidence from the main application.
   - Do not use isolated `kaos_academy_test` results as proof of main-application readiness.
   - Recheck S2-14 after the content and browser checks.

7. **Do not begin S3 until S2 is accepted.**
   - The current evidence establishes that S2 is not complete in the actual application.
   - S3 implementation would build on missing S2 data and would not be acceptance-ready.

---

## 13. PRD checksum before and after verification

**Authoritative PRD:** `PRD.md`

| Point | SHA-256 |
|---|---|
| Before verification | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` |
| After verification | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` |

The PRD checksum was unchanged. `PRD.md` was not edited, reformatted, renamed, or deleted. `PRD-ORIGINAL.txt` and `PRD.txt` were not modified by this verification.

---

## 14. Git branch, HEAD, and working-tree state

| Item | State |
|---|---|
| Branch | `main` |
| HEAD | `1f1d51538fae8f946f1b4b7cc933ed4dc6fbf43f` |
| Parent commit | `41d37e7df79bdba48b55399ef20fdea0ac7ea4db` |
| Remote | None configured |
| Staged files | 0 |
| Modified tracked files | 0 |
| Untracked files before this report | 2 existing audit/checkpoint reports |
| Untracked file added by this verification | `reports/S2-ACTUAL-APPLICATION-ACCEPTANCE-VERIFICATION.md` |

No commit, amend, reset, stash, clean, branch switch, stage, push, or other Git write was performed.

---

## 15. Explicit confirmation of no writes or external changes

This verification confirms the following:

- **No database writes:** No insert, update, delete, upsert, index creation, collection creation, cleanup, reset, or `dropDatabase` was performed by this verification. Only read-only `ping`, `listCollections`, `countDocuments`, `find`, aggregate, and index-listing operations were used.
- **No seeding:** The content seeder was not run. `npm run seed` was not executed.
- **No database integration tests:** `server/test/db.integration.test.ts` was not run. No test suite was run during this verification.
- **No learner-data changes:** No learner account was created, modified, deleted, or authenticated. No quiz attempt was submitted. No lesson was completed. No XP or achievement was awarded.
- **No source or configuration changes:** No application source, test, configuration, environment file, dependency, lockfile, PRD, checksum file, or decision record was modified.
- **No application process changes:** The existing backend on `4000` and frontend on `5173` were not started, stopped, restarted, or reconfigured. The isolated server on `4100` remained down.
- **No infrastructure changes:** No DNS, Atlas, hosting, deployment, or external service configuration was changed. No deployment was performed.
- **No Git writes:** No file was staged, committed, amended, reset, stashed, cleaned, checked out, switched, or pushed.
- **Only repository write:** This report file, `reports/S2-ACTUAL-APPLICATION-ACCEPTANCE-VERIFICATION.md`, is the only repository file written by this verification.
- **Temporary file outside the repository:** A temporary Vite HTML capture was written under the approved external temporary directory `/data/data/com.termux/files/usr/tmp/opencode/`. It is outside the repository and was not part of the application.
- **PRD preservation:** The `PRD.md` SHA-256 remained `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`.

### Security note

During the read-only inspection, one shell command that listed matching source/configuration text displayed the configured MongoDB connection string in the session tool output. The value is deliberately **not reproduced in this report**, and no credential, URI, session key, cookie, or token is included here. Because that value contained credentials, the owner should treat it as exposed to the session transcript and rotate or restrict the database credential if appropriate. This disclosure is included so the exposure is not silently ignored.

---

## Final determination

**S2 is not accepted in the actual application.**

The actual main application has correct course and lesson content, but it is missing all S2 quizzes, all S2 questions, and all S2 achievement definitions. The live API and frontend therefore cannot expose the intended quiz/assessment journey. The isolated test environment contains the missing content, but that is not evidence of main-application readiness.

**Recommended next step:** obtain explicit owner approval for the main-database S2 content seed and the browser acceptance channel, then re-run this verification. Do not begin S3 until S2 passes in the actual application.
