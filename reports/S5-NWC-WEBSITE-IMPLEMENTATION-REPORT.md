# S5 NWC Website Implementation Report

**Project:** KAOS Bitcoin Academy
**Date:** 2026-11-08
**Repository:** `kaos-bitcoin-academy`
**Branch:** `main`
**Baseline HEAD:** `f99c1a5477050e54cd77a58520423bd2b1cd332b`
**Commit handling:** Single owner-authorized S5 commit; not pushed.
**Report location:** `reports/S5-NWC-WEBSITE-IMPLEMENTATION-REPORT.md`

## 1. Executive summary

The client-only Option A Nostr Wallet Connect (NWC) integration now supports two exact
approved relays:

- Coinos: `wss://relay.coinos.io`
- Alby: `wss://relay.getalby.com/v1`

The implementation keeps the existing `@getalby/sdk@9.0.0` integration and the same
`get_info`-only workflow. It also adds a contextual practical-activity section to the
Lightning Network lesson that most directly covers wallet authorization and invoices:
`ln-channels` (“Channels, liquidity and invoices”) in `06-lightning-network`.

The resulting learner flow is:

1. The lesson explains why the learner might try a real read-only wallet connection.
2. The lesson links to the protected `/wallet` page.
3. The wallet page explains exactly what the Academy requests, distinguishes that request
   from the methods the wallet reports, and explains how to disconnect.
4. The wallet page links back to the lesson that introduced the activity.

The final refinement adds method awareness to the wallet page. It separates the one method
the Academy uses, `get_info`, from the method names returned in the wallet's `get_info`
response. Each reported method receives a short, plain-language description when the name is
known; unknown names are displayed as-is without an invented description. The page states
that reported methods are capabilities, not verified functionality, and that no payment,
invoice creation, balance request, or transaction-history request is performed. Missing or
empty method lists render a clear "did not report any methods" message instead of breaking
the page.

No additional NWC method was called. The method descriptions are display copy only.

The learning flow changes do not gate courses, lessons, quizzes, XP, achievements, the
Bitcoin Playground, or the AI Tutor behind a wallet connection.

**Important status distinction:** the automated tests remain mocked and did not contact a
real wallet or relay. The owner separately performed two manual live tests:

- A Coinos URI using `wss://relay.coinos.io` returned a successful `get_info`.
- A ZEUS-generated URI using `wss://relay.getalby.com/v1` returned a successful `get_info`.

These are two tested wallet/relay combinations, not proof of universal wallet compatibility.
The owner also confirmed that the revised wallet flow works. The implementation agent did not
perform these live tests. No payment, invoice, balance, or settlement operation was tested.
A successful `get_info` response does not prove payment or settlement functionality, and
AC-016 is not fully proven by this work.

## 2. Approved scope and boundaries

The implementation followed the approved S5 scope:

- Preserve the client-only NWC integration (Option A).
- Preserve exact SDK `@getalby/sdk@9.0.0`.
- Accept only the two exact approved relay URLs:
  - `wss://relay.coinos.io`
  - `wss://relay.getalby.com/v1`
- Continue to use the relay supplied by the learner's NWC URI.
- Preserve the Alby `/v1` path requirement.
- Only the `get_info` NWC request.
- Explain clearly that `get_info` is the only method the Academy uses.
- Display only the methods actually reported by the connected wallet, with short descriptions
  for recognised method names and the original name for unknown methods.
- Distinguish reported capabilities from methods the Academy has called, tested, or supports.
- Handle empty or missing method lists gracefully.
- Protected `/wallet` page consistent with existing routing, authentication, and styling.
- Add a contextual practical activity to the relevant existing lesson.
- Move the Wallet discovery point out of ordinary top-level navigation while preserving
  direct access to the protected route.
- No server-side NWC proxy, credential API, database model, or credential transmission.
- No persistent credential storage or automatic reconnection.
- No payment, invoice, balance, transaction-history, QR, receipt, or settlement features.
- No changes to S1-S4 course content, quiz logic, or existing lesson behavior; the shared
  lesson renderer gains only the conditional S5 activity callout.
- No changes to `PRD.md`, the Bitcoin Playground, or the AI Tutor.
- No fictional sample invoice was added.

`PRD.md` remains unchanged. Its SHA-256 after implementation is:

```text
1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d  PRD.md
```

The existing S5 local-validation report remains unchanged:

```text
fb931e34b8369f55e8f6d27eefbc5adc1936e66c65c53b64ef2dff3844cffc93  reports/S5-NWC-LOCAL-VALIDATION-REPORT.md
```

## 3. Files changed and added

| File | Change |
| --- | --- |
| `client/package.json` | Keeps the exact dependency `@getalby/sdk: "9.0.0"` |
| `client/package-lock.json` | Keeps the recorded SDK and transitive dependency lock entries |
| `client/src/features/wallet/nwc.ts` | Two-relay exact allowlist, relay validation, URI parsing, response sanitisation, safe errors, console suppression, and session lifecycle controller; missing/null method lists sanitise to an empty list |
| `client/src/features/wallet/activity.ts` | New lesson metadata for the practical activity entry point |
| `client/src/features/wallet/methods.ts` | Display-only descriptions for the nine named NWC methods; unknown names return no description |
| `client/src/features/wallet/WalletActivityCallout.tsx` | New lesson callout explaining why, what, and after, with a link to `/wallet` |
| `client/src/features/wallet/WalletMethods.tsx` | New presentational section separating the method used by the Academy from methods reported by the wallet, with the capability disclosure |
| `client/src/pages/Wallet.tsx` | Provider-neutral relay instructions, approved-relay section, both relays, method-awareness section, and a link back to the lesson |
| `client/src/pages/Lesson.tsx` | Renders the practical activity on `ln-channels` only |
| `client/src/components/Layout.tsx` | Wallet removed from ordinary authenticated top-level navigation; the file now matches baseline, so there is no net diff |
| `client/src/App.tsx` | Keeps the protected `/wallet` route |
| `server/src/app.ts` | Production `connect-src` now includes both exact relay origins |
| `server/test/wallet.test.ts` | Focused NWC tests updated to 15 tests, including Alby, sanitisation, security, and learning-flow checks |
| `server/test/wallet-methods.test.ts` | New focused tests for method descriptions and the used-versus-reported distinction (3 tests) |
| `server/test/static.test.ts` | Built-bundle checks updated for both relays, the lesson activity copy, and the method-awareness copy |
| `reports/S5-NWC-WEBSITE-IMPLEMENTATION-REPORT.md` | This report |

The root `package-lock.json`, `reports/S5-NWC-LOCAL-VALIDATION-REPORT.md`, and `tools/`
were already present as untracked files before this implementation. They were not modified
by this task and are not included in the S5 commit.

No PRD file, server API route, database model, deployment setting, playground file, or AI
Tutor file was modified.

## 4. Dependency and architecture

The client continues to declare and install exactly:

```text
@getalby/sdk@9.0.0
```

The page uses the documented import:

```ts
import { NWCClient } from '@getalby/sdk/nwc'
```

The client is constructed only after local URI validation:

```ts
new NWCClient({
  walletPubkey: connection.walletPubkey,
  relayUrls: [connection.relay],
  secret: connection.secret,
  requireSecret: true,
})
```

The NWC URI parser returns one of the two approved relays. The wallet page does not choose
a provider independently and does not contain provider-specific connection logic. The relay
comes from the learner's URI, so the same connection path works for either approved relay.

The only NWC request invoked is `getInfo()`. The only other SDK method used is the required
lifecycle method `close()`. No SDK URI parser is used on the raw pasted URI; the local parser
performs the required allowlisting and shaping.

The method-awareness section is display-only. It reads the sanitised `methods` array from the
`get_info` response, maps recognised method names to fixed explanatory copy, and renders
unknown names unchanged. It does not call, probe, or subscribe to any method named in that
array. Missing or null method arrays are sanitised to an empty list rather than treated as a
connection failure.

There is no server-side NWC route, database field, model, API payload, analytics event, or
error-reporting integration for the connection URI or secret.

## 5. Security controls

### 5.1 Local URI validation

The local parser accepts only:

```text
nostr+walletconnect://<64-hex wallet public key>?relay=<approved relay>&secret=<64-hex secret>
```

It also permits one optional `lud16` parameter, which is not used for the connection or
displayed. It rejects:

- Non-NWC schemes and malformed prefixes.
- Missing wallet public key, relay, or secret.
- Invalid public-key or secret lengths and non-hex characters.
- Missing query separator.
- Duplicate relay, secret, or `lud16` parameters.
- Unexpected query parameters.
- Fragments.
- Internal whitespace, empty values, and overlong URIs.
- Relay URLs with a non-`wss` scheme, unapproved host, custom port, unapproved path, query,
  fragment, or embedded credentials.

### 5.2 Exact relay allowlist

Only the following relay URLs are accepted:

```text
wss://relay.coinos.io
wss://relay.getalby.com/v1
```

The trailing-slash form `wss://relay.coinos.io/` is normalised to the approved Coinos origin.
The Alby relay must use the exact `/v1` path. `wss://relay.getalby.com`,
`wss://relay.getalby.com/`, `wss://relay.getalby.com/v1/`, `wss://relay.getalby.com/v2`,
and `wss://relay.getalby.com/v1/extra` are rejected.

Wildcard schemes, arbitrary relay hosts, unapproved ports, credentials, query strings,
fragments, and unapproved paths are rejected. No wildcard relay support or unrestricted
`wss://` acceptance was introduced.

### 5.3 Memory-only credentials

- The URI is held in React state only while it is being entered.
- The URI input is cleared immediately on submission.
- The parsed secret is cleared from the local parser object immediately after the SDK client
  is constructed.
- The SDK client is held in memory by the page session controller.
- No `localStorage`, `sessionStorage`, IndexedDB, cookie, URL parameter, analytics, or
  error-reporting payload is used for credentials.
- No automatic credential reconnection after disconnect or reload, and no reload persistence,
  exists.

### 5.4 No credential logging

The SDK's `getInfo()` failure path calls `console.error`. The implementation wraps the
request in a narrow console-suppression helper that temporarily replaces console methods
for the duration of the request and restores them in `finally`. The wallet source contains
no direct `console.log`, `console.info`, `console.warn`, `console.error`, or `console.debug`
output.

### 5.5 Safe error display

Errors are mapped to fixed, safe messages. Raw SDK error messages are not rendered. If an
error carries a recognised NIP-47 code, only the allow-listed code is shown. Unknown errors
and timeouts receive generic messages and are explicitly described as not exposing
sensitive details.

### 5.6 Response sanitisation

The page renders only allow-listed fields from the `get_info` response:

- alias
- network
- wallet public key
- color
- block height
- block hash
- reported methods
- reported extensions

Unknown fields, including any unexpected `secret`, relay, or metadata fields, are discarded.
Strings are trimmed and truncated, arrays are bounded, and duplicate entries are removed.

The page separates two categories:

- **Method used by the Academy:** `get_info` is identified as the only method the page uses.
  Its description explains that it requests basic wallet information such as the reported
  alias and network.
- **Methods reported by the connected wallet:** only methods present in the sanitised
  `get_info` response are displayed. Recognised names receive a short description from a
  fixed display map. Unknown names are displayed unchanged with no invented description.

Reported methods are displayed as **reported capabilities, not verified functionality**.
The page states that the Academy has not called or tested them, that displaying a method does
not mean the Academy supports that operation, and that the page performs no payment, invoice
creation, balance request, or transaction-history request. The list is not described as a
permission grant. Empty or missing method lists render a clear "did not report any methods"
message.

### 5.7 Production CSP

Before the S5 change, production CSP used:

```text
connect-src 'self'
```

The production CSP now uses exactly:

```text
connect-src 'self' wss://relay.coinos.io wss://relay.getalby.com
```

The Alby CSP source is the origin only. It does not include `/v1`; the NWC URI parser
continues to enforce the exact Alby `/v1` path. No wildcard `wss:` source, wildcard host, or
unrestricted relay source was added.

A production-mode app instance was started with non-secret dummy environment values and a
local HTTP request was made. The returned header was:

```text
default-src 'self';base-uri 'self';font-src 'self';form-action 'self';frame-ancestors 'none';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self';upgrade-insecure-requests;connect-src 'self' wss://relay.coinos.io wss://relay.getalby.com
```

This verifies the application-level CSP configuration. It is not a deployment test.

### 5.8 Connection and stale-response lifecycle

- The connection controller owns one SDK client reference and a monotonically increasing
  attempt token.
- Starting a new connection closes any prior client and invalidates older attempts.
- Disconnecting increments the attempt token, closes the client, and clears the client
  reference.
- The page also uses a separate request token to prevent older React updates from restoring
  stale status, wallet information, or errors.
- Disconnect clears the URI input, wallet information, busy state, and displayed error details,
  and resets the connection status to an explicit disconnected message.
- The React effect cleanup disconnects on route unmount.
- A `pagehide` listener closes the connection when the page is hidden.
- A `pageshow` listener resets state when the page is restored from the back-forward cache.
- No automatic credential reconnection occurs after disconnect or reload.

### 5.9 Honest security limitations

- Disconnecting from the academy does not necessarily revoke the connection inside the
  wallet provider. The page tells the learner to revoke it in their wallet.
- The page does not claim that disconnecting physically zeroizes memory. JavaScript strings
  cannot be guaranteed to be erased, and the SDK's `close()` closes relay connections but
  does not wipe its stored secret.
- A wallet's `mainnet` network value does not prove that it contains funds.
- A successful `get_info` response does not prove payment functionality or settlement.

## 6. Page behavior and learning flow

### 6.1 Wallet page

The protected `/wallet` page provides:

- A plain-language explanation of NWC and the optional nature of the connection.
- A statement that the Academy currently accepts only NWC URIs using the Coinos relay or
  the Alby relay, and that the wallet's generated URI determines which relay is used.
- An explicit “Approved relays” section listing:
  - Coinos relay: `wss://relay.coinos.io`
  - Alby relay: `wss://relay.getalby.com/v1`, with the `/v1` path required
- A statement that support is limited to those relays and is not a claim that every
  NWC-compatible wallet is supported.
- A warning never to paste a seed phrase or private key.
- A password-style input for the NWC connection URI.
- A Connect button that validates locally and requests only `get_info`.
- A live connection-status panel.
- A disconnect-and-clear button.
- A wallet-reported information section shown only after a successful response.
- A **Method used by the Academy** panel identifying `get_info` and explaining that it requests
  basic wallet information such as the reported alias and network.
- A **Methods reported by the connected wallet** list that renders only methods present in the
  sanitised response. Recognised methods receive a plain-language description; unknown names
  are shown as-is without a description.
- A prominent disclosure that reported methods are capabilities, have not been called or
  tested by the Academy, and do not imply Academy support. The page does not present them as
  permissions.
- Reported extensions, with the capability caveat.
- Instructions for obtaining a fresh NWC URI from a compatible wallet.
- A reminder to revoke the connection in the wallet when finished.
- A clear link back to the lesson that introduced the activity.
- Navigation back to the dashboard and courses.

The page explicitly states that the academy does not store or control the learner's funds.

### 6.2 Lesson entry point

The practical activity is attached to `ln-channels` in `06-lightning-network`
(“Channels, liquidity and invoices”). That lesson already discusses lightning channels,
invoices, and wallet authorization, so the connection is relevant to its content.

The activity section:

- Explains why a learner might try a real wallet connection after studying the topic.
- Describes the activity as a read-only NWC demonstration.
- States that the Academy requests only `get_info`.
- States that no payment, invoice, balance query, or transaction occurs.
- Explains that the activity is optional and does not unlock lessons, quizzes, XP,
  achievements, the Playground, or the AI Tutor.
- Lists both approved relay URLs.
- Explains that the wallet's generated URI determines the relay and that support is limited
  to the two relays.
- Warns the learner never to paste a seed phrase or private key.
- Links to `/wallet`.

No new lesson, dashboard card, onboarding tour, or modal was created.

### 6.3 Navigation change

The previous S5 working tree added Wallet as an ordinary authenticated top-level navigation
link. This refinement removes that link so the primary discovery point is the relevant
lesson. The protected `/wallet` route remains available for direct access, and the wallet
page links back to `ln-channels`. Existing authentication and routing conventions are
preserved.

### 6.4 Method awareness

The wallet page now makes the NWC method situation explicit without adding any wallet
operation:

- It always identifies `get_info` as the only method used by the Academy.
- It displays the wallet's sanitised `methods` array under a separate heading.
- It never adds a method that the wallet did not report.
- Known method names receive concise descriptions:

  | Method | Displayed description |
  | --- | --- |
  | `get_balance` | Requests wallet balance information. |
  | `lookup_invoice` | Looks up information about an invoice. |
  | `list_transactions` | Retrieves transaction history. |
  | `make_invoice` | Creates a payment invoice. |
  | `pay_invoice` | Requests payment of an invoice. |
  | `pay_keysend` | Requests a keysend payment. |
  | `pay` | Payment-related wallet operation. |
  | `receive` | Wallet receive-related operation. |
  | `get_info` | Retrieves wallet information. |

- Unknown method names are rendered unchanged with no invented description.
- Empty or missing method lists render "The wallet did not report any methods."
- The page states that the extra methods are reported capabilities and that the Academy has
  not called or tested them. It does not present them as permissions.
- No reported method is invoked. Only the existing `get_info` request and `close()` lifecycle
  call occur.

## 7. Verification performed

### 7.1 Typechecks

Command:

```text
npm run typecheck
```

Result: server and client TypeScript checks passed.

### 7.2 Focused NWC tests

Command:

```text
cd server
NODE_ENV=test node --import tsx --test test/wallet.test.ts test/wallet-methods.test.ts
```

Result:

```text
tests 18
pass  18
fail  0
```

The focused tests cover:

- The allowlist contains exactly the two supported relay URLs.
- Valid Coinos URI parsing and approved-relay normalisation.
- Valid Alby URI parsing with the exact `/v1` path.
- Rejection of an unapproved relay host.
- Rejection of `wss://relay.getalby.com` without `/v1`.
- Rejection of unexpected Alby paths, including `/v1/`, `/v2`, and `/v1/extra`.
- Rejection of insecure or malformed relay URLs.
- Rejection of duplicate or unexpected URI parameters.
- Malformed, incomplete, duplicate, and unexpected URI parts.
- Invalid public keys and secrets.
- Mocked `get_info` success and response sanitisation.
- Safe error descriptions that do not expose raw messages.
- SDK console suppression and restoration.
- Mocked Coinos and Alby connection success, sanitisation, and clean disconnect.
- Client closure on a failed `get_info` request.
- Delayed-response rejection after disconnect.
- Static checks for persistent storage, direct console output, backend transmission, and
  forbidden NWC method references.
- Exact production CSP sources.
- The activity lesson exists in the Lightning course with the expected title.
- Protected route, lesson activity entry point, and removal from ordinary top-level
  navigation.
- Method-description mapping for all nine named methods.
- Unknown method names, including inherited-object names such as `constructor` and
  `__proto__`, remain undescribed.
- The rendered page distinguishes the method used by the Academy from methods merely reported
  by the wallet.
- Only methods passed in the reported array are rendered.
- Reported method names are escaped safely when rendered.
- Empty and missing method lists render gracefully and sanitise to an empty list.

All test credentials were fake. The automated tests did not connect to a real wallet or relay.

### 7.3 Full server test suite

Command:

```text
cd server
NODE_ENV=test node --import tsx --test test/*.test.ts
```

Result:

```text
tests   109
suites  5
pass    109
fail    0
cancelled 0
skipped 0
todo    0
```

The run log also contains:

```text
﹣ database-backed S1 flows # Database tests need RUN_DB_TESTS=1 and MONGODB_URI pointing at the Atlas cluster.
```

Therefore the database-backed S1 integration flow did not execute in this environment.
The runner's counted tests all passed; the DB-backed integration flow remains unexecuted.
No failure was observed.

### 7.4 Production builds

Command:

```text
npm run build
```

Result: server TypeScript build and client Vite production build both passed.

Client build output:

```text
dist/index.html                   0.61 kB │ gzip:   0.36 kB
dist/assets/index-0PhuKG0f.css   23.44 kB │ gzip:   5.04 kB
dist/assets/index-CLF72GGD.js   541.43 kB │ gzip: 160.53 kB
```

Vite emitted a non-fatal warning that the JavaScript chunk is larger than 500 kB. The build
completed successfully. The SDK is statically imported by the wallet page, so it is
included in the main client bundle rather than lazily split.

### 7.5 Static inspection and secret scans

Results:

- No `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `location.search`,
  `location.hash`, `history.pushState`, `XMLHttpRequest`, `navigator.sendBeacon`, or
  `fetch(` markers in the wallet source.
- No forbidden NWC SDK method invocations or executable references in the wallet source.
  The method names in `methods.ts` are display strings only and are not calls.
- No direct console output calls in the wallet source.
- Exactly one `.getInfo()` invocation in the wallet source.
- The method-description map contains only the nine approved display descriptions; unknown
  names are not mapped.
- Both approved relay URLs are present in the built client bundle.
- The built bundle contains the activity copy, the used-versus-reported method headings, and
  the method descriptions.
- No `nsec1...` value was found in client or server source/tests.
- `git diff --check` reported no whitespace errors.
- `PRD.md` SHA-256 remained unchanged.

### 7.6 Production CSP header check

A temporary production-mode app instance was started locally with non-secret dummy
environment values. An HTTP request to `/api/health` returned status `200` and the exact CSP
shown in section 5.7. This is a local application check, not a deployed-host check.

### 7.7 Owner-performed live tests

After implementation, the owner manually tested the revised wallet flow with two wallet/relay
combinations:

| Test | Wallet/relay combination | Result |
| --- | --- | --- |
| Coinos URI | URI using `wss://relay.coinos.io` | Successful `get_info` |
| ZEUS-generated URI | URI using `wss://relay.getalby.com/v1` | Successful `get_info` |

The owner confirmed that the revised wallet flow works in these tests. These are two tested
wallet/relay combinations and do not establish universal wallet compatibility. No payment,
invoice, balance, or settlement operation was tested. The implementation agent did not perform
these live tests, and the automated tests in sections 7.2-7.3 remain mocked rather than live.

## 8. Requirement mapping

| Requirement | Status |
| --- | --- |
| Protected `/wallet` page | Implemented |
| Optional wallet; learning features remain accessible without it | Implemented |
| NWC explanation and safety instructions | Implemented |
| Password-style optional NWC URI input | Implemented |
| Connect, status, wallet information, disconnect | Implemented |
| Instructions for obtaining a URI | Implemented |
| Both approved relays documented on the page | Implemented |
| No claim that every NWC-compatible wallet is supported | Implemented |
| No claim that the academy stores or controls funds | Implemented |
| Documented `@getalby/sdk/nwc` import | Preserved |
| Exact `@getalby/sdk@9.0.0` | Preserved |
| Exact Coinos relay `wss://relay.coinos.io` | Implemented and tested |
| Exact Alby relay `wss://relay.getalby.com/v1` | Implemented and tested |
| Owner live `get_info` with Coinos URI | Confirmed successful |
| Owner live `get_info` with ZEUS-generated Alby URI | Confirmed successful |
| Universal wallet compatibility | Not claimed; only two combinations tested |
| Reject `wss://relay.getalby.com` without `/v1` | Implemented and tested |
| Reject unexpected Alby paths | Implemented and tested |
| Reject malformed, duplicate, unexpected, invalid, and unapproved URI parts | Implemented and tested |
| URI and secret client-side and memory-only | Implemented and statically checked |
| No persistent credential storage | Implemented and tested |
| No credential logging | Implemented and tested |
| No backend credential transmission | Implemented and statically checked |
| Only `get_info` NWC request | Implemented and statically checked; no additional SDK method invoked |
| Sanitised allow-listed wallet fields | Implemented and tested |
| `get_info` identified as the only method used by the Academy | Implemented and tested |
| Only wallet-reported methods displayed | Implemented and tested |
| Known method descriptions; unknown names preserved without invented descriptions | Implemented and tested |
| Reported methods presented as capabilities, not as permissions or Academy support | Implemented and tested |
| Empty or missing method lists handled gracefully | Implemented and tested |
| Methods shown as reported, not verified | Implemented and tested |
| No payment, invoice, balance, or transaction-history operation added | Confirmed absent |
| Disconnect closes client and clears state | Implemented and tested |
| Stale responses prevented from restoring state | Implemented and tested |
| Navigation, page-hide, and bfcache cleanup | Implemented |
| Wallet revocation guidance | Implemented |
| No physical memory-zeroization claim | Implemented |
| Exact production CSP addition with both origins | Implemented and header-checked |
| Contextual practical activity in the relevant lesson | Implemented |
| Wallet primary discovery moved to the lesson | Implemented |
| Wallet page links back to the lesson | Implemented |
| Direct `/wallet` access preserved | Implemented and protected |
| No payment, invoice, balance, transaction, receipt, or settlement features | Confirmed absent |
| No playground or AI Tutor changes | Confirmed |
| No PRD changes | Confirmed |
| Report copied to Android reports directory and `cmp`-verified | Performed after final report correction; see section 10 |
| Owner-authorized S5 commit | Included in one commit; no push |

## 9. Limitations and remaining verification

The following items remain outside the evidence produced here:

1. **Live-test scope:** The owner performed two successful live `get_info` tests: a Coinos URI
   on `wss://relay.coinos.io` and a ZEUS-generated URI on `wss://relay.getalby.com/v1`. These
   are two tested wallet/relay combinations and do not prove universal wallet compatibility.
   The implementation agent did not perform these live tests.
2. **Only `get_info`:** No payment, invoice, balance, transaction, or settlement operation
   was implemented or tested. The methods returned by the wallet are reported capabilities,
   not verified functionality.
3. **Method descriptions are UI copy:** The nine descriptions are fixed explanatory text,
   not a protocol capability check. Displaying a reported method does not prove that the
   wallet implements it, and the Academy did not call it.
4. **AC-016:** A successful `get_info` response does not prove payment or settlement.
   AC-016 is not fully proven by this work.
5. **Mocked automated tests:** The focused tests use fake credentials and a mocked client.
   They are not live tests and do not prove real relay availability, wallet compatibility, or
   live response behaviour.
6. **No browser automation:** The page logic and source were verified through DOM-free
   controller tests, static checks, React static-markup rendering of the method section, and
   the production bundle. No browser automation was run.
7. **Database-backed S1 flow:** The full-suite log shows the DB-backed S1 test did not
   execute because `RUN_DB_TESTS=1` and `MONGODB_URI` were not set.
8. **Bundle size:** Vite reported a 541.43 kB JavaScript chunk (160.53 kB gzip). The SDK is
   in the main bundle. This is a performance consideration, not a functional failure.
9. **CSP check scope:** The CSP header was verified on a local production-mode app instance,
   not on a deployed host.
10. **No deployment:** No deployment or external provisioning was performed.

## 10. Report copy verification

This report is copied to the established Android reports directory:

```text
/storage/emulated/0/Download/KAOS-Bitcoin-Academy/reports/S5-NWC-WEBSITE-IMPLEMENTATION-REPORT.md
```

After copying, byte-for-byte equality was verified with `cmp`. The verification returned `0`
(identical), and both copies had the same SHA-256 at verification time. The exact SHA-256 is
reported in the task completion summary.

## 11. Commit status

The S5 implementation and this report are included in one owner-authorized commit. Nothing
was pushed. No earlier commit was amended, and no unrelated untracked file was included in
the commit. No stash, reset, clean, or discard operation was performed. S6 was not started.
