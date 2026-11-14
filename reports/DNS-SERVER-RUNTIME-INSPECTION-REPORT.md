# KAOS Bitcoin Academy — Server Runtime DNS Configuration Inspection

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Inspection type: Read-only DNS and runtime resolver inspection
- Result: **Google Public DNS is ALREADY the configured resolver at every layer that can be configured. Configuring it again would change nothing. The MongoDB SRV lookup currently fails inside Node's bundled c-ares, not in the network. The failure is unrelated to an authentication error.**
- PRD SHA-256 (verified, unmodified): `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`

> **Status statement:** This inspection changed nothing. No file, environment variable,
> Android/Termux setting, resolver configuration, or service was modified. No server was
> restarted. No wallet, relay, or database operation was performed. The only network activity
> was read-only DNS queries, including two temporary loopback-only diagnostic processes used
> to isolate the cause. No credential, connection string, database hostname, shard hostname,
> or IP address is reproduced in this report.

---

## 1. Executive summary

| Question | Finding |
| --- | --- |
| Current DNS resolver configuration | Termux resolver: `8.8.8.8`. Node c-ares default: `8.8.8.8`. Application: `1.1.1.1` + `8.8.8.8` (hard-coded). |
| Who controls DNS | **Android/netd** for `getaddrinfo`; **Termux `resolv.conf` + Node c-ares** for Node-side resolution; **the application** for its own c-ares server list. **No deployment infrastructure exists in this repository.** |
| Node.js resolution behaviour | `dns.lookup` → OS `getaddrinfo`. `dns.resolve*` / `dns.promises.resolve` → c-ares. The MongoDB driver uses the c-ares path for SRV/TXT. |
| Is MongoDB hostname resolution failing? | **Yes — SRV only.** The host exists and its SRV record is correct on the wire, but Node's c-ares rejects it with `EBADRESP`. The record's *targets* resolve fine as ordinary A records. |
| Would Google DNS configuration help? | **No.** It is already in use at the OS and application layers, the failure is independent of the resolver address, and all outbound DNS on this network is intercepted anyway. |
| Is DNS likely the cause of the HTTP 503 "authentication" errors? | **No, not for the authentication wording.** Authentication only happens after DNS, TCP, and TLS all succeed. A separate 503 `DB_UNAVAILABLE` caused by the SRV failure is plausible and distinguishable by its logged error code. |

**Root cause identified (read-only, reproducible):** Node 26.4.0 ships c-ares 1.34.8. In this
runtime, c-ares fails with `EBADRESP` when an SRV answer uses a **compression pointer for the
target name inside the record data**. Real resolvers compress SRV targets, so every genuine
SRV answer from this network trips the bug. A minimal four-case experiment isolates it
(section 5.5).

---

## 2. Scope, method, and boundaries

### 2.1 What was inspected

- Termux resolver file and Android resolver properties.
- Node.js resolver state and behaviour (`dns.getServers`, `dns.lookup`, `dns.resolve*`,
  `dns.promises.resolve`).
- The application's DNS module, database bootstrap, environment schema, and startup path.
- Repository deployment and infrastructure configuration.
- The MongoDB driver's SRV/TXT resolution call site.
- Prior DNS reports in this repository (`DNS-IMPLEMENTATION-REPORT.md`,
  `DNS-MONGODB-CUSTOM-RESOLVER-INVESTIGATION.md`, `DNS-MONGODB-INSPECTION-REPORT.md`).

### 2.2 Method

Read-only inspection plus DNS queries. Where a hand-built DNS response was needed to isolate
the parser behaviour, it was served by a temporary **loopback-only** process on
`127.0.0.1` that answered with synthetic records. No external host was contacted for those
tests, and no real service was queried or modified.

### 2.3 Boundaries observed

- No file was edited, added to the repository, or deleted.
- No environment variable, Android setting, Termux setting, or system configuration was
  changed. `/data/data/com.termux/files/usr/etc/resolv.conf` still reads `nameserver 8.8.8.8`.
- No service was started, stopped, or restarted. The already-running development server was
  not contacted or interfered with.
- No database connection was attempted, and no database credentials were read into output.
- No wallet or relay operation.

---

## 3. Current DNS configuration and evidence

### 3.1 Operating system layer (Android / Termux)

| Item | Finding | Evidence |
| --- | --- | --- |
| Termux resolver | `nameserver 8.8.8.8` — Google Public DNS | `/data/data/com.termux/files/usr/etc/resolv.conf` |
| `/etc/resolv.conf` | Not present in this environment | Path absent |
| Android private-DNS / `net.*` properties | No resolver-related properties exposed to this process | `getprop` returned no DNS entries |
| `getaddrinfo` path | **Works.** `dns.lookup('example.com')` returned 4 addresses | Direct Node probe |

Android owns `getaddrinfo` through `netd`. Termux's own `resolv.conf` is what Node's c-ares
reads at startup.

### 3.2 Node.js layer

| Item | Finding |
| --- | --- |
| Node.js | `v26.4.0` |
| Bundled c-ares | `1.34.8` (`process.versions.ares`) |
| libuv | `1.52.1` |
| `dns.getServers()` | `["8.8.8.8"]` — inherited from the Termux resolver file |
| `dns.lookup` | OS `getaddrinfo` path — **not** affected by `dns.setServers()` |
| `dns.resolve*`, `dns.promises.resolve` | c-ares path — **is** the path the MongoDB driver uses |

### 3.3 Application layer

`server/src/lib/dns.ts` (added 2026-11-05) is the only DNS configuration in the project.

| Location | Finding |
| --- | --- |
| `server/src/lib/dns.ts:5` | `MONGODB_DNS_SERVERS = ['1.1.1.1', '8.8.8.8']` — hard-coded constant |
| `server/src/lib/dns.ts:200` | `configureMongoDns` — process-wide `dns.setServers()`, idempotent after success |
| `server/src/lib/dns.ts:225` | `createMongoResolver` — dedicated `dns.Resolver` with the same two servers, 5 s timeout, 2 tries |
| `server/src/lib/dns.ts:253` | `createMongoLookup` — Node-compatible `lookup` for the driver, IPv4 first |
| `server/src/db.ts:11` | `configureMongoDns()` runs **before** `mongoose.connect()` |
| `server/src/db.ts:13–17` | Atlas scope derived from the URI; custom `lookup` supplied only for a recognised Atlas scope |

### 3.4 Deployment / infrastructure layer

| Item | Finding |
| --- | --- |
| Deployment manifests | **None in this repository** — no `render.yaml`, `Dockerfile`, `compose` file, `Procfile`, or service unit |
| Startup script | `scripts/dev.mjs` — contains no DNS or resolver references |
| Environment schema | `server/src/config.ts` — **no DNS-related keys** (only `NODE_ENV`, `PORT`, `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `APP_ORIGIN`, `RENDER_EXTERNAL_URL`, `LOG_LEVEL`, `AI_ENABLED`, `OPENROUTER_API_KEY`) |
| `server/.env` | Key names only: `AI_ENABLED`, `APP_ORIGIN`, `LOG_LEVEL`, `MONGODB_DB`, `MONGODB_URI`, `NODE_ENV`, `OPENROUTER_API_KEY`, `PORT`, `SESSION_SECRET`. **No DNS key.** Values were never read except the MongoDB URI, which was parsed in-memory and never printed |

**Conclusion:** there is no DNS override in any startup script, environment configuration, or
deployment configuration, and no deployment infrastructure to override. The resolver list is
a source constant.

---

## 4. Node.js DNS resolution behaviour used by the server

Two distinct resolution paths are in play, and the server's DNS module was explicitly built
around that distinction:

| Path | Mechanism | Used for |
| --- | --- | --- |
| `dns.lookup` | OS `getaddrinfo` (Android `netd`) | Anything that does not go through the driver's SRV/TXT step |
| `dns.resolve*`, `dns.promises.resolve` | c-ares 1.34.8 | The MongoDB driver's SRV and TXT discovery |

The prior implementation report (`reports/DNS-IMPLEMENTATION-REPORT.md` §2.3) already recorded
the decisive constraint:

> The driver's SRV/TXT discovery uses the process-wide c-ares resolver, not the per-connection
> `lookup` callback.

**Therefore the application's custom `lookup` option cannot influence SRV discovery.** The
`lookup` callback supplied at `server/src/db.ts:26` is used for the TCP/TLS connection to the
already-discovered shard hosts, which is a later stage.

A further observation from this inspection: `dns.setServers()` changes `dns.getServers()` but
has **no observable effect on which server is actually queried** in this runtime. A dedicated
`Resolver` deliberately pointed at an unroutable TEST-NET address (`203.0.113.1`) still
resolved names successfully. Section 6.1 shows why.

---

## 5. MongoDB hostname resolution: findings and root cause

### 5.1 The host exists and is healthy in public DNS

All checks below were run against the configured Atlas SRV host. The hostname, the shard
hostnames, and the addresses are deliberately not reproduced.

| Query | Transport | Result |
| --- | --- | --- |
| SRV for the Atlas SRV host | UDP → `8.8.8.8` | `NOERROR`, 3 answers, all type SRV, port 27017, targets ending `.mongodb.net` with 4 labels |
| SRV for the Atlas SRV host | UDP → `1.1.1.1` | `NOERROR`, 3 answers |
| SRV for the Atlas SRV host | TCP → `8.8.8.8` / `1.1.1.1` | `NOERROR`, 3 answers |
| SRV with EDNS0 enabled / disabled | UDP → `8.8.8.8` | Byte-identical valid responses |
| TXT for the Atlas host | c-ares | `NOERROR`, 1 record |
| NS for the `mongodb.net` zone | c-ares | `NOERROR`, 4 records |
| A for each SRV target | c-ares **and** `getaddrinfo` | 1 IPv4 address each |

The response is standards-compliant: `rcode 0`, three SRV answers with correct `rdlen`
(31 bytes each), standard compression-pointer encoding for the owner name and the target
name, four authority records, zero additional records.

### 5.2 Node's c-ares rejects the same record

| Call | Result |
| --- | --- |
| `dns.promises.resolve(host, 'SRV')` — **the exact call the driver makes** | `EBADRESP` |
| `dns.resolveSrv(host)` | `EBADRESP` |
| `dns.promises.resolve(host, 'TXT')` — the driver's other call | `OK`, 1 record |
| `dns.resolve4`, `resolveTxt`, `resolveNs` | All succeed |

The failure is consistent: 8/8 repeat attempts returned `EBADRESP`.

### 5.3 It is the parser, not the network

A temporary loopback DNS proxy forwarded queries verbatim to `8.8.8.8` and relayed the exact
response bytes to c-ares:

| Path | Result |
| --- | --- |
| A record via the verbatim proxy | 2 records — parsed |
| SRV via the verbatim proxy | `EBADRESP` |
| SRV via the verbatim proxy for a public control (`_xmpp-server._tcp.jabber.org`) | `EBADRESP` |
| SRV directly to `8.8.8.8` for the same public control | `EBADRESP` |

Since the identical bytes are accepted by an independent parser and rejected by c-ares, and
the failure reproduces for a second, unrelated public SRV record, the fault is in c-ares
response handling.

### 5.4 The trigger, isolated

A loopback server returned hand-built SRV responses. Four combinations were tested:

| Owner name | Target name in RDATA | c-ares result |
| --- | --- | --- |
| uncompressed | uncompressed | **Parsed** |
| compressed | uncompressed | **Parsed** |
| uncompressed | compressed | `EBADRESP` |
| compressed | compressed | `EBADRESP` |

**The trigger is a compression pointer used for the SRV target name inside the record data.**
c-ares 1.34.8 in this Node build cannot expand a compressed SRV target and reports
`ARES_EDNSFORM` as `EBADRESP`.

Every real resolver compresses SRV targets, so every genuine SRV answer from this network
trips the defect. The Atlas record and the public control record both do.

### 5.5 The causal chain to the observed 503

1. `mongodb/lib/connection_string.js:65` resolves `mongodb+srv://` via
   `dns.promises.resolve(hostname, 'SRV')` — `mongodb/lib/connection_string.js:29–45`.
2. That call returns `EBADRESP` in this runtime.
3. The driver retries **only** on `ETIMEOUT`; any other code is rethrown unchanged
   (`connection_string.js:34–40`).
4. `mongoose.connect()` therefore never reaches the TCP/TLS stage, so the application's custom
   `lookup` callback is never used.
5. `connectDatabase()` throws (`server/src/db.ts:20`).
6. `server/src/index.ts:24–30` logs `database connection failed` and then either exits
   (production) or **starts the server without a database**.
7. Data routes then return `503 DB_UNAVAILABLE` (`server/src/errors.ts:28`).

The SRV **targets** resolve normally as A records, so a connection that avoids the SRV step
would work.

### 5.6 It worked on 2026-11-05 with the identical build

`reports/DNS-IMPLEMENTATION-REPORT.md` §2.2 records the same runtime — Node **v26.4.0**,
c-ares **1.34.8** — and §2.5 records that on that date:

> SRV lookup succeeded in 594 ms and returned 3 records.

So the build did not change; the observed behaviour did. The most likely reading is that the
resolver path in front of this device now emits compressed SRV targets where it previously did
not, or the network path changed (different network, VPN state, or Android private-DNS
setting). This is an environmental difference, not a regression in the application code.

---

## 6. Would configuring Google Public DNS affect this runtime?

### 6.1 No — the resolver address is already irrelevant on this network

Queries were sent to deliberately unroutable TEST-NET addresses:

| Resolver address asked | Result |
| --- | --- |
| `203.0.113.1` (TEST-NET-3) | `NOERROR`, 2 A records for `example.com` |
| `198.51.100.7` (TEST-NET-3) | `NOERROR`, 2 A records for `example.com` |
| `1.1.1.1` | `NOERROR`, 2 A records |
| `8.8.8.8` | Answered on some queries, timed out on others |

Unroutable addresses that cannot host a resolver nonetheless returned valid answers.
**All outbound UDP/53 traffic on this network is intercepted and answered by the network
itself.** The resolver address in the query does not determine who answers, so changing it
cannot change the answer's encoding — which is the thing that matters here.

### 6.2 No — Google Public DNS is already configured everywhere it can be

| Layer | Current value | Google DNS present? |
| --- | --- | --- |
| Termux resolver file | `8.8.8.8` | **Yes** |
| Node c-ares default | `8.8.8.8` | **Yes** |
| Application c-ares list | `1.1.1.1`, `8.8.8.8` | **Yes** (alongside Cloudflare) |
| Deployment infrastructure | None exists | Not applicable |

### 6.3 No — the failure is resolver-independent

The SRV lookup returned `EBADRESP` against the default resolver, `8.8.8.8`, `8.8.4.4`, and
`1.1.1.1`, and through a verbatim loopback proxy. Section 5.4 shows the failure is triggered
by the response encoding, which no resolver address choice can influence.

**Conclusion: adding or changing Google DNS configuration would change nothing and carries
risk of disrupting the currently working A/TXT/NS resolution paths for no benefit.**

---

## 7. Relationship to the observed HTTP 503 "authentication" errors

### 7.1 The two failure modes are different and are not interchangeable

| | DNS/SRV failure | Authentication failure |
| --- | --- | --- |
| Requires | Nothing beyond a query | SRV → A → TCP → TLS → wire handshake → credential exchange |
| Underlying error | `EBADRESP`, `MongoAPIError`, `MongoServerSelectionError`, `ENOTFOUND`, `EAI_AGAIN` | `MongoServerError` code 18, `Authentication failed` |
| User-visible | `503 DB_UNAVAILABLE` | `503 DB_UNAVAILABLE` |
| Logged as | `database connection failed` | `database connection failed` |

**An authentication error proves that DNS, SRV, TCP, and TLS all succeeded** — a wallet
service cannot challenge for credentials it was never reached on. DNS cannot produce an
authentication failure.

### 7.2 The 503 itself is a generic wrapper

Both failure modes surface as the same `503 DB_UNAVAILABLE` response, because
`server/src/index.ts:24–30` catches every connection error identically and the route layer
reports only "the database is temporarily unavailable". The **discriminating evidence is the
error object logged by `logger.error({ err: error }, 'database connection failed')`**.

### 7.3 What to check, and what it would mean

Read the error code in that log line (it is the only place the real cause is recorded):

| Logged error | Interpretation |
| --- | --- |
| `EBADRESP`, `MongoAPIError` referencing SRV, or a server-selection timeout | **This inspection's root cause.** The SRV step fails before any connection attempt. |
| `MongoServerError` with code 18 / `Authentication failed` | **Not DNS.** Credentials or the Atlas IP access list. DNS, TCP, and TLS all succeeded. |
| `ENOTFOUND` / `EAI_AGAIN` on the shard hostnames | A separate hostname-resolution problem at the TCP stage. Not reproduced here — the SRV targets resolved in this inspection. |

### 7.4 Note on the earlier evidence

`reports/DNS-IMPLEMENTATION-REPORT.md` recorded that the same runtime's `getaddrinfo` lookup
of the first shard hostname timed out on 2026-11-05, which is what the custom `lookup` option
was written to address. In this inspection the SRV targets resolved through both `getaddrinfo`
and c-ares A lookups, so that specific symptom was not reproduced today. The SRV defect
described above is the failure that **is** currently reproducible.

---

## 8. Recommended safe configuration approach

### 8.1 Recommended now — no DNS change

**Change no resolver configuration.** Google Public DNS is already the resolver at the OS and
application layers; the failure is a response-parsing defect that is independent of the
resolver address; and all outbound DNS on this network is intercepted regardless. Editing
Termux or Android DNS settings, or the hard-coded server list in `server/src/lib/dns.ts`,
would not fix the SRV failure and could destabilise the A/TXT/NS paths that currently work.

### 8.2 Confirm the actual cause first

The single cheapest next step is to read the `database connection failed` log line and its
`err.code`. Section 7.3 maps the code to the interpretation. This inspection does not need to
be repeated to obtain that evidence.

### 8.3 If the logged error is the SRV defect — options for the owner to choose

Each is a genuine trade-off and none should be applied without an explicit decision.

| Option | What it changes | Trade-offs and caveats |
| --- | --- | --- |
| **A. Run the server on a host where c-ares SRV works** | Deployment location only | The identical build resolved SRV successfully on 2026-11-05, so the environment, not the code, is the variable. Lowest code risk; changes where the server runs. |
| **B. Use an explicit seed list instead of `mongodb+srv://`** | The MongoDB URI shape | The three SRV targets each resolve to one IPv4 address via A lookups, which c-ares handles correctly, so the SRV step can be skipped entirely. Requires the owner to supply and maintain the seed list, and `deriveMongoDnsScope` returns an empty scope for a non-SRV URI, so the custom `lookup` would no longer be applied. Touches a credential-bearing configuration value. |
| **C. Resolve SRV outside c-ares** | New code in the DNS module | The application would need its own SRV resolution path (for example a small native query that expands the target names correctly). Adds security-critical protocol code and a dependency, which the project has so far avoided. |
| **D. Change the Node runtime** | The runtime only | Termux offers `nodejs` 26.13.0-1 as an upgrade from 26.4.0-1. The bundled c-ares version is not guaranteed to change with a Node patch release, so this must be **tested**, not assumed. A runtime upgrade affects the whole project. |
| **E. Do nothing yet** | Nothing | The application continues to serve with `503` on data routes while authentication and other non-database routes work. Defensible only if the database is not required for the current milestone. |

**Option A is the lowest-risk starting point** because it changes no application code, no
credential, and no dependency, and there is direct evidence that the same build worked in a
different environment on 2026-11-05. **Option B is the most reliable in-code fix** because it
removes the broken code path entirely rather than working around it.

### 8.4 What is explicitly not recommended

- Changing Termux's `resolv.conf`, Android private DNS, or the application's
  `MONGODB_DNS_SERVERS` list. All are ineffective here and carry regression risk.
- Adding a DNS or NWC dependency to work around a single runtime defect.
- Weakening the existing custom `lookup` implementation. It addresses a real, separately
  observed problem with `getaddrinfo` and is not implicated in the SRV failure.

---

## 9. Unresolved questions

1. **Which log error code accompanies the observed 503?** The decisive artifact is the
   `database connection failed` log entry. It distinguishes the SRV defect from an
   authentication or IP-allowlist rejection. Not obtainable read-only without contacting the
   running server.
2. **Why did the identical Node and c-ares build resolve SRV on 2026-11-05 and not today?**
   The evidence points to the resolver or network path in front of the device, but the exact
   mechanism (interception policy, Android private-DNS state, network change) was not
   established. It can be narrowed by comparing the raw SRV response bytes captured on
   2026-11-05 with those captured today.
3. **Does Node 26.13.0-1 bundle a c-ares with the defect fixed?** Unknown and not assumed.
   Testable only by installing it, which was outside this inspection's boundaries.
4. **Does the `mongodb+srv://` URI remain required?** If a seed list is acceptable to the
   owner, Option B removes the defect without a runtime or network dependency. This is a
   credential-configuration decision, not a technical one.

---

## 10. Non-claims and evidence limits

- This report does **not** claim that the Atlas cluster, its credentials, or its access list
  are correct. No database connection was attempted.
- This report does **not** claim that the 503 currently observed is caused by DNS. Section 7
  shows that an authentication error cannot be caused by DNS, and that the discriminating
  evidence is in the server log.
- This report does **not** claim that the SRV defect is a known upstream c-ares issue with a
  specific identifier. The trigger was isolated empirically; no upstream issue was consulted.
- This report does **not** claim that the interception layer is malicious or misconfigured.
  Only the observable behaviour — unroutable resolver addresses receiving valid answers — is
  reported.
- This report does **not** claim that `dns.setServers()` is broken in Node generally. The
  observation here is limited to this runtime and this network.
- The MongoDB URI, its credentials, the database hostname, the shard hostnames, and the
  resolved addresses were never printed, logged, or written to any file.
