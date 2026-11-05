# S2 Saved Feedback and Achievement Seeder Fix Report

Date: 2026-11-05

Scope: the two owner-authorized S2 blockers only:

1. Saved quiz-attempt history must render the feedback already returned by the server.
2. The content seeder must stop automatically drafting stale achievement definitions.

Verdict: both fixes are implemented in source and pass the available automated verification. Live browser/UI verification was not performed because the application database has not been seeded and no client test framework exists.

## 1. Preflight

- Read the full `reports/S2-QUIZ-IMPLEMENTATION-AND-VISIBILITY-AUDIT.md`.
- Read `reports/S2-CONCURRENCY-FIX-REPORT.md`.
- Inspected current Git state and preserved all existing changes.
- Inspected:
  - `client/src/pages/Quiz.tsx`
  - `client/src/components/Quiz.tsx`
  - `client/src/lib/types.ts`
  - `client/src/lib/queries.ts`
  - `server/src/routes/quizzes.ts`
  - `server/src/seed/seedContent.ts`
  - `server/src/models/Achievement.ts`
  - `server/src/models/UserAchievement.ts`
  - `server/src/models/Quiz.ts`
  - `server/src/models/QuizAttempt.ts`
  - existing quiz, seeder, reward, DNS, and database integration tests.
- Confirmed the current source matches the audit:
  - `GET /api/quizzes/:quizId/results` is authenticated, owner-scoped, and already returns `feedback` for each saved attempt.
  - The standalone quiz page rendered only score, percent, pass/fail, and date for saved attempts.
  - The seeder still auto-drafted stale achievement definitions.
- Confirmed no material source discrepancy requiring a stop.
- Confirmed `PRD.md` remains authoritative and unchanged. Its SHA-256 remains `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`.
- No PRD or checksum file was modified or reconciled.

## 2. Files changed

| File | Change |
| --- | --- |
| `client/src/pages/Quiz.tsx` | Added saved-attempt feedback rendering with ID-based question/option mapping and explicit unavailable-content states. |
| `server/src/seed/seedContent.ts` | Removed automatic stale-achievement drafting and narrowed the published-achievement assertion to authored achievement slugs. |
| `server/test/db.integration.test.ts` | Added a guarded database test proving authored achievement updates, stale achievement preservation, user-history preservation, stale quiz drafting, and attempt preservation. |
| `reports/S2-FEEDBACK-AND-SEEDER-FIX-REPORT.md` | This report. |

No server API endpoint, public quiz payload, authentication rule, database guard, MongoDB URI, session configuration, DNS code, or concurrency logic was changed.

## 3. Fix A: Saved-attempt feedback

### 3.1 Source of feedback

The existing owner-scoped results endpoint remains unchanged:

`GET /api/quizzes/:quizId/results`

It requires authentication, resolves the quiz through the existing access policy, queries attempts by the current session user and quiz, and returns each attempt's stored `feedback`:

- `questionId`
- `selectedOptionId`
- `correctOptionId`
- `correct`
- `explanation`

No new endpoint was added, and no answer key was added to a public quiz payload.

### 3.2 Rendering

`client/src/pages/Quiz.tsx` now renders a `SavedAttemptFeedback` section inside each saved attempt's history entry.

- The existing attempt summary and history behavior remain intact.
- Each attempt keeps its score, total, percent, pass/fail, and date.
- A native `<details>` / `<summary>` disclosure labeled `Show saved feedback (N questions)` exposes the feedback.
- The disclosure is keyboard-operable and keeps long attempt histories compact on mobile.
- The immediate inline feedback in `client/src/components/Quiz.tsx` was not changed.

### 3.3 Mapping answer IDs to labels

The page maps by stable IDs, never by array position:

1. Build `questionById` from the current quiz's `questions`.
2. For each feedback item, look up `feedback.questionId` in `questionById`.
3. Look up `feedback.selectedOptionId` in that question's `options`.
4. Look up `feedback.correctOptionId` in that question's `options`.
5. Render the current question prompt and option text only when the IDs resolve.

This avoids assuming that historical feedback order matches current quiz order.

### 3.4 Changed or unavailable historical content

The page handles content that cannot be mapped safely:

- Missing question ID: `Question no longer available`.
- Missing selected option ID: `This answer option is no longer available in the current quiz.`
- Missing correct option ID: `The correct answer option is no longer available in the current quiz.`
- If any feedback item has unavailable content, a notice explains that some saved questions or answer options are no longer available and that those items are marked below.
- The stored correctness state and explanation are still shown, because they do not require current labels.

The UI does not fabricate a prompt or option label when the current quiz cannot supply one.

### 3.5 Accessibility and mobile behavior

- Correct/incorrect state is stated in text (`Correct` / `Incorrect`), not by color alone.
- The badge also uses color as a secondary cue only.
- Feedback text uses `break-words` and nested padding so long prompts, answers, and explanations wrap on narrow screens.
- The native disclosure is keyboard-accessible.

### 3.6 Privacy and authentication

- The results endpoint remains owner-scoped by `userId` and `quizId`.
- The client only renders `resultsQuery.data`, which is fetched through the authenticated results query.
- No feedback is fetched or displayed for another learner's attempts.
- Public quiz payloads still exclude `correctOptionId` and `explanation`.

## 4. Fix B: Stale-achievement seeder policy

### 4.1 Authored achievements still update

The seeder still upserts each authored achievement by slug and sets its authored fields and `status: 'published'`.

The new test proves this by first corrupting the authored `first-check` definition, then running `seedContent()` and asserting that its authored title, description, order, and published status are restored.

### 4.2 Stale achievement definitions remain unchanged

The seeder no longer runs:

`AchievementModel.updateMany({ slug: { $nin: authoredSlugs } }, { $set: { status: 'draft' } })`

Stale achievement definitions absent from authored content are not updated, drafted, deleted, or otherwise mutated.

The test creates a stale `legacy-achievement` with:

- title `Legacy achievement`
- description `Preserve this stale definition.`
- order `99`
- status `published`

After `seedContent()`, all fields and the original `updatedAt` remain unchanged.

### 4.3 User achievement history remains intact

The seeder does not import or mutate `UserAchievementModel`.

The test creates a `user_achievements` record for the stale achievement and asserts after seeding that its `userId`, `achievementSlug`, and `earnedAt` are unchanged.

### 4.4 Stale quiz drafting and attempts remain intact

The existing stale-quiz behavior is unchanged:

`QuizModel.updateMany({ slug: { $nin: authoredQuizSlugs } }, { $set: { status: 'draft' } })`

The test creates a stale published quiz and an existing attempt, runs `seedContent()`, and asserts:

- the stale quiz status becomes `draft`;
- the stale quiz title remains intact;
- the existing attempt remains;
- the attempt still references the stale quiz and retains its `attemptKey`.

### 4.5 Validation assertion adjustment

The old seeder assertion required exactly three published achievements in the entire collection. That would fail whenever a stale published achievement was intentionally preserved.

The assertion now counts only authored achievement slugs and requires all three to be published:

`AchievementModel.countDocuments({ slug: { $in: authoredSlugs }, status: 'published' }) === achievements.length`

This preserves the seeder's validation intent without mutating or rejecting stale definitions.

## 5. Verification

All commands were run from the repository root unless a working directory is shown.

### 5.1 Focused seeder database test

Command:

```text
cd server
RUN_DB_TESTS=1 NODE_ENV=test node --env-file=.env --import tsx --test --test-name-pattern="stale achievements and user history" test/db.integration.test.ts
```

Result: **1/1 passed, 0 failed, 0 skipped**

Raw log: `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-focused-db.log`

### 5.2 Full non-database server suite

Command:

```text
cd server
npm test
```

Result: **65/65 passed, 0 failed, 0 skipped**

The database suite was skipped by its existing guard because `RUN_DB_TESTS` was not set.

Raw log: `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-non-db.log`

### 5.3 Full guarded database integration suite

Command:

```text
cd server
RUN_DB_TESTS=1 NODE_ENV=test node --env-file=.env --import tsx --test test/db.integration.test.ts
```

Result: **13/13 passed, 0 failed, 0 skipped**

This includes the new stale-content test and the two prior concurrency tests.

The existing guard remains in place and verifies the connected database is exactly `kaos_academy_test` before any test writes. The suite uses `deleteMany` cleanup only. No `dropDatabase` call was added or used.

Raw log: `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-full-db.log`

### 5.4 Typechecks

Commands:

```text
npm --prefix server run typecheck
npm --prefix client run typecheck
```

Results: both passed with no TypeScript errors.

Raw logs:

- `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-server-typecheck.log`
- `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-client-typecheck.log`

### 5.5 Production build

Command:

```text
npm run build
```

Result: passed.

- Server TypeScript build passed.
- Client Vite production build passed.
- 85 modules transformed.
- Client output: `dist/index.html`, `dist/assets/index-CXkUC2ew.css`, `dist/assets/index-Db88RVTH.js`.

Raw log: `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-build.log`

### 5.6 Whitespace check

Command:

```text
git diff --check
```

Result: exit `0`.

Raw log: `/data/data/com.termux/files/usr/tmp/opencode/s2-feedback-seeder-diff-check.log`

### 5.7 Client test framework

The client has no test framework:

- `client/package.json` has no `test` script.
- No client test dependency is installed.
- No client test files exist.

No testing stack was introduced. Client verification is limited to TypeScript typechecking, the production build, source inspection, and the manual procedure below.

## 6. Manual verification procedure not performed

The following checks were not performed because the application database has not been seeded and live UI/browser verification was not authorized in this task:

1. Sign in as a learner and submit a quiz attempt in a non-production environment.
2. Open `/quizzes/<quiz-slug>`.
3. Confirm the existing attempt summary and date are still shown.
4. Expand `Show saved feedback` and verify, for every question:
   - the prompt;
   - the learner's selected answer;
   - the correct answer;
   - the textual `Correct` / `Incorrect` state;
   - the explanation.
5. Submit an incorrect attempt and verify the incorrect state and labels.
6. In a test database, remove or rename a saved question/option ID after an attempt and verify the unavailable-content notice and per-item fallback text.
7. Check keyboard-only operation of the `<summary>` disclosure.
8. Check screen-reader output for the feedback text.
9. Check the layout at 360px width.
10. Confirm another learner's saved feedback is not visible.

## 7. Limitations and residual risks

- No automated client/UI test exists, and none was added.
- No live browser, keyboard-only, screen-reader, or 360px manual check was performed.
- The application database was not seeded, so the standalone quiz page was not exercised against real saved attempts.
- Saved feedback labels are resolved against the current quiz by question and option IDs. If an authored question or option ID is later reused for different wording without changing the ID, the current results API does not expose the historical quiz version to the client, so that specific case cannot be detected. Missing IDs are handled explicitly.
- The seeder was not run against `kaos_academy`.
- No production deployment was performed or verified.
- The previously reported `PRD.txt` versus `PRD.md` baseline conflict remains unresolved and was not touched.

## 8. Scope and safety confirmation

- No application database seeding was performed.
- No production database writes were performed.
- No `dropDatabase` was used.
- The database integration suite retained its exact `kaos_academy_test` guard and its `deleteMany` cleanup.
- No DNS, MongoDB URI, credential, TLS, Atlas access-rule, or session configuration was changed.
- No PRD or checksum file was changed.
- No concurrency fix was changed.
- No unrelated audit finding was fixed.
- No Git commit, push, stage, reset, stash, clean, or discard was performed.
- No deployment was performed.

## 9. Final Git status

Branch: `main`

HEAD: `41d37e7df79bdba48b55399ef20fdea0ac7ea4db`

Final status: 18 modified tracked files, 29 untracked files (including this report), 0 staged files. All pre-existing S2 and DNS changes remain preserved.
