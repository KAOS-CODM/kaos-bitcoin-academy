# S1 Database Integration Test Teardown Correction Report

Project: KAOS Bitcoin Academy
Slice: S1 database integration test teardown
Date: November 1, 2026
Status: Corrected and verified. The isolated database suite and the complete test suite both
exited cleanly.

## 1. Original root cause

`server/test/db.integration.test.ts` used this teardown:

```ts
after(async () => {
  await server.close()
  await mongoose.connection.dropDatabase()
  await disconnectDatabase()
})
```

The MongoDB Atlas application user does not have the `dropDatabase` privilege on
`kaos_academy_test`. Atlas rejected the call with:

```text
Error [MongoServerError]: user is not allowed to do action [dropDatabase] on [kaos_academy_test.]
code: 8000
codeName: 'AtlasError'
    at async SuiteContext.<anonymous> (server/test/db.integration.test.ts:66:5)
```

This was a teardown defect, not a failed application assertion.

## 2. Why seven child tests passed while the parent suite failed

The seven database tests completed and reported `✔` before the teardown ran. The parent
`describe('database-backed S1 flows')` suite has no assertions of its own; Node's test runner
marks a suite failed when an `after` hook rejects. The rejection at the old line 66 therefore
turned the suite red even though every child test had passed.

The rejection also skipped the old line 67 (`await disconnectDatabase()`). The Mongoose
connection stayed open, so the test process did not exit normally and the final reporter
details were delayed. Interrupting that hung process produced:

```text
'Promise resolution is still pending but the event loop has already resolved'
```

That pending-promise message was a consequence of the skipped disconnect, not the primary
failure.

## 3. Exact teardown correction

Only `server/test/db.integration.test.ts` was changed. The teardown is now at lines 64–83:

```ts
after(async () => {
  try {
    await server.close()

    const connectedDatabase = mongoose.connection.db?.databaseName
    if (connectedDatabase !== 'kaos_academy_test') {
      throw new Error(
        `Refusing database cleanup: connected to "${connectedDatabase ?? 'unknown'}", expected "kaos_academy_test".`,
      )
    }

    await ProgressModel.deleteMany({})
    await mongoose.connection.collection('sessions').deleteMany({})
    await UserModel.deleteMany({})
    await CourseModel.deleteMany({})
    await LessonModel.deleteMany({})
  } finally {
    await disconnectDatabase()
  }
})
```

The cleanup uses the existing models and the ordinary write permissions the tests already
need. It deletes in the required order: progress, sessions, users, courses, lessons.
Deletion is sequential so the requested order is actually preserved, rather than being
concurrent through `Promise.all`. `disconnectDatabase()` runs in `finally`, including when
server shutdown or any cleanup step throws.

No imports were added or removed. No application code, schema, model, configuration,
PRD, engineering decision, OD-001, or existing report was modified.

## 4. Database-name safety guard

Before any teardown deletion, the hook reads the actual connected database from
`mongoose.connection.db?.databaseName`. If it is not exactly `kaos_academy_test`, it throws:

```text
Refusing database cleanup: connected to "<actual>", expected "kaos_academy_test".
```

The guard is fail-closed and runs before the five deletions. It was not triggered during the
successful run because the connection was correct.

Observed safety evidence:

- `server/.env` sets the non-secret `MONGODB_DB` value to `kaos_academy`.
- Setup connects to `` `${MONGODB_DB}_test` ``, i.e. `kaos_academy_test`.
- The isolated test log recorded: `database connected ... db=kaos_academy_test`.
- Production `kaos_academy` is never the selected test database.
- No Atlas permission, database user, infrastructure, or production configuration was changed.

## 5. Before-and-after teardown behaviour

| Phase | Before | After |
| --- | --- | --- |
| Server shutdown | `server.close()` awaited | `server.close()` awaited inside `try`. |
| Database safety check | None | Exact `kaos_academy_test` check before deletion; abort otherwise. |
| Cleanup operation | `dropDatabase()` | Targeted `deleteMany({})` on progress, sessions, users, courses, lessons. |
| Required Atlas privilege | `dropDatabase` (absent) | Ordinary delete/write permissions (already available). |
| Cleanup result | Rejected with AtlasError 8000. | Completed without error. |
| Disconnect | Skipped when `dropDatabase()` rejected. | Always runs in `finally`. |
| Test process | Hung with an open Mongoose connection. | Exited normally with code 0. |
| Suite result | Seven children passed, parent suite failed. | Seven children passed, parent suite passed. |

## 6. Exact test commands and observed results

### Isolated integration suite

Executed from `~/kaos-bitcoin-academy/server`:

```bash
RUN_DB_TESTS=1 node --import tsx --test --test-reporter=spec test/db.integration.test.ts
```

Observed:

- Exit code: **0**
- Wall time: **130 seconds**
- `tests 7`
- `suites 1`
- `pass 7`
- `fail 0`
- `cancelled 0`
- `skipped 0`
- `todo 0`
- Runner duration: `129408.973909 ms`
- Parent suite: `✔ database-backed S1 flows (124086.298546ms)`
- Clean process exit: **yes**; no `db.integration.test.ts` process remained.

### Complete project test suite with database tests enabled

Executed from `~/kaos-bitcoin-academy`:

```bash
RUN_DB_TESTS=1 npm test
```

Observed:

- Exit code: **0**
- Wall time: **121 seconds**
- `tests 35` (28 non-database tests plus 7 database tests)
- `suites 1`
- `pass 35`
- `fail 0`
- `cancelled 0`
- `skipped 0`
- `todo 0`
- Runner duration: `118788.356205 ms`
- Clean process exit: **yes**; no database test process remained.

No test was interrupted, timed out, skipped, cancelled, or left running.

## 7. Diff summary

Compared with the pre-edit copy:

- File changed: `server/test/db.integration.test.ts` only.
- Diff: **16 insertions, 3 deletions**.
- Location: the `after(async () => { ... })` teardown at lines 64–83.
- Removed: `dropDatabase()` and the unconditional disconnect sequence.
- Added: `try/finally`, exact database-name guard, five ordered targeted deletions, guaranteed
  disconnect.
- No test assertions, test cases, setup logic, imports, or application files changed.
- Current test-file SHA-256:
  `82010841d49dba6aefd834392990a65d44183a9c545ff48cde78322a42059ab4`.

## 8. Successful assertions versus a clean suite exit

Before the correction, the seven assertions were trustworthy as individual results: they ran
against Atlas, none failed, and all completed before teardown. The overall run was nevertheless
not a clean pass, because the parent suite exited non-zero after the teardown rejection.

After the correction there is no longer a distinction in this run: all seven database assertions
passed **and** the parent suite passed **and** the process exited with code 0. The complete
35-test suite also passed and exited with code 0. These are clean suite exits, not merely
individually successful assertions.

## 9. Remaining limitations

1. The test database's documents are deleted, but the database and its collections/indexes are
   not dropped. This is intentional because the Atlas user lacks `dropDatabase`; empty
   collections remain in the dedicated test database.
2. The safety guard runs at teardown, before deletion. Setup writes only to
   `` `${MONGODB_DB}_test` `` and production `kaos_academy` is not selected, but if an unexpected
   database were selected, the guard would abort cleanup while leaving the test records in that
   unexpected database and failing the suite.
3. If `server.close()` fails, cleanup is skipped but `disconnectDatabase()` still runs; the suite
   would fail through the original server-shutdown error.
4. Atlas latency is significant (about 2 minutes for these suites); this is environmental and
   was not treated as a teardown failure.
5. No Atlas permissions, database users, infrastructure, or production configuration were
   changed. No S2 work, deployment, or Git operation was performed.

## 10. Report delivery

This is a new report; the target file did not exist before creation, so no report was overwritten.
The previously created `reports/S1-IMPLEMENTATION-REPORT.md` was not modified.

Project copy:

```text
~/kaos-bitcoin-academy/reports/S1-DB-TEARDOWN-CORRECTION-REPORT.md
```

A device-storage mirror is copied to:

```text
~/storage/shared/Download/KAOS-Bitcoin-Academy/reports/S1-DB-TEARDOWN-CORRECTION-REPORT.md
```

The mirror is copied without overwriting an existing file and verified with `cmp` and SHA-256;
the final verification values are reported in the task handover.
