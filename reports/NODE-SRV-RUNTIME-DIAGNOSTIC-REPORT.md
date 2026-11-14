# KAOS Bitcoin Academy — Termux Node.js SRV Resolution Compatibility Diagnostic

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Diagnostic type: Read-only runtime and DNS compatibility investigation
- Result: **The SRV parsing defect is CONFIRMED present in the installed runtime (Node 26.4.0 / c-ares 1.34.8). The only newer Termux package, nodejs 26.13.0-1, would ship c-ares 1.34.9, which contains the upstream fix for exactly this defect — but that could NOT be verified experimentally, because no alternate runtime is installed and installing one is out of scope.**
- PRD SHA-256 (verified, unmodified): `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`

> **Status statement:** Nothing was installed, upgraded, downgraded, removed, or switched. No
> project file, manifest, lockfile, environment file, DNS setting, Termux setting, or system
> file was modified. No service was started, stopped, or restarted. No MongoDB connection or
> authentication was attempted. No credential, connection string, database hostname, or shard
> hostname is reproduced in this report. The only network activity was read-only DNS queries
> plus read-only upstream documentation lookups.

---

## 1. Current runtime details (verified)

| Item | Value |
| --- | --- |
| Node.js executable | `/data/data/com.termux/files/usr/bin/node` |
| Node.js version | `v26.4.0` |
| npm version | `11.20.0` |
| Bundled c-ares | **1.34.8** (`process.versions.ares`) |
| libuv | `1.52.1` |
| OpenSSL | `3.6.5` |
| V8 | `14.6.202.34-node.21` |
| `process.versions.modules` | `147` |
| `dns.getServers()` | `["8.8.8.8"]` |
| Termux resolver file | `nameserver 8.8.8.8` (`/data/data/com.termux/files/usr/etc/resolv.conf`) |
| Platform | Android / Termux, aarch64 |

The global resolver configuration was **not** modified during this diagnostic. All lookups
below used the unmodified default configuration.

---

## 2. Is a newer Termux Node.js package available? (verified)

Termux package metadata, read without installing anything:

```
$ apt-cache policy nodejs
nodejs:
  Installed: 26.4.0-1
  Candidate: 26.13.0-1
  Version table:
     26.13.0-1 500
        500 https://mirror.sunred.org/termux/termux-main stable/main aarch64 Packages
 *** 26.4.0-1 100
        100 /data/data/com.termux/files/usr/var/lib/dpkg/status
```

| Item | Finding |
| --- | --- |
| Installed package | `nodejs/now 26.4.0-1` (aarch64) |
| Available upgrade | **`nodejs/stable 26.13.0-1`** — newer, and the **only** alternative version in the repository |
| npm | `11.20.0` installed; `12.2.2` available (not relevant to this diagnostic) |
| Installation performed | **None.** `apt-get install` / `pkg install` were never invoked. |

---

## 3. Does an alternate Node.js runtime already exist locally? (verified: no)

| Location checked | Result |
| --- | --- |
| `/data/data/com.termux/files/usr/bin/node*` | One file only: `node` (26.4.0) |
| Version managers (`~/.nvm`, `~/.nodenv`, `~/.fnm`, `~/.volta`, `~/.local/node`, `$PREFIX/opt/node`) | None present |
| Other `node` executables under Termux bin, `/usr/local/bin`, and the home directory (bounded search) | None |
| Downloaded archives or source trees (`node-v*`, `nodejs-*`) in the home directory | None |
| `dpkg -l` for node-related packages | Only `nodejs 26.4.0-1` |

**There is exactly one Node.js binary on this device.** No second runtime is available, so the
side-by-side comparison required by step 4 of the investigation **could not be performed**.

---

## 4. Current-runtime DNS baseline (verified)

All lookups below used the unmodified default resolver configuration, the same test names
throughout, and `dns.promises` exactly as the MongoDB driver calls it
(`dns.promises.resolve(host, 'SRV')`).

| Lookup | Result |
| --- | --- |
| `resolveSrv` — `_imap._tcp.gmail.com` | **OK — 1 record** (target is a single uncompressed label) |
| `resolveSrv` — `_xmpp-server._tcp.jabber.org` | **ERR `EBADRESP`** |
| `resolveSrv` — `_ldap._tcp.ovh.net` | ERR `ENOTFOUND` (no SRV record exists) |
| `resolveSrv` — `_kerberos._tcp.ipa.demo1.freeipa.org` | ERR `ENOTFOUND` (no SRV record exists) |
| `resolveSrv` — `_minecraft._tcp.mojang.com` | ERR `ENODATA` (no SRV record exists) |
| `resolveSrv` — **the configured Atlas SRV host (hostname withheld)** | **ERR `EBADRESP`** |
| `resolve4` — `example.com` | OK — 2 records |
| `resolve4` — `onecloud.googleusercontent.com` | OK — 1 record |
| `resolveTxt` — the configured Atlas host | OK — 1 record |

**Note on interpretation:** the `ENOTFOUND` / `ENODATA` entries mean *no such SRV record
exists*; they are not parser failures. The only parser failure is `EBADRESP`.

### 4.1 Public-data correlation of the failure

The two public SRV records above were compared by inspecting the response encoding only:

| Record | Owner name compressed | Target name in RDATA compressed | c-ares 1.34.8 |
| --- | --- | --- | --- |
| `_imap._tcp.gmail.com` | yes | **no** (1 label, `rdlen` 7) | **parsed successfully** |
| `_xmpp-server._tcp.jabber.org` | yes | **yes** (3 labels, `rdlen` 16) | **`EBADRESP`** |
| Atlas SRV host | yes | yes (3 labels) | **`EBADRESP`** |

A successful A lookup is **not** evidence that SRV works; the A path is unaffected. The
positive and negative SRV controls above are the relevant comparison.

This reproduces the previously isolated finding — the defect is in **expanding a compression
pointer used for an SRV target name inside the record data** — using public records only, with
no custom DNS proxy and no modification of any resolver setting.

---

## 5. Upstream evidence on the candidate runtime (verified documentation, not experimental)

The c-ares version carried by each Node release was taken from Node's own v26 changelog
(`doc/changelogs/CHANGELOG_V26.md`):

| Node release | Bundled c-ares |
| --- | --- |
| 26.4.0 — **installed here** | **1.34.8** |
| 26.5.0 | 1.34.8, plus a cherry-pick of `c-ares` commit `8ba37af8e3fb` — *"Fix incorrect check for empty wide string"*, touching only `src/lib/ares_sysconfig_win.c` (**Windows-only, irrelevant on Android**) |
| 26.6.0 | 1.34.8 |
| 26.12.1 (2026-10-21) | **1.34.9** (`deps: update c-ares to 1.34.9`) |
| **26.13.0 (2026-10-28) — the Termux candidate** | **inherits 1.34.9** (no c-ares change after 26.12.1) |

The c-ares 1.34.8 → 1.34.9 comparison contains this commit:

> `[Backport v1.34] ares_dns_parse: accept legacy compressed RDATA names (#1326) (#1345)`

which is the backport of upstream **c-ares PR #1326**, *"ares_dns_parse: accept legacy
compressed RDATA names"* — merged upstream on 2026-10-18. Its description states:

> Compressed SRV, SIG and NAPTR names are rejected on receipt. This breaks SRV lookups
> reported in #1287. Accept the legacy receive-side compression exceptions.

The 1.34.9 comparison also touches `test/ares-test-parse-srv.cc`, the SRV parse test.

This is a **direct match** for the empirically isolated defect and for the reported startup
error `querySrv EBADRESP`.

---

## 6. Verdict on the suspected defect

| Scope | Status | Basis |
| --- | --- | --- |
| Installed runtime — Node 26.4.0 / c-ares 1.34.8 | **Defect PERSISTS — verified experimentally** | Public positive control parses; public negative control and the configured Atlas record both return `EBADRESP`; the trigger correlates exactly with compression in SRV RDATA |
| Candidate runtime — Node 26.13.0-1 / expected c-ares 1.34.9 | **Fix PRESENT in the shipped c-ares version — verified from upstream history; NOT experimentally verified on this device** | c-ares PR #1326 / backport #1345, shipped in 1.34.9, adopted by Node 26.12.1 and inherited by 26.13.0 |
| Whether the candidate runtime actually resolves the failing records on this device | **INCONCLUSIVE** | The runtime is not installed, and installing it is outside this task's boundaries |

**Overall:** the defect is confirmed and explained, and the single available upgrade is
expected to carry the upstream fix. That expectation is documentary, not measured.

---

## 7. Assumptions (not verified)

1. **The Termux `nodejs 26.13.0-1` package bundles the same c-ares version as upstream Node
   26.13.0 (1.34.9).** Termux builds Node from the upstream release with the upstream
   `deps/ares` submodule, so this is highly likely, but the packaged binary was not
   downloaded or inspected. It could be confirmed without installing by fetching the Termux
   package and inspecting it, which was also out of scope.
2. **No later c-ares change was reverted.** Node's v26 changelog lists no c-ares change after
   26.12.1, so 26.13.0 should still carry 1.34.9.
3. **The device's DNS path still returns compressed SRV targets.** The responses observed
   today use compression in the SRV RDATA, which is what triggers the 1.34.8 defect. If the
   network path changed and stopped compressing, the defect would be masked — but the Atlas
   record still fails today, so it is currently triggered.
4. **No other cause is masking or amplifying the failure.** The reported startup error is
   `querySrv EBADRESP`, which matches the isolated defect exactly.

---

## 8. Tests that could not be performed

| Test | Why not |
| --- | --- |
| Side-by-side SRV comparison between Node 26.4.0 and Node 26.13.0 | The alternate runtime is not installed; installing it is prohibited by this task |
| `resolveSrv` against the configured Atlas record under the candidate runtime | Same reason |
| A-record comparison across both runtimes | Same reason |
| Confirmation of the c-ares version inside the Termux 26.13.0-1 binary | Requires downloading the package, which is prohibited |
| Any MongoDB connection or authentication attempt | Explicitly prohibited; also unnecessary, because the failure occurs during SRV resolution, before any connection |

---

## 9. Recommended next step

Based on the evidence above, and subject to explicit owner approval:

1. **Approve installing/upgrading the Termux `nodejs` package to 26.13.0-1**, which is
   already the repository candidate and carries c-ares 1.34.9 including upstream fix #1326 for
   exactly this defect. This is the only route available inside Termux that has a mechanism to
   correct the parser.
2. **Immediately after the upgrade, re-run the controlled diagnostic** — the same public SRV
   controls, the same configured Atlas SRV lookup, and the same A-record control — with the
   unmodified resolver configuration, and record the results before touching any application
   code.
3. **Do not change DNS configuration.** Google Public DNS is already the resolver at the OS
   and application layers, and the failure is a response-parsing defect that is independent of
   the resolver address (see `reports/DNS-SERVER-RUNTIME-INSPECTION-REPORT.md`).
4. **If the candidate runtime still returns `EBADRESP`**, fall back to the previously
   documented non-runtime options in `reports/DNS-SERVER-RUNTIME-INSPECTION-REPORT.md` §8.3 —
   principally running the server on a host where SRV parsing works, or using an explicit
   seed list instead of `mongodb+srv://`.

**Risk note for the upgrade itself.** Node 26.13.0 is a newer feature release than the
installed 26.4.0 and changes the runtime for the whole project, not only DNS. It should be
validated with the project's own typechecks, test suite, and production build before the
server is relied upon. The upgrade does not touch the repository, the MongoDB URI, or any
credential.

---

## 10. Non-claims

- This report does **not** claim that Node 26.13.0-1 fixes the failure. It claims only that the
  c-ares version that release is expected to carry contains the upstream fix, and that the
  fix has not been verified on this device.
- This report does **not** claim the c-ares version inside the Termux package was verified.
- This report does **not** claim that the MongoDB cluster, its credentials, or its access list
  are correct. No connection was attempted.
- This report does **not** claim the defect is the cause of any authentication error; an
  authentication error cannot arise from an SRV resolution failure.
- The MongoDB URI, its credentials, the database hostname, the shard hostnames, and the
  resolved addresses were never printed, logged, or written to any file.
