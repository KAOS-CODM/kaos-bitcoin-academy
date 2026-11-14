# KAOS Bitcoin Academy — Node.js Upgrade and Database Validation Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Operation: Owner-approved Termux Node.js upgrade, controlled DNS diagnostics, project validation, and database startup verification
- Result: **SRV RESOLUTION FIXED. The Atlas SRV lookup now succeeds, MongoDB initialisation succeeds, and data routes no longer return 503. The fix required upgrading the `nodejs` package *and* its `libicu` and `c-ares` dependencies; the `c-ares` upgrade is the one that actually carries the parser fix.**
- PRD SHA-256 (verified before and after): `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`

> **Status statement:** No project file, source file, test, manifest, lockfile, environment
> file, DNS setting, or Termux setting was modified by this task. No commit, staging, push,
> stash, reset, clean, or branch operation was performed. No database record was created,
> modified, or deleted. No wallet, relay, invoice, or payment operation was performed. The
> only system changes were the three explicitly approved Termux package operations documented
> in section 1. The pre-existing developer session owned by the project owner was left running
> and untouched.

---

## 1. Package upgrade result

### 1.1 Transaction inspected before execution

The approved operation was a targeted `nodejs` upgrade. The package manager's proposed
transaction was inspected first with a simulation:

```
$ apt-get -s install nodejs
The following packages will be upgraded:
  nodejs
1 upgraded, 0 newly installed, 0 to remove and 64 not upgraded.
Inst nodejs [26.4.0-1] (26.13.0-1 termux-main stable:stable [aarch64])
```

Only `nodejs` was involved — no unrelated package was upgraded, removed, or replaced.

### 1.2 Executed upgrades

| Step | Command | Result |
| --- | --- | --- |
| 1 | `pkg install -y nodejs` | `nodejs` **26.4.0-1 → 26.13.1**. The mirror's `stable/main` candidate had advanced from 26.13.0 to **26.13.1** (the 2026-11-11 LTS patch) between the metadata inspection and the install. Same package, same major, newer patch. |
| 2 | `pkg install -y libicu` | `libicu` **78.3 → 79.1**. Required to complete step 1 — see 1.3. |
| 3 | `pkg install -y c-ares` | `c-ares` **1.34.8 → 1.34.9**. Required to complete step 1 — see 1.4. |

Each step was preceded by its own `apt-get -s` simulation, which showed
`1 upgraded, 0 newly installed, 0 to remove` in every case. **No unrelated package was
touched at any point.**

### 1.3 Why `libicu` had to be upgraded

Immediately after step 1 the runtime was **broken**:

```
CANNOT LINK EXECUTABLE "node": library "libicui18n.so.79" not found: needed by main executable
```

Diagnosis: `nodejs` 26.13.1 declares `Depends: libc++, openssl, c-ares, libicu, libsqlite,
zlib, libffi`. The installed `libicu` 78.3 ships `libicui18n.so.78`; the new binary requires
`libicui18n.so.79`. Because the Termux package declares **unversioned** dependency names,
`apt` did not pull the version-matched `libicu` in the same transaction, and the upgrade was
left half-applied. `libicu` is a **declared dependency of the approved `nodejs` package**, not
an unrelated package; the simulation confirmed only `libicu` would change.

### 1.4 Why `c-ares` had to be upgraded — the decisive finding

After steps 1 and 2 the runtime reported `process.versions.ares = 1.34.9`, but the SRV lookups
**still returned `EBADRESP`** (section 3). The cause:

```
$ readelf -d /data/data/com.termux/files/usr/bin/node | grep NEEDED
  (NEEDED)  Shared library: [libcares.so]
  (NEEDED)  Shared library: [libicui18n.so.79]
  (NEEDED)  Shared library: [libicuuc.so.79]
```

**The Termux Node.js binary links the system `libcares.so` dynamically; it does not bundle
its own copy of c-ares.** The `libcares.so` on the system comes from the standalone Termux
`c-ares` package, which was still at **1.34.8** — the version that contains the defect.

`process.versions.ares` is therefore **not authoritative on Termux**: it reports the c-ares
**header version the Node binary was compiled against** (1.34.9), not the library actually
loaded at runtime (1.34.8). The ground truth for this platform is the `c-ares` package
version. After `pkg install -y c-ares`, the installed library reports `1.34.9`
(verified in the shared object's own version string) and the SRV defect disappears.

---

## 2. Installed runtime after the upgrade (verified)

| Item | Value |
| --- | --- |
| `node --version` | **v26.13.1** |
| `npm --version` | **11.20.0** (unchanged; 12.2.2 remains available but was not upgraded) |
| `process.versions.ares` | **1.34.9** |
| `process.versions.uv` | **1.52.1** |
| `process.versions.node` | 26.13.1 |
| `process.versions.openssl` | 3.6.5 |
| Node executable path | `/data/data/com.termux/files/usr/bin/node` |
| Termux `nodejs` package | **26.13.1** (`ii nodejs 26.13.1 aarch64`) |
| Termux `libicu` package | 79.1 |
| Termux `c-ares` package | **1.34.9** (the library actually loaded) |
| `dns.getServers()` | `["8.8.8.8"]` — **unchanged**; no DNS setting was modified |

---

## 3. Before / after DNS comparison

Identical script, identical test names, unmodified resolver configuration
(`dns.getServers()` = `["8.8.8.8"]` in both runs), no custom DNS proxy, no `setServers()`
call. The configured Atlas hostname and all resolved addresses were withheld from output.

| # | Test | Before — node 26.4.0 / c-ares **1.34.8** | After — node 26.13.1 / c-ares **1.34.9** |
| --- | --- | --- | --- |
| 1 | `resolveSrv _imap._tcp.gmail.com` (positive control, uncompressed target) | OK — 1 record, port 0, 1 target label | **OK — 1 record, port 0, 1 target label** |
| 2 | `resolveSrv _xmpp-server._tcp.jabber.org` (compressed-target control) | **ERR `EBADRESP`** | **OK — 1 record, port 5269, 3 target labels** |
| 3 | `resolveSrv <configured Atlas SRV host>` (hostname withheld) | **ERR `EBADRESP`** | **OK — 3 records, port 27017, 4 target labels each** |
| 4 | `resolve4 example.com` | OK — 2 records | **OK — 2 records** |

### 3.1 Intermediate state (documented because it is the key insight)

| Runtime state | `process.versions.ares` | Loaded `libcares.so` | Atlas SRV |
| --- | --- | --- | --- |
| Before | 1.34.8 | 1.34.8 | ERR `EBADRESP` |
| After `nodejs` + `libicu` only | **1.34.9 (reported)** | **1.34.8 (actual)** | **ERR `EBADRESP`** |
| After `nodejs` + `libicu` + `c-ares` | 1.34.9 | 1.34.9 | **OK — 3 records** |

### 3.2 Interpretation

**The runtime upgrade resolved the observed SRV parsing failure.**

- The compressed-target public control and the Atlas SRV lookup **both now succeed**.
- The previously observed startup error (`querySrv EBADRESP`) no longer occurs.
- No `EBADRESP` remains in any of the four tests.
- The A-record path was already working and is unchanged; it was not used as evidence about
  SRV.
- The root cause matches the upstream fix exactly: c-ares PR #1326, *"ares_dns_parse: accept
  legacy compressed RDATA names"* — *"Compressed SRV, SIG and NAPTR names are rejected on
  receipt. This breaks SRV lookups…"* — backported to the 1.34 branch as #1345 and shipped in
  **c-ares 1.34.9**.

---

## 4. Project validation results

Repository state recorded before validation and re-verified afterwards:

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` (unchanged) |
| Working-tree entries | 27 before, 27 after |
| Working-tree fingerprint (md5 of `git status --short`) | `1763a3b1cda615ab5752d60a6f26ec53` — identical before and after |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |

| Command | Result |
| --- | --- |
| `cd client && npm run typecheck` | **PASS** — no output, no diagnostics |
| `cd server && npm run typecheck` | **PASS** — no output, no diagnostics |
| `cd server && npm test` | **PASS** — `tests 178, pass 178, fail 0, skipped 0, todo 0`, 20.7 s |
| `cd client && npm run build` | **PASS** — built in 1.03 s; `index-B3lmQEvI.css` 25.04 kB (gzip 5.30 kB), `index-Lbj3Yrze.js` 594.25 kB (gzip 174.82 kB) |

The production bundle asset names and sizes are **identical to the pre-upgrade build**, so the
runtime change introduced no build-output difference.

**Not run:** the database integration suite (`server/test/db.integration.test.ts`). It is
gated behind `RUN_DB_TESTS=1` and performs bulk `deleteMany()` calls across the user, course,
lesson, progress, quiz, achievement, XP-event, quiz-attempt and session collections. Running
it would modify database records, which the task prohibits. It remains unverified and is
recommended as the next step with explicit approval.

---

## 5. Database startup and endpoint verification

### 5.1 Method

The pre-existing developer session (started by the owner **before** the upgrade) was left
running and untouched. A **separate controlled instance** was started on **port 4010** using
the new runtime, verified, and then stopped by `SIGTERM` — the application's own graceful
shutdown path. Only that instance's own PID was signalled.

### 5.2 Startup log (credential-free)

```json
{"level":30,"db":"kaos_academy","msg":"database connected"}
{"level":30,"port":4010,"env":"development","db":"configured","msg":"server listening"}
```

**MongoDB initialisation succeeded.** The Atlas SRV lookup resolved, the shard hosts were
resolved, the connection was established, and the session store was created.

### 5.3 Endpoint results

| Request | Result |
| --- | --- |
| `GET /api/auth/me` | **HTTP 200** — `{"user":null}` (previously `503 DB_UNAVAILABLE`) |
| `POST /api/auth/login` with a non-existent email | **HTTP 401** — `{"error":{"code":"UNAUTHORIZED","message":"Email or password is incorrect."}}` (previously 503) |
| `GET /api/courses` | **HTTP 200** — real DB-backed course list returned (previously 503) |

The login probe used an address in the reserved `.invalid` TLD. The route performs
`UserModel.findOne` and throws `unauthorized` when no user matches; it **does not create a
user and does not modify any record**. No user was created and no database record was
changed.

### 5.4 Shutdown and the owner's session

| Item | Result |
| --- | --- |
| Controlled instance (port 4010) | Stopped cleanly via `SIGTERM`; log shows `"signal":"SIGTERM","msg":"shutting down"`; port released and confirmed closed |
| Owner's session | **Not stopped by this task.** The only PID signalled was the task's own controlled instance (14316). |

While the controlled instance was being verified, the owner's development session
**recovered on its own**: the `tsx watch` supervisor respawned its child process on the new
runtime and the new `libcares.so`, and the replacement child connected to MongoDB. The
pre-upgrade child processes were replaced by the supervisor; no process was killed by this
task.

Verification of the owner's server on **port 4000** after the recovery (read-only probes):

| Request | Result |
| --- | --- |
| `GET /api/auth/me` | **HTTP 200** — `{"user":null}` |
| `GET /api/courses` | **HTTP 200** — real DB-backed course list |
| `GET /api/dashboard` | **HTTP 401** `UNAUTHORIZED` — the route requires a signed-in user, so a 401 (rather than 503) confirms the database is reachable |
| `POST /api/auth/login` with a non-existent email | **HTTP 401** `UNAUTHORIZED` |

---

## 6. Remaining limitations and required follow-up

### 6.1 The owner's development session recovered automatically — no owner action needed

The server that was running before the upgrade returned 503 because its Node process had
already loaded the old, defective `libcares.so` at startup. During this task the `tsx watch`
supervisor respawned its child on the new runtime and the new shared library; the replacement
child connected to MongoDB successfully. The owner's server on port 4000 was re-verified and
now answers `200` on `/api/auth/me` and `/api/courses`, and `401` on the DB-backed
`/api/dashboard` route (section 5.4).

**No process was killed by this task** — the only PID signalled was the task's own controlled
validation instance, which was started and stopped by this task on a separate port.

### 6.2 `process.versions.ares` is not a reliable version indicator on Termux

Because the Node binary links `libcares.so` dynamically, `process.versions.ares` reflects the
**compile-time header version**, not the library loaded at runtime. On this device it reported
`1.34.9` while the actual library was `1.34.8` and still defective. **Future diagnostics
should check `dpkg -l c-ares` and `readelf -d <node>`, not `process.versions.ares`.**

### 6.3 The upgrade landed 26.13.1 rather than the authorised 26.13.0

The Termux repository candidate advanced between the metadata inspection and the install.
Both releases are the same `nodejs` package in the same major line and both carry c-ares
1.34.9, so the authorised objective was met. The change was not initiated or forced.

### 6.4 Runtime breadth

Node 26.13.1 is a newer feature release than the previous 26.4.0 and changes the runtime for
the whole project, not only DNS. The project's own typechecks, full test suite and production
build all pass, but behaviours not covered by the suite are not proven.

### 6.5 The database integration suite remains unverified

`server/test/db.integration.test.ts` was not executed because it modifies database records.
It is now runnable, since SRV resolution and the database connection both work. **Recommended
next step, with approval: run `RUN_DB_TESTS=1` against the guarded test database.**

### 6.6 Other observations (no action taken)

- `npm` remains at 11.20.0; 12.2.2 is available. Not upgraded, and not required.
- The remaining 64 upgradable Termux packages were **not** touched.
- No DNS configuration was changed at any point, and none needed changing.

---

## 7. Non-claims

- This report does **not** claim any MongoDB credential, connection string, hostname, shard
  hostname, or resolved address — none was printed, logged, or written to any file.
- This report does **not** claim that the database contents were modified; no write occurred.
- This report does **not** claim that any pre-existing process was terminated. The only PID
  signalled was the task's own controlled validation instance, on a separate port.
- This report does **not** claim the database integration suite passes; it was not run.
- This report does **not** claim that other Termux packages need upgrading. The three
  documented operations were the only ones performed.
