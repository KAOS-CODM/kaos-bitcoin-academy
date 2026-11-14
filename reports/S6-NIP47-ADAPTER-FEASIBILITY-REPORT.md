# KAOS Bitcoin Academy — S6 NIP-47 Response Adapter Feasibility Report

- Project: KAOS Bitcoin Academy
- Phase: S6 — Guided Lightning Send and Receive
- Date: 2026-11-10
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Investigation type: Read-only SDK public-API feasibility audit for a strict NIP-47 response adapter
- Result: **FEASIBLE — every capability required for strict `result_type` validation is reachable through public class members of the exported `NWCClient`; no private field, reflection, monkey-patching, or `node_modules` modification is required. One offline, no-network spike is still required before C2 implementation.**
- Authoritative specification: `PRD.md`
- PRD SHA-256 before investigation: `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`
- PRD SHA-256 after investigation: `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`
- S6 plan SHA-256 before investigation: `30c598c875389fcde165fac1edfa54dd0762fda93e235c7fa123112c2ebe6389`
- S6 plan SHA-256 after investigation: `30c598c875389fcde165fac1edfa54dd0762fda93e235c7fa123112c2ebe6389`
- Git HEAD before investigation: `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Git HEAD after investigation: `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Plan status: the S6 implementation plan is **frozen**; this report does not modify it

> **Status statement:** The plan prerequisite recorded in §6.6 of the frozen S6 plan — that the
> NIP-47 envelope approach be demonstrated to use supported public SDK APIs — is
> **satisfiable**. This report establishes feasibility from read-only inspection only. It does
> **not** implement, prototype, or run the adapter, and it authorises no wallet, relay,
> invoice, lookup, or payment operation. S6 implementation must still not begin until the
> owner accepts the offline spike described in section 9 and the C2 work is performed against
> that validated composition.

---

## 1. Executive summary

### 1.1 Question answered

Can a safe NIP-47 request/response adapter be implemented on `@getalby/sdk@9.0.0` using
**public** APIs, such that the raw decrypted response envelope — including `result_type` — is
available for strict validation **before** any SDK transformation or validation occurs?

### 1.2 Answer

**FEASIBLE.**

The SDK's public payment methods (`payInvoice`, `makeInvoice`, `lookupInvoice`) resolve only
`response.result` and never expose `result_type`. However, the *same* public members that
those methods use internally — `pool.subscribe`, `pool.publish`, `client.encrypt`,
`client.decrypt`, `client.signEvent` — are themselves public on the exported `NWCClient`
class. An adapter can therefore perform the request/response lifecycle itself and stop at the
parsed envelope, where `result_type` is present and unfiltered.

No SDK method strips or transforms `result_type` before it reaches application code. It is
simply never read.

### 1.3 The one real trap

`client.encrypt()` and `client.decrypt()` branch on `this.encryptionType`, whose getter
**throws** `"Missing encryption or version"` when unset. The backing field is written only by
the **private** `_selectEncryptionType()`. The public route to it is any request method — and
the **existing S5 session already calls `client.getInfo()` on every successful connect**, so
the negotiation is already established in the current connection lifecycle. The adapter never
invokes the private method.

### 1.4 What remains before C2

One **offline, no-network spike** against a local in-memory fake relay, validating the
adapter's own composition: `result_type` mismatch and absence, malformed JSON, error/result
conflict, reply timeout with subscription close, and success-path cleanup. See section 9.

---

## 2. Scope, method, and boundaries

### 2.1 Files and declarations inspected

Installed package (paths relative to `client/node_modules/`):

| Path | What was read |
| --- | --- |
| `@getalby/sdk/package.json` | `exports` map: `.`, `./lnclient`, `./nwc`, `./oauth`, `./webln`, `./utils`; version `9.0.0` |
| `@getalby/sdk/dist/types/nwc.d.ts` | `NWCClient` class declaration (`:259`), `ReconnectingPool` (`:222`), `SubCloser` (`:213`), `SubscribeManyParams` (`:216`), `nostr-tools` type import (`:1`), export lists (`:443–444`) |
| `@getalby/sdk/dist/types/index.d.ts` | Root export list (`:956–957`); `nostr-tools` type import (`:2`) |
| `@getalby/sdk/dist/esm/nwc.js` | `encrypt`/`decrypt` (`:7361–7386`, `decrypt` at `:7375`), `encryptionType` getter (`:7340–7344`), `signEvent` (`:7349`), `close` (`:7358`), constructor (`:7292–7316`), `_selectEncryptionType` (`:7829–7841`), `_findPreferredEncryptionType` (`:7842–7850`), `executeNip47Request` (`:7725–7812`), `ReconnectingPool.subscribe`/`publish`/`close`/`destroy`, `NWCWalletService` response `result_type` write (`:8178`) |
| `@getalby/lightning-tools/package.json` | Version `9.0.2`; `./bolt11` subpath export present |
| `nostr-tools/package.json` | Version `2.26.0` (transitive; **not** a direct client dependency) |
| `nostr-tools/lib/types/core.d.ts` | `NostrEvent` (`:9`), `Event` (`:19`), `EventTemplate` (`:20`) |
| `nostr-tools/lib/types/filter.d.ts` | `Filter` (`:2`) |

Repository:

| Path | What was read |
| --- | --- |
| `client/package.json` | Direct client dependencies |
| `client/src/features/wallet/nwc.ts` | `WalletClientSession`, `NwcClientLike` (`:67–68`), `requestGetInfo` (`:285`), `parseNwcUri`, `APPROVED_RELAYS` |
| `client/src/pages/Wallet.tsx` | `createSession` — `new NWCClient({ walletPubkey, relayUrls: [connection.relay], secret, requireSecret: true })` |

Upstream documentation (read-only fetch):

- `https://raw.githubusercontent.com/getAlby/js-sdk/master/docs/nwc.md` — documented `NWCClient` surface
- `https://raw.githubusercontent.com/getAlby/js-sdk/master/examples/nwc/client/*.ts` — 18 upstream client examples
- `https://getalby.github.io/js-sdk/classes/nwc.NWCClient.html` — **HTTP 404, no generated class reference available**
- `https://raw.githubusercontent.com/nostr-protocol/nips/master/47.md` — NIP-47 protocol requirements

### 2.2 Read-only checks performed

- Declaration and source inspection of the installed SDK, `nostr-tools`, and the S5 wallet module.
- Enumeration of every public member of `NWCClient` and `ReconnectingPool`.
- Tracing of `_encryptionType` write sites and the `encryptionType` getter throw path.
- Tracing of `executeNip47Request` to determine exactly where the response envelope is parsed
  and where `result_type` is (not) read.
- Comparison of the shipped TypeScript declarations against the upstream documented and
  exemplified public surface.
- Confirmation that the S5 connect path already invokes the public `getInfo()` method.
- Confirmation that `Filter` and `EventTemplate` are structurally assignable without importing
  `nostr-tools`.

### 2.3 Boundaries observed

- **No file edits, no dependency changes, no manifest or lockfile changes, no source-code
  implementation.**
- **No Git operations.** HEAD, branch, index, and working tree untouched.
- **No wallet or relay connection.** No request was signed, encrypted, published, subscribed
  to, or decrypted; no envelope was produced or parsed.
- **No invoice creation, no lookup, no payment.**
- **No secrets or NWC credentials** appear in this report. No connection URI, secret, wallet
  pubkey, invoice, payment hash, or preimage is reproduced.
- **S1–S5 work was not reopened.** The S5 implementation was read only to establish the
  connection-lifecycle facts in section 6.

---

## 3. Verified public API surface

### 3.1 Entry points

`NWCClient` is exported from the documented `./nwc` entry point
(`@getalby/sdk/package.json` → `"./nwc"` → `dist/esm/nwc.js` / `dist/types/nwc.d.ts`), and is
re-exported from the package root (`dist/types/index.d.ts:956`).

### 3.2 `NWCClient` public members relevant to the adapter

All entries below are declared **without** a `private` modifier on the exported class
(`dist/types/nwc.d.ts`).

| Member | Declaration | Capability |
| --- | --- | --- |
| `pool` | `:260` — `pool: ReconnectingPool;` | Relay transport (publish/subscribe/close) |
| `relayUrls` | `:261` — `relayUrls: string[];` | The approved relay set for this connection |
| `walletPubkey` | `:264` — `walletPubkey: string;` | Wallet service public key (decrypt recipient / request `p` tag) |
| `get encryptionType()` | `:274` — `get encryptionType(): string;` | Negotiated crypto (`nip44_v2` / `nip04`) |
| `signEvent(event)` | `:276` — `signEvent(event: EventTemplate): Promise<Event>;` | Signs the kind-23194 request with the connection secret |
| `close()` | `:278` — `close(): void;` | Tears down the relay pool (S5 already uses it) |
| `encrypt(pubkey, content)` | `:279` — `encrypt(pubkey: string, content: string): Promise<any>;` | NIP-44/NIP-04 encryption of the request payload |
| `decrypt(pubkey, content)` | `:280` — `decrypt(pubkey: string, content: string): Promise<string>;` | **Raw plaintext** of the response envelope |
| `getInfo()` | `:295` — `getInfo(): Promise<Nip47GetInfoResponse>;` | Public handshake; also establishes encryption negotiation |
| `getWalletServiceInfo()` | `:290` | Reads the wallet-service info event (encryption capabilities) |
| `payInvoice` / `makeInvoice` / `lookupInvoice` | `:298` / `:302` / `:306` | Supported high-level calls — **discard `result_type`** (section 5) |

Private members, listed so they are explicitly **not** relied upon: `executeNip47Request`,
`_checkConnected`, `_selectEncryptionType`, `_findPreferredEncryptionType`
(`:309–312`), and `_encryptionType` (`:267`).

### 3.3 `ReconnectingPool` public members

| Member | Declaration | Capability |
| --- | --- | --- |
| `subscribe(relays, filter, params)` | `:236` → `SubCloser` | Opens the kind-23195 subscription; returns `{ close(reason?) }` |
| `publish(relays, event, params)` | `:237` → `Promise<string>[]` | Publishes the signed request; **rejects** per relay so `Promise.any` can detect "no relay accepted" |
| `close(relays)` | `:235` | Closes the relay connections and sets the closed flag |
| `destroy()` | `:241` | Full pool teardown |
| `ensureRelay(url, params)` | `:230` | Connection establishment with bounded wait |
| `closed` | `:225` | Closed-state observable |
| `publishTimeout` | `:228` — `readonly publishTimeout = 5000` | Public publish-timeout bound |

**Export-status caveat:** `ReconnectingPool` is *declared* at `:222` but is **not exported by
name** — it is absent from the `./nwc` export list (`:443`). It is reachable structurally
through the public `client.pool` property. `SubCloser` (`:213`) is likewise not exported by
name but is the declared return type of `pool.subscribe`.

### 3.4 Type assignability without importing `nostr-tools`

`nostr-tools` is **not** a direct client dependency, so importing it would itself require an
unapproved dependency declaration. The types are nevertheless not needed:

- `Filter` (`nostr-tools/lib/types/filter.d.ts:2`) is fully structural — optional
  `ids`/`kinds`/`authors`/`since`/`until`/`limit`/`search` plus the index signature
  `[key: \`#${string}\`]: string[] | undefined`. The literal
  `{ kinds: [23195], authors: [walletPubkey], "#e": [event.id] }` is assignable directly, and
  the `"#e"` key is admitted by the template-literal index signature.
- `EventTemplate` (`nostr-tools/lib/types/core.d.ts:20`) is
  `Pick<Event, 'kind' | 'tags' | 'content' | 'created_at'>`. The literal
  `{ kind: 23194, created_at, tags, content }` is assignable directly.
- If a named type is ever needed, it can be obtained without an import via
  `Parameters<typeof client.pool.subscribe>[1]` and `Parameters<typeof client.signEvent>[0]`.

**Conclusion:** no new direct dependency is required for the adapter. **[V]**

### 3.5 Vendor documentation coverage

Upstream `docs/nwc.md` documents only: `NWCClient` initialization options, a quick-start
example, `subscribeNotifications(onNotification, notificationTypes?)`,
`static fromAuthorizationUrl()`, and examples. The 18 upstream client examples
(`examples/nwc/client/`) use only the high-level methods — `get-info.ts`, `pay-invoice.ts`,
`make-invoice.ts`, `lookup-invoice.ts`, `hold-invoice.ts`, `sign-message.ts`, `subscribe.ts`,
and others. `result_type` appears **0 times** in the NWC client documentation, and the
generated class reference URL returns **HTTP 404**.

**Conclusion:** `pool` is public by shipped TypeScript declaration but **undocumented by the
vendor**. This is recorded as a caveat in section 8, not as a missing capability.

---

## 4. NIP-47 lifecycle mapping

### 4.1 Encrypting the request

`client.encrypt(walletPubkey, JSON.stringify({ method, params }))` (`nwc.d.ts:279`).
Implementation (`nwc.js:7361`) branches on `this.encryptionType`: `nip04` uses NIP-04
encryption; otherwise it derives a NIP-44 conversation key from the connection secret and the
peer public key. It throws `"Missing secret"` if no secret is present.

### 4.2 Encryption negotiation — the trap

`this.encryptionType` getter (`nwc.js:7340–7344`):

```js
get encryptionType() {
    if (!this._encryptionType) {
        throw new Error("Missing encryption or version");
    }
    return this._encryptionType;
}
```

`_encryptionType` is assigned at exactly one site, `nwc.js:7839`, inside the **private**
`_selectEncryptionType()` (`nwc.js:7829–7841`), which reads the wallet-service info event via
the public `getWalletServiceInfo()` and applies the private `_findPreferredEncryptionType()`
(`nip44_v2` preferred, else `nip04`, else `Nip47UnsupportedEncryptionError`).

`_selectEncryptionType()` is reached only from `executeNip47Request` (`nwc.js:7727`). The
public route to it is therefore **any public request method**, of which `getInfo()` is the
cheapest and is already part of the S5 flow (section 6).

**Consequence:** the adapter must not assume the getter is safe to read at construction time.
It must either rely on the completed S5 handshake or fail closed on the getter throw. It never
calls the private method.

### 4.3 Signing and publishing

`client.signEvent(eventTemplate)` (`nwc.d.ts:276`) resolves `finalizeEvent(event,
hexToBytes(this.secret))` (`nwc.js:7349–7354`), producing a signed `Event` that carries `id`,
`pubkey`, `sig` (`nostr-tools/lib/types/core.d.ts:9–18`).

`client.pool.publish(client.relayUrls, event)` (`nwc.d.ts:237`) returns one promise per relay.
Implementation (`nwc.js`) rejects on connection failure — with the comment *"reject rather than
resolve with an error message, so callers using Promise.any can detect that no relay accepted
the event"* — so `Promise.any` yields "at least one relay accepted" and an all-reject outcome
means the request was not accepted anywhere.

### 4.4 Subscribing and receiving

`client.pool.subscribe(client.relayUrls, filter, params)` (`nwc.d.ts:236`) returns a
`SubCloser`. The implementation normalises and de-duplicates relay URLs, maintains one
subscription per relay, supports reconnect with backoff, and returns
`{ close(reason) { ... activeSubs.forEach((sub) => sub.close(reason)); ... } }` which also
cancels pending reconnect waits.

**Ordering requirement:** the SDK subscribes **before** it publishes
(`nwc.js:7749` subscribes, `:7797` publishes). The adapter must do the same to avoid missing
the response.

### 4.5 Decrypting the response

`client.decrypt(walletPubkey, event.content)` (`nwc.d.ts:280`, implementation `nwc.js:7375`) returns
the **raw plaintext string**. Implementation mirrors `encrypt` and uses the negotiated type.

### 4.6 Correlation

The signed request `event.id` is placed in the subscription filter as `"#e": [event.id]`,
matching the response's `e` tag. `client.getEventHash(event)` (`nwc.d.ts:277`) is also public if an
independent hash check is wanted. The SDK uses the identical mechanism
(`nwc.js:7749–7752`).

### 4.7 Timeout and cleanup

- **Reply timeout:** the SDK uses its own `setTimeout` (default 60 s) that calls `sub.close()`
  and rejects with `Nip47ReplyTimeoutError` (`nwc.js:7783–7788`). The adapter owns the same
  timer and must clear it on every terminal path.
- **Publish timeout:** `pool.publishTimeout` (public, `5000`) bounds relay acceptance
  (`nwc.js:7789–7794`).
- **Cleanup:** `sub.close(reason)` for the subscription, and `client.close()` → `pool.close(relayUrls)`
  for the transport (`nwc.js:7358`). `pool.close` sets the closed flag so reconnect loops stop.
  The S5 session already calls `client.close()` on disconnect and on page hide.

### 4.8 Error handling

The following error classes are exported from the package root (`index.d.ts:956`) and are
available to application code: `Nip47NetworkError`, `Nip47PublishError`,
`Nip47PublishTimeoutError`, `Nip47ReplyTimeoutError`, `Nip47WalletError`,
`Nip47ResponseDecodingError`, `Nip47ResponseValidationError`,
`Nip47UnsupportedEncryptionError`. The adapter maps its own outcomes onto these categories
(sanitised, never rendering raw SDK messages), consistent with the frozen plan's §11
taxonomy.

---

## 5. Raw envelope and `result_type` accessibility

### 5.1 What the SDK does with the envelope

`executeNip47Request` (`nwc.js:7749–7781`) performs, in order:

1. subscribe to kind `23195` authored by the wallet pubkey with filter `#e: [event.id]`;
2. on event: `await this.decrypt(this.walletPubkey, event.content)` → plaintext;
3. `JSON.parse(decryptedContent)` → the envelope object;
4. `if (response.result) { resultValidator(response.result) ? resolve(response.result) : reject(new Nip47ResponseValidationError(...)) } else { reject(new Nip47WalletError(response.error?.message, response.error?.code)) }`.

**`response.result_type` is never read at any point.** The envelope reaches the validator
already parsed; the SDK simply discards `result_type` by omission.

### 5.2 What this establishes

The envelope is **not** transformed, stripped, or normalised by the SDK before an application
could inspect it. Because `pool.subscribe` and `client.decrypt` are public, an adapter can
reach the identical intermediate state and stop there:

```text
envelope = JSON.parse(await client.decrypt(client.walletPubkey, event.content))
// envelope.result_type  -> present, raw, unvalidated
// envelope.error        -> present, raw
// envelope.result       -> present, raw
```

Strict validation is then a direct comparison:

```text
if envelope.result_type !== requestedMethod -> unknown (never success, never failure)
if envelope.error and envelope.result         -> unknown (malformed/conflicting)
if envelope.result missing                    -> unknown
```

**Verdict: the raw envelope, including `result_type`, is accessible before any SDK
transformation or validation. [V]**

### 5.3 Why the high-level methods cannot substitute

`payInvoice` validates only `!!result`; `makeInvoice` validates only `!!result.invoice`;
`lookupInvoice` validates only `!!result.invoice` (`nwc.js:7571`, `:7613`, `:7657`). None of
these can satisfy strict `result_type` validation, and two of them **reject** responses that
NIP-47 declares valid (see section 8.4). The adapter is therefore required, not optional, if
`result_type` validation is mandatory.

---

## 6. S5 lifecycle and relay-allowlist compatibility

### 6.1 The existing connection already establishes negotiation

`WalletClientSession.connect()` (`client/src/features/wallet/nwc.ts`) creates the client and
then calls `requestGetInfo(client)` → `client.getInfo()` (`:285–297`, `:334`). Because
`getInfo()` routes through `executeNip47Request`, the S5 handshake performs the encryption
negotiation as a side effect.

**Consequence:** after any successful S5 connection, `client.encryptionType` is populated and
`client.encrypt()` / `client.decrypt()` are usable. The adapter inherits the existing
lifecycle with no extra round trip. **[V]**

### 6.2 Relay allowlist is preserved exactly

`createSession()` in `client/src/pages/Wallet.tsx` constructs the client with
`relayUrls: [connection.relay]`, where `connection.relay` is the output of the S5
`parseNwcUri` / `validateApprovedRelay` allowlist (exactly `wss://relay.coinos.io` or
`wss://relay.getalby.com/v1`).

An adapter that publishes and subscribes to `client.relayUrls` therefore uses **only** the
allowlisted relay. It introduces **no new origin**, requires **no CSP change**, and does not
bypass `parseNwcUri`. The frozen plan's §12.4 constraint holds unchanged. **[V]**

### 6.3 Stale-response and disconnect protections

S5 already invalidates in-flight work by incrementing a session attempt token on disconnect
and closing the client on page hide, bfcache restore, and unmount
(`client/src/features/wallet/nwc.ts`). The adapter composes with this: a response arriving
after `client.close()` is discarded by the same attempt-token guard the session already
applies, and `pool.close()` stops the reconnect loop. **[V]**

### 6.4 Narrow interface to widen in C2

The S5 `NwcClientLike` interface is deliberately narrowed to `getInfo()` and `close()`
(`client/src/features/wallet/nwc.ts:67–68`). C2 must widen it, or introduce a separate
interface, to expose `pool`, `relayUrls`, `walletPubkey`, `encryptionType`, `encrypt`,
`decrypt`, and `signEvent`. This is a contained, code-level change — it is listed here so it
is not discovered late. **[V]**

---

## 7. Feasibility verdict

### 7.1 Verdict

> **FEASIBLE**
>
> Supported public APIs expose everything required for strict response validation.

### 7.2 Smallest safe adapter design

Each step names only public members. No private member is called; no reflection or
monkey-patching is used; `node_modules` is not modified.

```text
1. Assert the S5 handshake has completed and client.encryptionType is readable
   (public getter). If the getter throws, fail closed as "negotiation unavailable".
   Never call the private _selectEncryptionType().

2. payload = JSON.stringify({ method, params })                    // NIP-47 request object
   encrypted = await client.encrypt(client.walletPubkey, payload)  // public

3. event = await client.signEvent({                                // public
     kind: 23194,
     created_at: Math.floor(Date.now() / 1000),
     tags: [
       ["p", client.walletPubkey],
       ["v", client.encryptionType === "nip44_v2" ? "1.0" : "0.0"],  // interop tag, see 8.2
       ["encryption", client.encryptionType],
     ],
     content: encrypted,
   })

4. sub = client.pool.subscribe(client.relayUrls, {                 // public
     kinds: [23195],
     authors: [client.walletPubkey],
     "#e": [event.id],
   }, { onevent: handleResponse })                                  // subscribe BEFORE publish

5. await Promise.any(client.pool.publish(client.relayUrls, event)) // public
   All-reject => not submitted by any relay (distinct from an ambiguous reply timeout).

6. handleResponse(event):                                          // async; catch internally
     plaintext = await client.decrypt(client.walletPubkey, event.content)   // public, raw
     envelope  = JSON.parse(plaintext)                            // may throw -> unknown
     require envelope.result_type === method                      // STRICT
     require consistent error/result                               // both present -> unknown
     apply method-specific shape rules                             // section 3.3 / plan section 10.4
   Any failure here yields "unknown" — never success, never failure.

7. Terminal paths (success, failure, timeout, disconnect):
     clearTimeout(replyTimer)
     sub.close()                                                   // public SubCloser
     client.close() only via the existing S5 session teardown      // public
```

### 7.3 Required evidence to close the plan prerequisite

The plan's §6.6 prerequisite requires the approach to be *demonstrated*. The demonstration is
the offline spike in section 9 — it must not require a relay or a wallet.

---

## 8. Caveats and residual risks

### 8.1 `pool` is public by declaration but undocumented by the vendor

`pool` carries no `private` modifier and is reachable without internals, but upstream
`docs/nwc.md` never mentions it, no upstream example uses it, and the generated class
reference is HTTP 404. It is therefore **public API surface without vendor documentation
support** — a real risk if the vendor changes it in a future release.

**Mitigation:** pin `@getalby/sdk` to the exact installed version `9.0.0` (already the case
in `client/package.json`), confine all `pool` usage to one adapter module, and add a
static test that fails if the required public members disappear from the installed
declarations. **[I]**

### 8.2 The `["v", …]` compatibility tag is an SDK interop detail, not a NIP-47 mandate

The SDK emits `["v", "1.0"]` for `nip44_v2` and `["v", "0.0"]` otherwise, with an in-source
note about a pre-2025-06-01 backwards-compatibility change (`nwc.js:7741`). NIP-47 does not
require it. Replicating it matches existing production behaviour against real wallets; the
alternative risks rejection by older wallet services. **Recommendation:** replicate it and
record it as an interop decision. **[I]**

### 8.3 `onevent` is not awaited

`SubscribeManyParams.onevent` is typed `(evt: Event) => void` and the SDK does not await it.
An async handler that throws would surface as an unhandled rejection. The adapter's handler
must wrap its body in `try/catch` and route every failure to `unknown`. **[V]**

### 8.4 SDK validators conflict with NIP-47 in two places

- `lookupInvoice` requires `result.invoice` (`nwc.js:7657`), but NIP-47 marks `invoice`
  optional in a lookup response. A spec-compliant wallet that omits it makes the **supported**
  method throw `Nip47ResponseValidationError`. The adapter does **not** have this defect,
  because it inspects the envelope directly and applies its own shape rules.
- `makeInvoice` requires `result.invoice` (`nwc.js:7613`), while NIP-47 marks `invoice`
  optional and requires `payment_hash`.
- `Nip47PayResponse` types `fees_paid` as required, while NIP-47 makes it optional and the
  runtime validator does not enforce it. Application code must read `fees_paid` guarded.
- The installed `Nip47Transaction` type omits the protocol's `expired` lookup state. The
  adapter must not use the SDK transaction type as the source of truth for acceptance.

**[V]**

### 8.5 Subscribe/publish ordering race

`pool.subscribe` establishes relay connections asynchronously, so a subscription may not be
active on the relay when the publish resolves. The SDK has the identical ordering and relies
on relay retention of the ephemeral response event. The adapter inherits this behaviour; it
should not attempt to improve on it without evidence. **[V]/[I]**

### 8.6 No runtime verification has been performed

Every finding in this report is **static**. No request was signed, encrypted, published,
subscribed to, or decrypted; no envelope was parsed; no timeout or cleanup path was
exercised. The adapter's own composition therefore remains unproven until the section 9 spike
runs. **[V]**

---

## 9. Smallest recommended next step

**One offline spike, inside C2, with no relay, no wallet, and no network.**

Scope — all of it local and in-memory:

1. Construct a kind-23194 request through `client.encrypt` + `client.signEvent` against a
   stubbed relay transport.
2. Publish and subscribe through the injected fake rather than a real relay.
3. Feed a **synthetic** kind-23195 envelope (a locally constructed JSON string, never a real
   wallet response) through `client.decrypt` and assert:
   - `result_type` matching the requested method → proceeds to shape validation;
   - `result_type` mismatched → `unknown`;
   - `result_type` absent → `unknown`;
   - malformed JSON → `unknown`;
   - `error` and `result` both present → `unknown`;
   - missing required method-specific fields → `unknown`;
   - none of the above ever yields success or failure.
4. Assert the **reply-timeout path**: the timer fires, `sub.close()` is invoked, the timer is
   cleared, and the promise settles exactly once with `unknown`.
5. Assert the **success path**: exactly one resolve, subscription closed, no timer leak.
6. Assert the **allowlist path**: publish and subscribe targets equal `client.relayUrls`
   exactly, with no additional origin.

This is the minimum needed to satisfy the plan's §6.6 prerequisite. It requires **no wallet,
no relay, no invoice, no payment, and no new dependency**.

---

## 10. Unresolved items and owner decisions

| Item | Status | Note |
| --- | --- | --- |
| D01 — client-only architecture vs PRD §11 | **Approved by the owner** | Per the owner's instruction accompanying this investigation |
| D02 — direct decoder dependency | **Approved by the owner** | `@getalby/lightning-tools@9.0.2` is installed and exposes the `./bolt11` subpath; a direct declaration plus lock update is required |
| Strict `result_type` validation | **Mandatory** | Not relaxed by this report |
| Adapter feasibility (plan §6.6 prerequisite) | **Feasible; demonstration outstanding** | Closes only after the section 9 spike is recorded |
| `pool` vendor-documentation gap | Open risk, not a blocker | Mitigation in section 8.1 |
| `["v", …]` interop tag | Open interop decision | Recommendation in section 8.2 |
| D08 — one real outgoing payment | Not authorized | Separate approval; unchanged |
| D11 — live receive-invoice creation | Not authorized | Separate approval; unchanged |
| C6 live lookup | Not performed | Requires applicable authorization and an independently obtained fixture |
| C1/C2 start | Blocked on the section 9 spike | No code until the prerequisite is demonstrated and recorded |

**No owner decision is approved on the owner's behalf in this report.** D08, D11, and the C6
live lookup remain unauthorized.

---

## 11. Non-claims and evidence limits

- This report does **not** claim that any wallet supports `make_invoice`, `lookup_invoice`, or
  `pay_invoice`. The only live wallet evidence in the project remains the owner's S5
  `get_info` tests.
- This report does **not** claim that the adapter works at runtime. It is a static feasibility
  finding (section 8.6).
- This report does **not** claim that `pool` is a stable, vendor-supported API. It is public
  by shipped declaration; the documentation gap is recorded in section 8.1.
- This report does **not** authorise any wallet, relay, invoice, lookup, or payment
  operation, and none was performed.
- This report does **not** modify `PRD.md`, the frozen S6 plan, application source, tests,
  dependencies, manifests, configuration, or any other report.
- This report does **not** reopen or revise any completed S1–S5 work.
- No secrets, NWC credentials, connection URIs, wallet public keys, invoices, payment
  hashes, or preimages are reproduced here.
