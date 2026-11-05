# S2 Concurrency Fix Report

## Scope

This task fixed only the two confirmed S2 concurrency defects:

1. Same `attemptKey` with different answers must return `409 ATTEMPT_KEY_REUSED`, not a successful replay.
2. Concurrent final-lesson completion and course-assessment passing must not miss the 50 XP course-completion reward or the `first-course` achievement.

No other audit findings were changed. The stale-achievement seeding decision, saved-attempt history UI, accessibility, cache-header, malformed-JSON, and other findings remain out of scope.

## Preflight

- Read the S2 implementation, acceptance, and quiz visibility audit reports.
- Inspected `server/src/routes/quizzes.ts`, `server/src/routes/progress.ts`, `server/src/lib/rewards.ts`, `server/src/lib/progress.ts`, `server/test/db.integration.test.ts`, the quiz/attempt/XP/achievement models, and the existing indexes.
- Confirmed the existing guarded test database resolves to `kaos_academy_test`.
- Confirmed `PRD.md` remains authoritative and its recorded SHA-256 was unchanged: `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`.
- Did not modify any PRD or checksum file.
- Reviewed the DNS implementation; no DNS code was changed.

## Files Changed

| File | Change |
| --- | --- |
| `server/src/routes/quizzes.ts` | Functional fix for same-key answer comparison and post-commit course-completion reconciliation. |
| `server/test/db.integration.test.ts` | Added two real-database concurrency tests and a test learner helper. |
| `server/src/lib/rewards.ts` | Comment-only documentation of the opportunistic in-transaction evaluation and the authoritative post-commit reconciliation. |
| `server/src/routes/progress.ts` | Comment-only documentation of the post-commit ordering assumption. |
| `reports/S2-CONCURRENCY-FIX-REPORT.md` | This report. |

No other files were changed by this task. Existing S2 and DNS work in the working tree was preserved.

## Fix A: Same Attempt Key With Different Answers

### Root cause

`server/src/routes/quizzes.ts` had three existing-attempt paths:

1. The pre-transaction lookup.
2. The in-transaction `findOne` branch.
3. The duplicate-key recovery branch.

The pre-transaction and duplicate-key paths compared stored canonical answers. The in-transaction branch assigned the stored attempt to `storedAttempt` and returned without comparing answers. If the pre-transaction lookup missed an attempt inserted by a concurrent request using the same key, that branch could replay the existing attempt successfully even when the newly submitted answers differed.

### Implementation

Added `storedAnswersMatch`, which normalizes the stored `QuizAttempt.answers` to `{ questionId, selectedOptionId }` and delegates to the existing `canonicalAnswersEqual` helper. Added `reusedAttemptKeyConflict`, which returns the existing `409 ATTEMPT_KEY_REUSED` contract.

The comparison is now applied in all three existing-attempt paths:

- Pre-transaction lookup.
- In-transaction `findOne` branch.
- Duplicate-key recovery branch.

Behavior:

- Same user, same quiz, same key, same canonical answers: idempotent replay.
- Same user, same quiz, same key, different canonical answers: `409 ATTEMPT_KEY_REUSED`.
- No duplicate attempt is created.
- No duplicate XP event or achievement is created.
- The existing transaction and duplicate-key recovery behavior is preserved.

The in-transaction conflict throws an application error, aborting the transaction before any attempt or reward write is committed.

## Fix B: Course-Completion Race

### Root cause

The assessment path evaluated course completion inside the attempt transaction. The final-lesson path evaluated completion after its progress write committed. Under a concurrent interleaving, each evaluation could read before the other completion event committed, so both observed an incomplete course and neither awarded the 50 XP completion reward or `first-course` achievement.

### Implementation

The assessment path still performs an opportunistic in-transaction completion evaluation. After the attempt transaction commits, `server/src/routes/quizzes.ts` now calls `evaluateCourseCompletion` again outside the transaction for a passing course assessment. Any newly awarded completion XP or achievement is merged into the response.

The lesson-completion path already calls `evaluateCourseCompletion` after its progress write. Its ordering assumption is now documented in `server/src/routes/progress.ts`.

### Why this closes the race

Let:

- `L` be the lesson progress commit.
- `A` be the assessment attempt commit.
- `rL` be the lesson-path reconciliation call.
- `rA` be the assessment-path reconciliation call.

The lesson path calls `rL` after `L`, so `rL > L`. The assessment path calls `rA` after `A`, so `rA > A`.

If `rL` does not see the assessment, then `rL < A`; combined with `L < rL`, this gives `L < A`. Since `rA > A`, `rA` runs after both commits and sees both events. Symmetrically, if `rA` does not see the lesson, then `rA < L`, and `rL > L` sees both. Therefore at least one post-commit reconciliation observes both completion events.

The existing unique indexes on XP events and user achievements make the award writes idempotent. `awardXp` and `awardAchievement` without a session treat duplicate keys as an idempotent no-op. This gives exactly one 50 XP completion event and one `first-course` achievement even when both paths reconcile concurrently.

### Transaction and ordering assumptions

- `session.withTransaction` resolves only after the attempt transaction commits.
- `ProgressModel.updateOne` resolves only after the progress write is acknowledged and visible to subsequent reads.
- The post-commit reconciliation reads committed state with the default read concern.
- The unique indexes on `XpEvent` and `UserAchievement` are the idempotency boundary for completion rewards.
- No new dependency and no unbounded retry loop were introduced.

## Tests Added

### Same-key concurrency test

`same attempt key with concurrent different answers returns one attempt and 409`

The test:

- Registers a fresh learner.
- Submits two concurrent attempts with the same `attemptKey` and different answer sets.
- Asserts the statuses are exactly `201` and `409`.
- Asserts the conflict body has `error.code === 'ATTEMPT_KEY_REUSED'`.
- Asserts exactly one attempt is retained.
- Asserts the retained attempt's answers match one of the two submitted answer sets.
- Asserts the retained attempt's pass/fail state determines whether exactly one lesson-check XP event and one `first-check` achievement exist, or zero of each.
- Replays the retained answer set and asserts a `200` idempotent replay with `xpAwarded: 0` and no increase in attempt, XP, or achievement counts.

### Course-completion concurrency test

`concurrent final lesson completion and assessment pass award completion once`

The test:

- Registers a fresh learner.
- Completes seven of the eight Bitcoin 101 lessons sequentially.
- Starts the final lesson completion and the course assessment pass concurrently.
- Asserts both requests succeed.
- Asserts the combined XP awarded by the two responses is exactly 75: 25 for the assessment pass and 50 for course completion.
- Asserts exactly one assessment attempt, eight progress records, one `course-assessment-pass` XP event, one `course-complete` XP event, one `first-assessment` achievement, and one `first-course` achievement.
- Asserts the course API reports complete, eight of eight lessons, and a passed assessment.
- Asserts the dashboard reports 75 XP, one complete course, and exactly `first-assessment` and `first-course`.
- Replays both the assessment attempt and the lesson completion, asserting zero additional XP and no increase in reward counts.

## Verification Results

All commands were run from the repository. Raw logs were retained under:

`/data/data/com.termux/files/usr/tmp/opencode/s2-concurrency-logs/`

| Check | Command | Result |
| --- | --- | --- |
| Focused unit tests | `NODE_ENV=test node --import tsx --test test/quiz.test.ts test/rewards.test.ts` | 11 tests, 11 pass, 0 fail |
| New concurrency tests | `RUN_DB_TESTS=1 NODE_ENV=test node --env-file=.env --import tsx --test --test-name-pattern="same attempt key with concurrent different answers|concurrent final lesson completion" test/db.integration.test.ts` | 2 tests, 2 pass, 0 fail |
| Complete guarded DB suite | `RUN_DB_TESTS=1 NODE_ENV=test node --env-file=.env --import tsx --test test/db.integration.test.ts` | 12 tests, 12 pass, 0 fail, 0 skipped |
| Complete non-DB suite | `npm test` in `server/` | 65 tests, 65 pass, 0 fail; DB suite skipped as expected |
| Server typecheck | `npm --prefix server run typecheck` | Pass |
| Client typecheck | `npm --prefix client run typecheck` | Pass |
| Production build | `npm run build` | Pass |
| Whitespace check | `git diff --check` | Exit 0 |

The non-DB suite includes all 18 DNS tests; all passed, and no DNS code was changed.

### Database target verification

The DB suite's existing guard connected through `connectDatabase(uri, databaseName)` with:

`databaseName = `${process.env.MONGODB_DB ?? 'kaos_academy'}_test``

The suite then asserted the connected database name was exactly `kaos_academy_test` before any writes and again before cleanup. The full suite passed, so all writes stayed on the guarded test database. Cleanup used `deleteMany`; no `dropDatabase` was used.

No production seeding was run, `kaos_academy` was not seeded, and no deployment was performed.

### Test-run history

The first focused DB run of the same-key test failed on a test-only assertion: the test compared stored `selectedOptionId` values against submitted `optionId` values. The production code was not changed to accommodate that assertion. The test normalization was corrected, and the focused DB run then passed 2/2. The full DB suite subsequently passed 12/12.

## XP and Achievement Uniqueness Evidence

The same-key test proves:

- Exactly one attempt survives the conflicting concurrent submissions.
- A passing retained attempt yields exactly one lesson-check XP event and one `first-check` achievement.
- A failing retained attempt yields zero of each.
- Replaying the retained attempt adds no XP, achievement, or attempt.

The course-completion test proves:

- Exactly one `course-assessment-pass:btc101-assessment` XP event.
- Exactly one `course-complete:01-bitcoin-101` XP event.
- Exactly one `first-assessment` user achievement.
- Exactly one `first-course` user achievement.
- Exactly one assessment attempt and eight progress records.
- The combined concurrent responses award exactly 75 XP.
- Replaying either operation adds no XP or achievement.

## Remaining Risks and Unverified Checks

- The in-transaction completion evaluation remains opportunistic. If the process crashes after the attempt or progress write commits but before the post-commit reconciliation, the completion reward can be delayed until a later completion event or replay. No background reconciliation job was added. This is a crash-window risk, not the concurrent-event race fixed here.
- The concurrency tests use real concurrent HTTP requests against the guarded database but do not inject a deterministic failpoint for a specific interleaving. The ordering proof above and the real-database runs support the fix; no test-only production hook was added.
- Manual browser/UI verification, keyboard-only verification, screen-reader verification, Lighthouse checks, and 360px mobile checks were not performed in this task.
- Deployment remains unperformed and unverified.
- The stale-achievement seeding decision remains unresolved and was not changed.
- Other audit findings, including saved-attempt history feedback, accessibility, cache headers on error paths, malformed JSON handling, parent-course checks, UUID fallback, and order-sensitive comparison, remain out of scope.
- The `PRD.txt` versus `PRD.md` baseline conflict remains an owner decision and was not reconciled.

## Final Git State

- Branch: `main`
- HEAD: `41d37e7df79bdba48b55399ef20fdea0ac7ea4db`
- Modified tracked files: 18
- Untracked files: 28, including this report
- Staged files: 0
- Commits or pushes: none
- Reset, stash, clean, or discard operations: none

The working tree still contains the pre-existing S2 and DNS changes. This task did not stage, commit, push, reset, stash, or clean anything.
