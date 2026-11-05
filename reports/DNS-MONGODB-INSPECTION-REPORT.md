# Read-Only DNS / MongoDB Configuration Inspection

**Scope executed:** repository searches, source reading, driver source reading, and DNS-layer probes only.  
**Not performed:** file edits, package installs, environment changes, service restarts, MongoDB connections, TCP probes to port 27017, or any Git write operation. Read-only Git commands used: `status`, `diff`, `log`, `ls-files`, `check-ignore`.

> Security note: `server/.env:9` contains a live-looking MongoDB credential. Its value is deliberately redacted here. The file is correctly ignored by Git (`.gitignore:8`, confirmed with `git check-ignore`), but it was exposed in this session's tool output. Rotation should be considered if these logs are shared.

---

## 1. Search results

Searched all project files, excluding `.git` and `node_modules` (driver internals checked separately).

| Pattern | Result | Locations |
|---|---|---|
| `dns.setServers` | **NOT PRESENT** | No match anywhere in project code or history (`git log -S` also empty) |
| `dns.Resolver` | **NOT PRESENT** | No match |
| `dns.promises` | **NOT PRESENT in project code** | Present only in driver: `server/node_modules/mongodb/lib/connection_string.js:29-30`, `server/node_modules/mongodb/lib/sdam/srv_polling.js:81` |
| `resolveSrv` | **NOT PRESENT as a project symbol** | Driver resolves SRV via `dns.promises.resolve(address, 'SRV')`, not a `resolveSrv` wrapper — `connection_string.js:29,45,65` |
| `8.8.8.8` | **NOT PRESENT in project** | **CONFIRMED outside the repo** at `/data/data/com.termux/files/usr/etc/resolv.conf:1` |
| `1.1.1.1` | **NOT PRESENT** | No match |
| `mongodb+srv` | **CONFIRMED** | `server/.env.example:8` (format comment), `server/.env:8` (comment), `server/.env:9` (actual URI, redacted), `server/test/static.test.ts:36` (forbidden-string assertion) |
| `mongoose.connect` | **CONFIRMED** | `server/src/db.ts:6`, built copy `server/dist/db.js:5` |
| `MongoClient` | **NOT PRESENT in project code** | Only inside `node_modules`; `connect-mongo` reuses the supplied client (`server/node_modules/connect-mongo/dist/index.cjs:203-218`, especially `:215`) |

No `node:dns`, `require('dns')`, `NODE_OPTIONS`, or DNS preload exists in `package.json`, `scripts/dev.mjs`, `server/dist`, or any source/test file.

---

## 2. Is custom DNS configured?

### Project-level: **NOT PRESENT**

There is no DNS configuration in the application. The only resolver-related value in the project is the `mongodb+srv` URI in `server/.env:9`, which causes the driver to perform SRV/TXT lookups.

### Environment-level: **CONFIRMED**

At runtime:

```text
dns.getServers()          => ["8.8.8.8"]
dns.getDefaultResultOrder() => "verbatim"
```

The only resolver configuration found is:

```text
/data/data/com.termux/files/usr/etc/resolv.conf:1
nameserver 8.8.8.8
```

This is outside the repository. `/etc` is a symlink to `/system/etc` and `/etc/resolv.conf` is absent, so this is a Termux-provided resolver file, not Android's system resolver. The exact mechanism by which Node's c-ares picks it up is **UNCERTAIN**, but the effective value is **CONFIRMED** by `dns.getServers()`.

`server/.env` contains only `NODE_ENV`, `PORT`, `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `APP_ORIGIN`, `LOG_LEVEL` — no DNS variables.

---

## 3. DNS behavior relevant to the driver

| Question | Finding |
|---|---|
| Exact file/line | `/data/data/com.termux/files/usr/etc/resolv.conf:1` (environment, not repo). No project file. |
| DNS API used | c-ares default global resolver. The driver calls `dns.promises.resolve(host, 'SRV'/'TXT')`. There is **no** `dns.setServers` and **no** `dns.Resolver` instance. |
| Affects SRV lookups? | **Yes.** `connection_string.js:29-30` uses `dns.promises.resolve`, which is c-ares-backed and therefore honors the configured nameserver. |
| Affects hostname lookups? | **No.** `dns.lookup()` / `getaddrinfo` is a separate path (Android/Bionic/netd), not controlled by this resolv.conf or by `dns.setServers`. This was confirmed observationally: c-ares A lookups succeeded while `dns.lookup` for the same names timed out. |
| Executed before `mongoose.connect()`? | No application code runs DNS setup. The resolver configuration is environmental and is read by c-ares independently of application ordering. |
| Actually used by the driver? | **Yes for SRV/TXT**, via `connection_string.js:29-45,65` and periodic re-polling at `srv_polling.js:60-85`. **No for TCP hostname resolution**, which goes through `net.createConnection()` at `cmap/connect.js:295` and thus `getaddrinfo`. |

Important consequence: adding `dns.setServers()` to the app would affect **only** SRV/TXT resolution, not the `getaddrinfo` path that is currently observed hanging. It would not be a complete fix for the reported TCP timeouts.

---

## 4. MongoDB connection initialization sequence

### Startup path (`server/src/index.ts`)

1. `config.ts:1` loads `dotenv` at import time, then validates `MONGODB_URI` at `config.ts:8`. Production requires it (`config.ts:33-36`). Exported as `config.mongodbUri` (`config.ts:56`).
2. `index.ts:10` enters `main()`. If a URI exists (`index.ts:13`):
3. `index.ts:15` calls `connectDatabase(config.mongodbUri, config.mongodbDb)`.
4. `db.ts:4-14`:
   - `db.ts:5` sets `strictQuery`.
   - `db.ts:6` calls `mongoose.connect(uri, {...})`.
   - Options: `dbName` (`:7`), `maxPoolSize: 10` (`:8`), `minPoolSize: 0` (`:9`), `serverSelectionTimeoutMS: 8000` (`:10`), `socketTimeoutMS: 45000` (`:11`).
   - Inside `mongoose.connect`, Mongoose creates a `MongoClient`; the driver parses the `mongodb+srv` URI, performs SRV/TXT DNS, opens topology monitors, and waits for server selection before resolving.
5. `index.ts:16` calls `ensureIndexes()` (`db.ts:28-49`), which dynamically imports nine models and runs `createIndexes()` in `Promise.all`.
6. `index.ts:17-23` creates `MongoStore` using the **existing** client: `mongoose.connection.getClient()`. No second client is created.
7. `index.ts:24-30` catches any failure from steps 3–6:
   - Production: logs and exits (`:26-28`).
   - Development: logs a warning and continues with `sessionStore` undefined (`:29`), causing `express-session` to use its in-memory store.
8. `index.ts:40` creates the app; `:41-46` starts listening.
9. Shutdown (`index.ts:48-55`): closes HTTP server, then calls `disconnectDatabase()` (`db.ts:20-22`).
10. Top-level `main().catch()` (`index.ts:61-63`) exits on fatal startup errors.

### Other connection paths

- Seed: `server/seed/run.ts:14-20` — connect → `ensureIndexes()` → seed → disconnect; errors disconnect and exit (`:23-27`).
- Integration tests: `server/test/db.integration.test.ts:67-97` — connect → DB-name guard → indexes → cleanup → seed → session store; teardown at `:120-143`.

### Ordering / error-handling findings

| Finding | Status |
|---|---|
| No DNS setup is ordered before `mongoose.connect()`; none exists. | **CONFIRMED** |
| `ensureIndexes()` and `MongoStore.create()` failures are caught by the same block that reports `"database connection failed"` (`index.ts:24-25`). A connected-but-unindexed database is therefore misreported as a connection failure. | **CONFIRMED** |
| In development, if `ensureIndexes()` fails after a successful `connectDatabase()`, Mongoose remains connected (`isDbReady()` may return `true`) while `sessionStore` stays `undefined`, silently switching sessions to in-memory storage. | **CONFIRMED code behavior** |
| No `mongoose.connection.on('error')` / `.once('error')` listener exists anywhere in `server/src` or `server/test`. Post-startup connection errors are not handled at application level. | **CONFIRMED** |
| No initial-connect retry/backoff. A failed startup in development stays DB-unavailable until restart; requests return 503 via `requireDb` (`middleware/auth.ts:5-11`). | **CONFIRMED** |
| `serverSelectionTimeoutMS: 8000` is short relative to observed `getaddrinfo` hangs of ~6–10 seconds. Server selection can expire before TCP connection is even attempted. | **CONFIRMED config; causal link plausible** |
| No explicit `family`, `lookup`, `autoSelectFamily`, `directConnection`, or `replicaSet` options are passed (`db.ts:6-12`), so Node/driver defaults apply. | **CONFIRMED** |
| `server/src/db.ts` has uncommitted changes, but they are only in `ensureIndexes()`; connection options are unchanged and match `server/dist/db.js`. | **CONFIRMED via `git diff`** |
| `reports/S2-IMPLEMENTATION-REPORT.md:198` already records the same `ReplicaSetNoPrimary` / 8000 ms failure. | **CONFIRMED** |

---

## 5. Can the current DNS configuration explain the symptoms?

### A. Intermittent SRV lookup timeouts — **environmentally possible; not caused by project config**

The project configures no DNS, so it cannot directly cause SRV timeouts. However, the environment pins c-ares to a single resolver, `8.8.8.8`, and the driver only retries once on `dns.TIMEOUT` (`connection_string.js:32-41`). If that single path is blocked, rate-limited, or slow, SRV/TXT lookups can intermittently time out.

Observed during this inspection:

```text
resolveSrv _mongodb._tcp.cluster0...  => OK, 368 ms, returned all 3 nodes
resolve4  node-00                      => OK, 2,955 ms
resolve4  node-01                      => timed out (6 s bound)
resolve4  node-02                      => OK, 3,812 ms
resolve4  google.com                   => OK, 112 ms (earlier run)
```

Verdict: **CONFIRMED** that the environment uses a single public resolver and that lookup latency/timeouts are intermittent. **UNCERTAIN** whether that is the sole cause of every SRV timeout, but it is a credible environmental contributor.

### B. `ReplicaSetNoPrimary` — **not explained by project DNS; root cause UNCERTAIN**

Current SRV resolution returned all three nodes:

```text
ac-xtyudlr-shard-00-02.amgeffi.mongodb.net:27017
ac-xtyudlr-shard-00-00.amgeffi.mongodb.net:27017
ac-xtyudlr-shard-00-01.amgeffi.mongodb.net:27017
```

So there is no evidence of an incomplete SRV answer at this moment. `ReplicaSetNoPrimary` means the driver established topology but saw no primary. That is consistent with the reachable node being a secondary and the primary’s monitor/TCP connection failing. DNS is only an indirect contributor if hostname resolution prevents monitors from reaching the primary; it is not the direct cause.

Verdict: **UNCERTAIN**, and **NOT PRESENT** as a project DNS misconfiguration.

### C. Two Atlas nodes timing out on 27017 while one is reachable — **project DNS cannot explain; environment resolver can**

This is the strongest finding. The driver’s TCP path uses `net.createConnection()` (`cmap/connect.js:295`), which resolves hostnames through `dns.lookup()` / `getaddrinfo`, **not** the c-ares path that uses `8.8.8.8`.

Observed `dns.lookup` behavior for the same three hosts:

| Run | Node | `dns.lookup` result |
|---|---|---|
| 1 | `...-00` | OK immediately → `64:ff9b::413e:2710` (NAT64 IPv6 encoding of `65.62.39.16`) |
| 1 | `...-01` | `ENOTFOUND` after 10,018 ms |
| 1 | `...-02` | script-level timeout (30 s) |
| 2 | all three | local 6 s timeout |
| 2 | control `google.com` | local 6 s timeout |

The first run produced a DNS64/NAT64-synthesized IPv6 address (`64:ff9b::/96`). If the network’s NAT64/IPv6 path is broken, that node’s TCP connection times out even though its A record exists. The second run shows `getaddrinfo` hanging generally, including for `google.com`, confirming this is an OS/network resolver issue rather than an Atlas-specific hostname issue.

Node’s default result order here is `verbatim`, and the app passes no `family` or `autoSelectFamily` override, so synthesized IPv6 results are not deprioritized.

Verdict:

- **CONFIRMED:** the environment’s hostname-resolution path (`getaddrinfo`) is intermittent and can hang beyond the 8 s server-selection timeout.
- **CONFIRMED:** TCP connections use that path, not the 8.8.8.8 c-ares path.
- **UNCERTAIN:** whether this exactly produced the observed “two nodes fail, one succeeds” pattern; no TCP probes to 27017 were made, per instruction.
- **NOT PRESENT:** any project-level DNS setting capable of causing per-node TCP timeouts.

---

## 6. Bottom line

| Question | Verdict |
|---|---|
| Custom DNS configured in the project? | **NOT PRESENT** |
| Custom DNS effective in the runtime environment? | **CONFIRMED** — single nameserver `8.8.8.8` via `/data/data/com.termux/files/usr/etc/resolv.conf:1` |
| Does it affect SRV lookups? | **CONFIRMED yes** (c-ares → `dns.promises.resolve(...,'SRV')`) |
| Does it affect TCP hostname lookups? | **CONFIRMED no** (`getaddrinfo`/`dns.lookup` is separate) |
| Is DNS setup ordered before `mongoose.connect()`? | No project-level setup exists |
| Does the driver use it? | Yes for SRV/TXT; no for TCP host resolution |
| Can it explain intermittent SRV timeouts? | Environmentally possible; **not** due to project config |
| Can it explain `ReplicaSetNoPrimary`? | Indirectly at most; **UNCERTAIN**, no incomplete SRV answer observed |
| Can it explain two nodes timing out on 27017? | Project DNS: **no**. OS resolver/NAT64 behavior: **credible mechanism, cause UNCERTAIN** |

**No changes were made.** The pre-existing working-tree modifications shown by `git status` were not touched.
