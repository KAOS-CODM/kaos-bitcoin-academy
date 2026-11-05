# DNS Implementation Report

Date: 2026-11-05
Project: KAOS Bitcoin Academy
Scope: Application-level DNS resolution for MongoDB Atlas connections

## 1. Summary

Application-level DNS has been implemented and validated.

- SRV/TXT discovery is redirected to `1.1.1.1` and `8.8.8.8` through the process-wide c-ares resolver.
- MongoDB TCP/TLS hostname resolution uses a dedicated `dns.Resolver` with the same servers through the driver's supported `lookup` option.
- IPv4 addresses are returned first, with IPv6 retained as a fallback.
- The existing `mongodb+srv://` URI, credentials, TLS verification, authentication, pooling, replica-set discovery, and session-store client reuse are unchanged.
- The Atlas integration suite connected successfully to the guarded `kaos_academy_test` database and passed 10/10 tests.

No production seeding, deployment, Atlas rule change, dependency installation, or Git write operation was performed.

## 2. Mandatory preflight

### 2.1 PRD integrity

`PRD.md` checksum was verified before any edit:

```text
1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d  PRD.md
```

This matches the established immutable checksum exactly. The checksum was rechecked after implementation and still matches. `PRD.md` was not modified.

### 2.2 Runtime and dependency versions

| Component | Installed version |
| --- | --- |
| Node.js | v26.4.0 |
| c-ares | 1.34.8 |
| MongoDB Node.js driver | 7.7.0 |
| Mongoose | 9.11.4 |
| connect-mongo | 6.0.0 |
| BSON | 7.3.3 |

### 2.3 Driver support

The installed driver exposes these recognized connection options:

- `lookup`: supported
- `family`: supported
- `autoSelectFamily`: supported
- `autoSelectFamilyAttemptTimeout`: supported

`lookup` is passed to the TCP/TLS socket constructors. The driver's SRV/TXT discovery uses the process-wide c-ares resolver, not the per-connection `lookup` callback.

### 2.4 Configured URI shape, credential-free

The configured URI was inspected without printing credentials or the connection string.

- Scheme: `mongodb+srv:`
- Credentials: present, not displayed
- Hostname: under `.mongodb.net`
- Hostname label count: 4
- Database name: present
- Atlas SRV discovery: returns 3 records
- Atlas TXT discovery: returns replica-set and auth-source metadata

The implementation derives a DNS scope of the form `<cluster>.mongodb.net` and its parent domain. No hostname, username, password, database name, or connection string is written to logs or this report.

### 2.5 Existing DNS and connection behaviour

Before implementation:

```text
dns.getServers()                 -> ["8.8.8.8"]
dns.getDefaultResultOrder()      -> "verbatim"
net.getDefaultAutoSelectFamily() -> true
```

A controlled preflight probe showed the actual failure mode:

- SRV lookup succeeded in 594 ms and returned 3 records.
- The operating-system lookup of the first returned Atlas node timed out after the probe's 6,015 ms limit.

This confirmed that SRV discovery could work while TCP hostname resolution stalled in `getaddrinfo`. It also confirmed that the application had no project-level DNS configuration before this change.

### 2.6 Existing working tree

The repository already contained unrelated modified and untracked files before this task. They were not reverted, reformatted, or discarded. The pre-existing modifications included S2 quiz/rewards work and earlier DNS investigation reports.

The implementation itself touched only:

- `server/src/db.ts` (targeted integration edit)
- `server/src/lib/dns.ts` (new)
- `server/test/dns.test.ts` (new)
- `reports/DNS-IMPLEMENTATION-REPORT.md` (this report)

## 3. Files created and modified

### Created

- `server/src/lib/dns.ts`
  - Global c-ares DNS initialization.
  - Dedicated `dns.Resolver` creation.
  - Atlas scope derivation.
  - Node-compatible `LookupFunction` implementation.
  - DNS error normalization, per-family fallback, timeout, and exactly-once completion.

- `server/test/dns.test.ts`
  - 18 controlled tests using injected resolver and lookup doubles.
  - No test depends on public DNS availability.

- `reports/DNS-IMPLEMENTATION-REPORT.md`
  - This report.

### Modified

- `server/src/db.ts`
  - Calls DNS initialization before `mongoose.connect()`.
  - Derives the Atlas scope from the URI.
  - Supplies the custom `lookup` option.
  - Preserves all existing connection options and the existing URI.
  - Keeps `connectDatabase()` as the single connection entry point used by the server, seeder, and integration tests.

## 4. DNS architecture and initialization sequence

The connection sequence in `connectDatabase(uri, dbName)` is now:

1. Initialize process-wide c-ares DNS servers:
   - `1.1.1.1`
   - `8.8.8.8`
2. Parse the configured URI internally to derive the Atlas hostname scope.
3. Create a dedicated `dns.Resolver` with the same two DNS servers.
4. Build the custom MongoDB lookup callback.
5. Call `mongoose.connect()` with the existing options plus the custom `lookup`.
6. Continue with the existing `ensureIndexes()` and `MongoStore` setup.

Initialization is idempotent after success. A failed global initialization throws a descriptive error and is not marked successful, so a later connection attempt can retry it. The initialization occurs before any MongoDB connection attempt.

The server, seeder, and integration test all use `connectDatabase()`:

- `server/src/index.ts:15`
- `server/src/seed/run.ts:14`
- `server/test/db.integration.test.ts:68`

## 5. SRV/TXT resolution

MongoDB SRV/TXT discovery uses Node's process-wide c-ares APIs. The implementation configures that resolver with:

```text
1.1.1.1
8.8.8.8
```

This preserves the existing `mongodb+srv://` format and Atlas replica-set discovery. It does not rewrite the URI into a static seed list.

The global configuration is performed once per process after a successful call. It is not changed repeatedly during normal application operation.

## 6. TCP/TLS hostname resolution

The MongoDB driver's `lookup` option is supplied only when the configured URI yields a recognized Atlas scope.

The lookup callback:

- Uses a dedicated `dns.Resolver` configured with the same public DNS servers.
- Resolves A and AAAA records directly through that resolver.
- Returns IPv4 records before IPv6 records.
- Preserves IPv6 as a fallback instead of forcing IPv4 permanently.
- Uses the operating-system lookup for hostnames outside the derived Atlas scope.
- Does not force the driver's `family` option and does not use `family: 0`.
- Leaves `autoSelectFamily` at the driver/runtime default.

TLS is unchanged. The driver still connects with the original Atlas hostname, so TLS SNI and certificate verification continue to use that hostname rather than a substituted IP address. The URI, authentication, connection pooling, database name selection, indexes, and session-store client reuse are untouched.

## 7. Callback contract

The lookup implementation is compatible with Node's `LookupFunction` contract:

- `options.all === true`: returns an array of `{ address, family }`.
- Normal lookup: returns one address string and its family.
- `family: 4` or `"IPv4"`: resolves A records only.
- `family: 6` or `"IPv6"`: resolves AAAA records only.
- Unspecified family: resolves both and orders IPv4 first.
- IP literals: returned directly without a DNS query.
- IP literal conflicting with a requested family: returns `ENOTFOUND`.
- Invalid family input: returns `EAI_BADFLAGS`.
- `ENODATA`, empty address lists, and equivalent no-record responses for one family are tolerated when the other family has usable records.
- If both families fail, a Node-compatible error is returned, preferring `ENOTFOUND`, then `ENODATA`, then the first meaningful resolver error.
- A 5-second lookup timeout returns `ETIMEOUT` rather than hanging indefinitely.
- A completion guard ensures the callback runs exactly once, even if a resolver double-calls or a timeout races a result.
- Promise rejections are captured by `Promise.allSettled()` and converted to callback errors; no unhandled rejection path is used.

## 8. IPv4 and IPv6 handling

The preflight evidence showed Atlas A records and no Atlas AAAA records for the tested environment, plus DNS64/NAT64-style synthesis on the Android side.

The implementation does not hard-code an IPv4-only policy. It:

- Queries A and AAAA by default.
- Returns IPv4 first.
- Keeps AAAA results available as fallback.
- Allows explicit IPv6-only lookups through `family: 6`.
- Does not set the driver's `family` option.

This preserves a path for future IPv6-capable environments while preferring IPv4 in the current one.

## 9. Security and TLS preservation

- The MongoDB URI and credentials are unchanged.
- The `mongodb+srv://` scheme is unchanged.
- No Atlas IP access rule was changed.
- `0.0.0.0/0` was not added.
- TLS and certificate verification were not disabled.
- The original hostname is retained for TLS SNI and certificate validation.
- Authentication and connection pooling are unchanged.
- `MongoStore` still receives `mongoose.connection.getClient()`.
- The URI is parsed only internally to derive the DNS scope; it is never logged or included in errors.
- The custom resolver is restricted to the Atlas parent domain derived from the configured URI; unrelated hostnames use the operating-system resolver.
- No unbounded DNS cache was added.
- No database credential, session secret, or connection string appears in this report.

## 10. Tests executed and exact results

### 10.1 Focused DNS tests

Command:

```text
cd server
NODE_ENV=test node --import tsx --test test/dns.test.ts
```

Result:

```text
tests 18
pass 18
fail 0
cancelled 0
skipped 0
todo 0
exit 0
```

Covered cases include IPv4-only success, requested IPv6, IPv4-first ordering, `all: true`, single-address callback, IP literals, one-family `ENODATA`, both-family failure, empty address lists, exactly-once completion, invalid family, string family values, DNS initialization order, initialization errors and retry, dedicated resolver server configuration, credential-free scope derivation, fallback for unrelated hostnames, resolver failure propagation, and timeout handling.

### 10.2 Backend typecheck

Command:

```text
cd server
npm run typecheck
```

Result:

```text
tsc -p tsconfig.json --noEmit
exit 0
```

An initial typecheck run found callback-arity errors in the new helper. The helper's internal completion type was corrected; the final typecheck passed with no errors.

### 10.3 Full non-database test suite

Command:

```text
cd server
NODE_ENV=test npm test
```

Result:

```text
tests 65
pass 65
fail 0
cancelled 0
exit 0
```

The database suite was skipped by its existing `RUN_DB_TESTS=1` guard during this run.

### 10.4 Production build

Command:

```text
cd server
npm run build
```

Result:

```text
tsc -p tsconfig.json
exit 0
```

Compiled output was inspected:

- `server/dist/lib/dns.js` exists and contains the DNS server list, resolver calls, initializer, scope derivation, and lookup factory.
- `server/dist/db.js` imports and calls `configureMongoDns`, derives the scope, creates the lookup, and includes it in the Mongoose connection options.

### 10.5 Database integration tests

The integration test has an explicit guard requiring the connected database to be exactly `kaos_academy_test`. It uses `deleteMany()` for cleanup and does not call `dropDatabase()`.

Command:

```text
cd server
NODE_ENV=test RUN_DB_TESTS=1 node --env-file=.env --import tsx --test test/db.integration.test.ts
```

Final result:

```text
tests 10
pass 10
fail 0
cancelled 0
duration_ms 238728.800691
exit 0
```

An earlier attempt hit the execution tool's 240-second limit after 9 tests had passed and the final test was still running. That was a command-level timeout, not a failed assertion. The retry with a larger timeout completed all 10 tests successfully. The test-runner output included unrelated Mongoose deprecation warnings for the `new` option; they did not affect results.

## 11. MongoDB connectivity result

MongoDB Atlas connectivity succeeded during the integration run on the currently active Android/Termux network.

- Connection used the existing `mongodb+srv://` URI.
- Atlas SRV/TXT discovery succeeded.
- The integration test verified the connected database name before writes.
- The connected test database was `kaos_academy_test`.
- All 10 integration tests passed.
- No production database writes occurred.
- No production seeding or deployment occurred.

The preflight operating-system lookup timeout was reproduced before the change. After the change, the same environment completed the Atlas integration suite through the custom lookup path. This is evidence that the application-level DNS path resolved the observed stall for the tested connection.

## 12. Network scope of verification

- The original problematic environment was the currently active Android/Termux network.
- No network switching was performed.
- Wi-Fi was not independently verified as the only successful network.
- Mobile-data, alternate Wi-Fi, DNS-blocked, and port-blocked scenarios were not tested.

## 13. Known limitations and remaining risks

1. Atlas source-IP access rules still apply. Public DNS cannot bypass an IP allow-list.
2. Network-level blocking of TCP port 27017, UDP/TCP port 53, or IPv6-only paths without a usable IPv4 path remains outside application control.
3. `dns.setServers()` is process-wide. It affects all c-ares lookups in the process, not only MongoDB. This is intentional for the SRV/TXT path but should be remembered if other libraries use c-ares.
4. The custom lookup is scoped to `mongodb+srv` Atlas hostnames under `.mongodb.net`. Non-Atlas or direct `mongodb://` URIs keep the operating-system resolver.
5. Unrelated hostnames encountered by the MongoDB client fall back to the operating-system resolver, which can still exhibit the original Android `getaddrinfo` behaviour.
6. No application-level DNS cache was added. Each lookup performs resolver queries; latency depends on the public resolvers and the network.
7. The lookup timeout is 5 seconds, while the existing driver server-selection timeout is 8 seconds. A very slow DNS path can still cause a connection failure.
8. The global DNS setting is not restored on disconnect; it remains process-wide for the lifetime of the process.
9. The integration suite is slow on this network (about four minutes) because of Atlas round-trip latency.
10. No production deployment or production database verification was performed.

## 14. Final Git status

No Git write operation was performed. The following is the read-only working-tree status after implementation, tests, build, and report creation. Pre-existing modifications and untracked files remain present.

```text
 M client/src/App.tsx
 M client/src/lib/queries.ts
 M client/src/lib/types.ts
 M client/src/pages/CourseDetail.tsx
 M client/src/pages/Dashboard.tsx
 M client/src/pages/Lesson.tsx
 M server/src/app.ts
 M server/src/content/index.ts
 M server/src/content/types.ts
 M server/src/db.ts
 M server/src/lib/progress.ts
 M server/src/routes/courses.ts
 M server/src/routes/dashboard.ts
 M server/src/routes/lessons.ts
 M server/src/routes/progress.ts
 M server/src/seed/seedContent.ts
 M server/test/db.integration.test.ts
 M server/test/http.test.ts
?? S2-SUMMARY.md
?? client/src/components/Quiz.tsx
?? client/src/pages/Quiz.tsx
?? reports/DNS-IMPLEMENTATION-REPORT.md
?? reports/DNS-MONGODB-CUSTOM-RESOLVER-INVESTIGATION.md
?? reports/DNS-MONGODB-INSPECTION-REPORT.md
?? reports/S2-ACCEPTANCE-AUDIT-REPORT.md
?? reports/S2-IMPLEMENTATION-REPORT.md
?? reports/S2-PLANNING-AND-ROADMAP-REPORT.md
?? reports/S2-PRE-IMPLEMENTATION-AUDIT-REPORT.md
?? server/src/content/achievements.ts
?? server/src/content/quizzes/
?? server/src/lib/dns.ts
?? server/src/lib/quiz.ts
?? server/src/lib/rewards.ts
?? server/src/models/Achievement.ts
?? server/src/models/Quiz.ts
?? server/src/models/QuizAttempt.ts
?? server/src/models/UserAchievement.ts
?? server/src/models/XpEvent.ts
?? server/src/routes/quizzes.ts
?? server/src/schemas/quiz.ts
?? server/test/dns.test.ts
?? server/test/quiz-content.test.ts
?? server/test/quiz.test.ts
?? server/test/rewards.test.ts
```

## 15. Outstanding work

- No production deployment.
- No production database verification.
- No alternate network matrix testing.
- No test with public DNS deliberately blocked.
- No change to Atlas IP access rules or other external security settings.
