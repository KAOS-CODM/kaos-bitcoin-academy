# KAOS Bitcoin Academy — S6 Wallet Account Dashboard Implementation Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-14
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Change type: Owner-authorized client-side implementation (local validation only)
- Result: **IMPLEMENTATION COMPLETE — a wallet account dashboard now shows connection overview, balance, transaction history, capabilities, and account diagnostics on the existing Wallet page. 283/283 tests pass, both typechecks pass, the production build succeeds. NO live wallet method was executed and no relay or wallet was contacted.**

> **Status statement:** This task implemented a read-only account dashboard and its manual
> request handlers. No `get_info`, `get_balance`, `list_transactions`, `pay_invoice`,
> `make_invoice`, or `lookup_invoice` request was executed against a real wallet or relay — not
> during implementation, not during testing, and not during visual verification. Verification
> used fake requesters and the in-memory `FakeNip47Pool` exclusively, and no socket was opened.
> No Git staging, commit, push, stash, reset, clean, or branch switch was performed, and no
> database schema, model, seed, or authentication change was made.

---

## 1. Implementation summary

The existing Wallet page previously showed one wallet-reported information block and two
payment practice panels. It now carries a **Wallet account dashboard** that lets a learner
inspect the connected wallet, request the balance, request transaction history, and read a
clear account diagnostic — while keeping the payment and receive panels intact and placing
account information ahead of them.

Four pieces were added or extended:

| Piece | Location | Purpose |
| --- | --- | --- |
| `account.ts` — request helpers, sanitizers, failure classification, diagnostics, capability description, formatting | `client/src/features/wallet/account.ts` | Pure, testable account logic with no request at import time |
| `WalletAccountDashboard` (presentational) + `WalletDashboard` (container) | `client/src/features/wallet/WalletAccountDashboard.tsx` | The five dashboard sections and the three manual request handlers |
| `Nip47EnvelopeMethod` + three new result validators | `client/src/features/wallet/nwc-envelope.ts` | Extends the strict envelope adapter to the account methods |
| Focused regression suite | `server/test/wallet-account-dashboard.test.ts` | 49 tests over the dashboard, the handlers, and the strict adapter |

The architecture is preserved exactly as approved:

- The **client-only NWC architecture** is unchanged. Every request still runs in the browser
  against the wallet's own relay, through the existing `@getalby/sdk@9.0.0` client and the
  existing NWC adapter.
- **No new dependency, wallet SDK, backend proxy, paid service, or relay** was introduced.
  `client/package.json` is byte-identical to the pre-task state (its only diff against `HEAD`
  is the `@getalby/lightning-tools` line added by earlier, separately authorized work).
- The **approved relay allowlist** is unchanged: `wss://relay.coinos.io` and
  `wss://relay.getalby.com/v1`, enforced by the adapter and re-asserted by a new test.
- **Strict NIP-47 `result_type` validation** is unchanged and now also applies to the three
  account methods.
- **Encryption, envelope validation, timeout, and error handling** are unchanged. The
  dashboard reuses `WalletClientSession.requestEnvelope` and `Nip47EnvelopeAdapter` as-is.
- **Credentials stay in browser memory only.** The new modules contain no storage API, no
  `fetch`, no `XMLHttpRequest`, no WebSocket constructor, and no console output.
- **All existing payment and receive functionality** is preserved and untouched in behaviour.
- **The immutable PRD and its SHA-256 are untouched** — re-verified in §8.
- **All pre-existing uncommitted and untracked work is preserved.**

## 2. Exact files changed

### 2.1 Created

| File | Change | Size |
| --- | --- | --- |
| `client/src/features/wallet/account.ts` | **New** — pure account-dashboard logic: `ACCOUNT_TRANSACTION_LIMIT`, `AccountRequester`, `AccountFailureCategory`, `classifyAccountFailure`, `requestAccountInfo`, `requestAccountBalance`, `requestAccountTransactions`, `sanitizeBalanceResponse`, `sanitizeTransactionList`, `WalletBalance`, `WalletTransaction`, `describeCapabilities`, `deriveAccountDiagnostic`, `formatSats`, `formatBtc`, `WalletAccountSnapshot` | new, 623 lines |
| `client/src/features/wallet/WalletAccountDashboard.tsx` | **New** — `WalletAccountDashboard` (presentational, props → markup) and `WalletDashboard` (stateful container holding the three manual handlers) | new, 635 lines |
| `server/test/wallet-account-dashboard.test.ts` | **New** — 49 focused tests | new, 1153 lines |

### 2.2 Modified

| File | Change | Size |
| --- | --- | --- |
| `client/src/features/wallet/nwc-envelope.ts` | `Nip47EnvelopeMethod` extended with `get_info`, `get_balance`, `list_transactions`; added `isValidGetInfoResult`, `isValidGetBalanceResult`, `isValidListTransactionsResult`; wired all three into `isValidMethodResult` | 407 → 453 lines |
| `client/src/features/wallet/nwc.ts` | `SAFE_WALLET_CODES` exported so the dashboard reuses the one fixed safe-code list instead of echoing wallet-supplied text. No behavioural change | 494 → 501 lines |
| `client/src/features/wallet/WalletMethods.tsx` | Capability section now separates *reported and tested* / *reported but unavailable* / *reported, not tested* / *not reported*; lists the three methods the academy uses; adds an "Operations unavailable to this connection" list; prose updated while retaining the shipped-bundle guarantee `"has not called or tested"` that `server/test/static.test.ts` asserts | 68 → 169 lines |
| `client/src/pages/Wallet.tsx` | Old `WalletInfo` block removed; `WalletDashboard` mounted before the payment and receive panels; new `infoRefreshedAt` state; `toAccountConnectionState` helper; intro copy updated | 544 → 514 lines |
| `client/src/features/wallet/WalletActivityCallout.tsx` | "What" copy now states that the dashboard calls `get_balance` and `list_transactions` only on button press and never polls | 80 → 81 lines |
| `server/test/fixtures/nip47-fake-relay.ts` | Added an **optional** `getInfoResult` override so a test can control the fake wallet service's `get_info` answer. Default behaviour byte-identical | 275 → 285 lines |
| `server/test/wallet-methods.test.ts` | Updated the one assertion that encoded the old "never requests a balance" rule | 91 → 92 lines |
| `server/test/wallet.test.ts` | Updated the two assertions that encoded the old "never requests a balance" rule | 583 → 590 lines |
| `server/test/wallet-page-structure.test.ts` | Added `Wallet account dashboard` to the expected section order, proving account information precedes the payment panel | 277 → 278 lines |

**Not modified by this task** (verified by `git status` and by content inspection):

`server/src/**` (entire backend — no schema, model, seed, route, middleware, or auth change) ·
`client/src/lib/**` · `client/src/pages/**` other than `Wallet.tsx` · every other client
component · every other test file · `client/package.json` and both lockfiles (no dependency
added) · `PRD.md` · `PRD-ORIGINAL.txt` · `PRD.txt` · `PRD-SHA256.txt` · `PRD-MD-SHA256.txt` ·
`AGENTS.md` · `ENGINEERING-DECISIONS.md` · every other report.

> The three wallet files whose line counts differ from the **original** S6 baseline (`nwc.ts`,
> `WalletMethods.tsx`, `WalletActivityCallout.tsx`) were already changed by **earlier,
> separately authorized corrections in this session** before this task began. Those corrections
> are preserved intact; this task only added the changes listed above.

## 3. Dashboard functionality implemented

The dashboard is one section of the existing Wallet page (`client/src/pages/Wallet.tsx:435`),
mounted immediately after the connection status and **before** the payment and receive panels,
so account information is the first thing a learner sees about their wallet.

### 3.1 A — Connection overview

| Field | Source |
| --- | --- |
| Connection state (Connected / Disconnected / Connection error) | Page connection status |
| Wallet alias | `get_info` → `alias` |
| Network | `get_info` → `network`, only when the wallet supplies it |
| Last successful information refresh | Timestamp of the last successful `get_info` |
| Wallet public key, block height, block hash | `get_info`, only when supplied |
| Connection and authorization errors | Classified failure messages |

A connected wallet is never presented as funded. The section states verbatim:
*"A connected wallet is not a funded wallet: the academy never labels a wallet funded or
payment-ready from a connection alone."*

### 3.2 B — Balance

- Uses the NIP-47 `get_balance` method with an empty parameter object.
- Shows the balance in satoshis (`21,000 sats`), a readable formatted value in bitcoin
  (`0.00021000 BTC`), and the last successful balance-check timestamp.
- States: *"No balance has been requested in this session yet."* when nothing has been asked.
- States: *"Connect a wallet above to read a balance."* when disconnected.
- States: *"This wallet does not report the `get_balance` method, so a balance cannot be
  requested on this connection."* when the wallet does not report the capability.
- Shows a loading state while the request is in flight.
- A failed request is **never** shown as a zero balance. The value is only rendered when the
  wallet actually returned one.

### 3.3 C — Transaction history

- Uses the NIP-47 `list_transactions` method with a bounded `{ limit: 20 }`.
- Shown only when the connected wallet reports support for the method.
- Displays type, amount, status (when returned), timestamp, and a shortened payment-hash
  reference.
- Empty history is stated explicitly: *"The wallet returned no transactions for this request.
  That is an empty history, not a failure."*
- An unsupported method is stated explicitly instead of offering the request.
- The `invoice` and `preimage` fields of a transaction are **never read** by the sanitizer, so
  they cannot reach the interface.

### 3.4 D — Wallet capabilities

`WalletMethods` now presents three distinct lists with a badge on every method:

| Badge | Meaning |
| --- | --- |
| Reported and tested | The wallet reports it **and** a request for it succeeded in this session |
| Reported but unavailable | The wallet reports it, but the request did not succeed |
| Reported, not tested | The wallet reports it; the academy has not called it in this session |
| Not reported | The wallet did not report it, so it is unavailable to this connection |

A method appearing in the wallet's capability list is never assumed to work.

### 3.5 E — Account diagnostics

One evidence-based summary. The categories are kept strictly apart and are never conflated:

`connected-responding` · `connected-unverified` · `balance-unavailable` ·
`permission-missing` · `unsupported-operation` · `insufficient-balance` ·
`session-expired` · `transport-failure` · `wallet-error` · `invalid-response` ·
`no-connection` · `connection-error`

The section states verbatim: *"These diagnostics describe the wallet connection and the account
requests only. They are not payment results, and they never say that a wallet holds funds."*

## 4. NWC methods wired to manual user actions

| Method | Request parameters | Trigger | Button label |
| --- | --- | --- | --- |
| `get_info` | `{}` | Explicit click | "Refresh wallet information" |
| `get_balance` | `{}` | Explicit click | "Check balance" |
| `list_transactions` | `{ limit: 20 }` | Explicit click | "Load transaction history" |

Every request runs through the existing session and adapter:

```
WalletDashboard (container)
  → WalletClientSession.requestEnvelope(method, params)
    → Nip47EnvelopeAdapter.request(method, params)
      → approved relay only, strict result_type + result-shape validation
```

Guarantees enforced by construction and by test:

- **No automatic request on mount.** The container's only effect invalidates a pending response
  when the page goes away; it never requests.
- **No polling, no retry loop, no background timer.** The new modules contain no `setInterval`,
  no `setTimeout`, and no `requestAnimationFrame`.
- **One activation issues exactly one request.** A busy guard prevents a second concurrent
  request while one is in flight.
- **No payment method is invoked.** `pay_invoice`, `make_invoice`, and `lookup_invoice` are not
  called by the dashboard; a test asserts this over all three activations.
- **A late reply cannot restore stale data.** A monotonic attempt token discards a response
  that arrives after the page has gone away.

## 5. Tests added and results

New file: `server/test/wallet-account-dashboard.test.ts` — **49 tests**.

| Required case | How it is covered |
| --- | --- |
| Successful `get_info` response | `requestAccountInfo` returns the sanitized info; exactly one `get_info` call with `{}`; unknown fields dropped |
| Successful balance response | `requestAccountBalance` returns `balanceMsat` / `balanceSats`; exactly one `get_balance` call with `{}` |
| Balance request failure | Failed outcome carries a failure and **no value**; the UI renders the error and never `0 sats` |
| Unsupported `get_balance` | `NOT_IMPLEMENTED` → `unsupported-operation`; the UI explains and does not offer the request |
| Successful transaction-history response | Sanitized records with type, amount, state, timestamp, truncated hash reference |
| Empty transaction history | `transactions: []` → an empty list, not a failure and not invented rows |
| Unsupported `list_transactions` | `NOT_IMPLEMENTED` → `unsupported-operation`; the UI explains and does not offer the request |
| Disconnected wallet | The UI shows "No wallet connected" and no account values; no request is issued without a session |
| Expired session | `stale` → `session-expired` with "Reconnect the wallet" guidance |
| Permission and authorization errors | `UNAUTHORIZED`, `RESTRICTED`, `QUOTA_EXCEEDED` → `permission-missing`, not retryable |
| Wallet-reported insufficient balance | `INSUFFICIENT_BALANCE` → `insufficient-balance`, never conflated with a transport failure |
| Manual refresh behaviour | Capturing the rendered control and activating it produces **exactly one** request with the exact method and parameters |
| No automatic requests on page mount | Rendering the container issues **zero** requests, with and without a wallet |
| No fabricated balance or transaction data | Malformed replies yield `null`; records missing a usable type or amount are dropped; no row is invented |
| No sensitive credential or preimage exposure | Module hygiene tests plus rendered-markup tests for secret, preimage, invoice, and full payment hash |

Additional coverage in the same file:

- Strict adapter behaviour for the three new methods over the in-memory fake relay — including
  a mismatched `result_type`, a `get_balance` reply without `balance`, a `list_transactions`
  reply without `transactions`, and a `get_info` reply without `methods`, all rejected as
  `invalid-envelope`.
- Failure-category separation — six distinct categories asserted to stay distinct.
- An unknown wallet error code is never echoed back to the learner.
- Module hygiene: no storage API, no `fetch`, no `XMLHttpRequest`, no `WebSocket(`, no console
  output, no unapproved relay URL, no long hex literal, no `nostr+walletconnect://`.

### 5.1 Full suite result

```
$ npm run build && npm --prefix server test
ℹ tests 283
ℹ suites 5
ℹ pass 283
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 25111.725147
```

Baseline before this task was **234 tests, 234 passing**. The suite now contains **283 tests,
all passing** — a net addition of 49 tests with zero regressions.

> **Build ordering matters for the authoritative result.** `server/test/static.test.ts`
> asserts against the **built** bundle in `client/dist`, not against source. Running the suite
> against a stale bundle can therefore hide a copy regression. The authoritative figure above
> comes from a run performed **after** the final production build. This was caught and fixed
> during the final verification pass: the reworded capability copy had dropped the shipped
> guarantee *"has not called or tested"*, which `static.test.ts` asserts is present in the
> bundle. The copy now keeps that guarantee in a form that stays true — *"The Academy has not
> called or tested every method here; the badge shows whether this one has actually been
> tested in this session."* The suite passes on a fresh build.

### 5.2 Updated existing assertions

Three assertions in the pre-existing suite encoded the earlier rule that the academy *never*
queried a balance or transaction history. That rule is superseded by this owner-authorized
task, so the assertions were updated to the new manual-only rule rather than deleted:

| File | Was | Now |
| --- | --- | --- |
| `server/test/wallet-methods.test.ts` | "This page does not request balances or retrieve transaction history." | "requests a balance or a transaction history only when you press the matching button." plus "It never polls and never runs on its own." |
| `server/test/wallet.test.ts` | same string, source-level match | same replacement, source-level match |
| `server/test/wallet.test.ts` | `WalletActivityCallout`: "It never queries a balance or retrieves transaction history." | "calls `get_balance` and `list_transactions` only when you press the matching button, and it never polls." |

No security assertion was weakened. The storage, network, console, relay-allowlist,
credential-material, and forbidden-SDK-method checks all still pass unchanged.

## 6. Typecheck results

```
$ npm --prefix server run typecheck
> tsc -p tsconfig.json --noEmit
(no output — clean)

$ npm --prefix client run typecheck
> tsc -p tsconfig.json --noEmit
(no output — clean)
```

Both typechecks pass with the project's strict settings (`strict: true`,
`noUnusedLocals` via the client's inherited configuration, `verbatimModuleSyntax`,
`isolatedModules`).

## 7. Production build result and bundle size

```
$ npm run build
> npm --prefix server run build && npm --prefix client run build

> tsc -p tsconfig.json          # server — clean

> vite build
vite v8.3.5 building client environment for production...
✓ 115 modules transformed.
✓ built in 1.04s

dist/index.html                   0.61 kB │ gzip:   0.36 kB
dist/assets/index-B4nzBd47.css   25.54 kB │ gzip:   5.40 kB
dist/assets/index-tHwI-3Zi.js   621.97 kB │ gzip: 181.59 kB
```

The build **succeeds**. The measured dashboard contribution, obtained by building once with
the dashboard render removed and then restoring the file and re-verifying it by SHA-256:

| Build | JS bundle | Gzip |
| --- | --- | --- |
| Without the dashboard | 595.77 kB | 175.18 kB |
| With the dashboard | 621.97 kB | 181.59 kB |
| **Delta** | **+26.20 kB** | **+6.41 kB** |

The pre-existing ">500 kB chunk" advisory is unchanged and originates from the NWC SDK
(`@getalby/sdk` plus `nostr-tools`), not from this task.

## 8. Confirmation that no live wallet or relay operation occurred

**Confirmed.** Specifically:

- No `get_info`, `get_balance`, `list_transactions`, `pay_invoice`, `make_invoice`, or
  `lookup_invoice` request was executed against a real wallet or relay.
- No WebSocket was opened. Every test used a fake requester or the in-memory
  `FakeNip47Pool`, which replaces the SDK's public `pool` property and answers published
  requests itself.
- The `get_info` request that already existed at connect time was not re-run against a live
  wallet during this task either; the only live-shaped code path exercised was the in-memory
  fake.
- The visual check of the rendered dashboard was produced from a static server-side render
  with synthetic fixture values. No browser was launched and no network request was made.
- No account check, payment, invoice, or settlement lookup was performed.

**Live account checks remain outstanding and require the project owner's separate
authorization.**

## 9. Confirmation that no Git or database operation occurred

**Confirmed.**

- Only read-only Git commands were run: `git status`, `git diff`, `git log`, `git rev-parse`,
  `git stash list`.
- No staging, commit, push, stash, reset, clean, rebase, or branch switch was performed.
- No Git operation modified the index, the working tree, or any ref.
- No database operation of any kind was performed: no schema change, no model change, no
  migration, no seed run, no data write. `server/src/**` is byte-identical to its pre-task
  state.
- No authentication change. No route, middleware, or CSP change.
- The immutable PRD was not modified. Integrity re-verified:

```
$ sha256sum PRD.md PRD-ORIGINAL.txt
1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d  PRD.md
7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed  PRD-ORIGINAL.txt
```

Both match `PRD-MD-SHA256.txt` exactly (`PRD.md` → `1e73e32c…`, reference → `7a44c87e…`).
No checksum mismatch arose, so no reconciliation was needed.

## 10. Preserved architecture — verification summary

| Requirement | Status | Evidence |
| --- | --- | --- |
| Client-only NWC architecture | Preserved | All requests run in the browser through `WalletClientSession` |
| `@getalby/sdk@9.0.0` and the existing adapter | Preserved | No new SDK; `client/package.json` unchanged by this task |
| Approved relay allowlist | Preserved | `APPROVED_RELAYS` unchanged; new test re-asserts it |
| Strict NIP-47 `result_type` validation | Preserved and extended | Adapter-level tests for all three account methods |
| Encryption, envelope, timeout, error handling | Preserved | The dashboard reuses the adapter unchanged |
| Credentials and clients in browser memory only | Preserved | No storage API, no network call, no persistence in the new modules |
| No NWC URI, secret, private key, or preimage persisted | Preserved | Module hygiene test; no long hex literal; no `nostr+walletconnect://` |
| Payment and receive functionality preserved | Preserved | `PaymentPanel` and `ReceivePanel` untouched; their tests pass |
| PRD and its SHA-256 unchanged | Preserved | Hashes re-verified in §8 |
| Existing uncommitted and untracked work preserved | Preserved | `git status` shows only the changes listed in §2; nothing deleted |
| No new wallet SDK, backend proxy, paid dependency, or service | Confirmed | No manifest or lockfile change by this task |
| No live wallet or relay operation | Confirmed | §8 |
| No Git or database operation | Confirmed | §9 |

## 11. Remaining limitations

1. **Not exercised against a live wallet.** Real-wallet quirks will surface as a strict
   `invalid-response` failure rather than as a wrong number. The most likely case is a wallet
   that reports `get_balance` in satoshis instead of the NIP-47 millisatoshi unit, or that
   omits `methods` from a `get_info` reply — the `get_info` validator requires `methods`,
   matching the SDK's own `getInfo()` check.
2. **Capability-gated buttons.** `get_balance` and `list_transactions` are offered only when
   the wallet's `get_info` reports them. A wallet that supports a method but omits it from
   `methods` will show that method as unavailable to the connection.
3. **A stale balance remains visible but is explicitly labelled.** After a failed refresh the
   last successful value stays on screen under the heading "Last successful balance check",
   with its timestamp and the note *"The most recent balance request did not succeed, so this
   is the last check that did."* It is never presented as current and never shown as zero.
4. **Transaction rows can be dropped.** A record without a usable `type` or `amount` is
   discarded, so the number of displayed rows can be lower than the number the wallet
   returned. No placeholder row is shown.
5. **Only the truncated payment hash is displayed.** The full hash is never rendered, and the
   `invoice` and `preimage` fields are never read.
6. **Out of scope by design.** `pay_keysend`, `get_budget`, notifications, hold invoices,
   multi-account wallets, and historical balance series are not exposed. They appear only in
   the capability list as reported or not reported.
7. **Dashboard placement.** The dashboard renders after the connect form and the connection
   status, so a learner sees connection setup first and account information immediately after
   it — before the payment and receive panels.
8. **One `get_info` still runs automatically on connect.** This is pre-existing behaviour
   required by the SDK handshake. The dashboard's *additional* `get_info` is manual only.
9. **Existing `ReceivePanel` polling is untouched.** The receive practice still polls
   `lookup_invoice` for its own invoice until the invoice expiry deadline. That is pre-existing
   behaviour in a different panel, outside this task's scope, and it was neither extended nor
   changed.

## 12. Reproduction commands

```bash
cd /data/data/com.termux/files/home/kaos-bitcoin-academy

# Build first: server/test/static.test.ts asserts against the built bundle in client/dist
npm run build

# Full test suite (283 tests)
npm --prefix server test

# Typechecks (server + client)
npm run typecheck

# PRD integrity
sha256sum PRD.md PRD-ORIGINAL.txt
```

---

**End of report.**
