# S2 Quiz Implementation and Visibility Audit

Date: 2026-11-05

Scope: read-only audit of the S2 quiz implementation and the missing lesson knowledge check for the lesson the owner viewed as “Why Bitcoin exists”.

Verdict: **NOT ACCEPTED YET**

The immediate visibility cause is confirmed: the configured application database (`kaos_academy`) contains **0 quiz records**, so the target lesson-check record does not exist. The target lesson and its parent course do exist and are published. The lesson API therefore returns `quiz: null`; the client never requests a quiz slug and never mounts the inline quiz component.

The S2 source implementation is substantial and the target quiz exists in source and in the seeder. The problem is that S2 content has not been seeded into the application database. Separately, four previously reported acceptance blockers remain in current source: unapproved stale-achievement drafting, the course-completion race, same-key concurrent different-answer handling, and saved-attempt history that omits feedback.

This audit did not run the seeder, tests, builds, or the application, and did not write to any database.

---

## 1. Executive verdict

### 1.1 What is confirmed

- The lesson the owner called “Why Bitcoin exists” is the first lesson in the Bitcoin 101 module whose title is “Why Bitcoin exists”. The actual lesson title is “Money and the problem Bitcoin addresses”; its slug is `btc101-money-problem`. See §3.
- The target lesson check exists in source: `btc101-money-problem-check`, kind `lesson`, 2 questions, passing score 67. See §4.
- The check is included in the seeder's exported quiz array and the seeder has no condition that omits it. See §4.
- The application database `kaos_academy` has 8 courses and 22 lessons, and the target lesson and parent course are published. It has 0 quizzes. See §5.
- The lesson API queries for a published lesson check and returns `quiz: null` when none exists. See §6.
- The lesson page only fetches a quiz when `lesson.quiz.slug` exists and only renders the inline check when the `quiz` summary exists. See §7.
- Therefore the quiz is not hidden by CSS and is not merely below the fold: the component is never mounted because the database has no quiz record.

### 1.2 What remains unverified

- No application process or listener was running during this audit, so live HTTP status and response bodies could not be observed.
- No browser or DOM session was available, so visual rendering, keyboard-only use, screen-reader behavior, Lighthouse, and mobile layout were not verified.
- The DNS report records 18/18 DNS tests, 65/65 non-database tests, and 10/10 guarded database integration tests passing on 2026-11-05. This audit did not rerun them and did not review raw logs.
- Deployment and production seeding remain unverified and were not performed.

### 1.3 Acceptance position

S2 should not be accepted yet. The current environment cannot demonstrate the quiz feature to a learner because the application database has no quiz content. Even after seeding, four previously reported acceptance blockers remain, plus several lower-severity defects and test gaps.

---

## 2. Repository and PRD preflight

### 2.1 Repository identity and state

| Item | Observed value |
|---|---|
| Repository root | `/data/data/com.termux/files/home/kaos-bitcoin-academy` |
| Branch | `main` |
| HEAD | `41d37e7df79bdba48b55399ef20fdea0ac7ea4db` |
| Modified tracked files | 18 |
| Staged files | 0 |
| Untracked files | 26 before this report |

The working tree contains the expected S2 and DNS work. The modified tracked files are the S2 client/server changes plus `server/src/db.ts` for DNS. The untracked files include the S2 quiz content, models, routes, tests, reports, and the DNS implementation/test/report files. No package manifest, lockfile, or environment file appears as a tracked change.

Evidence: `git rev-parse`, `git status --short`, and `git diff --stat` were run read-only. The full status is recorded in §15.

### 2.2 DNS implementation presence

The DNS implementation and its report are present:

- `server/src/lib/dns.ts`
- `server/src/db.ts` (modified to configure DNS and pass a MongoDB `lookup`)
- `server/test/dns.test.ts`
- `server/dist/lib/dns.js`
- `reports/DNS-IMPLEMENTATION-REPORT.md`

The DNS report states that the guarded Atlas integration suite connected to `kaos_academy_test` and passed 10/10 tests (`reports/DNS-IMPLEMENTATION-REPORT.md:15`). It also reports 18/18 DNS tests (`:233-234`) and 65/65 non-database tests (`:274-275`). This audit treats those as report claims, not as independently reproduced results.

The current read-only database query in §5 did connect successfully using the compiled DNS helper, which is consistent with the DNS report but does not by itself prove the full test suite.

### 2.3 Reports read

The following existing reports were read or inspected for relevant claims:

- `reports/DNS-IMPLEMENTATION-REPORT.md`
- `reports/S2-IMPLEMENTATION-REPORT.md`
- `reports/S2-ACCEPTANCE-AUDIT-REPORT.md`
- `reports/S2-PLANNING-AND-ROADMAP-REPORT.md`
- `reports/S2-PRE-IMPLEMENTATION-AUDIT-REPORT.md`
- `S2-SUMMARY.md`

Their claims were used as leads and rechecked against current source and the current application database.

### 2.4 PRD integrity record

The current repository records the following checksums and sizes:

| File | SHA-256 | Size |
|---|---|---:|
| `PRD.md` | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | 28,170 bytes |
| `PRD-ORIGINAL.txt` | `7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed` | 28,031 bytes |
| `PRD.txt` | `80f7f293030ec9cb8429811b74233d1906500c11b47c9a214a6521db3884d873` | 28,025 bytes |

`PRD-MD-SHA256.txt` records that:

- `PRD.md` is the sole authoritative PRD.
- `PRD-ORIGINAL.txt` is the preserved reference copy.
- A six-line “Final authority” section was appended to `PRD.md` with owner approval, so `PRD.md` and `PRD-ORIGINAL.txt` are intentionally not byte-identical.
- If the two diverge, `PRD.md` governs and the discrepancy is reported, never automatically reconciled.

`PRD-SHA256.txt` records `PRD.txt` as an archived, superseded, non-authoritative copy with checksum `80f7...`.

The supplied baseline checksum `1e73e32...` matches `PRD.md`, not `PRD.txt`. This is a document-role/baseline conflict, not evidence that the authoritative PRD was altered. This audit did not modify, reconcile, rename, or reformat any PRD file. Owner confirmation is still required if a task instruction expects `PRD.txt` to match the `PRD.md` baseline.

---

## 3. Exact target lesson identity

The owner's phrase “Why Bitcoin exists” is the module title, not the lesson title. The exact identities are:

| Object | Field | Value |
|---|---|---|
| Course | slug | `01-bitcoin-101` |
| Course | title | Bitcoin 101 |
| Course | status in app DB | `published` |
| Module | slug | `why-bitcoin-exists` |
| Module | title | Why Bitcoin exists |
| Module | order | 1 |
| Lesson | slug | `btc101-money-problem` |
| Lesson | title | Money and the problem Bitcoin addresses |
| Lesson | moduleSlug | `why-bitcoin-exists` |
| Lesson | order | 1 |
| Lesson | isPreview | false |
| Lesson | status in app DB | `published` |
| Lesson check | slug | `btc101-money-problem-check` |
| Lesson check | kind | `lesson` |
| Lesson check | courseSlug | `01-bitcoin-101` |
| Lesson check | lessonSlug | `btc101-money-problem` |
| Lesson check | title | Check: money and the problem Bitcoin addresses |
| Lesson check | passingScore | 67 |
| Lesson check | questions in source | 2 |

Source evidence:

- Module declaration: `server/src/content/courses/01-bitcoin-101.ts:14-19`.
- Lesson declaration: `server/src/content/courses/01-bitcoin-101-a.ts:13-18`.
- Target quiz declaration: `server/src/content/quizzes/01-bitcoin-101.ts:4-35`.

Database evidence for the lesson and course is in §5. There is no database evidence for the quiz because the record is absent.

The fact that the user saw lesson content means the page was not blocked by the non-preview 401 path. The target lesson is not the anonymous preview lesson; the single preview lesson is `btc101-what-is-bitcoin` (`server/test/content.test.ts:41-46`).

---

## 4. Source content and seed mapping

### 4.1 Current source totals

A read-only import of `server/src/content/index.ts` produced:

| Content type | Count |
|---|---:|
| Courses | 8 |
| Lessons | 22 |
| Preview lessons | 1 |
| Quizzes | 30 |
| Lesson checks | 22 |
| Course assessments | 8 |
| Questions | 87 |
| Lesson-check questions | 44 |
| Assessment questions | 43 |
| Achievements | 3 |

`validateContent()` returned no problems. Correct-answer positions are 29 / 29 / 29 across the three option positions. All lesson checks have 2 questions and passing score 67; all course assessments have passing score 80; Bitcoin 101 has 8 assessment questions and the other seven courses have 5 each. There were no deviations.

The content tests encode the same expectations: `server/test/quiz-content.test.ts:11-45` checks 30 quizzes, 22 lesson checks, 8 assessments, one check per lesson, 2–3 questions per check, one assessment per course, and the assessment question counts.

### 4.2 Target quiz definition and references

`server/src/content/quizzes/01-bitcoin-101.ts:4-35` defines:

- `slug: 'btc101-money-problem-check'`
- `kind: 'lesson'`
- `courseSlug: '01-bitcoin-101'`
- `lessonSlug: 'btc101-money-problem'`
- `title: 'Check: money and the problem Bitcoin addresses'`
- `passingScore: 67`
- 2 questions

The course and lesson references match the lesson declaration exactly. The target is not orphaned in source.

### 4.3 Inclusion in the quiz export

`server/src/content/quizzes/index.ts:1-20` imports `bitcoin101Quizzes` and spreads it into the exported `quizzes` array. `server/src/content/index.ts:9` imports that array and `server/src/content/index.ts:32` exports `quizzes` to the seeder.

### 4.4 Seeder behavior

`server/src/seed/seedContent.ts:23-31` validates content before writing. `server/src/seed/seedContent.ts:76-101` upserts each quiz by slug with `status: 'published'`, `version: 1`, and the authored questions. There is no condition that filters out the target quiz. `server/src/seed/seedContent.ts:155-161` asserts that 30 quizzes and 3 achievements were seeded and stored.

The seeder also performs two stale-content operations:

- Stale quizzes not present in authored content are set to `draft`: `server/src/seed/seedContent.ts:103-106`.
- Stale achievements not present in authored content are set to `draft`: `server/src/seed/seedContent.ts:124-127`. This second behavior was not approved. See §10.6.

The seeder is not run on server startup. `server/src/index.ts:10-46` connects to the database, ensures indexes, creates the session store, and starts the HTTP server; it never calls `seedContent()`. The only normal entry point is `server/src/seed/run.ts:6-20`, invoked by `npm run seed` (`package.json:10`, `server/package.json:14`).

### 4.5 Conclusion for the source/seed stage

The source and seed path is connected and complete for the target lesson check. The missing link is the database write: the seeder has not been run against `kaos_academy`.

---

## 5. Database target and read-only state findings

### 5.1 Target database

The configured application database is `kaos_academy`:

- `server/.env` contains `MONGODB_DB=kaos_academy`.
- `server/.env` contains `NODE_ENV=development` and `PORT=4000`.
- `MONGODB_URI` and `SESSION_SECRET` are present; their values were not printed.

The test database is derived as `${MONGODB_DB}_test` by `server/test/db.integration.test.ts:24`, so the guarded test target is `kaos_academy_test`. It is not the application database.

### 5.2 Read-only method

The database was inspected with a direct MongoDB `MongoClient` connection, using the compiled DNS lookup helper from `server/dist/lib/dns.js`. The query used only:

- `listCollections`
- `countDocuments`
- `findOne`
- `aggregate` with `$match`, `$group`, `$project`, and `$size`

No `insert`, `update`, `delete`, `deleteMany`, `dropDatabase`, `createIndex`, `ensureIndexes`, or seeder call was made. No URI, credential, cookie, session value, or learner record was printed. No full quiz document or answer key was dumped.

### 5.3 Application database counts

| Collection | Count in `kaos_academy` |
|---|---:|
| `courses` | 8 |
| `lessons` | 22 |
| `quizzes` | 0 |
| `achievements` | 0 |
| `quiz_attempts` | 0 |
| `xp_events` | 0 |
| `user_achievements` | 0 |

The collections `courses`, `lessons`, `quizzes`, and `achievements` exist, but collection existence does not mean content exists. The quiz collection is empty.

### 5.4 Target records

The target lesson record is present and published:

```text
slug: btc101-money-problem
title: Money and the problem Bitcoin addresses
courseSlug: 01-bitcoin-101
moduleSlug: why-bitcoin-exists
status: published
isPreview: false
```

The parent course record is present and published:

```text
slug: 01-bitcoin-101
title: Bitcoin 101
status: published
```

The target quiz query returned no record:

```text
expected_quiz = null
target_lesson_quizzes = []
```

No quiz exists with `lessonSlug: 'btc101-money-problem'`, and no quiz exists with `slug: 'btc101-money-problem-check'`. There is therefore no record whose status, lesson reference, course reference, or question count could be inspected.

### 5.5 Test database state

The guarded test database `kaos_academy_test` was also inspected read-only:

| Collection | Count in `kaos_academy_test` |
|---|---:|
| `courses` | 0 |
| `lessons` | 0 |
| `quizzes` | 0 |
| `achievements` | 0 |
| `quiz_attempts` | 0 |
| `xp_events` | 0 |
| `user_achievements` | 0 |

This is consistent with the integration suite's cleanup. The test database cannot explain the application content, and it does not contain a seeded copy of the curriculum.

### 5.6 Interpretation

The database evidence is decisive for the visibility issue:

- The curriculum was seeded (8 courses, 22 lessons).
- The target lesson and course are published.
- S2 quiz/achievement content was not seeded (0 quizzes, 0 achievements).
- The target lesson check exists in source and in the seeder, but not in the application database.

This is an environment/data-state cause, not a source-content cause.

---

## 6. API request/response trace

### 6.1 Route mounting and access order

`server/src/app.ts:92-97` mounts:

- `/api/auth`
- `/api/courses`
- `/api/lessons`
- `/api/progress`
- `/api/dashboard`
- `/api/quizzes`

The quiz router applies `requireDb` and, for attempts/results, `requireAuth` before the handler. The attempt route also applies a rate limiter and validation before the handler (`server/src/routes/quizzes.ts:174-179`).

### 6.2 Lesson endpoint

`GET /api/lessons/:lessonId`:

- Requires the database (`requireDb`): `server/src/routes/lessons.ts:21`.
- Finds a lesson by slug or ObjectId with `status: 'published'`: `:22-25`.
- Returns 404 if the lesson does not exist: `:27-29`.
- Requires authentication for non-preview lessons: `:31-34`.
- Loads the parent course with `status: 'published'`: `:37`.
- Loads published sibling lessons: `:38-41`.
- Loads the learner's progress if authenticated: `:42-44`.
- Loads the published lesson check for the lesson and course: `:45-52`.
- Returns 404 if the parent course is not published: `:55-57`.
- Includes `quiz` only as a summary (`slug`, `title`, `passingScore`, `questionCount`) and returns `quiz: null` when no published check exists: `:94-110`.

Because `kaos_academy` has no quiz record, the expected lesson response for `btc101-money-problem` is a 200 with `quiz: null`. This is a source-and-database inference, not a live HTTP observation, because no server was running.

### 6.3 Standalone quiz endpoint

`GET /api/quizzes/:quizId`:

- Requires the database (`requireDb`): `server/src/routes/quizzes.ts:174`.
- Finds a quiz by slug or ObjectId with `status: 'published'`: `:62-68`.
- Returns 404 if the quiz is missing or draft: `:69-70`.
- Resolves the parent course and requires `status: 'published'`: `:71-80`.
- For lesson quizzes, resolves the parent lesson, requires it to be published and to match the course, and uses the lesson's `isPreview` flag: `:78-96`.
- Returns 401 for an anonymous viewer of a non-preview quiz: `:99-100`.
- Allows the public preview exception only for the preview lesson: `:99-100`.
- Returns `toPublicQuiz(quiz)` with no correct option IDs or explanations: `:140-167`.
- Sets `Cache-Control: private, no-store` and `Vary: Cookie` on the successful response: `:161`.

The target quiz is non-preview. A signed-in learner would be allowed; an anonymous viewer would get 401. The target is not the preview lesson.

### 6.4 Attempt and results endpoints

`POST /api/quizzes/:quizId/attempts`:

- Requires DB, auth, rate limiting, and schema validation: `server/src/routes/quizzes.ts:174-179`.
- Loads an accessible quiz: `:180-181`.
- Scores submitted answers on the server: `:183-195`.
- Checks for an existing attempt by `{userId, quizId, attemptKey}` before opening a transaction: `:197-214`.
- Replays the original result if the stored answers are identical: `:200-201`.
- Returns `409 ATTEMPT_KEY_REUSED` if the stored answers differ: `:198-199`.
- Opens a transaction, writes the attempt, awards XP/achievements for a pass, and commits: `:235-314`.
- Handles duplicate-key races by reloading the original attempt: `:292-301`.
- Returns 201 for a new attempt and 200 for a replay: `:321-333`.

`GET /api/quizzes/:quizId/results`:

- Requires DB and auth: `server/src/routes/quizzes.ts:337`.
- Loads an accessible quiz: `:340`.
- Queries attempts for the current user and quiz only: `:342`.
- Returns selected answer, correct answer, correctness, and explanation in each feedback item: `:347-360`.
- Limits history to 20 attempts: `:360`.

### 6.5 Course assessment path

`GET /api/courses/:courseId` loads the published course and the published course assessment separately from the lesson check. The assessment lookup is at `server/src/routes/courses.ts:125-129`. The course detail DTO exposes an assessment summary with slug, title, question count, pass mark, attempts, best percent, and passed state (`server/src/routes/courses.ts:42-105`). The client links to `/quizzes/:slug` from `client/src/pages/CourseDetail.tsx:36-40` and renders the assessment card at `:113-148`.

This path also depends on the quiz collection. With 0 quizzes, the assessment summary is `null`, so no assessment card or link appears.

### 6.6 Live HTTP status

No live HTTP request was possible:

- `ps` found no running Node/Vite/npm process.
- `ss -ltnp` found no listening socket.
- `curl --max-time 2 http://127.0.0.1:4000/api/health` failed with exit code 7 (connection refused) and HTTP status 000.

Therefore no actual API status or response body is claimed. The expected shape is source-derived: `quiz: null` in the lesson response, and no quiz request from the client.

### 6.7 Answer-key handling

Public quiz DTOs omit `correctOptionId` and `explanation`:

- `server/src/lib/quiz.ts:140-167` maps only question id, prompt, scenario, and options.
- The route returns that DTO at `server/src/routes/quizzes.ts:161`.
- The content test checks no answer keys in the public DTO: `server/test/quiz.test.ts:150-157`.
- The DB access test checks the raw preview response does not contain `correctOptionId` or `"explanation"`: `server/test/db.integration.test.ts:424-426`.

Feedback containing the correct option and explanation is returned only after an authenticated submission or from the owner-scoped results endpoint. This is consistent with the approved design.

---

## 7. Frontend query-to-render trace

### 7.1 Route and lesson query

`client/src/App.tsx:21` maps `/lessons/:slug` to the `Lesson` page. `client/src/pages/Lesson.tsx:7-11`:

- Reads the route slug.
- Calls `useLesson(slug)`.
- Calls `useQuiz(lessonQuery.data?.quiz?.slug)`.

`client/src/lib/queries.ts:47-54` defines `useLesson`:

- Query key: `['lesson', slug]`.
- Endpoint: `GET /api/lessons/:slug`.
- Enabled only when `slug` is truthy.
- No custom stale time.

`client/src/lib/queries.ts:65-72` defines `useQuiz`:

- Query key: `['quiz', slug]`.
- Endpoint: `GET /api/quizzes/:slug`.
- Enabled only when `slug` is truthy.
- No custom stale time.

### 7.2 The exact conditional

`client/src/pages/Lesson.tsx:168-189` contains:

```text
{quiz ? (
  quizQuery.isPending ? ... :
  quizQuery.isError ? ... :
  quizQuery.data ? <QuizRunner ... /> : null
) : null}
```

The outer condition is `quiz`, which is the `quiz` summary from the lesson response. If the lesson API returns `quiz: null`, then:

- `useQuiz(undefined)` is disabled and sends no request.
- The outer conditional is false.
- `QuizRunner` is never mounted.
- No loading, error, or empty quiz placeholder is rendered.

This is exactly the observed symptom: lesson content, completion controls, navigation, and footer are present, but no knowledge check appears.

### 7.3 Other states

If a quiz summary exists but the quiz request is pending, the page renders “Loading the lesson check…” (`client/src/pages/Lesson.tsx:169-172`).

If the quiz request fails, the page renders a non-blocking message: “The lesson check could not be loaded right now. You can still read the lesson and mark it complete.” (`:173-179`).

If the quiz request succeeds, `QuizRunner` receives the quiz, viewer authentication state, and attempt summary (`:180-188`).

If the lesson is pending, the page shows “Loading lesson…” (`:13-19`). If the lesson request errors, it shows a 401, 404, or generic unavailable message (`:21-60`).

### 7.4 CSS and layout

No CSS rule is the cause. The inline quiz block is a normal `<div>`/`<section>` sibling after the lesson article (`client/src/pages/Lesson.tsx:164-189`). There is no `hidden`, `display: none`, negative z-index, or overflow clipping applied specifically to that block in the source. More importantly, the block is not mounted at all when `quiz` is null, so CSS concealment is not a viable explanation.

### 7.5 Type compatibility

`client/src/lib/types.ts:94-126` defines `LessonDetail.quiz` as a nullable `QuizSummary` and the quiz response as `QuizResponse` with `quiz: QuizView`, `viewer`, and `attemptSummary`. The server lesson response includes `quiz` as a summary and the standalone quiz response includes the public DTO plus viewer state. The field names and nullable shape match the client types.

### 7.6 Course assessment path

`client/src/pages/CourseDetail.tsx:9` calls `useCourse(slug)`. The course API supplies the assessment summary. `client/src/pages/CourseDetail.tsx:34-40` builds the assessment link only when `assessment` exists and sends anonymous users to login. The card is rendered at `:113-148`.

The assessment path is separate from the inline lesson-check path:

- Inline check: lesson response summary → separate `GET /api/quizzes/:slug` → `QuizRunner` inline.
- Course assessment: course response summary → link to `/quizzes/:slug` → standalone `Quiz` page.

Both depend on published quiz records. The fact that a course assessment card might work after seeding would not prove the inline lesson-check path works, and vice versa. In the current database, neither can work because there are no quizzes.

### 7.7 Frontend conclusion

The frontend is correctly wired for a quiz when the lesson response contains a quiz summary. It does not request or render a quiz when the summary is null. The missing database record is upstream of the frontend, so the frontend is not the root cause.

---

## 8. Browser and DOM verification

No browser or DOM verification was possible.

- No application process was running.
- No listening socket was present.
- A direct `curl` to `127.0.0.1:4000/api/health` failed with connection refused (exit 7).
- No browser session was open for this audit.

Build artifacts exist:

- `client/dist/index.html` and `client/dist/assets/*` have timestamps around 2026-11-01 22:41.
- `client/src/pages/Lesson.tsx` has a timestamp around 2026-11-01 22:28.
- `server/dist` was rebuilt around 2026-11-05 11:59.

These timestamps are not proof that the running page is current, because nothing was running. This audit does not claim that visual rendering, keyboard-only use, screen-reader behavior, Lighthouse, 360px mobile layout, or a production deployment was verified.

---

## 9. S2 scoring, attempts, XP, achievements, and completion audit

### 9.1 Content and thresholds

| Rule | Observed in source | Status |
|---|---|---|
| 22 lesson checks, 2 questions each | 22 checks, 44 questions | PASS |
| 8 course assessments | 8 assessments | PASS |
| Bitcoin 101 assessment: 8 questions | 8 | PASS |
| Other 7 assessments: 5 questions each | 5 each | PASS |
| Total 30 quizzes, 87 questions | 30 and 87 | PASS |
| Lesson-check pass threshold 67% | All checks use 67 | PASS |
| Course-assessment pass threshold 80% | All assessments use 80 | PASS |
| Answer keys/explanations excluded from public payloads | Public DTO omits them | PASS |

Source evidence: `server/src/content/quizzes/*.ts`, `server/src/content/index.ts:111-281`, `server/src/lib/quiz.ts:56-71,140-167`, and `server/test/quiz-content.test.ts:11-45`.

### 9.2 Attempt and scoring flow

The server-side flow is present and generally sound:

- The attempt schema requires a UUID `attemptKey`, at least one answer, at most 50 answers, and strict question/option objects (`server/src/schemas/quiz.ts:3-18`).
- `scoreQuiz` validates that every quiz question is answered exactly once, rejects unknown or duplicate question IDs, rejects options not belonging to the question, and computes score/percent/pass on the server (`server/src/lib/quiz.ts:84-147`).
- The pass threshold is inclusive: `percent >= quiz.passingScore` (`server/src/lib/quiz.ts:135-146`).
- Attempts persist the canonical selected answers and feedback (`server/src/routes/quizzes.ts:253-282`; model `server/src/models/QuizAttempt.ts:56-89`).
- Idempotency is enforced by a unique `{userId, quizId, attemptKey}` index (`server/src/models/QuizAttempt.ts:76-79`).
- Sequential same-key replay returns the original result and does not double-award XP (`server/src/routes/quizzes.ts:197-201,292-301`).
- Sequential different answers with the same key return `409 ATTEMPT_KEY_REUSED` (`server/src/routes/quizzes.ts:198-199`).
- Concurrent same-key same-answer requests are covered by a DB test (`server/test/db.integration.test.ts:577-600`).
- Different-key concurrent passing attempts have a retry assertion (`server/test/db.integration.test.ts:602-625`).

Two gaps remain:

1. **Same-key concurrent different answers can return 200 instead of 409.** The outer pre-check compares answers, but the in-transaction `current` branch only assigns the stored attempt and returns without comparing (`server/src/routes/quizzes.ts:249-251`). The route then responds 200 with the stored attempt (`:321-333`). The existing tests do not cover this interleaving. See §10.1.
2. **Course completion can be missed under a final-lesson/assessment race.** See §9.4 and §10.2.

### 9.3 XP and achievements

| Event | XP | Achievement | Evidence |
|---|---:|---|---|
| First passing lesson check | 10 | `first-check` | `server/src/lib/rewards.ts:14-18,232-247` |
| First passing course assessment | 25 | `first-assessment` | `server/src/lib/rewards.ts:14-18,248-266` |
| First course completion | 50 | `first-course` | `server/src/lib/rewards.ts:14-18,199-210` |
| Mark lesson complete only | 0 | none | `server/src/routes/progress.ts:157-169`; `server/src/lib/rewards.ts:186` |

The three approved achievements are defined in `server/src/content/achievements.ts:3-21`:

- `first-check`
- `first-assessment`
- `first-course`

There is no migration or backfill for S1 progress; XP and achievements begin with S2 events. This matches the no-retroactive-reward decision. The dashboard exposes XP and earned achievements (`server/src/routes/dashboard.ts:121-143`; `client/src/pages/Dashboard.tsx:80,203-220`).

### 9.4 Course-completion predicate and race

The predicate is correct in isolation:

```text
totalPublishedLessons > 0
and completedPublishedLessons === totalPublishedLessons
and assessmentPassed === true
```

Evidence: `server/src/lib/progress.ts:21-31`.

The race is in how the two event paths evaluate the predicate:

- Lesson completion writes progress, then calls `evaluateCourseCompletion` outside a transaction (`server/src/routes/progress.ts:118-169`).
- Assessment pass calls `awardQuizPassRewards`, which calls `evaluateCourseCompletion` inside the attempt transaction (`server/src/lib/rewards.ts:268`).

Possible interleaving:

1. Assessment transaction reads progress before the final lesson progress commits, so it sees an incomplete course.
2. Final lesson completion reads assessment attempts before the assessment transaction commits, so it sees no pass.
3. Both paths evaluate completion as false.
4. No reconciliation loop runs later.

The result can be no 50 XP and no `first-course` achievement even though the learner has completed both requirements. A later retry of “Mark as Complete” may catch up, but nothing guarantees one. The sequential DB test covers assessment-first and lessons-first (`server/test/db.integration.test.ts:666-938`), but not the concurrent final-lesson/assessment case.

### 9.5 Test evidence matrix

| Check | Definitions | Reported result | Independently rerun? | Status |
|---|---|---:|---|---|
| DNS tests | 18 declarations in `server/test/dns.test.ts` | 18/18 pass per DNS report `:233-234` | No | Report-only |
| Non-database suite | 65 declarations excluding `db.integration.test.ts` | 65/65 pass per DNS report `:274-275` | No | Report-only |
| Database integration | 10 declarations in `server/test/db.integration.test.ts` | 10/10 pass per DNS report `:15,334-336` | No | Report-only |
| Typecheck | `server` and `client` scripts | Report says passed | No | Report-only |
| Production build | `npm run build` | Report says passed; artifacts exist | No | Report-only |
| Client tests | No test script in `client/package.json:7-11` | None exist | — | NOT VERIFIED |
| Browser / keyboard / screen reader / Lighthouse / 360px | None | Not performed | No | NOT VERIFIED |
| Deployment | None | Not performed | No | NOT VERIFIED |
| Human content review | Report says deferred | Not performed | No | NOT VERIFIED |

The DNS report's database run is significant because it was completed on 2026-11-05 against the guarded `kaos_academy_test` database (`reports/DNS-IMPLEMENTATION-REPORT.md:15,304-336`). It does not prove production seeding, and it does not cover the concurrency cases above. The test database was empty when inspected in this audit, consistent with cleanup.

The DB test guard is correct in source:

- It enables only with `RUN_DB_TESTS=1` and a URI (`server/test/db.integration.test.ts:22-28`).
- It derives the target as `${MONGODB_DB}_test` (`:24`).
- It refuses writes unless the connected database is exactly `kaos_academy_test` (`:67-89`, `:120-143`).
- It uses `deleteMany`, not `dropDatabase` (`:79-88`, `:131-143`).

No raw test or build logs were reviewed in this audit.

---

## 10. Reassessment of previous acceptance findings

### 10.1 Same-key concurrent different answers — still present

**Status: CONFIRMED FROM CURRENT SOURCE; acceptance blocker.**

The outer pre-check is correct (`server/src/routes/quizzes.ts:197-214`), but the in-transaction branch at `:249-251` returns the stored attempt without comparing answers. If a concurrent request inserts the same key with different answers before this transaction's `findOne`, this request sees `current`, returns it, and never reaches the 409 comparison. The response path then returns 200 (`:321-333`).

The DB test covers sequential different answers (`server/test/db.integration.test.ts:569-575`) and concurrent same answers (`:577-600`), but not concurrent different answers with the same key. This remains a real idempotency violation relative to the approved decision.

### 10.2 Course-completion race — still present

**Status: CONFIRMED FROM CURRENT SOURCE; acceptance blocker.**

See §9.4. The two event paths can both observe an incomplete state and neither awards the 50 XP or `first-course`. No reconciliation or outbox exists. The sequential test does not cover concurrency.

### 10.3 Saved attempt history omits feedback — still present

**Status: CONFIRMED FROM CURRENT SOURCE; acceptance blocker for the learner-facing feedback requirement.**

The server returns per-question feedback from the results endpoint (`server/src/routes/quizzes.ts:347-360`). The standalone quiz page renders only score, total, percent, pass/fail, and completion date for each saved attempt (`client/src/pages/Quiz.tsx:128-140`). It does not render selected answer, correct answer, correctness, or explanation for saved attempts.

The inline runner does render immediate feedback after a submission (`client/src/components/Quiz.tsx:177-183`), so the gap is specifically the saved-attempt history, not the immediate result panel.

### 10.4 Correct-answer indication is color-only — still present

**Status: CONFIRMED FROM CURRENT SOURCE; accessibility gap.**

After submission, the option is styled with green/red border and background classes (`client/src/components/Quiz.tsx:147-160`). There is no textual marker on the option itself and no `aria-describedby`/`aria-label` that identifies the correct option. The feedback block below does say “Correct” or “Not quite” and gives the explanation (`:177-183`), but the option-level correct-answer state is color-only. This does not meet an accessible-by-default standard without manual assistive-technology verification.

### 10.5 Lesson completion does not verify parent course publication — still present

**Status: CONFIRMED FROM CURRENT SOURCE; draft-content inconsistency.**

`POST /api/progress/lessons/:lessonId/complete` checks only that the lesson is published (`server/src/routes/progress.ts:105-113`). The lesson detail route does check the parent course (`server/src/routes/lessons.ts:37,55-57`), and the quiz route does check it (`server/src/routes/quizzes.ts:71-80`). A published lesson attached to a draft course can therefore be completed through the progress API. It will not earn course-completion XP because `evaluateCourseCompletion` requires a published course (`server/src/lib/rewards.ts:142-197`), but a progress record can be written and can appear in dashboard fallback data (`server/src/routes/dashboard.ts:107-119`).

### 10.6 Stale achievements auto-drafted without approval — still present; owner decision required

**Status: CONFIRMED FROM CURRENT SOURCE; NEEDS OWNER DECISION.**

`server/src/seed/seedContent.ts:124-127` runs `AchievementModel.updateMany` and sets every achievement not present in the authored content to `draft`.

Exact effects:

- It affects achievement **definitions** in the `achievements` collection.
- It does **not** delete or rewrite `user_achievements` records.
- It is executed during normal `seedContent()` runs, which are invoked by `npm run seed` and by the database integration suite.
- It is not executed on server startup.
- Earned achievements are currently read by slug without a status filter (`server/src/lib/rewards.ts:117-140`), so existing earned achievements would still resolve even if their definitions were drafted. However, any future query or UI that filters on `status: 'published'` would hide them.
- The behavior could draft legacy achievement definitions that were previously published. That is a production-data change beyond the explicitly approved stale-quiz retirement.

The approved decision covers stale **quizzes** becoming `draft`; no equivalent approval exists for achievements. This must be resolved before any production seed. See `reports/S2-ACCEPTANCE-AUDIT-REPORT.md:351-358` and `S2-SUMMARY.md:43`.

### 10.7 Malformed JSON returns 500 and may log raw body — still present

**Status: CONFIRMED 500 FALLTHROUGH; raw-body logging is a source-level risk, not live-verified.**

- `express.json({ limit: '32kb' })` is mounted at `server/src/app.ts:67`.
- The error handler handles `AppError`, `ZodError`, Mongoose `CastError`, and duplicate key, but not body-parser `SyntaxError`/`entity.parse.failed` (`server/src/middleware/errors.ts:22-66`).
- It falls through to `logger.error({ err: error, ... })` and a 500 response (`:68-71`).
- Body-parser parse errors can carry the raw body in the error object. Logger redaction covers cookies, authorization, passwords, secrets, `MONGODB_URI`, and `SESSION_SECRET`, but not `err.body` or a raw request body (`server/src/logger.ts:8-20`).

The 500 response is confirmed by source. The raw-body logging exposure is a plausible source-level risk; it was not exercised with a live request because this audit did not start the application.

### 10.8 Fallback attempt key is not a UUID — still present

**Status: CONFIRMED FROM CURRENT SOURCE; compatibility gap.**

`client/src/components/Quiz.tsx:15-20` uses `crypto.randomUUID()` when available, otherwise falls back to:

```text
`${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
```

That fallback is not a UUID. The server schema requires `z.string().uuid()` (`server/src/schemas/quiz.ts:5`). In an environment without `crypto.randomUUID`, a submission would be rejected with a 400 validation error. Modern secure-context browsers provide `crypto.randomUUID`, but the fallback is not a valid substitute.

### 10.9 Answer comparison is order-sensitive — still present

**Status: CONFIRMED FROM CURRENT SOURCE; low-to-medium audit/versioning risk.**

`canonicalAnswersEqual` compares `answers[index]?.questionId` and `selectedOptionId` at each index (`server/src/lib/quiz.ts:169-179`). It does not sort or key by question ID.

The test title says “ignores order” (`server/test/quiz.test.ts:159`), but the test body only compares an identical-order array (`:160-169`). It does not actually reorder the input.

In the normal flow, the route scores submitted answers into canonical quiz order and stores that canonical order, so the comparison usually sees the same order. The risk appears if a stored attempt's question order differs from the current quiz order, for example after content reordering. The helper name and test title imply order-insensitivity that the implementation does not provide.

### 10.10 Cache headers are absent on middleware-generated 401/503/429 — still present

**Status: CONFIRMED FROM CURRENT SOURCE; low risk/test gap.**

`setQuizCacheHeaders` is called inside the quiz route handler at `server/src/routes/quizzes.ts:161,179,338`. `requireDb`, `requireAuth`, and `attemptLimiter` run before the handler. Their 401, 503, and 429 responses do not receive `Cache-Control: private, no-store` or `Vary: Cookie`. Successful quiz responses do receive them, and those are covered by tests (`server/test/db.integration.test.ts:422-423,513,649`).

### 10.11 Prior finding: different-key concurrency not verified

**Status: REPORTED PASS, NOT INDEPENDENTLY RERUN.**

The assertion exists at `server/test/db.integration.test.ts:602-625`. The DNS report records a 10/10 database integration pass on 2026-11-05 (`reports/DNS-IMPLEMENTATION-REPORT.md:15,334-336`). This is stronger evidence than the earlier “not verified” state, but this audit did not rerun the suite or inspect raw logs. It should be treated as a reported pass pending independent confirmation.

### 10.12 Prior finding: transaction fallback not implemented

**Status: STILL NOT IMPLEMENTED; conditional deployment risk.**

The attempt route uses `session.withTransaction` (`server/src/routes/quizzes.ts:235`). There is no fallback for an environment that cannot support transactions. The implementation report says the current Atlas target supports transactions (`reports/S2-IMPLEMENTATION-REPORT.md:350`). This is acceptable only if the production deployment target is confirmed to support them. It remains a conditional acceptance/deployment risk.

---

## 11. Security and privacy findings

### 11.1 Passes

- Public quiz responses omit correct option IDs and explanations (`server/src/lib/quiz.ts:140-167`; `server/src/routes/quizzes.ts:161`).
- Saved results are owner-scoped: the results query filters by the current session user and quiz (`server/src/routes/quizzes.ts:339-360`).
- Cross-user result access is covered by the DB test (`server/test/db.integration.test.ts:660-663`).
- Authentication is applied before attempt creation and results (`server/src/routes/quizzes.ts:174-176,337`).
- Anonymous attempts and anonymous results for the preview quiz return 401 (`server/test/db.integration.test.ts:440-449`).
- Non-preview quiz retrieval for anonymous viewers returns 401 (`server/test/db.integration.test.ts:437-438`).
- Draft or missing quiz retrieval returns 404 (`server/src/routes/quizzes.ts:69-70`).
- Parent course and lesson publication state is checked on the standalone quiz path (`server/src/routes/quizzes.ts:71-96`).
- Request validation is strict: UUID attempt key, answer array limits, and strict objects (`server/src/schemas/quiz.ts:3-18`).
- Rate limiting is present and applied after authentication (`server/src/routes/quizzes.ts:31-39,175-176`).
- Cross-origin mutations are rejected by the origin guard (`server/src/middleware/origin.ts:21-53`).
- No answer key appears in client source outside the feedback types and post-submission rendering (`client/src/lib/types.ts:235-237`; `client/src/components/Quiz.tsx:147,182`).
- No credentials, URI, session value, or learner record was printed during this audit.

### 11.2 Gaps and risks

- Malformed JSON falls through to 500 and may log a raw body; see §10.7.
- Cache headers are absent on middleware-generated 401/503/429; see §10.10.
- The client fallback attempt key is not a UUID; see §10.8.
- The correct-answer state is color-only; see §10.4.
- No client test framework exists (`client/package.json:7-11`), so client security/accessibility behavior is source-inspection only.
- No manual browser, keyboard-only, screen-reader, Lighthouse, or 360px mobile verification exists.

No sensitive values were exposed in this report.

---

## 12. Root-cause diagnosis for the missing lesson quiz

### 12.1 Confirmed evidence chain

1. The target lesson exists in source and is published in the application database: `btc101-money-problem`, module `why-bitcoin-exists`, course `01-bitcoin-101` (`server/src/content/courses/01-bitcoin-101-a.ts:13-18`; DB query in §5).
2. The target lesson check exists in source and in the seeder: `btc101-money-problem-check`, 2 questions, passing score 67 (`server/src/content/quizzes/01-bitcoin-101.ts:4-35`; `server/src/content/quizzes/index.ts:1-20`; `server/src/seed/seedContent.ts:76-101`).
3. The application database `kaos_academy` has 8 courses and 22 lessons but 0 quizzes (`§5.3`).
4. The target quiz query returned `null`, and no quiz with the target lesson slug exists (`§5.4`).
5. The lesson API queries for a published lesson check and returns `quiz: null` when none exists (`server/src/routes/lessons.ts:45-52,94-110`).
6. The client only fetches a quiz when `lesson.quiz.slug` exists (`client/src/pages/Lesson.tsx:11`; `client/src/lib/queries.ts:65-72`).
7. The inline render block is guarded by `{quiz ? ... : null}` (`client/src/pages/Lesson.tsx:168-189`). With `quiz: null`, the component is never mounted.

### 12.2 Conclusion

**Confirmed root cause: the application database has not been seeded with S2 quiz content. The target lesson check exists in source and in the seeder, but the `kaos_academy` database contains zero quiz records. The lesson API therefore has no quiz summary to return, the client never requests a quiz, and the inline quiz component never mounts.**

This is a data/operations cause, not a CSS, routing, or component-wiring cause.

### 12.3 Alternatives eliminated or reduced

| Alternative | Finding |
|---|---|
| Quiz definition missing from source | Eliminated. It exists at `server/src/content/quizzes/01-bitcoin-101.ts:4-35`. |
| Quiz not included in seed content | Eliminated. It is included via `server/src/content/quizzes/index.ts:1-20` and seeded at `server/src/seed/seedContent.ts:76-101`. |
| Quiz references wrong lesson/course | Eliminated. The references match the lesson and course declarations. |
| Quiz exists but is draft | Not applicable. No record exists at all. |
| Quiz exists but orphaned | Not applicable. No record exists at all. |
| API does not return the quiz | Consequence, not cause. The API returns null because no published record exists. |
| Frontend never requests the quiz | Consequence, not cause. It is disabled because the lesson response has no quiz slug. |
| Frontend query fails or receives incompatible response | No request is made, so no query failure occurs. Types match. |
| Rendering condition prevents mount | Consequence of the null summary; the condition is working as designed. |
| Component mounts but CSS hides it | Eliminated. The component is not mounted. |
| Stale application build or mismatched server | Cannot be fully assessed because nothing is running; the database absence is sufficient to explain the symptom regardless of build state. |

### 12.4 Remaining uncertainty

The exact live DOM and API response were not observed because no server or browser was running. The database record absence and the source-level conditional are sufficient to explain the symptom, but a future live check should confirm that after seeding the lesson response contains a quiz summary and the component mounts.

---

## 13. Prioritized findings table

| # | Severity | Finding | Evidence | Acceptance impact |
|---:|---|---|---|---|
| 1 | Critical / environment | Application DB has 0 quizzes; target check absent | `kaos_academy` counts in §5.3-5.4; source `server/src/routes/lessons.ts:45-52,94-110` | The lesson check is invisible. This is the direct cause of the owner's report. Production seeding is required before acceptance in this environment. |
| 2 | High | Course-completion race can miss 50 XP and `first-course` | `server/src/routes/progress.ts:118-169`; `server/src/lib/rewards.ts:268`; `server/test/db.integration.test.ts:666-938` | Acceptance blocker. Sequential tests pass, but concurrent final lesson + assessment can both miss completion. |
| 3 | High | Same-key concurrent different answers can return 200 instead of 409 | `server/src/routes/quizzes.ts:197-214,249-251,321-333`; tests `server/test/db.integration.test.ts:569-600` | Acceptance blocker. Violates the approved idempotency rule. |
| 4 | High | Saved attempt history omits selected answer, correct answer, correctness, and explanation | `client/src/pages/Quiz.tsx:128-140`; server feedback `server/src/routes/quizzes.ts:347-360` | Acceptance blocker for the learner-facing feedback requirement. Immediate feedback works; history does not. |
| 5 | High / owner decision | Stale achievements are auto-drafted without approval | `server/src/seed/seedContent.ts:124-127` | Must be resolved before any production seed. Affects achievement definitions, not user history directly, but can draft legacy definitions. |
| 6 | Medium | Correct-answer state is color-only | `client/src/components/Quiz.tsx:147-160` | Accessibility gap; needs textual/ARIA indication and manual verification. |
| 7 | Medium | Lesson completion does not verify parent course is published | `server/src/routes/progress.ts:105-113`; contrast `server/src/routes/lessons.ts:37,55-57` | Draft-content inconsistency; can write progress for a lesson in a draft course. |
| 8 | Medium | Malformed JSON returns 500 and may log raw body | `server/src/app.ts:67`; `server/src/middleware/errors.ts:22-71`; `server/src/logger.ts:8-20` | Robustness/privacy risk; add 400 handling and a malformed-JSON test. |
| 9 | Low | Fallback attempt key is not a UUID | `client/src/components/Quiz.tsx:15-20`; `server/src/schemas/quiz.ts:5` | Compatibility gap in environments without `crypto.randomUUID`. |
| 10 | Low | `canonicalAnswersEqual` is order-sensitive despite its test title | `server/src/lib/quiz.ts:169-179`; `server/test/quiz.test.ts:159-169` | Audit/versioning risk; test does not actually reorder. |
| 11 | Low | Cache headers absent on middleware 401/503/429 | `server/src/routes/quizzes.ts:31-39,161,174-179,338` | Low privacy/caching risk; successful responses are covered. |
| 12 | Conditional | No transaction fallback for attempt creation | `server/src/routes/quizzes.ts:235`; `reports/S2-IMPLEMENTATION-REPORT.md:350` | Deployment risk if the production target cannot support transactions. |
| 13 | Informational | Seeder has no environment guard and is not run at startup | `server/src/seed/run.ts:6-20`; `server/src/index.ts:10-46` | Production seeding is process-controlled, not code-guarded. Combined with finding 5, do not run against production yet. |
| 14 | Informational | Test evidence is report-only in this audit | DNS report `:15,233-234,274-275,334-336`; test counts in §9.5 | 18 DNS, 65 non-DB, and 10 DB tests are reported passed; not independently rerun. Browser/client tests remain absent. |
| 15 | Informational | `PRD.txt` does not match the supplied `PRD.md` baseline | §2.4; `PRD-MD-SHA256.txt`; `PRD-SHA256.txt` | Document-role/baseline issue; owner confirmation required. Do not reconcile automatically. |

---

## 14. Recommended next steps

### 14.1 Confirmed implementation defects (require explicit owner authorization)

1. Fix the course-completion race by reconciling completion after both event types, or by using a transactional/outbox approach that cannot miss the transition. Add a concurrency test that starts the final lesson completion and assessment pass together and asserts exactly one 50 XP event and one `first-course` award.
2. Add answer comparison to the in-transaction `current` branch in `server/src/routes/quizzes.ts:249-251`, and add a concurrent same-key/different-answer test that asserts `409 ATTEMPT_KEY_REUSED`.
3. Render saved-attempt feedback in `client/src/pages/Quiz.tsx:128-140`: selected answer, correct answer, correctness, and explanation, using the already-returned server feedback.
4. Add a textual/ARIA correct-answer indicator to `client/src/components/Quiz.tsx:147-160`, not color alone.
5. Add a parent-course publication check to lesson completion in `server/src/routes/progress.ts:105-113`, and test a published lesson in a draft course.
6. Add a body-parser `SyntaxError`/`entity.parse.failed` branch returning 400, and ensure raw bodies are not logged. Add a malformed-JSON test.
7. Replace the non-UUID fallback attempt key with a valid UUID fallback, or remove the fallback and fail with a clear client error.
8. Make `canonicalAnswersEqual` order-insensitive, or rename it and the test to state that order is significant. Prefer keying by question ID.
9. Apply quiz cache headers to middleware-generated 401/503/429 responses.
10. Decide whether a transaction fallback is required for the production deployment target; implement it if required.

### 14.2 Missing verification

1. Rerun exact-current-code typecheck, production build, non-database suite, and guarded database suite, and retain raw logs.
2. Add and run concurrency tests for same-key/different-answer attempts and final-lesson/assessment completion.
3. Add and run malformed-JSON, rate-limit 429, cache-header failure, parent-course draft, and stale-quiz-preserves-attempts tests.
4. Perform manual browser verification of the target lesson after seeding: confirm the lesson response contains the quiz summary, the quiz request occurs, the component mounts, and the inline check is visible.
5. Perform keyboard-only, screen-reader, Lighthouse, and 360px mobile checks.
6. Verify deployment behavior and production database state separately.
7. Complete human subject-matter review of the 30 quizzes/87 questions.

### 14.3 Owner decisions

1. **Stale achievements:** approve automatic drafting, or require the seeder to stop drafting achievements. Do not run the seeder against production until this is resolved.
2. **Production seeding:** explicitly authorize seeding `kaos_academy` with S2 quiz and achievement content. This is the direct fix for the current visibility issue, but it must wait for the stale-achievement decision.
3. **PRD baseline:** confirm whether `PRD.txt` or `PRD.md` is the intended baseline for future checksum instructions. Do not reconcile the files automatically.
4. **Transaction fallback:** confirm whether the production Atlas/deployment target supports transactions, and whether a fallback is required.
5. **Implementation authorization:** explicitly authorize the defect fixes in §14.1 before any source change.

---

## 15. Confirmation of no changes

This audit was strictly read-only except for creating this report.

- No application source code was edited, created, deleted, renamed, or reformatted.
- No test file was edited, created, deleted, renamed, or reformatted.
- No existing documentation or report was modified.
- No `PRD.md`, `PRD-ORIGINAL.txt`, `PRD.txt`, or checksum record was modified, renamed, or reconciled.
- No seeder was run.
- No database record was inserted, updated, deleted, or cleaned.
- No `deleteMany`, `dropDatabase`, migration, or index creation was executed.
- No integration test, unit test, typecheck, build, or production command was run.
- No backend, frontend, database, or DNS service was started, stopped, restarted, or reconfigured.
- No environment variable, DNS setting, MongoDB setting, or Atlas access rule was changed.
- No Git operation that modifies repository state was performed: no staging, commit, branch, checkout, reset, stash, clean, or push.
- No deployment or external service provisioning was performed.
- No credentials, connection URI, session value, cookie, token, answer key, or learner record was printed.

The only new file created is:

`reports/S2-QUIZ-IMPLEMENTATION-AND-VISIBILITY-AUDIT.md`

The repository Git state after creating this report is recorded in the final response and contains no staged changes and no modification to existing tracked files beyond the pre-existing S2/DNS work.

### 15.1 Read-only database query note

The application database was queried through a direct `MongoClient` connection using the compiled DNS helper. The query performed only metadata reads. The database name was `kaos_academy`; the test database was `kaos_academy_test`. No URI or credential was printed. The application database returned 8 courses, 22 lessons, 0 quizzes, 0 achievements, 0 quiz attempts, 0 XP events, and 0 user achievements. The test database returned 0 for the counted collections.

### 15.2 Final note

The immediate visibility issue is not a code mystery: the quiz exists in source and in the seeder, but it is absent from the application database. Seeding S2 content is necessary but not sufficient for acceptance, because the four previously reported acceptance blockers and the additional lower-severity defects remain.
