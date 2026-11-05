# Read-Only Investigation: Custom DNS for MongoDB Hostname Resolution

**No files, packages, environment settings, services, MongoDB connections, or Git state were changed.** DNS probes used only `node:dns`; no TCP connection to port 27017 was attempted.

---

## 1. Exact installed versions

| Component | Version | Evidence |
|---|---|---|
| Node.js | **v26.4.0** | `process.version` |
| c-ares | **1.34.8** | `process.versions.ares` |
| OpenSSL | **3.6.5** | `process.versions.openssl` |
| MongoDB Node.js driver | **7.7.0** | `server/node_modules/mongodb/package.json`; `server/package-lock.json` |
| Mongoose | **9.11.4** | `server/node_modules/mongoose/package.json`; `server/package.json:26` |
| BSON | **7.3.3** | `server/node_modules/bson/package.json` |
| connect-mongo | **6.0.0** | `server/node_modules/connect-mongo/package.json` |

Driver engines: `node >=20.19.0`; Node 26.4.0 satisfies it.

Current runtime defaults:

```text
net.getDefaultAutoSelectFamily()            => true
net.getDefaultAutoSelectFamilyAttemptTimeout() => 500
dns.getDefaultResultOrder()                 => "verbatim"
dns.getServers()                            => ["8.8.8.8"]
```

---

## 2. Does driver 7.7.0 support a custom DNS lookup callback?

**CONFIRMED — yes, for TCP/TLS socket connections.**

Evidence:

- `MongoClientOptions` extends `SupportedNodeConnectionOptions` — `server/node_modules/mongodb/mongodb.d.ts:6080`.
- `SupportedSocketOptions` is a `Pick<...>` from `TcpNetConnectOpts` using `LEGAL_TCP_SOCKET_OPTIONS` — `mongodb.d.ts:8514-8522`.
- `LEGAL_TCP_SOCKET_OPTIONS` includes `lookup`, `family`, `hints`, `autoSelectFamily`, and `autoSelectFamilyAttemptTimeout` — `mongodb.d.ts:5402`.
- `lookup?: LookupFunction` is declared on `TcpSocketConnectOpts` — `server/node_modules/@types/node/net.d.ts:39-55`.
- The driver’s runtime option table includes `lookup: { type: 'any' }` — `server/node_modules/mongodb/lib/connection_string.js:1093`.
- Unknown options are rejected, and `lookup` is accepted because it is in `OPTIONS` — `connection_string.js:273-280`.
- `setOption()` copies `type: 'any'` values unchanged — `connection_string.js:436-466`.

Important limitation: this callback applies to **TCP/TLS socket hostname resolution only**. It does **not** affect the driver’s initial SRV/TXT resolution, which uses the module-global `dns.promises.resolve` directly:

- `connection_string.js:29-30` — SRV uses `dns.promises.resolve(address, 'SRV')`; TXT uses `'TXT'`.
- `connection_string.js:45,65` — `resolveSrv` / `resolveTxt` helpers.
- `srv_polling.js:81` — periodic SRV re-polling also uses global `dns.promises.resolve`.

There is no supported `dnsResolver`/`srvResolver` injection option. `srvPoller` exists internally (`connection_string.js:1075`, `topology.js:122-123`) but is excluded from public typings (`mongodb.d.ts:6269,8389`) and only replaces the periodic poller, not the initial SRV lookup.

---

## 3. Supported MongoClient options

| Option | Supported? | Evidence and behavior |
|---|---|---|
| `lookup` | **Yes** | `mongodb.d.ts:5402,8514-8522`; runtime `connection_string.js:1093`; copied into `net.createConnection()` at `cmap/connect.js:226-229,295`. Must be passed programmatically, not as a URI query parameter. |
| `family` | **Yes, but only `4` or `6`** | `connection_string.js:630-637` throws `MongoParseError` for any other value, including `0`. Mongoose docs mention `0`, but driver 7.7.0 rejects it. Omitting `family` is how you request both. |
| `autoSelectFamily` | **Yes; default `true`** | `connection_string.js:565-568` sets `default: true`. This means the driver passes `autoSelectFamily: true` to Node even when the application does not set it. |
| `autoSelectFamilyAttemptTimeout` | **Yes** | `connection_string.js:569-571`; no driver default, so Node’s default applies: **500 ms** (`net.getDefaultAutoSelectFamilyAttemptTimeout()`). |
| `hints` | **Yes** | Part of `LEGAL_TCP_SOCKET_OPTIONS`; passed through the same path. |
| `localAddress`, `localPort`, `keepAliveInitialDelay` | **Yes** | Same pass-through list. |

Mongoose accepts these because `ConnectOptions extends mongodb.MongoClientOptions` (`server/node_modules/mongoose/types/connection.d.ts:40`) and passes options to `new mongodb.MongoClient(uri, options)` (`server/node_modules/mongoose/lib/drivers/node-mongodb-native/connection.js:338`). Mongoose deletes only its own options such as `dbName`, `user`, `pass`, `autoIndex`, `autoCreate`, etc. (`connection.js:300-330`); it does not remove `lookup`.

**Practical constraint:** `lookup` is a function, so it cannot be placed in the `mongodb+srv://` URI. It must be supplied in the options object.

---

## 4. Trace from MongoClient options to `net.createConnection()`

**CONFIRMED chain:**

1. `MongoClient` stores options and creates the topology:
   - `server/node_modules/mongodb/lib/mongo_client.js:248`
   ```js
   this.topology = new topology_1.Topology(this, options.hosts, options);
   ```

2. Topology passes the same options to each `Server`:
   - `server/node_modules/mongodb/lib/sdam/topology.js:494`
   ```js
   const server = new server_1.Server(topology, serverDescription, topology.s.options);
   ```

3. Server builds pool options by spreading the client options:
   - `server/node_modules/mongodb/lib/sdam/server.js:47-49`
   ```js
   const poolOptions = { hostAddress: description.hostAddress, ...options };
   this.pool = new connection_pool_1.ConnectionPool(this, poolOptions);
   ```

4. Connection pool freezes those options, then spreads them into each new connection:
   - `server/node_modules/mongodb/lib/cmap/connection_pool.js:84-94`
   - `connection_pool.js:404-416`
   ```js
   const connectOptions = { ...this.options, ... };
   (0, connect_1.connect)(connectOptions).then(...)
   ```

5. `connect()` calls `makeSocket()`:
   - `server/node_modules/mongodb/lib/cmap/connect.js:23-29`
   ```js
   const socket = await makeSocket(options);
   ```

6. `makeSocket()` calls `net.createConnection()` or `tls.connect()`:
   - `cmap/connect.js:267` — `makeSocket`
   - `cmap/connect.js:283` — TLS: `tls.connect(parseSslOptions(options))`
   - `cmap/connect.js:295` — plain TCP: `net.createConnection(parseConnectOptions(options))`

7. `parseConnectOptions()` copies every legal TCP option, including `lookup`, `family`, `autoSelectFamily`, and `autoSelectFamilyAttemptTimeout`, then sets `host` and `port`:
   - `cmap/connect.js:221-241`
   ```js
   for (const name of exports.LEGAL_TCP_SOCKET_OPTIONS) {
     if (options[name] != null) result[name] = options[name];
   }
   result.host = hostAddress.host;
   result.port = hostAddress.port;
   ```

8. For TLS, `parseSslOptions()` calls `parseConnectOptions()` first, then sets SNI:
   - `cmap/connect.js:250-264`
   ```js
   const result = parseConnectOptions(options);
   ...
   if (result.servername == null && result.host && !net.isIP(result.host)) {
     result.servername = result.host;
   }
   ```

So a `lookup` supplied to `mongoose.connect()` reaches Node’s `net`/`tls` socket constructor unchanged. Certificate verification still uses the original **hostname** as `servername`, not the resolved IP.

### Node’s lookup contract

`net` calls a custom lookup with different argument shapes depending on options. Verified by an in-process argument probe (no TCP connection):

```text
default / autoSelectFamily=true      => { hints: 1024, all: true }
autoSelectFamily=false               => { hints: 1024 }
family=4 or family=6                 => { family: 4|6, hints: 0 }
```

Implication for implementation:

- If `options.all === true`, callback must return an **array** of `{ address, family }`.
- Otherwise, callback must return `(err, address, family)`.
- `family: 4` or `6` means resolve only that family.
- A custom lookup that ignores `options.all` will break the default `autoSelectFamily: true` path.

---

## 5. Can a custom `node:dns` Resolver with `1.1.1.1` and `8.8.8.8` resolve SRV/TXT and A/AAAA?

**Yes for capability; with an important split:**

- `dns.Resolver` has `resolveSrv`, `resolveTxt`, `resolve4`, and `resolve6` — `@types/node/dns.d.ts:828-868`.
- A resolver is independent; `resolver.setServers()` does not affect other resolvers — `dns.d.ts:794-800`.
- `resolver.setServers(['1.1.1.1'])` is supported — `dns.d.ts:794-800`.
- Resolver options support `timeout`, `tries`, and `maxTimeout` — `dns.d.ts:760-780`.

Live read-only probes confirmed both public resolvers currently work from this device:

```text
Resolver(['1.1.1.1']):
  A google.com                 OK
  A atlas node                 OK -> 65.62.39.16
  SRV _mongodb._tcp...         OK -> 3 Atlas nodes, port 27017
  TXT cluster0...              OK -> authSource=admin&replicaSet=atlas-iqzicn-shard-0

Resolver(['8.8.8.8']):
  same four queries            OK
```

However:

- The **driver will not use a Resolver instance for SRV/TXT**. Its initial lookup and periodic poller call the global `dns.promises.resolve` (`connection_string.js:29-30,45,65`; `srv_polling.js:81`).
- To make SRV/TXT use `1.1.1.1` and `8.8.8.8`, you must call the global `dns.setServers([...])` before `mongoose.connect()` and before any other c-ares query.
- Node explicitly documents that `dns.setServers()` affects only `dns.resolve*()` and `dns.reverse()`, and specifically **not** `dns.lookup()` — `@types/node/dns.d.ts:707`.
- A custom `dns.Resolver` used by a `lookup` callback handles A/AAAA for TCP, but it bypasses `/etc/hosts`, Android Private DNS, VPN split DNS, search domains, and mDNS. For public Atlas FQDNs this is acceptable.

**Conclusion:** a Resolver with explicit servers can safely resolve all four record types, but only the A/AAAA path can be injected via `lookup`. SRV/TXT must be redirected globally with `dns.setServers()`, or the `+srv` URI must be abandoned in favor of an explicit seed list (which conflicts with the requirement to preserve `mongodb+srv`).

---

## 6. Supported way to make TCP use the explicit resolver

The supported path is:

1. Call `dns.setServers(['1.1.1.1', '8.8.8.8'])` once at startup, before the first `mongoose.connect()`, so the driver’s internal SRV/TXT queries use those servers.
2. Pass a `lookup` function in the Mongoose/MongoClient options, backed by a `dns.Resolver` configured with the same servers, so TCP/TLS hostname resolution bypasses Android `getaddrinfo`.
3. Optionally pass `family: 4` to force IPv4, or implement IPv4-first ordering inside the lookup.
4. Keep `mongodb+srv`, TLS, auth, pooling, and the existing session-store client unchanged.

Design sketch (not implemented):

```text
server/src/lib/dns.ts
  DNS_SERVERS = ['1.1.1.1', '8.8.8.8']

  configureMongoDns():
    dns.setServers(DNS_SERVERS)          // global, c-ares, before connect
    resolver = new dns.Resolver({ timeout: 5000, tries: 2 })
    resolver.setServers(DNS_SERVERS)

  createMongoLookup(): LookupFunction
    - if hostname is a literal IP: return it immediately
    - read options.family (4 | 6 | undefined)
    - query resolver.resolve4 and/or resolver.resolve6
    - tolerate ENODATA for one family (Atlas currently has A but no AAAA)
    - if options.all: return [{address, family}, ...]
    - else: return first address + family
    - order IPv4 first if requested / configured
    - map errors to NodeJS.ErrnoException codes

server/src/db.ts
  configureMongoDns() before mongoose.connect()
  mongoose.connect(uri, {
    ...existing options,
    lookup: createMongoLookup(),
    family: 4,                 // optional, see IPv4/NAT64 section
    autoSelectFamily: true,    // already the driver default
    autoSelectFamilyAttemptTimeout: 500
  })
```

Because `connectDatabase()` is used by the server, seed script, and integration tests (`server/src/index.ts:15`, `server/src/seed/run.ts:14`, `server/test/db.integration.test.ts:68`), placing the setup inside `connectDatabase()` ensures all connection paths use it.

No new npm package is required: `node:dns`, `node:net`, and the driver’s existing option handling are sufficient.

---

## 7. IPv4 preference and DNS64/NAT64

Current state:

- `dns.getDefaultResultOrder()` = `verbatim`.
- Driver `autoSelectFamily` defaults to `true`.
- No `family` is set in `server/src/db.ts:6-12`.
- Atlas currently has A records for all three nodes but **no AAAA records** (observed).
- Android’s `getaddrinfo` path previously returned a DNS64/NAT64-synthesized address such as `64:ff9b::413e:2710`.

Implications:

1. **Explicit public DNS does not perform DNS64.** Querying `1.1.1.1` or `8.8.8.8` returns authoritative A/AAAA records. Since Atlas has no AAAA, the custom lookup will normally return IPv4 only. This bypasses Android’s synthesized NAT64 AAAA path.
2. **`family: 4`** makes behavior deterministic: only A records are queried and only IPv4 sockets are attempted. On Android NAT64 networks with CLAT/464XLAT, IPv4 sockets normally still work. On an IPv6-only network without CLAT, forcing IPv4 would fail.
3. **Leaving `family` unset** and implementing IPv4-first ordering in the lookup is more flexible. With `autoSelectFamily: true`, Node can try IPv4 first and fall back to any AAAA. But because public DNS returns no AAAA for this cluster, the practical result is still IPv4.
4. **Do not set `family: 0`.** Driver 7.7.0 rejects values other than 4 or 6 (`connection_string.js:630-637`).
5. If the network later becomes IPv6-only and Atlas adds AAAA records, a hardcoded `family: 4` becomes a liability. Make it configurable rather than permanently hardcoded.

**Recommendation:** use `family: 4` for this Android/NAT64 environment only if testing confirms IPv4 works through the carrier’s CLAT; otherwise implement IPv4-first with AAAA fallback and leave `family` unset.

---

## 8. Preservation of existing behavior

| Requirement | How it is preserved |
|---|---|
| `mongodb+srv` format | URI is unchanged. `dns.setServers()` changes the resolver used by the driver’s existing SRV/TXT code (`connection_string.js:29-30,45,65`). No URI rewrite to `mongodb://`. |
| Replica-set discovery | Initial SRV resolution still returns all Atlas nodes; TXT still supplies `replicaSet` (`connection_string.js:23,97-106`). The custom lookup also applies to every subsequent replica-set member socket. |
| TLS and certificate verification | `lookup` only maps hostname → address. TLS still receives the original host as `servername` (`cmap/connect.js:261-264`), so certificate hostname verification remains intact. Do not rewrite hosts to IPs. |
| Authentication | Credentials and `authSource` from the URI/TXT are untouched (`connection_string.js:97-106`). |
| Connection pooling | `lookup` is part of the pool’s frozen connection options (`connection_pool.js:84-94`) and is applied to each new pooled socket. Same pool, same `maxPoolSize`/`minPoolSize`. |
| Session-store client reuse | `server/src/index.ts:18` passes `mongoose.connection.getClient()` to `MongoStore`; connect-mongo reuses `options.client` (`server/node_modules/connect-mongo/dist/index.cjs:215`) and does not create a second client. |

---

## 9. Can application-level DNS solve the observed issue?

### Yes, for the resolver-path problem

If the failure is Android `getaddrinfo` hanging or synthesizing unusable NAT64 addresses, a custom lookup backed by `1.1.1.1`/`8.8.8.8` bypasses that path and is a valid application-level fix. It does **not** change the source IP, so **no Atlas IP access-rule change is needed for DNS reasons**.

### No, for these remaining network limitations

- **Atlas IP access list:** if the current egress IP is not allowlisted, custom DNS cannot help. The source IP is unchanged.
- **Port 27017 filtering:** carrier/ISP/firewall blocking of 27017 is unaffected.
- **IPv6-only network without CLAT:** forced IPv4 will fail.
- **Blocked public DNS:** if UDP/TCP 53 to `1.1.1.1` or `8.8.8.8` is blocked, c-ares times out. Node’s `node:dns` has no DNS-over-HTTPS fallback.
- **DNS interception / captive portal:** explicit servers may be redirected or blocked.
- **Atlas node maintenance / regional outage:** DNS cannot fix an unavailable node.
- **VPN or Private DNS policy:** a custom resolver bypasses it, which may violate network policy.
- **`serverSelectionTimeoutMS: 8000`:** even with fast DNS, 8 seconds is tight for DNS + TCP + TLS + hello; the driver default is 30 seconds.

---

## 10. Risks

1. **Global side effect:** `dns.setServers()` affects every c-ares query in the process, including other libraries. Call it once, before any query; Node forbids calling it during a DNS query (`dns.d.ts:686-716`).
2. **Custom lookup contract:** must correctly handle `options.all`, `family`, `hints`, IP literals, and error mapping. A partial implementation can break every MongoDB connection.
3. **No `/etc/hosts` or Android DNS:** the custom lookup bypasses OS name resolution. Restrict the custom resolver to Atlas hostnames and fall back to `dns.lookup()` for anything else if the helper could ever see non-Atlas hosts.
4. **No caching:** each new pooled connection performs A/AAAA queries. That is acceptable for Atlas but adds latency; adding a cache introduces TTL/staleness risk.
5. **Public DNS availability/privacy:** hardcoding Cloudflare/Google DNS may be blocked or prohibited; queries leave the device to third parties.
6. **IPv4-only trade-off:** may fail on future IPv6-only networks.
7. **Resolver errors:** `resolve6` returns `ENODATA` for Atlas today; the lookup must treat an empty AAAA result as non-fatal and still return A records.
8. **`lookup` cannot be a URI option:** it must be programmatic; accidentally placing it in the connection string would pass a string to `net` and fail.
9. **Existing sockets are not re-resolved:** changing DNS settings later does not affect already-open pool connections; they are replaced on reconnect/failure.

---

## 11. Files that would need modification

| File | Purpose |
|---|---|
| `server/src/lib/dns.ts` (new, recommended) | Configure global c-ares servers and provide a `LookupFunction` backed by `dns.Resolver`. |
| `server/src/db.ts` | Call DNS configuration before `mongoose.connect()` and add `lookup` (and optionally `family`) to the connect options at lines 6–12. |
| `server/src/index.ts` | Only if DNS configuration is not centralized in `connectDatabase()`; otherwise no change needed at line 15. |
| `server/src/config.ts` | Optional: make DNS server list / family configurable instead of hardcoded. |
| `server/test/db.integration.test.ts` | Add coverage for the lookup contract and DNS-selected connection path; existing connect call at line 68 would inherit the new behavior. |
| `server/dist/db.js` etc. | Generated by `npm --prefix server run build`; do not hand-edit. |
| `server/package.json` | **No change required** — only built-in `node:dns`/`node:net` APIs. |

---

## 12. Bottom line

- **Driver:** MongoDB Node.js driver **7.7.0** (Mongoose 9.11.4) on **Node v26.4.0**.
- **Custom lookup:** **supported** via the `lookup` MongoClient option, passed through to `net.createConnection()` / `tls.connect()`.
- **Supported options:** `lookup`, `family` (4 or 6 only), `autoSelectFamily` (default true), `autoSelectFamilyAttemptTimeout` (Node default 500 ms), plus `hints`/local binding options.
- **SRV/TXT:** cannot use a per-client Resolver; only global `dns.setServers()` affects the driver’s internal SRV/TXT calls while preserving `mongodb+srv`.
- **TCP hostnames:** a `lookup` backed by `dns.Resolver(['1.1.1.1','8.8.8.8'])` bypasses Android `getaddrinfo` and NAT64 synthesis.
- **Likely outcome:** if the observed failure is the Android resolver/NAT64 path, application-level DNS can fix it without changing Atlas IP rules. If the cause is an Atlas allowlist, port blocking, or carrier firewall, it cannot.
- **No implementation was performed.**
