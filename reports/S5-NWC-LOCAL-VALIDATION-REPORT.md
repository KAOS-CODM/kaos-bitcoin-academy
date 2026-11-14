# S5 NWC Local Validation Report

**Date:** 2026-11-08  
**Repository:** `/data/data/com.termux/files/home/kaos-bitcoin-academy`  
**Branch:** `main`  
**Task mode:** Authorized S1–S4 baseline commits, followed by an isolated S5 validation harness; live-test report correction  
**Live wallet test:** **Owner-performed on 2026-11-08; successful for `get_info` only.** A fresh Coinos connection returned a real wallet response through `wss://relay.coinos.io`; the owner then confirmed that **Disconnect and clear** worked.

---

## 1. Baseline Git commits and grouping

The pre-task HEAD was:

```text
39093b3f94f93f2dd15f7ca264c8583df1420187
```

S1 and S3 implementation work, and the S2 implementation checkpoint, were already
committed before this task. The outstanding attributable work was S2 evidence
documentation, the S4 implementation, and S4 documentation. No commit was
manufactured for a phase with no outstanding changes.

Three logical baseline commits were created:

| Commit | Group | Contents |
|---|---|---|
| `07a90d6ab3642f1b8ca306eadab1902ecd310e03` | S2 evidence | `docs(s2): preserve acceptance and checkpoint evidence` — 3 S2 reports, 1,600 insertions |
| `964859349e163104377e3ac2d4bb9bed90607c83` | S4 implementation | `feat(s4): add contextual AI tutor` — server tutor route/provider/context/schema, client tutor page and navigation, tests, configuration, 20 files changed |
| `f99c1a5477050e54cd77a58520423bd2b1cd332b` | S4 documentation | `docs(s4): record tutor readiness, closure, and roadmap` — readiness audit, implementation report, closure/S5-readiness report, updated roadmap audit, 4 files, 3,476 insertions |

The new baseline HEAD is:

```text
f99c1a5477050e54cd77a58520423bd2b1cd332b
```

Relevant prior history preserved unchanged:

```text
39093b3 docs(playground): record S3 acceptance
c6be8df test(playground): cover simulation behavior and routes
4ab0d41 feat(playground): add six Bitcoin simulations
1f1d515 chore: checkpoint S2 quiz integration and DNS work
41d37e7 docs: add pre-S2 Git initialization report
e7673e8 chore: expand gitignore for local artifacts
9512f9c chore: establish S1 project baseline
```

No S5 work was included in any baseline commit. No commit was amended, squashed,
rebased, reset, or rewritten. No Git configuration was changed. No remote was
configured and nothing was pushed.

An earlier untracked S5 feasibility report, `reports/S5-NWC-ZERO-FUNDS-VALIDATION-REPORT.md`,
was excluded from the baseline and preserved outside the repository at:

```text
/data/data/com.termux/files/usr/tmp/opencode/prebaseline-s5/S5-NWC-ZERO-FUNDS-VALIDATION-REPORT.md
```

Its pre-move SHA-256 was:

```text
a1400aa4108d50221b41e1dc891f936d0549c4d9b80106ef3c3f41a0be71a09e
```

The existing Android copy of that earlier report was not modified by this task.

### Baseline verification

- `git status --short` produced no output immediately after
  `f99c1a5`, confirming a clean working tree before S5 began.
- Every baseline commit was inspected with `git show --stat` and
  `git show --check`.
- `git show --check` flagged only Markdown two-space line-break whitespace in the
  committed reports. The S4 implementation commit had no whitespace warnings.
  No amend was performed, per the no-rewrite rule.
- No `.env` file was staged or committed. `server/.env` is ignored by
  `.gitignore:8`.
- A secret-marker scan of changed and untracked files found only:
  - a forbidden-marker test string in `server/test/static.test.ts`;
  - a clearly fake example MongoDB URI in an S2 report;
  - an empty OpenRouter API key placeholder in an S4 report.
  No live credential, wallet URI, private key, or API key was found.

## 2. Clean working tree before S5

Confirmed. Immediately after the third baseline commit:

```text
git status --short
# no output
```

S5 work began only after that check. The current working tree intentionally shows
the new S5 harness and this report as untracked because no S5 commit was
authorized. No tracked production file was modified by S5.

## 3. PRD integrity

The PRD checksum is unchanged:

```text
1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d  PRD.md
```

`PRD.md` was not edited, renamed, reformatted, or deleted.

## 4. Harness directory and files

The harness is inside the repository at:

```text
tools/s5-nwc-validation/
```

Files created:

| Path | Purpose |
|---|---|
| `tools/s5-nwc-validation/package.json` | Dedicated manifest; exact SDK and Vite pins |
| `tools/s5-nwc-validation/package-lock.json` | Dedicated lockfile; SDK resolved at 9.0.0 |
| `tools/s5-nwc-validation/index.html` | Password-style URI input, status, response display, warnings |
| `tools/s5-nwc-validation/src/nwc.js` | Local URI parser, exact relay allowlist, response sanitisation |
| `tools/s5-nwc-validation/src/main.js` | SDK client lifecycle, only `getInfo()`, disconnect cleanup |
| `tools/s5-nwc-validation/src/styles.css` | Local page styling |
| `tools/s5-nwc-validation/vite.config.js` | Local-only `127.0.0.1` dev/preview binding |
| `tools/s5-nwc-validation/scripts/verify.mjs` | Static checks and parser/allowlist tests |
| `tools/s5-nwc-validation/README.md` | Scope, security notes, and owner test procedure |

Generated `node_modules/` and `dist/` directories are ignored by the repository
`.gitignore`. The harness has its own manifest and lockfile and does not change
the root, client, or server dependency manifests.

No production client, server, CSP, database, API route, PRD, or deployment
configuration was altered for S5.

## 5. Exact SDK version and API used

Pinned and installed:

```text
@getalby/sdk  9.0.0
vite          8.3.5
```

Verified installed versions:

```text
node_modules/@getalby/sdk/package.json  -> 9.0.0
package-lock.json @getalby/sdk entry    -> 9.0.0
node_modules/vite/package.json          -> 8.3.5
```

The SDK is imported through its documented NWC subpath:

```js
import { NWCClient } from '@getalby/sdk/nwc'
```

The installed type declarations and source confirm:

- `constructor(options?: NewNWCClientOptions)` accepts `relayUrls`,
  `walletPubkey`, `secret`, `nostrWalletConnectUrl`, `lud16`, `logger`, and
  `requireSecret`.
- `getInfo(): Promise<Nip47GetInfoResponse>`.
- `close(): void`.
- `getInfo()` calls `executeNip47Request("get_info", {}, ..., { replyTimeout: 10000 })`.
- The SDK's `getInfo()` failure path calls
  `console.error("Failed to request get_info", error)`.
- The SDK URI parser validates wallet pubkey, relay presence, and secret format,
  but does not enforce `wss://` and does not require a secret by default.
- `close()` closes the relay pool; it does not wipe the client's stored secret.

The harness does not pass a raw URI to the SDK. It parses and validates the URI
locally, then constructs the client with only the validated values:

```js
new NWCClient({
  walletPubkey: parsed.walletPubkey,
  relayUrls: [parsed.relay],
  secret,
  requireSecret: true,
})
```

Only this operation is invoked:

```js
await client.getInfo()
```

No payment, invoice, balance, transaction, notification, QR, or other NWC method
is invoked. The SDK package itself contains the full `NWCClient` method surface,
so the built bundle necessarily contains other SDK method names; the harness
source does not call them.

Transitive runtime packages installed by the approved SDK were:

```text
@getalby/lightning-tools 9.0.2
@webbtc/webln-types     3.0.0
nostr-tools             2.26.0
```

These are declared dependencies of `@getalby/sdk@9.0.0`, not extra direct
dependencies added by this task. No additional direct dependency was added
beyond the SDK and Vite.

## 6. Security controls implemented

### Input and URI handling

- The URI field is `type="password"` with `autocomplete="off"`,
  `autocapitalize="off"`, and `spellcheck="false"`.
- The URI is read locally, the input is cleared immediately, and the value is
  never placed in a URL, query string, fragment, storage API, or backend request.
- Only the canonical `nostr+walletconnect://` prefix is accepted.
- Wallet public key and secret must each be exactly 64 hexadecimal characters.
- Exactly one `relay` and one `secret` parameter is required.
- Unknown query parameters, duplicate relay/secret parameters, fragments,
  internal whitespace, and non-canonical schemes are rejected.
- `lud16` is tolerated as an optional URI parameter but is not used or displayed.

### Relay allowlist

Only the exact approved relay is accepted:

```text
wss://relay.coinos.io
```

The parser rejects `ws://`, `http://`, `https://`, alternate hosts, lookalike
hosts such as `relay.coinos.io.evil`, custom ports, paths, queries, credentials,
and duplicate relay parameters.

### No persistent storage or backend

The harness source and page contain no:

- `localStorage`
- `sessionStorage`
- IndexedDB
- cookies
- analytics
- HTTP backend calls
- secret-bearing application URL parameters
- service worker or silent app-level reconnection

The built bundle was also scanned for persistent-storage markers and none were
found. The SDK bundle necessarily contains library code for its NWC client; the
harness does not add an HTTP backend.

### Only `get_info`

`npm run verify` checks the harness source for the only permitted SDK call and
fails if any of the following method names appear in harness source:

```text
getBalance, payInvoice, payKeysend, makeInvoice, lookupInvoice,
listTransactions, getBudget, signMessage, createConnection,
makeHoldInvoice, settleHoldInvoice, cancelHoldInvoice,
subscribeNotifications, getWalletServiceInfo
```

### SDK logging and error handling

- The SDK's `getInfo()` failure path logs through `console.error`. The harness
  temporarily replaces `console.log`, `info`, `warn`, `error`, and `debug` with
  no-ops for the duration of the `getInfo()` request and restores them in a
  `finally` block.
- The harness itself contains no direct console output.
- Errors are mapped to fixed, safe messages. SDK error messages and error
  objects are not rendered.
- Only allow-listed `get_info` response fields are displayed: `alias`, `color`,
  `pubkey`, `network`, `block_height`, `methods`, and `extensions`. Unknown
  fields are discarded.
- Values are rendered with `textContent`, not HTML injection.

### Disconnect and lifecycle

Disconnect performs all of the following:

- calls `client.close()` if a client exists;
- sets the client reference to `null`;
- clears the password input;
- clears the response table and raw JSON;
- hides the response section;
- resets the connection status.

`pagehide` and bfcache `pageshow` events also close the client and clear state.
A per-attempt token prevents a late response from updating the page after a
disconnect.

### Explicit non-claims

JavaScript strings cannot be reliably zeroized. Clearing references and UI state
is best-effort and is not physical memory erasure. The SDK's `close()` closes
relay connections but does not wipe its stored secret. The harness does not claim
otherwise.

## 7. Build and test results

### Harness

| Command | Result |
|---|---|
| `npm install --no-audit --no-fund` | Passed; 25 packages added |
| `npm run verify` | Passed: SDK 9.0.0, exact relay, `get_info` only, no persistent storage/backend calls in harness source |
| `npm run build` | Passed; Vite 8.3.5 built the local page |
| Local preview smoke test | Passed; `127.0.0.1:4173` served the page with the password input and approved relay |
| Built-bundle storage scan | Passed; no `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` markers |
| SDK constructor smoke test | Passed with fake 64-hex values; client exposed the approved relay, `getInfo`, and `close` without connecting |
| Owner live `get_info` test (2026-11-08) | Passed for `get_info` only; see the live-test record below |

Harness build output:

```text
dist/index.html                   3.56 kB
dist/assets/index-*.css           3.26 kB
dist/assets/index-*.js          113.61 kB
```

### Owner live test (2026-11-08)

The project owner performed the live test manually with a fresh Coinos NWC
connection:

- A fresh connection was used; the previously exposed connection was not reused.
- The harness connected through the approved relay `wss://relay.coinos.io`.
- The wallet returned a real `get_info` response.
- Reported alias: `ln.coinos.io`.
- Reported network: `mainnet`.
- Reported block height: `975028`.
- Reported supported methods included `get_info`, `pay_invoice`, `pay_keysend`,
  `make_invoice`, `receive`, and others.
- The owner pressed **Disconnect and clear** and confirmed that the disconnect and
  clearing operation worked.

Only `get_info` was invoked. The advertised methods are wallet claims, not
evidence that any of them were called or tested. No payment, invoice creation,
balance request, or transaction was performed. The `mainnet` value does not prove
that the wallet contains funds, and this test does not establish payment
functionality or settlement.

### Existing application

| Command | Result |
|---|---|
| `npm run typecheck` | Passed for server and client |
| `npm test` | 90 passed, 0 failed; the database-backed S1 flow printed its normal conditional notice because `RUN_DB_TESTS=1` and `MONGODB_URI` were not set |
| `npm run build` | Passed; server TypeScript build and client Vite build |

No existing test or build failure was introduced by the S5 harness.

### Static verification specifics

`npm run verify` passed checks for:

- exact `@getalby/sdk` and `vite` pins;
- installed SDK version 9.0.0;
- lockfile SDK version 9.0.0;
- approved relay constant;
- `@getalby/sdk/nwc` import;
- `new NWCClient(...)`, `.getInfo()`, and `client.close()`;
- absence of forbidden NWC method names in harness source;
- absence of persistent-storage, URL-parameter, HTTP, and WebSocket construction
  markers in harness source;
- password-style input and autocomplete-off markup;
- approved relay URI accepted;
- disallowed relays and malformed URIs rejected;
- response sanitisation drops unknown fields.

## 8. What was actually tested versus what remains untested

### Actually tested

- Repository state, branch, HEAD, staged/unstaged/untracked state.
- Baseline commit creation and per-commit inspection.
- Clean working tree immediately after the baseline.
- PRD checksum.
- Exact SDK and Vite installation and lockfile versions.
- SDK API declarations and relevant source paths.
- Harness static checks, URI parser, relay allowlist, and response sanitisation.
- Harness production build.
- Local preview server smoke test on `127.0.0.1:4173`.
- Built-bundle persistent-storage marker scan.
- Existing application typecheck, tests, and build.
- Owner-performed live `get_info` test on 2026-11-08 using a fresh Coinos NWC
  connection through `wss://relay.coinos.io`.
- Wallet-reported alias, network, block height, and advertised methods, without
  treating advertised methods as tested methods.
- Owner-confirmed **Disconnect and clear** behavior in the live harness.

### Not tested

- Only `get_info` was invoked. No payment, invoice creation, balance request,
  transaction, QR flow, or other NWC method was called or tested.
- Advertised wallet methods are not evidence that those methods work.
- The wallet-reported `mainnet` value does not prove that the wallet contains
  funds.
- Successful `get_info` does not establish payment functionality or settlement.
- No wallet-side connection revocation was performed.
- The 0 sats budget is an owner-side Coinos configuration; the harness did not
  independently verify it.
- Physical memory zeroization cannot be proven. Disconnect and clear was manually
  confirmed for the harness UI and client reference only.
- AC-016 is not yet fully proven by this test.

The owner performed the manual test; the remaining untested items above define the
boundary of this validation.

## 9. Owner live-test record and reproduction instructions

The live test was performed by the project owner on 8 November 2026. The
recorded findings are in section 7. The procedure below is retained for
reproducibility and future zero-funds checks.

Do not paste the NWC URI or secret into chat, a terminal command, an environment
file, a report, a screenshot, or source code.

1. In Termux, enter the harness directory:

   ```sh
   cd /data/data/com.termux/files/home/kaos-bitcoin-academy/tools/s5-nwc-validation
   ```

2. If dependencies are not already installed:

   ```sh
   npm install --no-audit --no-fund
   ```

3. Run the static checks and build:

   ```sh
   npm run verify
   npm run build
   ```

4. Start the local preview server:

   ```sh
   npm run preview
   ```

   It binds only to `127.0.0.1:4173`. Do not add `--host 0.0.0.0`.

5. On the same Android device, open Chrome and navigate to:

   ```text
   http://127.0.0.1:4173/
   ```

   If available, `termux-open-url http://127.0.0.1:4173/` opens the same local
   page.

6. In Coinos, create a **fresh** NWC connection with a **0 sats** budget. Do not
   reuse the previously exposed connection. Confirm its relay is exactly
   `wss://relay.coinos.io`.

7. Paste the fresh URI directly into the password-style field. Do not send it
   through chat or any terminal command.

8. Click **Connect and request `get_info`**.

9. Record only:
   - the displayed status;
   - the wallet-reported allow-listed fields;
   - any fixed error code or fixed error message shown by the page.

   Do not copy the URI, secret, or raw SDK error into the result.

10. Click **Disconnect and clear**.

11. Confirm:
    - the URI field is empty;
    - the response section is hidden;
    - the status says the connection state was cleared.

12. Revoke the connection in Coinos if it is no longer needed.

13. Report the result to the project owner. If the test fails, report only the
    safe status/error shown by the page.

## 10. Known limitations and risks

- **Live `get_info` only.** A fresh Coinos connection returned `get_info` through
  `wss://relay.coinos.io` on 2026-11-08. This does not validate any other NWC
  method.
- **Advertised methods are not tested methods.** The wallet advertised
  `get_info`, `pay_invoice`, `pay_keysend`, `make_invoice`, `receive`, and others,
  but only `get_info` was invoked.
- **No payment, invoice, balance, or transaction proof.** No such operation was
  performed. The `mainnet` value does not prove that the wallet contains funds,
  and successful `get_info` does not establish payment functionality or
  settlement.
- **Disconnect is manually confirmed, not memory-erasure proof.** Disconnect and
  clear worked in the live UI, but JavaScript strings cannot be guaranteed to be
  physically zeroized. The SDK also does not wipe its stored secret on close.
- **AC-016 is not yet fully proven.** This test is evidence for the `get_info`
  connection path, not for the full acceptance criterion.
- **SDK secret lifetime.** `NWCClient.close()` closes relay connections but does
  not wipe its stored secret; the harness drops its reference after closing.
- **SDK parser is weaker than the harness.** The SDK does not enforce `wss://` or
  require a secret by default. The harness enforces both before constructing the
  client.
- **SDK internal logging.** The harness suppresses console methods only during
  the `getInfo()` request. The SDK and relay library still contain internal
  console calls outside that window; the harness itself never logs the URI or
  secret.
- **SDK bundle surface.** The bundled `@getalby/sdk/nwc` code includes the full
  `NWCClient` method surface, so other method names appear in the built bundle.
  The harness source calls only `getInfo()`.
- **SDK relay pool behavior.** The SDK may retry its relay connection while a
  request is pending. The harness does not implement app-level reconnection and
  closes the pool on disconnect.
- **Local harness only.** This is not a production integration, deployment, or
  CSP change. Production CSP remains unchanged and is still restrictive.
- **No network exposure.** Vite dev/preview binds to `127.0.0.1`; the harness is
  not intended for LAN or public access.
- **No wallet-side controls.** The harness cannot verify that Coinos set a 0 sats
  budget, and it cannot revoke the wallet connection. The owner must do both.
- **Optional Vite dependencies.** `npm ls` reports several Vite optional
  dependencies as unmet. The vanilla harness build succeeds without them.

---

## Result

S1–S4 baseline work is preserved in logical commits, the working tree was clean
before S5 began, the PRD checksum is unchanged, and the isolated harness builds
and passes static checks.

On 8 November 2026, the project owner performed a successful live `get_info`
test using a fresh Coinos NWC connection through the approved relay
`wss://relay.coinos.io`. The wallet reported alias `ln.coinos.io`, network
`mainnet`, block height `975028`, and advertised methods including `get_info`,
`pay_invoice`, `pay_keysend`, `make_invoice`, `receive`, and others. The owner
then confirmed that **Disconnect and clear** worked.

**Scope boundary:** Only `get_info` was invoked. Advertised methods are not
evidence that those methods were tested. No payment, invoice creation, balance
request, or transaction was performed. The `mainnet` value does not prove that
the wallet contains funds, and successful `get_info` does not establish payment
functionality or settlement. Disconnect and clear was manually confirmed, but
JavaScript strings cannot be guaranteed to be physically zeroized. **AC-016 is
not yet fully proven by this test.**
