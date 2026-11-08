# S2 Final Actual-Application Acceptance Report

**Date:** 2026-11-07 (UTC)  
**Repository:** `/data/data/com.termux/files/home/kaos-bitcoin-academy`  
**Authoritative specification:** `PRD.md`  
**PRD SHA-256 before work:** `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`  
**PRD SHA-256 after work:** `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`  
**Main database:** `kaos_academy`  
**Main backend:** `http://127.0.0.1:4000`  
**Frontend:** `http://127.0.0.1:5173`  
**Branch / HEAD:** `main` / `1f1d51538fae8f946f1b4b7cc933ed4dc6fbf43f`  
**S2 functional result:** PASS at the database, API, learner-flow, XP, achievement, course-completion, and idempotency levels.  
**S2 overall acceptance result:** **NOT FULLY ACCEPTED** as a complete end-to-end acceptance because browser/rendered-UI acceptance remains **NOT VERIFIED**. No functional S2 defect was found.  
**Supersedes:** the pre-seed FAIL-state report `reports/S2-ACTUAL-APPLICATION-ACCEPTANCE-VERIFICATION.md`; that earlier report is retained unchanged as historical evidence.

---

## 1. Main database identity

The main application was confirmed to use `kaos_academy`, not `kaos_academy_test`:

- `server/.env` contains the non-secret setting `MONGODB_DB=kaos_academy`.
- The seed process logged `"db":"kaos_academy"` when it connected.
- A read-only MongoDB connection reported `databaseName: "kaos_academy"`.
- The live backend health endpoint returned HTTP 200 with `{"status":"ok","db":"up"}`.
- Live API data matched the records in `kaos_academy`.
- The isolated `kaos_academy_test` database was not used as proof of main-application readiness.
- No MongoDB connection string, credential, session secret, cookie value, or session identifier is reproduced in this report.

---

## 2. Before-and-after collection counts

The counts below come from three verified snapshots plus the final report-close read:

- **Before seed:** verified pre-seed backup.
- **After seed:** verified pre-flow backup, after two seed runs.
- **After controlled test flow:** final reconciliation immediately after the dedicated test identity completed its flow.
- **At report close:** final count after real, additive live-app activity by the pre-existing learner.

| Collection | Before seed | After seed | After controlled test flow | At report close | Explanation |
|---|---:|---:|---:|---:|---|
| `courses` | 8 | 8 | 8 | 8 | Authored courses preserved |
| `lessons` | 22 | 22 | 22 | 22 | Authored lessons preserved |
| `quizzes` | 0 | 30 | 30 | 30 | 22 lesson checks + 8 assessments |
| `achievements` | 0 | 3 | 3 | 3 | Approved achievement definitions |
| `users` | 1 | 1 | 3 | 3 | Existing user preserved; two dedicated test identities added |
| `progresses` | 6 | 6 | 14 | 14 | Existing 6 preserved; 8 controlled test progress records added |
| `quiz_attempts` | 0 | 0 | 5 | 6 | 5 controlled test attempts; 1 additive live-app attempt by pre-existing learner |
| `xp_events` | 0 | 0 | 3 | 5 | 3 controlled test events; 2 additive live-app events by pre-existing learner |
| `user_achievements` | 0 | 0 | 3 | 5 | 3 controlled test awards; 2 additive live-app awards by pre-existing learner |
| `sessions` | 1 | 1 | 3 | 3 | Existing session preserved; two sessions belong to the aborted auth-only test identity |

The increase between “after controlled test flow” and “at report close” is live application activity, not a seeder or verification-client write. It was recorded at `2026-11-07T01:50:58Z` through `2026-11-07T01:51:00Z`, after the controlled test flow had finished at approximately `01:43Z`.

A final read-only count recheck at `2026-11-07T02:00:32.638Z` returned: courses 8, lessons 22, quizzes 30, achievements 3, progresses 14, quiz attempts 6, XP events 5, user achievements 5, users 3, sessions 3.

---

## 3. Seeder operations

### 3.1 Inspection result

`server/src/seed/run.ts` connects to the configured main database, calls `ensureIndexes()`, then runs `seedContent()`.

`seedContent()`:

- Upserts authored courses, lessons, quizzes, and achievement definitions.
- Sets authored records to `published`.
- Marks quizzes that are not in the authored set as `draft`.
- Creates indexes through `ensureIndexes()`.
- Does **not** delete courses, lessons, quizzes, achievements, users, progress, attempts, XP events, user achievements, or sessions.
- Does **not** create quiz attempts.
- Does **not** award XP or achievements.
- Does **not** reset or overwrite learner progress.
- Does **not** recreate users or invalidate sessions.

The `QuizModel.updateMany` stale-quiz operation is non-destructive; it only changes status to `draft` for non-authored quiz slugs. In this database, it affected no records because all stored quizzes are authored S2 quizzes.

### 3.2 Execution

- `npm run seed` was executed twice against `kaos_academy`.
- First run: created the missing 30 quizzes and 3 achievement definitions, and confirmed the existing 8 courses and 22 lessons.
- Second run: produced the same content counts, no duplicate content, and no learner-data changes.
- Both runs emitted only Mongoose deprecation warnings about the legacy `new` option in `findOneAndUpdate`; these warnings did not affect results.
- No cleanup, reset, drop, truncate, or database integration test was run.

The seeder is not the source of any learner activity. All controlled learner activity was created separately through the live API using the dedicated test identity.

---

## 4. Backup and preservation evidence

### 4.1 Backups

Two local, app-private backups were created outside the repository:

1. **Pre-seed backup:** `/data/data/com.termux/files/home/kaos-academy-backups/2026-11-07-s2-seed-before`
   - Manifest SHA-256: `bf2cf1b8aee065b9c902c942efa40b573cdd34c19113c1a42604cec21c3761fa`
   - 10 collections, 38 documents.
2. **Pre-flow backup:** `/data/data/com.termux/files/home/kaos-academy-backups/2026-11-07-s2-pre-flow`
   - Manifest SHA-256: `6a3a7a1c0757e2a8cdd213df973d38eabd3d825a9380670f1c4bc2f03d62e5b7`
   - 10 collections, 71 documents.

Each backup was exported as EJSON, then re-read and verified document-by-document against its collection count. Each manifest records per-collection document counts, file sizes, file SHA-256 values, and canonical document-set SHA-256 values.

The backups contain learner and session data and remain in app-private storage. They were deliberately not copied to device storage or included in this report.

### 4.2 Preservation comparison

Canonical EJSON comparison after the controlled flow showed:

| Existing data | Before | At final preservation check | Missing | Changed |
|---|---:|---:|---:|---:|
| Pre-existing user documents | 1 | 1 | 0 | 0 |
| Pre-existing progress documents | 6 | 6 | 0 | 0 |
| Pre-existing quiz attempts | 0 | 0 | 0 | 0 |
| Pre-existing XP events | 0 | 0 | 0 | 0 |
| Pre-existing user achievements | 0 | 0 | 0 | 0 |
| Pre-existing sessions | 1 | 1 | 0 | 0 |

The pre-existing session payload and user association are unchanged. Its expiry timestamp advanced from `2026-11-14T01:28:20.776Z` to `2026-11-14T01:51:31.034Z`, which is consistent with normal live-session touch activity. It was not invalidated or replaced.

An initial strict comparison flagged `__v` because the EJSON parser represented the integer as `Int32` while the live document held a JavaScript number. Canonical EJSON comparison confirmed that this was a serialization artifact, not a data change.

The live-app activity recorded for the pre-existing learner added new attempt, XP, and achievement records. It did not modify the pre-existing user document or any of the six original progress documents. Those new records were not created by the seeder or by the verification client.

---

## 5. Quiz and question verification

The main database now contains exactly the required S2 content:

- **8 published courses**
- **22 published lessons**
- **1 preview lesson**
- **22 published lesson knowledge-check quizzes**
- **8 published course assessments**
- **30 published quizzes total**
- **87 questions total**
- **3 published achievement definitions**

### 5.1 Content integrity

A field-level comparison against the authored content found:

- No missing course, lesson, quiz, or achievement slugs.
- No extra course, lesson, quiz, or achievement slugs.
- No duplicate slugs in any of the four content collections.
- No field mismatches in courses, lessons, quizzes, or achievements after excluding Mongo/Mongoose metadata fields (`_id`, `__v`, `createdAt`, `updatedAt`).
- All lesson-to-course and lesson-to-module associations valid.
- All lesson quizzes associated with the correct course and lesson.
- All course assessments associated with the correct course.
- All authored questions, options, correct answers, explanations, passing scores, and version values preserved exactly.

### 5.2 Per-course distribution

| Course | Lessons | Lesson quizzes | Assessments | Questions |
|---|---:|---:|---:|---:|
| `01-bitcoin-101` | 8 | 8 | 1 | 24 |
| `02-money-and-bitcoin` | 2 | 2 | 1 | 9 |
| `03-how-bitcoin-works` | 2 | 2 | 1 | 9 |
| `04-bitcoin-wallets` | 2 | 2 | 1 | 9 |
| `05-using-bitcoin` | 2 | 2 | 1 | 9 |
| `06-lightning-network` | 2 | 2 | 1 | 9 |
| `07-staying-safe` | 2 | 2 | 1 | 9 |
| `08-beyond-bitcoin` | 2 | 2 | 1 | 9 |
| **Total** | **22** | **22** | **8** | **87** |

### 5.3 Public answer-key protection

The live quiz DTOs returned questions and options without answer keys:

- Guest preview quiz: HTTP 200, 2 questions, no `correctOptionId`, no `explanation` field.
- Authenticated preview quiz: HTTP 200, no answer keys.
- Authenticated course assessment: HTTP 200, 8 questions, no answer keys.
- Guest non-preview quiz: HTTP 401.
- Guest course assessment: HTTP 401.
- Guest attempt submission: HTTP 401.

The word `explanation` appears only inside a lesson summary as ordinary prose in the course/lesson content. It is not a quiz answer-key field.

Correct answer identifiers and explanations are stored in the database and returned only after a submitted attempt, as verified through the live attempt responses.

---

## 6. Achievement verification

The three approved definitions exist and are published:

| Slug | Title | Status |
|---|---|---|
| `first-check` | First Check | Published |
| `first-assessment` | Assessment Passed | Published |
| `first-course` | Course Finisher | Published |

The controlled learner flow awarded them at the intended points:

- `first-check` after the first passing lesson knowledge check.
- `first-assessment` after the first passing course assessment.
- `first-course` only after all published Bitcoin 101 lessons were complete and the assessment had passed.

The database contains a unique index on `userId + achievementSlug`, and no duplicate award was created by a replay or by a second new attempt.

---

## 7. Learner-data preservation

### 7.1 Controlled test identity

A dedicated synthetic identity was used for all controlled learner submissions. No existing learner account was used for test submissions.

- Active test identity ID: `6aee82102c7f3d64e59ad380`
- Synthetic email domain: `example.invalid`
- Exact synthetic address: withheld
- Password: not retained

The controlled identity produced:

- 8 progress records for Bitcoin 101
- 5 quiz attempts
- 3 XP events
- 3 user achievement awards
- 0 active sessions after final logout

### 7.2 Aborted test identity

One additional synthetic identity was created during an initial test-client cookie-name error:

- Aborted test identity ID: `6aee80ae2c7f3d64e59ad37f`
- Learner activity: 0 progress, 0 attempts, 0 XP events, 0 achievements
- Sessions: 2 test-only sessions remain and will expire normally

This identity contains no course or reward activity. It was not used to alter any existing learner record. No cleanup script was run.

### 7.3 Live learner activity during the window

The pre-existing learner received additive live-app activity during the verification window:

- 1 Lightning Network assessment attempt, passed with score 4/4, at `2026-11-07T01:50:58.563Z`
- 25 XP for `course-assessment-pass:lightning-network-assessment`
- 50 XP for `course-complete:06-lightning-network`
- `first-assessment` at `2026-11-07T01:50:59.119Z`
- `first-course` at `2026-11-07T01:51:00.371Z`

This activity was not initiated by the verification client and was not created by the seeder. It is additive live application use. The pre-existing user document and all six original progress documents remain unchanged.

---

## 8. API verification

### 8.1 Guest and public behavior

| Check | Result | Evidence |
|---|---|---|
| `GET /api/health` | PASS | HTTP 200, database `up` |
| `GET /api/courses` | PASS | HTTP 200, 8 courses; assessment metadata present |
| Guest assessment attempts | PASS | `attempts: null`, `passed: null`; no guest learner state exposed |
| `GET /api/courses/01-bitcoin-101` | PASS | HTTP 200; assessment `btc101-assessment` present |
| `GET /api/lessons/btc101-what-is-bitcoin` | PASS | HTTP 200; preview lesson; quiz present |
| `GET /api/quizzes/btc101-what-is-bitcoin-check` | PASS | HTTP 200; 2 questions; no answer key; no attempt summary |
| `GET /api/quizzes/btc101-money-problem-check` | PASS | HTTP 401 as guest |
| `GET /api/quizzes/btc101-assessment` | PASS | HTTP 401 as guest |
| `GET /api/lessons/btc101-money-problem` | PASS | HTTP 401 as guest |
| `GET /api/dashboard` | PASS | HTTP 401 as guest |
| `GET /api/progress/01-bitcoin-101` | PASS | HTTP 401 as guest |
| Guest attempt submission | PASS | HTTP 401; no attempt created |

### 8.2 Authenticated behavior

| Check | Result | Evidence |
|---|---|---|
| Registration | PASS | HTTP 201; dedicated test session created |
| `GET /api/auth/me` | PASS | HTTP 200; correct test user |
| Authenticated preview lesson | PASS | HTTP 200; quiz metadata present |
| Authenticated non-preview quiz | PASS | HTTP 200; lesson quiz returned |
| Authenticated course assessment | PASS | HTTP 200; 8 questions; no answer keys |
| Lesson attempt submission | PASS | HTTP 201; scored correctly |
| Replay with same attempt key | PASS | HTTP 200; `replayed: true`; XP unchanged |
| New attempt with new key | PASS | HTTP 201; no duplicate reward |
| Course assessment submission | PASS | HTTP 201; 8/8; 25 XP |
| Lesson completion | PASS | HTTP 201 for all 8 Bitcoin 101 lessons |
| Dashboard | PASS | HTTP 200; 85 XP; 3 achievements; 8/8 course progress |
| Course progress detail | PASS | HTTP 200; 8 records; complete; assessment passed |
| Course detail and catalogue | PASS | Complete; assessment passed; 2 stored assessment attempts |
| Logout | PASS | HTTP 204; subsequent dashboard 401 |
| Fresh login | PASS | HTTP 200; dashboard preserved 85 XP, 3 achievements, 8/8 progress |

### 8.3 Response safety

A scan of public responses found no MongoDB URI, MongoDB SRV address, session secret, password hash, password field, session cookie name, or session cookie value. The only `explanation` occurrence was the lesson-summary prose described above. Quiz responses contained no correct-answer identifiers or answer-key fields before submission.

---

## 9. Learner-flow and idempotency results

### 9.1 Controlled flow

| Behavior | Result | Evidence |
|---|---|---|
| Access published lesson | PASS | HTTP 200 |
| Submit an incorrect check | PASS | 0/2; not passed; 0 XP |
| Receive incorrect feedback | PASS | Feedback array contained correct/incorrect state and explanations |
| Submit a correct check | PASS | 2/2; 100%; passed; 10 XP |
| Receive correct feedback | PASS | Feedback array contained correct/incorrect state and explanations |
| Award `first-check` | PASS | Awarded on first correct lesson check |
| Replay same attempt key | PASS | HTTP 200; `replayed: true`; 0 new XP; total stayed 10 |
| Submit a second new attempt | PASS | HTTP 201; 0 new XP; no duplicate achievement |
| Pass course assessment | PASS | 8/8; 100%; 25 XP; `first-assessment` |
| Replay assessment key | PASS | HTTP 200; 0 new XP; total stayed 35 |
| Submit a second assessment attempt | PASS | HTTP 201; 0 new XP; total stayed 35 |
| Complete all 8 Bitcoin 101 lessons | PASS | All accepted |
| Course completion | PASS | Last completion returned `complete: true`, 50 XP, total 85 XP |
| Award `first-course` | PASS | Awarded at course completion |
| Dashboard totals | PASS | 85 XP; 3 achievements; 8/8 course; 8/22 overall |
| Progress detail | PASS | 8 records; complete; assessment passed |
| Course and catalogue views | PASS | Complete; assessment passed |
| Refresh | PASS | Dashboard retained 85 XP |
| New authenticated session | PASS | Logout then login retained 85 XP, 3 achievements, and 8/8 progress |

### 9.2 Idempotency protections

The main database has these unique indexes:

- `xp_events_user_key_unique` on `(userId, eventKey)`
- `user_achievements_user_slug_unique` on `(userId, achievementSlug)`
- `quiz_attempts_user_quiz_key_unique` on `(userId, quizId, attemptKey)`
- `progress_user_lesson_unique` on `(userId, lessonSlug)`

The controlled identity has 3 unique XP event keys, 3 unique achievement slugs, and 5 unique attempt keys. Replays and second new attempts did not create duplicate XP or achievements. A second seed run created no duplicate content.

---

## 10. Browser acceptance and limitations

### 10.1 Browser availability

No rendered-UI acceptance was performed:

- The OpenCode desktop browser reported: `No desktop browser is connected to this session.`
- No local `chromium`, `chromium-browser`, `google-chrome`, `google-chrome-stable`, or `firefox` binary was found.
- The Melaya phone is paired but offline.
- The phone allow-list contains ChatGPT, Reddit, and Termux; Chrome is not allow-listed, and widening access is a device-owner action.
- No browser or new testing dependency was installed.

The Vite frontend returned HTTP 200 for `/` and for the Bitcoin 101 lesson route. This confirms delivery, not rendered behavior, and is not treated as browser acceptance evidence.

### 10.2 Browser checklist status

| Browser acceptance item | Status |
|---|---|
| Course and lesson navigation | NOT VERIFIED |
| Knowledge-check interface | NOT VERIFIED |
| Answer selection and submission | NOT VERIFIED |
| Correct and incorrect answer feedback display | NOT VERIFIED |
| Course assessment interface | NOT VERIFIED |
| XP display | NOT VERIFIED |
| Achievement display | NOT VERIFIED |
| Progress and course-completion display | NOT VERIFIED |
| Mobile layout and navigation | NOT VERIFIED |
| Keyboard behavior | NOT VERIFIED |
| Screen-reader behavior | NOT VERIFIED |
| 360 px layout | NOT VERIFIED |

The actual API, database, and source wiring are ready for these checks. The outstanding limitation is the absence of a usable browser channel, not a discovered functional failure.

### 10.3 Remaining browser acceptance procedure

When a browser is available:

1. Connect the OpenCode desktop browser, or bring the Melaya phone online and allow-list a browser app through the device owner’s normal control.
2. Use a fresh owner-approved test identity or an approved reset of a test identity. The active controlled identity’s random password was intentionally not retained.
3. Open the running frontend at `http://127.0.0.1:5173`.
4. Verify course and lesson navigation, preview and protected lesson behavior, quiz answer selection, submission, correct/incorrect feedback, and explanations.
5. Verify the assessment interface and passing/failing states.
6. Verify dashboard XP, achievement cards, course progress, overall progress, and completion state.
7. Verify refresh and logout/login persistence.
8. Verify mobile layout at 360 px, keyboard operation, and screen-reader labels/announcements.
9. Do not run destructive database tests or reset the main database.

---

## 11. Regression and safe checks

- `npm run typecheck` passed with no errors.
- 45 safe non-database tests passed:
  - `content.test.ts`
  - `http.test.ts`
  - `password.test.ts`
  - `progress.test.ts`
  - `quiz-content.test.ts`
  - `quiz.test.ts`
  - `rewards.test.ts`
  - `validation.test.ts`
- The configured database integration suite `server/test/db.integration.test.ts` was **not** run.
- `dns.test.ts` and `static.test.ts` were also excluded conservatively because their setup contains database/environment-sensitive indicators.
- The full `npm test` command was not run because it includes the prohibited database integration suite.
- No cleanup script, destructive helper, database reset, drop, truncate, or main-database test setup was run.
- The second live seeder run and the live unique indexes provided the idempotency verification.

---

## 12. Remaining defects and risks

### Functional defects

No functional S2 defect was found in the main database, live API, or controlled learner flow.

### Remaining limitations and risks

1. **Browser UI acceptance is unverified.** This is the only reason S2 is not marked fully accepted.
2. **Test records remain in the main database.** They are clearly identified by the two synthetic test identities. No cleanup was run. The owner may choose to retain or remove them through an approved process.
3. **Two test-only sessions remain** for the aborted auth-only identity. They contain no learner activity and will expire normally.
4. **The active test identity password was not retained.** Browser login will require a fresh test identity or an approved reset.
5. **Live learner activity is still occurring.** Counts can change after this report’s close timestamp; the report close counts are explicitly time-stamped in the count table.
6. **Seeder deprecation warning.** Mongoose reports that the `new` option in `findOneAndUpdate` is deprecated. This did not affect S2 behavior and is not a functional defect.
7. **`PRD.txt` and `PRD.md` remain unreconciled.** This is a pre-existing documentation discrepancy and was not changed.
8. **Credential exposure note.** One earlier read-only session command displayed the configured MongoDB connection string in tool output. It is not reproduced here. The owner should consider rotating or restricting that credential.
9. **No public deployment was performed.** Verification is against the actual running main application on the local host.

---

## 13. S2 acceptance matrix

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| S2-01 | Eight expected courses are present in the main application database. | **PASS** | 8 stored, 8 authored, all published, no missing/extra, fields match |
| S2-02 | All 22 expected lessons are present and correctly associated. | **PASS** | 22 stored, 22 authored, all published, 1 preview, valid associations, fields match |
| S2-03 | All 22 lesson knowledge-check quizzes are available. | **PASS** | 22 lesson quizzes published; live preview lesson has quiz metadata; authenticated non-preview quiz returns 200 |
| S2-04 | All eight course assessments are available. | **PASS** | 8 assessments published; live course metadata and authenticated assessment endpoint return the assessment |
| S2-05 | The 30 quizzes and 87 questions match authored source definitions. | **PASS** | 30 stored, 87 questions, all authored slugs present, no duplicates, field-level match |
| S2-06 | Public quiz APIs do not expose correct-answer keys. | **PASS** | Live guest and authenticated quiz DTOs contain no `correctOptionId` or explanation field before submission |
| S2-07 | Quiz scoring is implemented correctly. | **PASS** | Incorrect attempt 0/2, correct attempt 2/2, assessment 8/8; live API results |
| S2-08 | Saved quiz-attempt feedback is implemented and available. | **PASS** | 5 controlled attempts stored; live responses returned feedback with correct/incorrect state and explanations. Rendered display remains part of S2-12 browser checks. |
| S2-09 | XP awarding and idempotency are implemented correctly. | **PASS** | 10 + 25 + 50 = 85 XP; replay and second attempts awarded no duplicate XP; unique index present |
| S2-10 | The three approved achievements exist and their criteria are implemented. | **PASS** | All 3 definitions published; all 3 awarded at the intended events; unique index present |
| S2-11 | Course completion and progress reconciliation are implemented correctly. | **PASS** | All 8 lessons plus assessment required; 50 XP on completion; dashboard/progress/course reflect complete |
| S2-12 | The actual website exposes the intended quiz and assessment interfaces. | **PARTIAL** | Live APIs now return quiz/assessment data, frontend routes return HTTP 200, and source renders conditionally. No browser is available, so rendered interface behavior is NOT VERIFIED. |
| S2-13 | The dashboard and achievement interfaces are connected to the intended data. | **PARTIAL** | Dashboard API returns 85 XP, 3 achievements, 8/8 progress; source wiring is present. Rendered dashboard is NOT VERIFIED without a browser. |
| S2-14 | No outstanding critical defect prevents S2 acceptance. | **PASS** | No functional defect found in database/API/learner-flow checks. The remaining limitation is an evidence gap from unavailable browser acceptance, not a discovered critical defect. |

---

## 14. Final S2 verdict

**S2 functional implementation: PASS.**  
The actual main database contains all required S2 content, the live API exposes it, the controlled learner flow scores attempts correctly, saves feedback, awards 10/25/50 XP, awards all three achievements, completes the course, reflects dashboard progress, and prevents duplicate rewards.

**S2 overall acceptance: NOT FULLY ACCEPTED.**  
Browser and rendered-interface acceptance remains NOT VERIFIED because no usable browser channel was available. S2-12 and S2-13 are therefore PARTIAL, not PASS. Under the stated acceptance rule that all applicable requirements must pass, S2 cannot be marked fully accepted until the browser checklist is completed.

No corrective S2 implementation is currently known to be required. No S3 work was started.

---

## 15. Report delivery

- Repository report: `reports/S2-FINAL-ACTUAL-APPLICATION-ACCEPTANCE.md`
- Device report target: `/storage/emulated/0/Download/KAOS-Bitcoin-Academy/reports/S2-FINAL-ACTUAL-APPLICATION-ACCEPTANCE.md`
- Device-copy verification: verified byte-identical with `cmp` after the final report edit.
