# KAOS Bitcoin Academy — S6 NWC "INTERNAL" Error Investigation

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Investigation type: Read-only forensic audit of the Wallet page connection failure
- Result: **ROOT CAUSE CONFIRMED — the message was produced by the application's error normalizer, which collapsed six structurally different SDK failures into one factually wrong sentence. A local failure was presented as a wallet-reported error. Fixed.**

> **Status statement:** This investigation changed nothing. The correction was applied afterwards
> under separate owner approval and is recorded in section 8. No wallet connection, NWC method,
> invoice, lookup, or payment was performed at any point.

---

## 1. Root cause

**The message came from the application's presenter, not from the wallet.**

`client/src/features/wallet/nwc.ts` (before the fix):

```ts
if (SAFE_WALLET_CODES.has(code)) {
  return `The wallet returned ${code}. No sensitive details are displayed.`   // line 272
}
const name = ...error.name...
if (/timeout/i.test(name)) {                                               // line 280 — UNREACHABLE
  return 'No get_info response arrived before the wallet timeout. …'
}
```

`SAFE_WALLET_CODES` contains `'INTERNAL'` (`nwc.ts:35`), and the code check runs **before** the
timeout-name check. Six different SDK failures all carry `code === 'INTERNAL'`:

| SDK error class | SDK source | Real meaning |
| --- | --- | --- |
| `Nip47ReplyTimeoutError` | `nwc.js:7786` | No reply from the wallet before the 10 s deadline |
| `Nip47PublishTimeoutError` | `nwc.js:7792` | The relay did not accept the request within 5 s |
| `Nip47PublishError` | `nwc.js:7808` | Every relay refused/failed to publish the request |
| `Nip47ResponseDecodingError` | `nwc.js:7765` | The reply could not be decrypted or JSON-parsed |
| `Nip47ResponseValidationError` | `nwc.js:7773` | The reply decrypted but failed the SDK's `get_info` validator |
| `Nip47WalletError` | `nwc.js:7779` | The wallet genuinely returned an error envelope |

For **five of the six**, "The wallet returned INTERNAL" is **factually wrong** — no wallet error
was returned at all. The `/timeout/i` branch was dead code, because **no SDK error class sets
`name`**:

```
class Nip47Error extends Error { constructor(message, code) { super(message); this.code = code; } }
class Nip47NetworkError extends Nip47Error { }
…
class Nip47PublishError extends Nip47Error { constructor(message, code, relayErrors = []) { super(message, code); this.relayErrors = relayErrors; } }
```

Every instance reports `name === 'Error'`. The only reliable discriminator is
**`constructor.name`**.

**Why the existing test missed it** (`server/test/wallet.test.ts:216`): the S5 test builds
`Object.assign(new Error(raw), { name: 'Nip47ReplyTimeoutError' })` — **with no `.code`**, and
with a `name` that real SDK errors never have. That unrealistically-shaped error skips the
allow-list and reaches the timeout branch, so the test passed while the real SDK shape was
never covered.

## 2. Error origin

| Candidate | Verdict | Evidence |
| --- | --- | --- |
| NWC request construction (app) | Excluded | The `get_info` request is built entirely inside the SDK (`executeNip47Request`). The app never constructs it. |
| Strict NIP-47 envelope validation | Excluded | `requestEnvelope` (the envelope adapter) is used **only** by `PaymentPanel` and `ReceivePanel` for `pay_invoice` / `make_invoice` / `lookup_invoice`. `connect()` uses `requestGetInfo(client)` → `client.getInfo()` (`nwc.ts:374`), the SDK's public method. The envelope adapter is **not** in the `get_info` path, so it cannot be the cause and must not be weakened. |
| SDK response handling | In scope | `Nip47ResponseDecodingError` / `Nip47ResponseValidationError` are SDK-side, both code `INTERNAL`. |
| Relay communication | Partially excluded | Relay *connect* failure raises `Nip47NetworkError` (code `OTHER`) → the page would show *"The wallet returned OTHER"*. The observed `INTERNAL` therefore means the relay WebSocket **did** connect, and the failure is strictly later. Relay *publish* failure/timeout remained possible. |
| Wallet-side rejection | In scope | `Nip47WalletError` with code `INTERNAL`. |
| Error normalization / UI presentation | **Confirmed defect** | The mis-attribution in section 1. |

**Also excluded by elimination:** `Nip47UnsupportedEncryptionError` (code `UNSUPPORTED_ENCRYPTION`)
→ the wallet's kind-13194 info event **was** retrieved and encryption **was** negotiated. The
plain-`Error` path ("no info event (kind 13194) returned from relay") has no `.code` → it would
show the *generic* "The wallet connection failed…" message. **So the failure occurred after a
successful relay subscription and encryption negotiation.**

## 3. Execution trace

```
client/src/pages/Wallet.tsx
  onConnect (form submit)
   └─ session.connect(raw)                        nwc.ts:362
        ├─ parseNwcUri(raw)                       nwc.ts:365  (URI/relay allowlist)
        ├─ createClient(parsed) → new NWCClient   client/src/pages/Wallet.tsx:39
        ├─ requestGetInfo(client)                 nwc.ts:374 → withSuppressedConsole(() => client.getInfo())
        │    └─ SDK getInfo() → executeNip47Request("get_info", {}, r => !!r.methods, {replyTimeout:10000})
        │         ├─ _checkConnected()             nwc.js:7726 → pool.ensureRelay() → new Relay() → global WebSocket (undici)
        │         │                                                       ↑ relay WS CONNECTED (else code OTHER)
        │         ├─ _selectEncryptionType()      nwc.js:7727 → getWalletServiceInfo() → kind-13194 retrieved ✓
        │         ├─ encrypt + signEvent          nwc.js:7735-7746
        │         ├─ pool.subscribe(kind 23195)   nwc.js:7749
        │         └─ pool.publish(kind 23194)     nwc.js:7797  ← publish error / 5 s timeout ⇒ INTERNAL
        │            ... wait for kind 23195 reply (10 s)        ← reply timeout ⇒ INTERNAL
        │            ... decrypt + JSON.parse                   ← decode error ⇒ INTERNAL
        │            ... resultValidator (!!result.methods)     ← validation error ⇒ INTERNAL
        │            ... wallet error envelope                  ← Nip47WalletError ⇒ INTERNAL
        └─ catch → describeWalletError(error)    nwc.ts:209 → nwc.ts:261
             └─ SAFE_WALLET_CODES.has('INTERNAL') → "The wallet returned INTERNAL..."  ← nwc.ts:272
```

The `result_type` envelope validator is **not** on this path — the SDK's own `!!result.methods`
validator is.

## 4. Evidence

| Evidence | Result |
| --- | --- |
| `describeWalletError` | **byte-identical to the committed S5 version** (`md5 3d701e2b`) — the presenter did not change |
| `SAFE_WALLET_CODES` | **byte-identical to S5** — the allow-list did not change |
| `nwc.ts` diff vs S5 | only `requestGetInfo` internals (now `withSuppressedConsole`) plus the new `requestEnvelope`; the **`get_info` call path is unchanged** |
| Real SDK error classes → `describeWalletError` | all six `INTERNAL`-coded classes → identical wrong message (section 1) |
| SDK error classes setting `name` | **none** — all report `name === 'Error'` |
| Relay connect failure | code `OTHER` → *"The wallet returned OTHER"* — **not observed**, so the relay socket opened |
| Encryption negotiation failure | code `UNSUPPORTED_ENCRYPTION` — **not observed**, so negotiation succeeded |
| Info event missing | plain `Error`, no `.code` → generic message — **not observed** |
| `requestEnvelope` usage | only `PaymentPanel.tsx:118,166` and `ReceivePanel.tsx:69,139` — **never in the connect path** |
| Last successful `get_info` | **2026-11-08**, owner-performed, Coinos relay — `reports/S5-NWC-LOCAL-VALIDATION-REPORT.md:7` |
| Runtime change since then | `nodejs` 26.4.0 → **26.13.1**; `c-ares` 1.34.8 → 1.34.9; `libicu` 78.3 → 79.1 |
| Relay transport | `nostr-tools/lib/esm/relay.js:235` → `opts.websocketImplementation \|\| WebSocket` → Node's built-in WebSocket → **undici** |
| undici in Node 26.4.0 | **8.0.2** |
| undici in Node 26.13.1 | **8.12.4** (8 bumps in between: 8.7.0, 8.9.0, 8.10.0, 8.10.2, 8.11.2, 8.12.2, 8.12.3, 8.12.4) |
| Current runtime | `process.versions.undici = 8.12.4` |

## 5. Previous successful behavior

- Last confirmed success: the owner's **2026-11-08** `get_info` through `wss://relay.coinos.io`
  (`reports/S5-NWC-LOCAL-VALIDATION-REPORT.md:7`), plus a ZEUS/Alby `get_info` success
  (`reports/S5-NWC-WEBSITE-IMPLEMENTATION-REPORT.md:685–686`). Both on **Node 26.4.0 /
  undici 8.0.2**.
- The app's `get_info` path is **unchanged since S5** (section 4).
- The MongoDB/SRV work is a **separate concern**: it changed DNS resolution for `mongodb+srv://`
  only. NWC relay communication is a WebSocket to `wss://relay.*`, whose hostname resolves
  through `getaddrinfo`, not c-ares. The two are not causally linked.

## 6. Potential causes (ranked — hypotheses, not confirmed)

1. **Runtime/undici WebSocket behaviour change (highest).** The relay transport is undici's
   WebSocket and the runtime jump moved undici **8.0.2 → 8.12.4** across eight bumps. A
   handshake, header, extension-negotiation (`permessage-deflate`), framing, or close-handshake
   change could make the relay refuse the request event or the reply never arrive — surfacing
   as `Nip47PublishError`, `Nip47PublishTimeoutError`, or `Nip47ReplyTimeoutError`, all
   `INTERNAL`. Strongest temporal correlation: success on 26.4.0, failure on 26.13.1, with the
   app's NWC code unchanged.
2. **Wallet-side rejection.** The wallet service received the request but answered with an error
   envelope coded `INTERNAL`.
3. **Stale/expired NWC connection.** NWC connections are time-limited and the wallet's session
   may have lapsed. The app already instructs *"Paste a fresh NWC connection URI before
   connecting"* (`Wallet.tsx:182`, `:403`).
4. **Relay-side rejection of the published event.** Less likely: the same relay successfully
   delivered the wallet's kind-13194 info event moments earlier.
5. **Excluded:** c-ares/libicu (DNS/Unicode only — the relay socket connected and the failure
   is post-connect); the Wallet page key fix and the S6 panel code (not on the connect path);
   strict NIP-47 `result_type` validation (not on the connect path); the app's error mapping
   (unchanged since S5).

**The available evidence could not distinguish causes 1–3.** All three end in one of the six
`INTERNAL`-coded classes, and the class was discarded before display.

## 7. Correction applied (under separate owner approval)

**`client/src/features/wallet/nwc.ts`** — added a static, non-sensitive message map keyed by
SDK error class, plus `sdkErrorClassName()` reading `constructor.name`:

```ts
const SDK_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  Nip47NetworkError:            'The approved relay could not be reached. …',
  Nip47PublishError:            'The approved relay did not accept the request. …',
  Nip47PublishTimeoutError:     'The approved relay did not accept the request in time. …',
  Nip47ReplyTimeoutError:       'The wallet did not answer in time. …',
  Nip47ResponseDecodingError:   "The wallet's reply could not be decrypted, so it was not accepted. …",
  Nip47ResponseValidationError: "The wallet's reply was not a valid get_info response, so it was not accepted. …",
  Nip47UnsupportedEncryptionError: 'The wallet does not support a compatible encryption mode. …',
}
```

`describeWalletError` now routes `Nip47WalletError` → *"The wallet returned &lt;code&gt;"*
(**only** a genuine wallet answer); every other SDK class → its own accurate description; unknown
`Nip47*` → a neutral *"The wallet request did not complete"*; non-SDK errors → the existing
safe fallbacks, unchanged.

**Before → after, using the real SDK error classes:**

| SDK class | Before | After |
| --- | --- | --- |
| `Nip47ReplyTimeoutError` | "The wallet returned INTERNAL." | "The wallet did not answer in time. …" |
| `Nip47PublishTimeoutError` | "The wallet returned INTERNAL." | "The approved relay did not accept the request in time. …" |
| `Nip47PublishError` | "The wallet returned INTERNAL." | "The approved relay did not accept the request. …" |
| `Nip47ResponseDecodingError` | "The wallet returned INTERNAL." | "The wallet's reply could not be decrypted, so it was not accepted. …" |
| `Nip47ResponseValidationError` | "The wallet returned INTERNAL." | "The wallet's reply was not a valid get_info response, so it was not accepted. …" |
| `Nip47WalletError` | "The wallet returned INTERNAL." | "The wallet returned INTERNAL." ← **accurate** |
| `Nip47NetworkError` | "The wallet returned OTHER." | "The approved relay could not be reached. …" |
| `Nip47UnsupportedEncryptionError` | "The wallet returned UNSUPPORTED_ENCRYPTION." | "The wallet does not support a compatible encryption mode. …" |

## 8. Regression tests added — `server/test/wallet-error-attribution.test.ts` (9 tests)

| Test | Guards |
| --- | --- |
| every real SDK error class is identified by its constructor name | the discriminator itself; asserts `name === 'Error'` |
| a local failure is never reported as a wallet-returned error | **the exact defect** — 7 local classes must not say "The wallet returned…" |
| each SDK failure class produces its own distinct description | no two classes share a message |
| an INTERNAL-coded timeout is not described as a wallet-returned error | closes the S5 test's unrealistic-shape gap |
| a genuine wallet error still reports the wallet code | `PAYMENT_FAILED` shown, message withheld |
| a wallet error with an unknown code does not echo the wallet message | no leakage |
| no rendered description leaks SDK error content | relay URLs / event ids / payloads never appear |
| non-SDK errors keep the existing safe fallbacks | back-compat; the old S5 assertions stay green |
| an application validation error is still shown verbatim | allowlist message unchanged |

## 9. Verification after the fix

| Check | Result |
| --- | --- |
| client typecheck | PASS |
| server typecheck | PASS |
| full server suite | PASS — 194 tests, 0 fail, 0 skipped |
| production build | PASS |
| dev server served module | all six new messages present |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |

## 10. Logging and privacy review

- No URI, secret, private key, raw encrypted event, full invoice, or wallet response payload is
  ever surfaced. Every message is a static string; the SDK's own error message (which can carry
  relay URLs, event ids, or a stringified response) is never rendered.
- The SDK's `console.error("Failed to request get_info", error)` is suppressed for the duration
  of the call by `withSuppressedConsole` (`nwc.ts:294`), so DevTools cannot leak it either.
- The safe diagnostic categories now available are class-level only: relay unreachable, relay
  publish failed/timed out, wallet reply timeout, reply undecryptable, reply invalid,
  encryption incompatible, wallet-reported (code only).
- Still outstanding as an optional refinement: `nwc-envelope.ts:340` defaults a **missing**
  `error.code` to `'INTERNAL'`, so "the wallet said INTERNAL" and "the wallet sent an uncoded
  error" are not yet distinguishable.

## 11. Repository preservation

| Item | Value |
| --- | --- |
| Branch / HEAD | `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` — unchanged |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |
| Files changed by the investigation | **None** (the section 7 correction was a separate, approved action) |
| Git operations | None |
| Live operations | None — no wallet connection, NWC method, invoice, lookup, or payment |
| Services | Untouched — nothing started, stopped, or restarted |
