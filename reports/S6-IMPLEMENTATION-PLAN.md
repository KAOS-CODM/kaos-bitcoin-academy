# S6 Implementation Plan: Guided Lightning Send and Receive

**Project:** KAOS Bitcoin Academy
**Date:** 2026-11-10
**Repository:** `kaos-bitcoin-academy`
**Baseline HEAD:** `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
**PRD SHA-256:** `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`
**Status:** Planning only. No S6 source, configuration, dependency, database, wallet, or payment change was made for this report.
**Scope:** S6 planning; S7 is excluded.

## 1. Executive summary and recommendation

S6 should complete the **client-side guided Lightning experience** using the existing
Nostr Wallet Connect (NWC) connection, without adding a backend wallet service, a database,
a proxy, a payment provider, or a new route.

The recommendation is to divide S6 into two gates while keeping one code path:

1. **S6 Core — buildable now at zero cost.** Add invoice inspection and validation, an
   explicit send flow, a receive flow (implemented and tested against mocked adapter
   responses), status lookup, a payment state model, safe failure handling, and automated
   tests. No real payment or live invoice is required to build or verify this logic. C1/C2
   additionally require the adapter-feasibility verification in section 6.6 to be satisfied
   and recorded first.
2. **S6 Live Evidence — conditional on owner approval and resources.** Use the existing
   Coinos/Coinos and ZEUS/Alby wallet combinations only for `get_info` and any explicitly
   authorized read-only compatibility check. Live invoice creation and outgoing payment are
   separate approvals. At most one small outgoing payment may be attempted only under a
   separate approval. A real incoming payment needs a second payer or a second wallet with
   inbound liquidity; it is not assumed. **No live invoice is created or solicited by this
   plan.**

**The PRD-critical direction is sending.** FR-010 is "Users can complete a guided Lightning
payment," and the demo journey requires a guided payment followed by verification. Receiving
is part of PRD Module E's learning experience and should be implemented as invoice creation
and status where the wallet supports it, but a real incoming settlement should not be allowed
to block the send flow.

**The realistic conclusion is:**

- Invoice validation, send preparation, send submission, receive-invoice creation, status
  lookup, failure handling, and negative tests are feasible before the deadline at zero cost.
- A real **send** is feasible only with a funded wallet, outbound liquidity, a real external
  invoice, and explicit owner approval.
- A real **receive** with independent confirmation needs a second wallet or an external payer
  and inbound liquidity. It is not an engineering-only task.
- AC-014 and the PRD Definition of Done cannot be claimed from fakes, simulations, testnet
  rehearsals, or a successful `get_info`. If resources are not approved, S6 must stop at the
  core and record a documented deviation. The code must never present a fake result as real.

The submission deadline is 2026-11-20. Ten days remain from this plan's date. The schedule is
therefore deliberately narrow: do the send path first, add receive creation/status second, and
leave UI polish, PWA, accessibility review, and deployment to S7.

## 2. Authority, evidence, and claim labels

### 2.1 Authority

`PRD.md` remains the sole authoritative requirements document. Its SHA-256 was verified before
this report:

```text
1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d
```

`PRD.md` was not edited, reformatted, renamed, or replaced. S1–S5 are treated as closed.
Files from those slices were inspected only where S6 directly depends on them.

### 2.2 Claim labels used in this report

| Label | Meaning |
| --- | --- |
| **[V]** | Verified by inspecting the current repository, installed package source/types, or an authoritative protocol document. This is source evidence, not a live runtime test. |
| **[T]** | Verified by a recorded test or owner-performed live test in the S5 evidence. It does not prove S6 behavior. |
| **[I]** | Inference from the evidence. It requires implementation or runtime confirmation before being treated as a fact. |
| **[C]** | Requires owner confirmation, an owner decision, or a live wallet/network test. |

### 2.3 What was actually performed for this plan

- Read-only inspection of the repository, S5 implementation, S5 reports, PRD, installed SDK
  declarations/source, and protocol documentation.
- No application source change, dependency installation, package install, database operation,
  route creation, deployment, commit, branch, push, or real payment.
- No live wallet connection, invoice creation, invoice payment, live `lookup_invoice`,
  settlement, or relay test was performed for this plan. The only live wallet evidence
  remains the owner's S5 `get_info` tests.
- The low-level NIP-47 adapter approach was **not** implemented or prototyped; it is recorded
  as **UNVERIFIED** in section 6.6.
- No owner decision has been approved on the owner's behalf. See the status summary in
  section 15.5.

## 3. Current baseline and verified constraints

### 3.1 S5 architecture and boundaries

The S5 implementation is a client-only NWC connection on the protected `/wallet` page.

| Concern | Current state | Evidence |
| --- | --- | --- |
| NWC dependency | `@getalby/sdk@9.0.0`, imported as `@getalby/sdk/nwc` | `client/package.json`; `client/src/pages/Wallet.tsx` |
| Approved relays | Exactly `wss://relay.coinos.io` and `wss://relay.getalby.com/v1` | `client/src/features/wallet/nwc.ts` (`APPROVED_RELAYS`, `parseNwcUri`, `validateApprovedRelay`) **[V]** |
| Connection authority | Browser memory only; no backend route, database field, or persistent storage | `server/src/app.ts`; `server/test/wallet.test.ts`; S5 report §4–§5 **[V]/[T]** |
| NWC method used | `get_info` only; `close()` for lifecycle | `client/src/features/wallet/nwc.ts` (`requestGetInfo`, `WalletClientSession`); S5 report §4 **[V]/[T]** |
| Capability display | Wallet-reported `methods` are displayed with fixed descriptions; not called or verified | `client/src/features/wallet/WalletMethods.tsx`; `methods.ts` **[V]** |
| Route protection | `/wallet` is wrapped in `ProtectedRoute` | `client/src/App.tsx` **[V]** |
| Navigation | Wallet link appears only for signed-in users | `client/src/components/Layout.tsx` **[V]** |
| Production CSP | `connectSrc` permits only the two relay origins, with no wildcard and no Alby path in CSP | `server/src/app.ts`; `server/test/wallet.test.ts` **[V]** |
| Console hygiene | `requestGetInfo` suppresses SDK console output for the duration of the request | `client/src/features/wallet/nwc.ts`; `server/test/wallet.test.ts` **[V]** |
| Stale-response guard | `WalletClientSession` closes on disconnect and ignores a delayed `get_info` after disconnect | `client/src/features/wallet/nwc.ts`; `server/test/wallet.test.ts` **[V]** |

### 3.2 Recorded live test status

Only these combinations have been tested, and only for `get_info`:

| Wallet/relay combination | Recorded result | What it does not prove |
| --- | --- | --- |
| Coinos URI using `wss://relay.coinos.io` | Successful live `get_info` | Invoice creation, payment, lookup, settlement, or general wallet support |
| ZEUS-generated URI using `wss://relay.getalby.com/v1` | Successful live `get_info` | Invoice creation, payment, lookup, settlement, or general wallet support |

**No payment operation has been tested.** No other wallet, relay, path, or method has been
approved or tested. The S5 report explicitly says the additional methods are reported
capabilities, not verified functionality.

### 3.3 SDK surface and verified behavior

The installed `NWCClient` exposes `getInfo()`, `makeInvoice()`, `lookupInvoice()`,
`payInvoice()`, `getBalance()`, `listTransactions()`, `payKeysend()`, hold-invoice methods,
`subscribeNotifications()`, and `close()`.

Relevant verified SDK behavior:

- `@getalby/sdk` is version `9.0.0`; its dependency `@getalby/lightning-tools` is version
  `9.0.2` in the installed tree. **[V]**
- `payInvoice()` validates only that the result is truthy. It does not validate the preimage,
  `fees_paid`, or the response `result_type`; the app must validate all of them. **[V]** —
  `dist/esm/nwc.js`, `payInvoice`.
- NIP-47 requires the response `result_type` to equal the requested method. The installed
  SDK's private `executeNip47Request` resolves only `response.result`; it never exposes or
  compares `result_type`. The only `result_type` in the installed client source is in the
  `NWCWalletService` response constructor, not in `NWCClient` response handling. Public
  `NWCClient` methods therefore cannot enforce this protocol requirement. **[V]**
- `makeInvoice()` validates that `result.invoice` is truthy; it does not validate the amount,
  payment hash, state, or expiry. NIP-47 marks `invoice` optional in a `make_invoice` response,
  so a spec-compliant wallet that omits it can make the public SDK throw. **[V]**
- `lookupInvoice()` validates that `result.invoice` is truthy. NIP-47 marks `invoice` optional
  in a lookup response, so a spec-compliant wallet that omits it can make the public SDK
  throw. This must not be treated as payment failure. **[V]**
- The installed `Nip47Transaction` type omits the protocol's `expired` lookup state and marks
  several optional fields as required. `Nip47PayResponse` marks `fees_paid` as required even
  though NIP-47 says it is optional. The adapter must use its own runtime shape types and
  not rely on the SDK type definitions for acceptance decisions; the protocol's optional
  field must be handled according to NIP‑47, not the SDK's stricter type.

**Protocol-detail clarifications:**

- **pay_invoice** (NIP-47): The response must contain `result_type: "pay_invoice"` and a
  `result.preimage` field (64‑hex). `fees_paid` is optional; if present it must be a
  non‑negative integer. The adapter must reject any response that lacks `result_type`,
  lacks `preimage`, or has a mismatched `result_type`.

- **make_invoice** (NIP-47): The response may contain `invoice`, `payment_hash`, `amount`,
  `description`, `description_hash`, `preimage`, `fees_paid`, `created_at`, `expires_at`,
  `metadata`. Some fields (`invoice`, `preimage`) are optional per NIP‑47. The adapter must
  validate present fields but not require all of them; a response missing `invoice` is not
  automatically invalid, but the adapter must not treat it as a settled payment.

- **lookup_invoice** (NIP-47): The response state may be `pending`, `settled`, `accepted`,
  `expired`, or `failed`. The `invoice` field is optional per NIP‑47. A missing `invoice`
  field must **not** be treated as proof of failure; the adapter must rely on `state` and,
  where available, `payment_hash`, `amount`, and `expires_at`. An `expired` or `failed`
  state must be honoured; `pending` or `settled` must be confirmed with the wallet’s own
  UI before any claim of payment.

- **Unexpected result types / malformed responses**: If the response envelope does not
  contain `result_type` matching the requested method, or if the JSON is malformed, or
  if required fields for the claimed state are absent, the adapter must return
  `unknown`/unverified and must **never** present the outcome as success or failure.
  The adapter must use its own runtime shape types and not rely on the SDK type definitions
  for acceptance decisions; the protocol's optional fields (including `fees_paid`) must be
  handled according to NIP‑47, not the SDK's stricter type. **[V]**
- The SDK's default reply timeouts are 10 seconds for `get_info` and 60 seconds for
  `pay_invoice`, `make_invoice`, and `lookup_invoice`; the relay publish timeout is 5 seconds
  and the connection wait is 3 seconds in the installed implementation. **[V]** —
  `dist/esm/nwc.js`, `executeNip47Request`.
- The SDK prefers NIP-44 v2 and falls back to NIP-04 when the wallet advertises it. **[V]**
- Several SDK methods call `console.error` on failure; validation errors can include
  stringified response data. The application must suppress console output around every
  wallet operation, not only `get_info`. **[V]/[I]**
- `getWalletServiceInfo()` exists and can report notifications, but the current
  `sanitizeGetInfoResponse` does not preserve `notifications`. S6 does not need to add
  notification support. **[V]**

### 3.4 Invoice decoding and validation capability

The installed package evidence is:

| Item | Verified finding |
| --- | --- |
| Package/version | `@getalby/lightning-tools@9.0.2` is installed and exposes the `./bolt11` subpath with ESM, CJS, and type declarations. **[V]** — `dist/types/bolt11.d.ts`, `package.json` exports |
| Decoder | `decodeInvoice(paymentRequest: string): DecodedInvoice \| null`; it returns `null` on failure. **[V]** |
| Output fields | `paymentHash`, `satoshi`, `millisatoshi`, `amountRaw`, `timestamp`, `expiry`, `description`. **[V]** |
| Amount units | `millisatoshi` is a JavaScript number parsed from the protocol’s integer millisatoshi string; `satoshi` is `millisatoshi / 1000` and can therefore be fractional; `amountRaw` is the decoder’s millisatoshi string, not the original human-readable amount. The app must use the integer millisatoshi value and check `Number.isSafeInteger`. **[V]** |
| Time units | `timestamp` is Unix seconds, not milliseconds. `expiry` is a relative duration in seconds, or `undefined` when the tag is absent. The application must apply the BOLT11 default of 3600 seconds explicitly. **[V]** |
| Missing expiry | The bundled `Invoice` class creates `expiryDate` only when `expiry` is truthy, and `hasExpired()` returns `false` when `expiryDate` is undefined. Do not use it as the sole expiry check. **[V]** |
| Checksum | The decoder uses bech32 decoding, so a corrupted checksum fails decoding. **[V]** |
| Signature | The decoder parses a signature section but does not cryptographically verify the BOLT11 signature. A decoded invoice is well-formed, not proven authentic. **[V]** |
| Preimage | `validatePreimage(preimage, paymentHash)` checks that SHA-256(preimage) equals the payment hash. **[V]** |
| Export status | The `Invoice` class is exported by `@getalby/lightning-tools`, but the root `@getalby/sdk` exposes it only as a type; it is not the pre-payment inspector. **[V]** |
| Direct dependency | The package is installed transitively through the SDK, but it is **not** declared as a direct client dependency. Importing `@getalby/lightning-tools/bolt11` directly requires a direct dependency declaration. **[V]** |

The evidence supports retaining the decoder as the proposed dependency: it is already present,
it exposes a typed decoder and preimage validator, and its checksum/amount/expiry behavior is
known. It does not verify signature authenticity, so the wallet remains the final payment
authority. **[V]/[I]**

### 3.5 PRD requirements that S6 must satisfy or advance

| Requirement | Current state | S6 relevance |
| --- | --- | --- |
| FR-009 — compatible Lightning wallet connection | S5 `get_info` path exists; two combinations tested | Reused, not reopened |
| FR-010 — guided Lightning payment | Not implemented | Primary S6 deliverable |
| AC-012 — compatible wallet can be connected | S5 evidence only for `get_info` | Reused |
| AC-013 — generate or handle a real Lightning payment request | Not implemented | S6 can handle a real external invoice; generation is optional and wallet-dependent **[I]/[C]** |
| AC-014 — guided payment completed and verified | Not implemented | Requires real funds, a real invoice, and evidence; conditional |
| AC-015 — payment failures communicated accurately | Not implemented | S6 must implement and test safely |
| AC-016 — wallet secrets not exposed | S5 controls exist for `get_info` | Must extend to every payment operation |
| PRD Module E — receiving/sending, invoices, authorization, outcomes, safety | S5 covers connection and invoice literacy only | S6 adds guided practice |
| PRD §13 payment security | Not implemented for payments | Amount/invoice validation, status verification, no auto-pay, no secret logging |
| PRD §19 payment testing | Not implemented | State, negative, timeout, and verification tests |
| PRD §25 Definition of Done | Not met | Real payment remains a hard evidence gate |

## 4. S6 scope, non-goals, and recommended shape

### 4.1 In scope

- Reuse the S5 NWC connection, approved-relay allowlist, protected route, and memory-only
  secret handling.
- Inspect and locally validate a pasted BOLT11 invoice before any payment request.
- Present an explicit payment confirmation that names the amount, description, payment hash,
  expiry, wallet alias, and the fact that real sats may move.
- Submit `pay_invoice` exactly once per confirmed intent, with no automatic retry.
- Verify the returned preimage against the invoice payment hash.
- Validate the NIP-47 response envelope: `result_type`, error/result consistency, and
  method-specific response shapes, before any response is treated as evidence.
- **C6 covers only `get_info` and read-only `lookup_invoice` compatibility checks; it does
  not authorize live `make_invoice` or any outgoing payment.**
- **Testing live `make_invoice` requires the separate D11 owner approval checkpoint
  (see section 15.5). Until then, receive-invoice testing must use mocked adapters.**
- Optionally confirm wallet-side settlement with `lookup_invoice` where supported and tested.
- Implement the receive-invoice flow — amount entry, creation request, display, and status
  polling — inside S6 Core using a fake adapter for automated tests. The **live** `make_invoice`
  call sits behind the separate D11 authorization gate and is not part of S6 Core.
- Provide honest states for request-returned, preimage-verified, wallet-settled,
  receiver-confirmed, failed, expired, unsupported, and unknown/ambiguous outcomes.
- Add unit, controller, adapter, static/security, and build tests using fakes. No live payment
  or live invoice is required for these tests.
- Add only the UI needed to make these operations understandable and usable on the existing
  `/wallet` page.

### 4.2 Out of scope

- Balance display, transaction history, list-transactions browsing, analytics, subscriptions,
  recurring payments, keysend, hold invoices, lightning addresses, LNURL, fiat conversion, or
  multi-wallet management.
- A backend payment intent service, MongoDB model, database migration, API proxy, LNbits
  service, custodial wallet, or payment provider.
- Persistence of payment intents, receipts, invoices, preimages, or wallet secrets across
  reloads. S6 is session-only; this is a deliberate limitation, not a hidden feature.
- QR-code generation. A copyable invoice is the minimum usable receive display; QR is a
  presentation enhancement for a later decision.
- S7 work: UI polish, responsive optimization, PWA/service worker, performance/bundle work,
  accessibility review, cross-browser review, deployment readiness, or public documentation.
- XP, badges, completion certificates, or any gamification tied to spending money.
- Live invoice creation or solicitation of an incoming payment without separate explicit
  owner approval. This planning task creates no live invoice.
- Any claim that a fake, simulated, testnet, or unpaid request satisfies AC-013 or AC-014.
- **"make_invoice"** creates a real payable invoice. It is not an outgoing payment, but another person may pay it.
- Permission to test outgoing payments (e.g., via a fake adapter or S6 Core) does **not** authorize live invoice creation.
- C6 (Live non-payment compatibility) may verify non-payment compatibility only within the explicitly authorized test scope; it does not authorize live invoice or payment creation.
- Live invoice creation requires separate, explicit owner approval (decision D11, section 15.5), specifying:
  - Receiving wallet and relay.
  - Exact invoice amount in sats.
  - BOLT11 expiry in seconds.
  - Permitted payer and test participants.
  - Handling of unexpected incoming payments.
  - Whether and where the invoice may be shared.
- **Do not create a live invoice or solicit payment during this task.**

**Live `lookup_invoice` restrictions (C6):**

- `lookup_invoice` is a **live, read-only wallet operation**. It reads invoice or payment-hash
  status from the wallet; it does not create an invoice and does not initiate a payment.
- It requires an existing invoice or payment hash obtained **independently of this test**.
- C6 must **not** create its own fixture using `make_invoice`, and must not call
  `pay_invoice`.
- No live lookup may occur without applicable explicit owner authorization.
- If the applicable authorization or an independently obtained fixture is unavailable, the
  live lookup test is **skipped** and recorded as untested.
- A successful lookup proves only that that one lookup request returned the recorded
  response. It does not prove `make_invoice`, `pay_invoice`, settlement behavior, or general
  wallet compatibility.
- Invoice strings, payment hashes, preimages, secrets, and other sensitive values must not
  appear in logs, test output, or reports.

### 4.3 Recommended product shape

Keep one page and one connection:

1. **Connect** (existing S5 section).
2. **Wallet information and reported methods** (existing, updated honestly for S6).
3. **Send a payment**: paste invoice → inspect → confirm → submit → verify → receipt.
4. **Create a receive invoice**: amount → create → copy invoice → monitor status.
5. **Safety and limitations** (extended for real-money practice).

No new route is required. The existing `/wallet` page remains protected. A separate component
boundary is recommended so `Wallet.tsx` does not become a payment monolith.

### 4.4 The minimum honest experience

S6 Core is complete only when a learner can:

- see whether the connected wallet reports the method needed for the chosen direction;
- inspect a valid invoice and understand its amount and expiry before approving anything;
- explicitly approve one payment and see a status that never calls an unknown result a success;
- see the four evidence levels separated: request returned, preimage verified, wallet-reported
  settlement, and receiver-confirmed receipt;
- use the receive flow end to end in the UI — amount entry, invoice display, status polling,
  and the "created", "waiting", "settled", and "status unavailable" states — implemented and
  exercised against **mocked adapter responses**;
- see a clear explanation when the wallet does not support a method or the relay/wallet does
  not answer.

**S6 Core does not require D11 approval.** The receive flow, its state handling, its
validation, and its adapter behavior are implemented and tested against mocked responses.
S6 Core performs **no** live `make_invoice` call and creates **no** live payable invoice.
Mocked invoices and simulated payment states are never presented as real wallet activity or
as payment evidence.

Live receive testing — actual `make_invoice` requests and live invoice status experiments —
is a separate activity that requires its own applicable authorization (D11), and is covered
by the live-evidence criteria in section 15.6 rather than by S6 Core.

It is not complete if the only demonstration is a mocked success, a screenshot of a form, or a
`get_info` response.

## 5. Requirements traceability and acceptance interpretation

| Requirement | S6 implementation response | Evidence expected | Status after S6 Core |
| --- | --- | --- | --- |
| FR-009 / AC-012 | Reuse S5 connection; no new wallet onboarding | Existing S5 tests and owner `get_info` evidence | Reused; not re-claimed |
| FR-010 | Guided send flow with explicit confirmation and verified result | Controller/adapter tests; live evidence only with approval | Partial until a real payment is completed |
| AC-013 | Handle a real external BOLT11 invoice; optionally create an invoice with `make_invoice` | Real invoice parsed/validated; wallet response handled; live generation only if supported | Potentially met by handling a real invoice; owner acceptance interpretation required **[C]** |
| AC-014 | Real guided payment, preimage-verified and optionally lookup-settled | One approved real payment, amount/hash match, receipt, external receiver confirmation preferred | Not met without funds/approval; cannot be faked |
| AC-015 | Accurate failure, expiry, refusal, timeout, and unknown states | Negative tests with fakes plus allowed live refusal tests | Met by automated negative coverage; live coverage conditional |
| AC-016 | No secret/invoice/preimage logging, storage, backend transmission, or bundle leakage | Static tests, source scan, console-suppression tests, bundle scan | Met by controls and tests; live behavior still subject to review |
| PRD §13 | Amount/invoice validation, status verification, no auto-pay, no secret logging | Tests and code review | Met for S6 scope |
| PRD §19 | Payment state interpretation, invoice creation/handling, negative tests | Test suite | Met for S6 scope |
| PRD §25 | Real guided payment without mock results | Live evidence only | Not met unless the live gate passes |

**AC-013 interpretation is an acceptance decision, not a technical one.** A literal reading of
"generate or handle a real Lightning payment request" permits handling a real invoice created
outside the Academy. Prior S2 planning treated a real receiving wallet as part of AC-013. This
plan does not silently resolve that tension. The owner must confirm whether a real external
invoice is sufficient, or whether an Academy-generated invoice is required. **[C]**

**AC-014 has no zero-cost interpretation.** It requires a real payment. The plan can make the
software ready, but it cannot manufacture funds, inbound liquidity, or a receiver.

## 6. Architecture and trust boundaries

### 6.1 Target topology

```text
Learner (browser)
  |
  v
React /wallet page
  |  memory-only NWC client
  v
@getalby/sdk NWCClient
  |
  v
Approved relay: Coinos or Alby
  |
  v
Learner's wallet (authority for authorization and settlement)
  |
  v
Lightning Network
```

There is no server-side wallet route, database record, proxy, or payment service in this
design. The existing Express API remains responsible for authentication and learning data,
not custody or payment execution. This preserves the S5 client-side boundary and avoids
expanding the attack surface before the deadline.

### 6.2 Session ownership

`WalletClientSession` already owns the single SDK client and an attempt token. S6 should extend
that ownership rather than let UI components hold the client:

- Provide a single wallet-operation boundary for `pay_invoice`, `make_invoice`, and
  `lookup_invoice` that validates `result_type`, error/result consistency, and
  method-specific response shapes before returning a typed result. **The concrete
  implementation of that boundary is not settled: section 6.6 records the low-level NIP-47
  adapter approach as UNVERIFIED and makes a successful verification with supported public
  SDK APIs a prerequisite before C1/C2 begin.**
- Do not let the UI call the public SDK methods directly: the public methods discard
  `result_type` and therefore cannot be the acceptance boundary.
- Keep the secret inside the client/session; never expose the client object or raw connection
  object to components.
- Suppress SDK console output around every wallet call.
- Return a stale result or throw a typed stale condition when an operation completes after a
  disconnect or a newer operation supersedes it.
- Enforce one in-flight operation at a time in the UI and, defensively, in the session.
- Close the client and invalidate all operations on disconnect, page hide, bfcache restore, or
  route unmount.

This is an extension of the existing pattern, not a second connection architecture. **[I]**

### 6.3 Trust model

| Party | Trust level | Consequence |
| --- | --- | --- |
| Learner's wallet | Authority for its own authorization and reported result | It can reject, delay, or lie; the app must show evidence, not blind success |
| Relay | Untrusted transport | It can delay or drop messages; it cannot be treated as settlement evidence |
| Invoice creator | Untrusted | Amount and description are displayed as claims; only the payment hash and cryptographic verification are strong evidence |
| Local invoice decoder | Advisory | Checks structure/checksum, not the BOLT11 signature; the wallet is the final payment authority |
| Academy client | Not a custodian | It must never hold keys, seeds, or funds; it must not auto-pay |
| Receiver | Independent party | Only receiver confirmation can prove incoming settlement; payer preimage is strong but not independent |

### 6.4 PRD §11 conflict

PRD §11 lists proposed wallet endpoints (`/api/wallet/connect`, `/api/wallet/invoices`,
`/api/wallet/payments`, and related routes) and says the backend must validate ownership,
authorization, invoice details, and payment status. The S5 implementation deliberately chose
a client-only connection for `get_info`.

| PRD §11 description | S6 client-only proposal | Consequence |
| --- | --- | --- |
| Backend wallet endpoints own connection/payment/invoice state | Browser holds the NWC client and performs requests directly | No backend wallet route, model, or status record |
| Backend validates ownership, authorization, invoice details, and payment status | The learner's wallet authorizes; browser validates invoice/envelope shapes | Server-side validation is absent; the wallet is the authority |
| Wallet credentials are handled by the backend | NWC URI remains browser-memory-only and never reaches the server | Server cannot validate or replay the connection |
| Payment status is a backend responsibility | Payer preimage and optional wallet lookup are the only client evidence | Independent receiver confirmation remains external |

**The S5 `get_info` acceptance is not an owner decision to omit the PRD §11 payment backend
for S6.** That acceptance covers the existing connection only. S6-D01 is a blocking decision:
the owner must explicitly accept the client-only deviation or require a backend replan before
any implementation starts. If the owner rejects the deviation, S6 must stop and be replanned;
this plan must not be implemented as if both positions are compatible. **[C]**

The PRD is not modified by this plan. A deviation decision must be recorded separately; it
cannot be implied by the S5 report, this plan, or silence. **[C]**

### 6.5 Dependency decision

Invoice inspection needs a BOLT11 decoder. The least-risk option is to declare the already
installed `@getalby/lightning-tools@9.0.2` as a direct client dependency and import
`decodeInvoice` and `validatePreimage` from `@getalby/lightning-tools/bolt11`.

| Option | Assessment |
| --- | --- |
| Direct `@getalby/lightning-tools@9.0.2` declaration | Recommended. Already present transitively; no new third-party package; gives decode and preimage verification. Requires owner approval and a manifest/lock update. |
| Use only the root `@getalby/sdk` exports | Does not expose a standalone pre-payment decoder; `LNClient.pay()` pays before returning an invoice object. Not suitable for inspection. |
| Write a local BOLT11 decoder | Rejected. Duplicates protocol parsing and increases security risk. |
| Skip local decoding and send directly | Rejected. Fails invoice inspection, amount/expiry validation, and the PRD payment-security requirement. |

If the direct dependency is not approved, S6 Core cannot meet the invoice-inspection and
validation requirements as planned. The correct response is to stop and choose another
approved decoder, not to weaken validation silently. **[C]**

### 6.6 NIP-47 response envelope validation and adapter feasibility

**Adapter feasibility status: UNVERIFIED.** This plan does not assert that a low-level
NIP-47 adapter is technically established. The evidence below records what the installed
`@getalby/sdk@9.0.0` package actually exposes and what remains unproven.

**Protocol requirement.** NIP-47 requires the encrypted response envelope to contain a
`result_type` equal to the requested method. The installed SDK does not satisfy that
requirement through its public payment methods:

- `NWCClient.payInvoice()`, `makeInvoice()`, and `lookupInvoice()` call a **private**
  `executeNip47Request` (`dist/types/nwc.d.ts:309`, `private executeNip47Request;`).
- That method decrypts the reply, parses the JSON, and resolves only `response.result`
  (`dist/esm/nwc.js:7760-7781`). It never reads or exposes `response.result_type` and never
  compares it with the requested method.
- The SDK defines `Nip47UnexpectedResponseError`, but it is not used by
  `executeNip47Request`.
- The only `result_type` occurrence in the installed client source is in the
  `NWCWalletService` response constructor (`dist/esm/nwc.js:8178`), not in client-side
  validation. **[V]**

**Verified public capability.** Read-only inspection of the installed package establishes
the following. All paths are relative to `client/node_modules/@getalby/sdk/`.

| Primitive | Declaration evidence | Classification |
| --- | --- | --- |
| `encrypt` | `dist/types/nwc.d.ts:279` — `encrypt(pubkey: string, content: string): Promise<any>;` on the exported `NWCClient` class; no `private` modifier | Verified public capability |
| `decrypt` | `dist/types/nwc.d.ts:280` — `decrypt(pubkey: string, content: string): Promise<string>;` | Verified public capability |
| `signEvent` | `dist/types/nwc.d.ts:276` — `signEvent(event: EventTemplate): Promise<Event>;` | Verified public capability |
| `walletPubkey` | `dist/types/nwc.d.ts:264` — `walletPubkey: string;` | Verified public capability |
| `relayUrls` | `dist/types/nwc.d.ts:261` — `relayUrls: string[];` | Verified public capability |
| `pool` | `dist/types/nwc.d.ts:260` — `pool: ReconnectingPool;`. `ReconnectingPool` is declared at `dist/types/nwc.d.ts:222` with public `subscribe`, `publish`, `close`, `destroy`, `ensureRelay`, and `readonly publishTimeout = 5000`, but the class is **not exported by name**: the `./nwc` export list at `dist/types/nwc.d.ts:443` does not include it. | Verified public property; the pool class is not a named public export |

`NWCClient` itself is exported from the documented `./nwc` entry point
(`package.json` exports `./nwc` → `dist/esm/nwc.js` / `dist/types/nwc.d.ts`). The primitives
above are reachable without private fields, reflection, monkey-patching, or SDK internals.
**[V]**

**Missing or inaccessible capabilities.**

- `executeNip47Request` is `private`; so are `_checkConnected`, `_selectEncryptionType`, and
  `_findPreferredEncryptionType` (`dist/types/nwc.d.ts:309-312`). There is no supported public
  seam that performs the full NIP-47 request lifecycle.
- The `Filter`, `Event`, `EventTemplate`, and `Relay` types are imported from `nostr-tools`
  inside the SDK declarations (`dist/types/nwc.d.ts:1`) and are **not re-exported** by either
  the root (`dist/types/index.d.ts:956-957`) or the `./nwc` (`dist/types/nwc.d.ts:443-444`)
  entry points. `nostr-tools` is a transitive dependency of the SDK and is **not** a direct
  client dependency (`client/package.json`), so typing a subscription filter or an event
  template would require either inference-only usage or a new direct dependency declaration
  that has not been approved.
- The kind-23194 request template and its tags (`p`, `v`, `encryption`), the kind-23195
  subscription filter with the `#e` correlation tag, publish via `Promise.any`, response
  decryption/parsing, error mapping, the reply and publish timeouts, and subscription cleanup
  are implemented **only inside the private method** (`dist/esm/nwc.js:7725-7812`).

**Remaining uncertainties.**

- Whether the complete lifecycle can be reproduced correctly using only the public
  primitives has **not** been demonstrated. No such implementation exists, no test exercises
  it, and no live or replayed exchange has been observed.
- Correlation depends on the signed request event id and the `#e` filter; reproducing it
  outside the SDK has not been validated.
- Encryption negotiation depends on the private `_selectEncryptionType`, which reads the
  wallet service info event; the public `getWalletServiceInfo()` is available, but no public
  API performs the negotiation itself.
- Cleanup semantics (`pool.close`, `pool.destroy`, `sub.close`, timer clearing) across
  success, failure, timeout, and disconnect have not been validated in this arrangement.
- The exact relay allowlist and the session stale-response protections have not been
  reconciled against a duplicated request path.

**Safe recommendation.** Classify the low-level NIP-47 adapter approach as **UNVERIFIED**,
not recommended and not established. Reproducing the private request lifecycle in application
code would duplicate undocumented SDK protocol behavior; that is not a supported integration
and must not be asserted as one.

**Implementation prerequisite.**

> The S6 payment adapter must not be implemented until the proposed NIP-47 envelope approach
> has been demonstrated to use supported public SDK APIs. If that cannot be established,
> stop and replan around an approved SDK/API alternative.

Successful verification of that prerequisite is required before implementing **C1/C2**. The
verification must record, with exact installed package file paths and declaration or source
evidence:

1. Exact public export names and signatures for every primitive the approach would use.
2. Whether each API is accessible without private fields, reflection, monkey-patching, or
   undocumented internals.
3. The complete request lifecycle: signing kind-23194 events, encryption negotiation,
   publishing to the approved relay, subscribing for matching kind-23195 responses,
   decrypting and parsing responses, correlating the response to the original request event,
   `result_type` validation, protocol-error and malformed-response handling, a bounded
   timeout, and cleanup of subscriptions, timers, and resources after success, failure,
   timeout, or disconnect.
4. That the existing exact relay allowlist and the session stale-response protections are
   preserved.

If the installed SDK does not expose a suitable public API for this, the correct outcome is to
evaluate and obtain owner approval for a different supported approach before implementation,
not to proceed on assumption. **[V]/[C]**

### 6.7 No new CSP or backend origin

No new network origin is introduced. Invoice decoding is local. There is no LNURL fetch, no
fiat-rate fetch, no QR image service, and no server wallet call. The existing production CSP
remains exactly as tested in S5; any future origin addition requires a separate review. **[V]/[I]**

## 7. Sending flow

Sending is the primary S6 flow because it directly serves FR-010 and the demo journey.

### 7.1 Preconditions and readiness

The send panel is enabled only when:

- a wallet is connected and the session is active;
- the sanitised `get_info` response reports `pay_invoice` in `methods`;
- the invoice passes local inspection and validation;
- the invoice amount is at or below the provisional UI guard, if that product guard is
  approved (it is not a security boundary);
- the invoice is not already blocked in the in-memory attempted-payment set;
- no other wallet operation is in flight.

Reported capability is necessary but not sufficient. It is not proof that the method works
with the wallet's current permissions, budget, balance, or liquidity. The UI must say that a
wallet can still refuse.

### 7.2 Step 1 — paste and normalize

- Accept a BOLT11 payment request, optionally prefixed with `lightning:`.
- Trim outer whitespace; reject internal whitespace, control characters, fragments, and
  excessive length.
- Normalize only the wrapper prefix and case as required by the decoder; do not rewrite the
  invoice payload.
- Do not treat a `lightning:` URI as a web URL and do not fetch it.
- Do not send the invoice to the Academy server.

### 7.3 Step 2 — inspect before any wallet call

The inspection result must show, from local decoding where possible:

- amount in sats and/or millisats, with a clear unit;
- whether the invoice is amountless;
- payment hash, shortened for display;
- description, labelled as creator-supplied and untrusted;
- creation time and expiry;
- network/prefix;
- an explicit statement that the local check validates structure/checksum, not the BOLT11
  signature or the recipient's honesty.

An invalid, amountless, expired, wrong-network, over-cap, or already-attempted invoice is
blocked before `pay_invoice` is called. A wallet-side error is not used as the first line of
invoice validation.

### 7.4 Step 3 — explicit confirmation

The confirmation panel must state:

- exact amount in sats;
- a warning that real sats may leave the learner's wallet;
- the wallet alias/reported identity;
- the truncated payment hash;
- the description, with "untrusted, supplied by the invoice creator" if present;
- the expiry time;
- the provisional 21-sat default and 100-sat maximum UI guard, if approved;
- that the wallet may ask for its own approval;
- that the Academy cannot reverse a payment.

There is no auto-pay, no timer-based payment, no "pay on connect", and no payment from a
route load or browser event. A learner must activate a single explicit control for the current
invoice. The button label should name the action and amount, for example `Pay 21 sats`.

If the amount is above the cap, the correct output is a blocked state with no payment request,
not a warning followed by a payment attempt.

### 7.5 Step 4 — submit once

On confirmation:

1. Re-check the session, invoice, cap, and duplicate-hash guard.
2. Record the payment hash in the in-memory attempted set before submitting.
3. Set the state to `submitting` and disable duplicate controls.
4. Call `payInvoice({ invoice })` once. Do not pass an `amount` for an amountless invoice
   because amountless invoices are rejected in S6.
5. Suppress SDK console output for the whole call.
6. Ignore the result if the session was disconnected or the operation was superseded.
7. Never automatically call `payInvoice` again for the same invoice.

There is no server-side idempotency key. NWC has no general idempotency guarantee. The
in-memory hash lock is a best-effort at-most-once guard for the current page session, not a
distributed exactly-once guarantee. A reload clears it; the limitation must be visible.

### 7.6 Step 5 — validate the result, then verify

A resolved `pay_invoice` response is **acceptance by the wallet/client path**, not proof of
settlement. Before any of it is treated as evidence, the wallet-operation boundary must:

- confirm the response envelope carries `result_type` equal to the requested method, and treat
  a missing or mismatched `result_type` as unverified;
- confirm the envelope's error/result fields are consistent, and treat a malformed envelope
  as unverified;
- require a result object;
- require a 64-hex preimage;
- compute SHA-256(preimage) and compare it with the invoice payment hash;
- accept `fees_paid` only if it is a non-negative safe integer when present; NIP-47 makes it
  optional, so its absence is not itself a failure;
- if the preimage is missing, malformed, or does not match, set `unknown` or `unverified`, never
  `paid`;
- if `lookup_invoice` is reported and usable, request status for the payment hash/invoice;
- treat lookup `settled` as wallet-settled evidence only if the amount/hash still match;
- treat lookup errors, timeouts, validation failures, or `NOT_FOUND` as "unverified" or
  "unknown", not as failure and not as success.

The verification levels are defined in section 10. A receipt must name its level; it must not
collapse all levels into "Payment successful."

### 7.7 Step 6 — final send state and receipt

Permitted final states:

| State | Meaning | Learner action |
| --- | --- | --- |
| `blocked` | Preflight validation or capability/cap check failed; no request sent | Correct the invoice or connection |
| `rejected` | Wallet explicitly refused before any credible payment evidence | Read the safe reason; only retry after the specific cause is fixed and a new confirmation |
| `failed` | Wallet reported `PAYMENT_FAILED`; payment is not claimed | Check the wallet; do not retry the same invoice automatically |
| `expired` | Invoice expired locally before submission | Request a new invoice |
| `unknown` | Request may have reached the wallet; no reliable result | Check wallet/status; **do not pay again** |
| `accepted-unverified` | Wallet returned a result but it is not cryptographically verified | Check status; do not claim paid |
| `preimage-verified` | Preimage matches the invoice payment hash | Show payer-verified receipt; independent receiver confirmation still absent |
| `wallet-settled` | Lookup reports settled and hash/amount match | Show wallet-settled receipt |
| `receiver-confirmed` | External receiver evidence matches | Strongest acceptance evidence; separate acceptance gate |

The receipt should contain only necessary, non-secret fields:

- amount;
- short payment hash;
- wallet alias;
- verification level;
- timestamp;
- optional lookup state;
- a plain-language statement of what was and was not verified.

Do not display the full preimage by default. Do not persist the receipt. Do not award XP or
unlock content for a payment; spending money is not a learning achievement in S6.

### 7.8 Sending: explicit non-claims

S6 must not claim any of the following unless the corresponding live evidence exists:

- that `pay_invoice` works for Coinos or ZEUS;
- that a wallet's reported method list is accurate;
- that a preimage-verified payment is independently receiver-confirmed;
- that an attempted payment is a completed payment;
- that a timeout means the payment failed;
- that a `get_info` success proves payment capability.

## 8. Receiving flow

Receiving is a separate flow with a separate wallet method and a separate settlement
authority. It must not be inferred from the send flow.

### 8.1 Preconditions

The receive panel is enabled only when:

- a wallet is connected and active;
- `make_invoice` is reported;
- no other invoice/payment operation is in flight;
- the requested amount is positive, integer, and within the approved cap.

`lookup_invoice` is required for live receive status. If it is not reported, invoice creation
can still be offered as a limited educational action, but the UI must say that incoming status
cannot be verified here. It must not show a fake "paid" state.

### 8.2 Step 1 — choose a fixed practice amount

- Default to a small fixed amount, proposed for owner approval as 21 sats.
- Hard cap at a small approved value, proposed as 100 sats.
- Do not offer a free-form unlimited amount.
- Do not convert fiat; that would add a network dependency and an unnecessary failure mode.
- Use a fixed Academy description such as `KAOS Bitcoin Academy practice invoice`, or a
  tightly length-limited description. Do not accept arbitrary HTML.
- Request a short expiry, proposed as 10 minutes, so an abandoned invoice does not remain
  payable indefinitely. The wallet may choose its own expiry; display what it returns.

Amounts are sent to `makeInvoice` in **millisatoshis**. The UI displays sats and the app must
keep the conversion exact and integer-safe.

### 8.3 Step 2 — create and validate the invoice

Call `makeInvoice({ amount, description, expiry })` once per explicit learner action.

The result is not trusted merely because the SDK resolved. Validate:

- result is an object;
- `invoice` is a non-empty string;
- the returned invoice decodes locally;
- the decoded payment hash is 64 hex;
- the decoded amount matches the requested amount within the protocol's exact msat value;
- the decoded expiry/state is coherent with the request;
- the payment hash is not already active in this session.

If the returned invoice is missing, malformed, decodes to a different amount, or has no usable
hash, show an error and do not present it as a valid receive request. If the wallet returns a
`payment_hash` that disagrees with the decoded invoice, do not guess; reject the result.

### 8.4 Step 3 — display the invoice

Display:

- amount in sats;
- the invoice text in a selectable, copyable field;
- a `lightning:` copy form if useful;
- payment hash shortened;
- expiry;
- description, labelled as Academy-supplied if that is true;
- a clear "Waiting for payment" state, not "Paid";
- the wallet alias;
- a warning that the invoice is only valid for the displayed expiry.

QR generation is deferred. A copyable invoice is sufficient for the minimum receive flow; a
QR enhancement must not add an unapproved dependency or leak the invoice to an external image
service. This is a decision in section 15.

### 8.5 Step 4 — monitor status with lookup

If `lookup_invoice` is available:

- request by both `payment_hash` and `invoice` where the wallet accepts both;
- start with a short interval (for example 3 seconds), back off to a longer interval, and stop
  at invoice expiry plus a short grace period for late settlement;
- stop immediately on `settled`, `expired`, `failed`, disconnect, unmount, or a new operation;
- ignore stale responses after disconnect;
- treat transient lookup errors as "status unavailable", not as proof of failure;
- never poll `list_transactions` or balance as a fallback;
- never use notifications in S6 unless separately approved and tested.

A `settled` lookup is wallet-side receive evidence, not independent payer confirmation. The
invoice amount and payment hash must still match. An `expired` state means the invoice is no
longer payable; it is not proof that no payment arrived before expiry, so a final lookup is
appropriate.

### 8.6 Real incoming settlement

A real incoming payment needs both:

- a second wallet or external payer to pay the created invoice; and
- inbound liquidity or a custodial balance in the receiving wallet, depending on the wallet.

The Academy is not operating a receiving wallet or holding funds. The current client-only
design **can** issue a `make_invoice` request against the learner's connected wallet where
the wallet supports `make_invoice`, but it cannot guarantee that the wallet can receive, that
liquidity exists, or that an independent receiver confirms settlement. Issuing that live
request requires D11 approval with all six conditions specified; until then the receive flow
is exercised only against mocked adapter responses. A real receive test must additionally be
owner-assisted and separately approved. No payment is authorized by this plan.

### 8.7 Receiving: explicit non-claims

- Creating an invoice is not receiving money.
- A displayed invoice is not a settled payment.
- A pending lookup is not a failure.
- A wallet-reported settled state is not the same as independent receiver confirmation.
- A wallet that does not support `make_invoice` must not be shown a simulated invoice as if it
  were real.

## 9. Invoice inspection and validation

### 9.1 Validation rules

| Rule | Proposed behavior | Rationale |
| --- | --- | --- |
| Input type | Must be a string | Avoid coercion |
| Outer whitespace | Trim | Copy/paste convenience |
| Inner whitespace/control characters | Reject | Malformed input |
| Optional `lightning:` prefix | Strip once, case-insensitively | Common wallet copy format |
| Maximum length | Reject above an approved bound (proposed 8192 characters) | Bound parser work and UI abuse |
| BOLT11 prefix | Mainnet `lnbc` by default; testnet `lntb`, signet `lntbs`, regtest `lnbcrt` only under an explicit environment decision | Prevent accidental wrong-network payment |
| Decode | `decodeInvoice` must return a value | Structural validity |
| Checksum | Decoder must accept the bech32 checksum | Reject corrupted invoices |
| Payment hash | Required, 64 hex after normalization | Needed for duplicate guard and preimage verification |
| Amount | Required and greater than zero; amountless invoices rejected | Avoid a second amount decision at payment time |
| Amount units | Use millisatoshis internally; display sats exactly | Avoid floating-point loss |
| Expiry | Use decoded expiry plus timestamp; if absent, apply BOLT11's 3600-second default | Do not rely on a missing expiry being non-expiring |
| Expired | Reject before wallet submission | Avoid avoidable requests |
| Network mismatch | Compare prefix with the wallet's reported network and reject a clear mismatch | Prevent wrong-network mistakes |
| Description | Optional; trim, bound length, label untrusted | XSS/content safety |
| Signature | Not verified locally; state this explicitly | Decoder does not prove authenticity |
| Duplicate | Reject an invoice whose payment hash was already attempted in this session | Best-effort double-payment guard |
| Cap | Reject above the approved amount cap | User protection |

### 9.2 Amount handling

BOLT11 amounts can be expressed in bitcoin, millibitcoin, microbitcoin, nanobitcoin, or
picosatoshi units, and can resolve to millisatoshis. The app should not use the decoder's
`number` satoshi field for money decisions. It should use the integer millisatoshi value,
validate that it is a safe integer, convert to sats only for display, and keep the cap in
millisatoshis. If an invoice has a sub-satoshi amount, show the exact msat value or a clear
rounded display; do not silently round the payable amount down.

### 9.3 Expiry handling

- BOLT11's default expiry is 3600 seconds when the expiry tag is absent. **[V]** — BOLT11.
- Use `timestamp + (expiry ?? 3600)` and compare with the current time.
- Treat an invoice as expired at or after that instant.
- Do not use `Invoice.hasExpired()` as the only check if its missing-expiry behavior could
  treat an absent tag as non-expiring; implement the default explicitly.
- Display both "created" and "expires" times in the learner's locale.
- A clock-skewed device can misjudge expiry. The wallet remains the final authority; a local
  expiry rejection is a safety guard, not a network fact.

### 9.4 Sample versus real invoices

S5 deliberately did **not** add a fictional sample invoice, and it made no invoice or payment
request. S6 should preserve that honesty:

- the payment flow handles only a learner-pasted real invoice;
- test vectors stay in tests and are never presented as payable learner content;
- a created receive invoice is labelled real and payable only within its expiry;
- the UI must not use one component state to blur a test fixture and a real invoice;
- if a sample is ever added for teaching, it must be visibly non-payable and must never be
  sent to `pay_invoice`. This plan recommends not adding one to the S6 flow.

### 9.5 Test vectors and parser tests

Use published BOLT11 test vectors and locally generated fixtures. Do not require a live wallet
for parser tests. Cover valid mainnet, uppercase, `lightning:` wrapper, bad checksum, malformed
bech32, amountless, expired, missing expiry, sub-satoshi amount, over-cap, wrong network, long
description, and duplicate hash. Do not include a fixture that could be mistaken for a live
payable invoice in learner-facing copy.

## 10. Settlement verification and state model

### 10.1 Evidence levels

| Level | Evidence | Permitted claim | Not sufficient for |
| --- | --- | --- | --- |
| `created` | `make_invoice` returned a valid invoice, locally decoded and matched | "Invoice created" | Payment, settlement |
| `submitted` | SDK publish path accepted the request by at least one relay | "Request sent to wallet" | Payment, settlement |
| `accepted` | `pay_invoice` resolved with a syntactically possible result | "Wallet returned a result" | Paid, settled |
| `preimage-verified` | Preimage is 64 hex and SHA-256(preimage) equals the invoice payment hash | "Paid — payer evidence verified" | Independent receiver confirmation |
| `wallet-settled` | `lookup_invoice` reports `settled`, with matching hash/amount | "Settled per wallet" | Independent receiver confirmation |
| `receiver-confirmed` | External receiver/payer evidence matches amount and hash | "Receiver confirmed" | Nothing stronger in S6 |

A receipt may show more than one level, but it must not call `accepted` or `submitted`
"successful payment."

### 10.2 Send state machine

```text
idle
  -> inspecting
  -> blocked | ready
  -> confirming
  -> submitting
  -> unknown | rejected | failed | expired | accepted
  -> verifying
  -> accepted-unverified | preimage-verified | wallet-settled | unknown
```

Rules:

- Only `preimage-verified`, `wallet-settled`, or `receiver-confirmed` may show a paid receipt.
- `unknown` is sticky until a lookup gives reliable evidence or the learner explicitly leaves
  the flow. It never transitions to `failed` merely because time passed.
- A stale response after disconnect/new operation is discarded, not applied.
- A second confirmation click cannot produce a second `payInvoice` call.
- A reload loses the in-memory intent; the UI must tell the learner to check their wallet
  before trying anything again.
- There is no automatic retry transition.

### 10.3 Receive state machine

```text
idle
  -> creating
  -> invoice-ready
  -> waiting
  -> settled | expired | status-unavailable | failed
```

Rules:

- `invoice-ready` means the invoice was created and locally matched; it does not mean paid.
- `waiting` persists until settlement, expiry, disconnect, or status-unavailable.
- `status-unavailable` is not `failed`; it means the app cannot verify.
- `expired` is based on the invoice, not on a lookup error.
- A late `settled` response before the grace cutoff can still update the state.
- Disconnect stops polling and no delayed response may restore the panel.

### 10.4 Verification algorithm

For a send:

```text
envelope = await walletBoundary.payInvoice({ invoice })
if envelope.result_type != "pay_invoice"      -> unknown
if envelope has error                         -> map to rejected/failed, never success
if envelope.result missing                    -> unknown
result = envelope.result
if no result or no preimage                   -> unknown
if preimage not 64 hex                        -> unknown
if sha256(preimage) != paymentHash            -> unknown
if fees_paid present and invalid              -> unknown
state = preimage-verified
if lookup available:
  lookupEnvelope = await walletBoundary.lookupInvoice({ payment_hash, invoice })
  if lookupEnvelope.result_type != "lookup_invoice" -> keep preimage-verified or unknown
  if lookupEnvelope.result.state == settled and hash/amount match -> wallet-settled
  if lookup state missing/errors              -> keep preimage-verified or unknown
```

`walletBoundary` is the single validated wallet-operation boundary described in section 6.2.
Its concrete implementation is subject to the adapter-feasibility prerequisite in section 6.6.

Preimage verification is cryptographic evidence from the payer side. It is not a substitute
for receiver confirmation, and it does not prove the recipient is the intended merchant.
The invoice description is never proof of recipient identity.

### 10.5 No false-negative failures

A timeout, publish error, network error, SDK validation error, or malformed response is not a
payment failure. It is an **ambiguous/unknown** outcome. The UI must not offer a "Retry payment"
button for the same invoice. It may offer "Check status" if lookup is available and safe.
If lookup is unavailable, the honest action is: "Open your wallet and check before doing
anything else."

## 11. Failure, timeout, duplicate, and ambiguous-outcome handling

### 11.1 Failure taxonomy

| Class | Examples | Meaning | Safe UI action |
| --- | --- | --- | --- |
| Preflight | Invalid invoice, amountless, expired, wrong network, over cap, method missing, duplicate hash | No wallet payment request was made | Correct the input or connection |
| Refusal | `UNAUTHORIZED`, `RESTRICTED`, `QUOTA_EXCEEDED`, `INSUFFICIENT_BALANCE`, `NOT_IMPLEMENTED`, `RATE_LIMITED`, `UNSUPPORTED_ENCRYPTION` | Wallet/connection refused; no credible payment evidence | Explain; fix the cause; require a new explicit confirmation |
| Wallet-reported failure | `PAYMENT_FAILED` | Wallet says the payment failed, but the outcome must not be retried blindly | Show failed/uncertain; tell learner to check wallet; no automatic retry |
| Publish error | `Nip47PublishError` | No relay accepted the event according to the SDK | Treat as not-submitted or unknown; no success; no retry of the same invoice |
| Publish timeout | `Nip47PublishTimeoutError` | Relay may have received the request | Unknown; check status; never retry |
| Reply timeout | `Nip47ReplyTimeoutError` | Request published but no reply | Unknown; check status; never retry |
| Network/connection | `Nip47NetworkError`, relay disconnect | No reliable request/response | Unknown or not-submitted; offer reconnect, not payment retry |
| Response validation | `Nip47ResponseValidationError` | Wallet replied, but the SDK could not validate the result | Unknown; never success; check status |
| Malformed result | Missing/mismatched preimage, invalid fee, wrong shape | Cannot prove payment | Unknown; never success |
| Lookup unavailable | Method not reported, validation error, `NOT_FOUND`, timeout | Cannot verify status | Unverified or status-unavailable; not failed |
| Receive lookup transient | Relay/wallet error during polling | Status temporarily unknown | Keep waiting/status-unavailable; retry lookup only, not payment |

Safe error codes are already allow-listed in `describeWalletError`; S6 should extend the
formatter by operation and state rather than displaying raw SDK messages. The SDK's validation
error message may contain a stringified result, so displaying `error.message` is prohibited.

### 11.2 Submission ambiguity

| Situation | Was the request possibly submitted? | May the app retry automatically? |
| --- | --- | --- |
| Local validation failed | No | No request exists; correct input |
| Wallet says `UNAUTHORIZED`/`RESTRICTED`/`QUOTA_EXCEEDED`/`INSUFFICIENT_BALANCE`/`NOT_IMPLEMENTED` | No credible payment | No automatic retry; new confirmation only |
| Relay publish error with clear refusal from all relays | Probably not | No automatic retry; check before a new attempt |
| Relay publish timeout | Yes | **No** |
| Reply timeout | Yes | **No** |
| Network disconnect during request | Possibly | **No** |
| SDK response validation failure | Possibly | **No** |
| Malformed result/preimage mismatch | Possibly | **No** |
| `PAYMENT_FAILED` | Wallet says no, but never assume | **No** |

### 11.3 Duplicate and replay controls

- One active send operation and one active receive invoice per page session.
- Disable the submit control while `submitting`, `verifying`, or `unknown`.
- Record the payment hash before calling `payInvoice`.
- Refuse a second payment for the same hash in the same session.
- Do not use invoice text as the only duplicate key; use the decoded payment hash.
- Do not persist the attempted set; on reload, warn that the in-memory guard is gone.
- Do not offer a "retry" affordance on unknown outcomes. Offer "Check wallet/status".
- Do not use `list_transactions` to reconcile a duplicate; it is out of scope and not a
  reliable substitute.
- React effect cleanup must clear polling timers and ignore late results.
- A disconnect increments the session attempt token; all pending operations become stale.
- A bfcache restore or pagehide closes the connection, consistent with S5.

### 11.4 User-facing unknown copy

The unknown state must be explicit and calm:

> The wallet did not confirm whether this payment completed. Do not pay the same invoice
> again. Open your wallet and check its activity. If you can, use "Check status" here. This page
> cannot prove a payment that the wallet did not confirm.

This copy is not a substitute for technical state handling; it is the required user contract
when the technical state is genuinely unknown.

## 12. Wallet and relay compatibility

### 12.1 Evidence status

| Wallet/relay | `get_info` | `make_invoice` | `lookup_invoice` | `pay_invoice` | Real payment |
| --- | --- | --- | --- | --- | --- |
| Coinos URI / `wss://relay.coinos.io` | Recorded success **[T]** | Not tested **[C]** | Not tested **[C]** | Not tested **[C]** | Not authorized |
| ZEUS URI / `wss://relay.getalby.com/v1` | Recorded success **[T]** | Not tested **[C]** | Not tested **[C]** | Not tested **[C]** | Not authorized |
| Any other wallet | Not approved/tested | Not approved/tested | Not approved/tested | Not approved/tested | Not authorized |
| Any other relay | Not approved/tested | Not approved/tested | Not approved/tested | Not approved/tested | Not authorized |

The matrix must stay this sparse until evidence exists. A wallet advertising a method is not
evidence that the method works; the S5 page already says this.

Reading the matrix:

- `make_invoice` is **not tested** and is **not authorized** for live testing. Live
  `make_invoice` testing requires D11 approval with all six conditions specified.
- `lookup_invoice` is **not tested**. A live lookup is a read-only wallet operation that
  requires the applicable explicit authorization and an independently obtained invoice or
  payment hash; if either is unavailable, the test is skipped and recorded as untested. A
  successful lookup would prove only that one lookup request returned the recorded response,
  not `make_invoice`, `pay_invoice`, settlement behavior, or general wallet compatibility.
- `pay_invoice` is **not tested** and is **not authorized**; a real outgoing payment requires
  D08 approval.
- No live wallet operation of any kind was performed for this plan.

### 12.2 Compatibility gates

For each direction, the UI checks the reported method:

- send requires `pay_invoice`;
- receive creation requires `make_invoice`;
- receive status requires `lookup_invoice`;
- send verification preferably uses `lookup_invoice`, but a missing lookup must not be
  disguised as successful settlement.

If a required method is not reported, the relevant panel is disabled with a plain explanation.
No sample or fake transaction may stand in for an unsupported real operation.

### 12.3 Installed SDK limitations to design around

1. **`payInvoice` accepts any truthy result.** Validate the preimage and fee yourself. **[V]**
2. **`lookupInvoice` requires `result.invoice`.** NIP-47 says the lookup `invoice` field is
   optional. A wallet that omits it can fail through the installed SDK even if its status is
   valid. This must be tested with each approved wallet. **[V]/[C]**
3. **`makeInvoice` checks only `result.invoice`.** Validate amount, hash, and expiry locally.
4. **The SDK does not expose `result_type` to callers.** Do not infer that a result belongs to
   the requested method from its shape alone; require the method-specific fields. The
   low-level adapter approach that would enforce `result_type` is recorded as **UNVERIFIED**
   in section 6.6, and its verification is a prerequisite before C1/C2. **[V]/[C]**
5. **Default timeouts are long enough to create ambiguity.** A 60-second reply timeout is not a
   failure signal. The UI must enter `unknown`, not `failed`.
6. **The SDK logs errors.** Suppress console output around every operation to avoid leaking
   validation payloads or error text into DevTools.
7. **NIP-04 fallback remains possible.** Do not claim NIP-44-only security. The wallet may
   negotiate NIP-04; the existing SDK does this internally. **[V]**
8. **Notifications are not part of S6.** The sanitised `get_info` path does not preserve them,
   and subscriptions add lifecycle complexity. Polling is the smaller, more testable choice.

### 12.4 Relay compatibility

- The only approved relays remain Coinos and Alby. No custom relay, port, path, query, or
  fragment is accepted.
- CSP continues to allow only the two exact WebSocket origins.
- Alby's NWC URI path `/v1` is required by the URI validator even though CSP uses the origin.
- Relay availability is not guaranteed. A relay failure is a transport failure, not a payment
  failure.
- No fallback to another relay is allowed in S6. The wallet's URI determines the relay, and
  the allowlist is exact.

### 12.5 No universal-support claim

The Academy can honestly say: "This is a guided test with two previously observed
wallet/relay combinations. It is not a general wallet compatibility guarantee." It cannot say
"works with any NWC wallet." It cannot say a wallet's method list is verified functionality.

## 13. Security, privacy, and secret handling

### 13.1 Sensitive data classes

| Data | Sensitivity | Allowed handling |
| --- | --- | --- |
| NWC connection URI / secret | Highest; grants wallet requests | Password-style input; memory only; never log, store, send to server, or include in reports |
| Wallet pubkey / alias / relay | Connection metadata | Display as already done; no need to persist |
| Invoice | Sensitive payment request | Display/copy for the active flow; do not log; do not store |
| Payment hash | Sensitive correlator | Short display only; in-memory duplicate guard; no logging |
| Preimage | Payment secret/evidence | Validate locally; do not display full by default; never log/store |
| Amount / description | Financial context | Display; description is untrusted; no analytics |
| Error payload | May contain the above | Map to safe copy; never render raw `error.message` |

### 13.2 Credential lifecycle

- Reuse S5 `parseNwcUri`, exact relay allowlist, memory-only client, and disconnect behavior.
- Do not add `localStorage`, `sessionStorage`, IndexedDB, cookies, URL parameters, or server
  routes for the URI or secret.
- Do not add payment data to the learning API.
- Close the client on disconnect, pagehide, bfcache restore, unmount, and route change.
- Explain that JavaScript cannot guarantee physical memory zeroization; do not overclaim.
- Ask the learner to revoke the connection in the wallet when finished.

### 13.3 Logging and console

- Extend console suppression from `requestGetInfo` to every SDK call used by S6.
- Do not use `console.log`, `console.error`, or analytics for invoices, preimages, hashes,
  raw wallet results, or errors.
- The SDK's `Nip47ResponseValidationError` can include `JSON.stringify(response.result)`;
  display only a generic safe message.
- Server logs must not receive payment data because no payment route exists. If that changes,
  stop and replan with redaction, authorization, and a new threat model.
- Static tests must scan source and built bundles for credentials, storage APIs, and accidental
  payment logging.

### 13.4 Injection and content safety

- Treat the invoice description as untrusted text; React escapes it. Never use
  `dangerouslySetInnerHTML`.
- Bound all displayed strings and method names.
- Do not render wallet-provided HTML, URLs as clickable, or arbitrary error messages.
- Do not fetch invoice descriptions, LNURL endpoints, or fiat rates. That avoids new SSRF/CSP
  surfaces and unnecessary network calls.
- Display the payment hash and amount without trusting the description as identity.

### 13.5 Authorization, least privilege, and caps

- No automatic payment; the learner must explicitly confirm the current invoice.
- The proposed default is 21 sats per payment and a hard cap of 100 sats, but this requires
  owner approval. The cap is a user‑interface guard, **not** a security boundary; client‑side
  checks can be bypassed. Wallet‑side spending limits, permissions, and authorization remain
  the primary controls. Never imply the application can enforce a tamper‑proof spending limit.
- Apply least privilege: connect only the methods needed for the chosen practice, prefer the
  smallest wallet budget, and revoke the connection when finished. The wallet's own
  budget/permission is the real boundary, not the client-side cap.
- No balance check is added. `get_balance` is out of scope. The wallet can refuse with
  `INSUFFICIENT_BALANCE`.
- No keysend, hold invoices, or streaming payments.

### 13.6 Replay and duplicate safety

- Use an in-memory payment-hash set before submission.
- Never retry a possibly successful payment.
- Never convert a timeout or validation failure into a retry.
- On unknown, direct the learner to the wallet and status lookup.
- A reload clears the in-memory guard; warn clearly. The wallet is the durable source of
  transaction truth.
- Do not add server idempotency because that requires the backend expansion this plan avoids.
  The limitation must be documented and accepted, not hidden.

### 13.7 Security acceptance

AC-016 is met for S6 only when:

- no URI/secret/payment secret appears in source, bundle, tests, logs, reports, or backend;
- no storage API is added;
- console suppression covers every wallet call;
- no raw wallet error is rendered;
- CSP remains exact;
- the production build is scanned;
- the live test report contains no secret or full invoice/preimage.

## 14. User feedback and educational experience

### 14.1 State copy

| State | Heading / message | Control |
| --- | --- | --- |
| No wallet | "Connect a wallet to use the payment practice." | Connect section |
| Method missing | "This wallet does not report the method needed for this direction." | Disabled |
| Inspecting | "Checking the invoice structure and amount…" | Busy |
| Ready | "Invoice checked. Review the amount and expiry before approving." | Review |
| Confirming | "You are about to send real sats from your wallet." | Explicit pay control |
| Submitting | "Waiting for your wallet to respond. Do not submit again." | Disabled |
| Rejected | "Your wallet did not authorize this request." | Safe reason; no auto retry |
| Failed | "Your wallet reported that the payment failed. Check your wallet before trying another invoice." | No retry of same invoice |
| Unknown | "The wallet did not confirm whether this payment completed. Do not pay again." | Check status / wallet |
| Verified | "Payment evidence verified from your wallet." | Receipt with level |
| Settled | "Wallet reports the payment settled." | Receipt with level |
| Receive waiting | "Invoice created. Waiting for a payer." | Copy invoice |
| Receive settled | "Wallet reports the invoice settled." | Receipt/status |
| Status unavailable | "This wallet cannot confirm the invoice status here." | Explain limitation |

Use `role="status"` / `aria-live="polite"` for status and `role="alert"` for errors, consistent
with the current status section. Do not rely on color alone. Full accessibility review remains
S7, but S6 must not introduce an inaccessible control.

### 14.2 Educational framing

- Keep the existing wallet lesson callout and invoice literacy.
- Change the callout from "read-only" only when the S6 functionality actually exists; do not
  claim payment practice before implementation.
- Explain the difference between a wallet connection, invoice creation, invoice payment, and
  settlement in plain language.
- Show the wallet approval step as part of the lesson: the Academy asks, the wallet decides.
- State that spending money is optional and not required to learn.
- Do not use financial-return language or promise earnings.
- Do not award XP for spending. S6 is practice, not a paid unlock.

### 14.3 Receipt content

A receipt is a learning record, not a financial document. It should show:

- amount;
- short hash;
- wallet alias;
- verification level and timestamp;
- what was verified and what was not;
- a warning that the page does not store the receipt.

No PDF, certificate, email, or server persistence is added in S6. Those would expand scope.

### 14.4 Mobile and copy

- The wallet and invoice controls must remain usable at small widths; S7 owns full responsive
  QA, but S6 must not add a desktop-only control.
- Provide a copy button with a visible confirmation; clipboard failure must be handled.
- Selectable invoice text is required even if the copy button fails.
- No QR in S6 unless separately approved. On the same device, copy/paste is the minimum path.

## 15. Implementation sequence, testing, risks, and approval decisions

### 15.1 Proposed code boundaries

These are proposed paths, not created changes:

| Proposed file | Responsibility |
| --- | --- |
| `client/src/features/wallet/invoice.ts` | Normalize, decode, validate BOLT11, expiry, amount, network, cap, duplicate hash |
| `client/src/features/wallet/payment.ts` | Pure state types, transitions, evidence levels, safe error mapping |
| `client/src/features/wallet/payment-nwc.ts` | Wallet-operation boundary for `pay_invoice`, `make_invoice`, `lookup_invoice`: envelope/`result_type` validation, method-specific shape checks, console suppression, stale guards. Its concrete implementation depends on the adapter-feasibility verification in section 6.6 |
| `client/src/features/wallet/PaymentPanel.tsx` | Send UI: inspect, confirm, status, receipt |
| `client/src/features/wallet/ReceivePanel.tsx` | Create/display/poll receive invoice |
| `client/src/pages/Wallet.tsx` | Integration, retaining existing connect/disconnect flow |
| `client/src/features/wallet/WalletMethods.tsx` | Honest copy for methods used versus merely reported |
| `client/src/features/wallet/activity.ts` / `WalletActivityCallout.tsx` | Lesson copy alignment after implementation |
| `server/test/wallet-invoice.test.ts` | Parser/validator tests |
| `server/test/wallet-payment-state.test.ts` | State-machine, duplicate, timeout, verification tests |
| `server/test/wallet-payment-adapter.test.ts` | Fake-client adapter tests |
| `server/test/wallet-payments-ui.test.ts` | Static React render/state-copy tests |
| Existing `server/test/wallet*.test.ts`, `static.test.ts` | Extend security, route, CSP, bundle checks |

No server source, database model, migration, wallet route, or CSP origin is planned. If
implementation discovers a need for one, stop and return for approval.

### 15.2 Checkpoints

| Checkpoint | Work | Exit condition |
| --- | --- | --- |
| C0 — Plan approval | Owner reviews scope, client-only boundary, dependency, cap, receive scope, live-payment process | Explicit approval recorded; no code started before this |
| C1 — Invoice module | Parser/validator plus vectors | Unit tests pass; no wallet call needed |
| C2 — State and adapter | Pure state machine, fake client, console suppression, stale guards | Adapter tests pass; no live funds |
| C3 — Send UI | Inspect → confirm → submit → verify | Static/UI tests and manual local walkthrough pass |
| C4 — Receive UI | Create → display → poll → settle/expiry | Adapter/poll tests pass; no live funds |
| C5 — Security/build | Typecheck, build, full suite, secret/CSP scans | All recorded checks pass or are honestly marked skipped |
| C6 — Live non-payment compatibility | Owner tests `get_info`, read-only `lookup_invoice`, and method gating on both approved combinations, within the explicitly authorized scope and using an independently obtained fixture | Results recorded; no payment claimed; live `make_invoice` testing requires separate D11 approval |
| C7 — Live payment gate | One explicitly approved real small payment and, if possible, receiver evidence | Amount/hash evidence recorded; no secret/full invoice in report |
| C8 — S6 report and S7 handoff | Implementation report, limitations, evidence, no overclaim | Owner review; S7 may start |

**Prerequisite before C1/C2.** The S6 payment adapter must not be implemented until the
proposed NIP-47 envelope approach has been demonstrated to use supported public SDK APIs, as
required by section 6.6. If that cannot be established, stop and replan around an approved
SDK/API alternative. C1/C2 do not begin until that prerequisite is satisfied and recorded. **[C]**

**C6 scope boundary.**

- C6 covers `get_info`, method reporting, and read-only `lookup_invoice` compatibility checks
  that do not create payable invoices.
- `lookup_invoice` is a live, read-only wallet operation. It requires an existing invoice or
  payment hash obtained independently of this test.
- C6 must not create a fixture using `make_invoice`, and must not call `pay_invoice`.
- No live lookup may occur without applicable explicit owner authorization. If the applicable
  authorization or an independently obtained fixture is unavailable, the live lookup test is
  skipped and recorded as untested.
- A successful lookup proves only that that one lookup request returned the recorded
  response. It does not prove `make_invoice`, `pay_invoice`, settlement behavior, or general
  wallet compatibility.
- Invoice strings, payment hashes, preimages, secrets, and other sensitive values must not
  appear in logs, test output, or reports.
- C6 is separate from D08 (outgoing payment) and D11 (live receive-invoice creation). C6 does
  not authorize either, and neither authorizes C6.
- No live lookup was performed during this planning task.

If C6 shows a required method is unsupported, disable that direction honestly and continue
with the supported one. If C7 is not approved or funded, stop after C8 with AC-014 and the
Definition of Done marked unmet.

### 15.3 Test plan

**Invoice parser/validator tests**

- valid mainnet invoice with amount, expiry, description;
- uppercase invoice;
- `lightning:` wrapper;
- invalid bech32/checksum;
- non-BOLT11 text;
- amountless rejection;
- expired and default-expiry cases;
- sub-satoshi amount handling;
- wrong network;
- over-cap;
- duplicate hash;
- whitespace, control characters, and length bound;
- description truncation/escaping.

**State and adapter tests**

- every legal transition and every illegal transition;
- no auto-pay on mount/render;
- one `payInvoice` call per confirmation;
- duplicate click does not double-submit;
- duplicate hash blocked;
- preimage missing/malformed/mismatched;
- fee invalid;
- `PAYMENT_FAILED` mapping;
- refusal code mapping;
- publish timeout, reply timeout, network error, validation error;
- stale response after disconnect;
- late response after a new operation;
- lookup settled, pending, expired, `NOT_FOUND`, validation failure, timeout;
- receipt only at permitted evidence levels;
- no full preimage display;
- receive create result mismatch;
- receive polling stops on settle/expiry/disconnect;
- receive transient lookup error does not become failed.

**Static/security tests**

- no `localStorage`, `sessionStorage`, IndexedDB, cookie, URL, or backend credential path;
- no console logging of URI/secret/invoice/hash/preimage;
- SDK console suppression wraps all operations;
- no raw `error.message` render;
- no new relay origin and no CSP wildcard;
- no `pay_invoice` call from a route effect or automatic timer;
- built bundle secret scan;
- Wallet route remains protected and navigation unchanged.

**Commands proposed for implementation later (not run now)**

```text
cd client && npm run typecheck
cd client && npm run build
cd server && npm run typecheck
cd server && npm test
```

The existing suite uses `node:test` and `tsx`; no new test framework is required. The
database-backed S1 test remains dependent on `RUN_DB_TESTS=1` and `MONGODB_URI`; its skip must
be reported, not described as a pass. Browser interaction and live wallet behavior are not
covered by the automated suite and must be reported separately.

### 15.4 Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| No funding or receiver for AC-014 | High | High | Complete S6 Core; require explicit funding/recipient decision; document deviation; never fake |
| Required wallet method unsupported | Medium–High | High | Method gating; owner live compatibility tests; disable direction honestly |
| `lookup_invoice` response incompatibility | Medium | Medium | Test both wallets; allow `preimage-verified` without lookup; label unverified |
| Double payment | Low–Medium | High | One in-flight lock; hash guard; no retry same invoice; unknown copy |
| SDK logs sensitive response data | Medium | High | Suppress console around all calls; never display raw errors |
| Malicious invoice description/phishing | Medium | Medium | Mark untrusted; escape; amount/hash focus; no recipient identity claim |
| Local decoder misses signature verification | High | Medium | State limitation; wallet is final authority; no local authenticity claim |
| Client-only cap is bypassable | Medium | Medium | Treat as UX control; rely on wallet budget/permission; disclose |
| Reload loses pending intent | High | Medium | Session-only disclosure; direct to wallet; no false recovery |
| Deadline pressure causes scope creep | High | High | Freeze S6 scope; S7 excluded; no backend/DB/QR/history |
| Dependency approval delays parser | Medium | High | Decide at C0; if rejected, stop and choose approved decoder |
| False success claim after timeout | Medium | High | State model makes unknown sticky; no paid claim without evidence |
| Relay outage during demo | Medium | Medium | Rehearse; show honest error; no fallback relay |
| No browser/mobile walkthrough | Medium | Medium | Basic manual test; S7 owns full responsive/a11y review |
| Bundle growth from decoder | Low–Medium | Low | Measure; do not optimize in S6; S7 may address if needed |

### 15.5 Decisions requiring owner approval

**Owner-decision status summary.** No decision below has been approved by the owner. Approval
of this plan, of S6 Core, or of the architecture does **not** authorize live wallet
operations or real-money transactions.

| Item | Status |
| --- | --- |
| D01: Client-only architecture / PRD §11 deviation | Owner decision required |
| D02: Direct decoder dependency | Owner decision required |
| D03–D07 | Owner decisions required |
| D08: One real outgoing payment | Not authorized |
| D09–D10 | Owner decisions required |
| D11: Live receive-invoice creation | Not authorized |
| NIP-47 adapter feasibility | Unverified |
| C6 live lookup | Requires applicable explicit authorization and independent fixture |

**D01 remains an implementation blocker until the owner explicitly accepts or rejects the
PRD §11 deviation.** C1/C2 additionally require the adapter-feasibility prerequisite in
section 6.6 to be satisfied and recorded. **[C]**

| ID | Decision | Recommendation | Consequence if not approved |
| --- | --- | --- | --- |
| S6-D01 | Keep S6 client-only with no wallet backend/database, treating PRD §11 wallet endpoints as deferred | Approve | S6 cannot proceed under both client-only and literal §11 backend validation |
| S6-D02 | Declare `@getalby/lightning-tools@9.0.2` as a direct dependency for invoice decode/preimage validation | Approve | No safe local invoice inspection as planned; stop/replan |
| S6-D03 | Mainnet-only live practice; testnet/signet/regtest only with explicit approval | Approve mainnet-only for the demo | Wrong-network ambiguity; parser can recognize prefixes but live practice stays mainnet-only |
| S6-D04 | Default 21 sats, hard cap 100 sats per payment/invoice | Approve or set lower | A cap must exist before any live payment |
| S6-D05 | Prioritize send; receive creation/status is secondary and wallet-dependent | Approve | Receiving work may consume the remaining deadline and delay FR-010 |
| S6-D06 | Defer QR; copyable invoice is the minimum receive display | Approve | QR adds a dependency/feature before the deadline |
| S6-D07 | No persistence/recovery across reload; wallet is the durable source | Approve | Persistence needs storage/backend work and a new threat model |
| S6-D08 | Authorize at most one real payment with named recipient, amount, environment, funding source, and evidence procedure | Separate explicit approval required | No AC-014 / Definition of Done claim; stop at S6 Core |
| S6-D09 | Keep the S5 relay allowlist exactly; no new relay/wallet approval | Approve | Any new relay requires CSP, URI, and compatibility work |
| S6-D10 | Reject amountless invoices in S6 instead of adding a second amount-entry step | Approve | Amountless support adds a separate amount-confirmation state; require a new approved sub-scope |
| S6-D11 | Live receive-invoice creation is prohibited without explicit owner approval | Do not approve | Live `make_invoice` testing is prohibited until the owner separately approves D11 with all six conditions below. Until explicit approval, receive-invoice testing must use mocked adapters only. D08 and D11 are independent; neither authorizes the other. |

**D11 — live receive-invoice authorization: NOT APPROVED.**

D11 authorizes live `make_invoice` **only** when the owner explicitly approves it with all of
the following conditions specified:

1. **Receiving wallet and relay** — which wallet and which approved relay may be used.
2. **Exact invoice amount in sats** — the precise amount the live test invoice will carry.
3. **BOLT11 expiry in seconds** — the expiry the live test invoice may have.
4. **Permitted payer and test participants** — who is allowed to pay the invoice and who may
   take part in the test.
5. **Handling of unexpected incoming payments** — the agreed procedure if a payment arrives
   outside the expected scope.
6. **Whether and where the invoice may be shared** — whether the invoice or its details may
   be shared outside the controlled test.

Authorization boundaries:

- D11 authorizes live receive-invoice creation **only** when its specific conditions above
  are approved.
- D08 concerns outgoing payment and **does not** authorize D11.
- D11 **does not** authorize D08.
- Neither decision authorizes the other; each requires its own explicit owner sign-off.
- Until D11 is explicitly approved, receive-invoice testing must use mocked adapters only,
  and no live invoice may be created or solicited.

### 15.6 Definition of done for S6

**S6 Core is done when:**

- invoice inspection/validation and all send/receive state transitions are implemented and
  tested;
- every failure/timeout/unknown path is honest and has no automatic retry;
- preimage verification and optional lookup verification are implemented;
- the **receive flow is implemented and tested using mocked adapter responses** — receive UI,
  adapter behavior, state handling, validation, and status polling — including the
  "created", "waiting", "settled", and "status unavailable" states;
- S6 Core performs **no** live `make_invoice` call and creates **no** live payable invoice;
  mocked invoices and simulated payment states are never presented as real wallet activity
  or as payment evidence;
- no backend, database, storage, proxy, new route, or new relay origin is added;
- secret/console/bundle/CSP tests pass;
- client and server typechecks and builds pass; the full suite passes with skips reported;
- manual local walkthrough is recorded;
- no mock, sample, or unsupported method is presented as a real payment.

**S6 Live Evidence is satisfied when:**

- the two approved wallet/relay combinations are tested for the claimed non-payment methods
  within the explicitly authorized scope;
- one real guided payment is completed and verified at `preimage-verified` or stronger, with
  owner approval;
- the amount and payment hash match the evidence; receiver confirmation is included if
  available;
- the report contains no secret, full connection URI, or full preimage;
- AC-013/AC-014/AC-015 claims are made only for evidence actually obtained.

**Live receive testing** is a separate activity from S6 Core and is **not** part of S6 Core's
completion criteria. It consists of actual `make_invoice` requests and live invoice status
experiments, and it requires its own applicable authorization (D11) with the receiving wallet
and relay, exact amount, expiry, permitted payer, and unexpected-payment handling specified.
A created invoice is not proof of incoming payment; real incoming settlement additionally
requires a separately controlled payer and appropriate receiving-wallet capability. Live
receive testing that is not authorized is not performed, and any omission is recorded rather
than simulated.

If the S6 Live Evidence conditions are not met, S6 Core may still be complete, but S6 Live
Evidence is not satisfied and AC-014 / the Definition of Done remain unmet. A documented
deviation records that gap; it does not turn it into a completion claim.

**S6 is not complete merely because the UI exists, tests pass against fakes, or `get_info`
works.** If the live gate fails, the project may still proceed to S7 with a partial MVP, but
it must not claim the full Definition of Done.

### 15.7 Stop conditions

Stop and return for owner direction if:

- D01 is still unresolved: the owner has neither accepted nor rejected the PRD §11 client-only
  deviation, and implementation would begin on an assumed answer;
- the adapter-feasibility prerequisite in section 6.6 cannot be established with supported
  public SDK APIs, and no alternative approach has been evaluated and approved;
- the owner requires a literal PRD §11 backend wallet service;
- the direct decoder dependency is refused;
- the wallet reports no usable send method for the chosen live demo;
- the only way to proceed is a fake success, simulated settlement, or a claim not supported by
  evidence;
- a real payment is requested without a named recipient, amount, cap, funding source, and
  explicit approval (D08);
- a live invoice is requested without D11 approved with all six conditions specified;
- a live `lookup_invoice` is requested without the applicable explicit authorization and an
  independently obtained fixture;
- implementation requires storing the NWC secret, invoice history, or wallet credentials;
- a new relay, origin, provider, or paid service becomes necessary.

## Appendix A — Sources inspected

Repository:

- `PRD.md` (authority; checksum verified; not edited) — §§5.1, 7, 8, 9, 11–19, 23–25.
- `AGENTS.md` (project authority and approval boundaries).
- `client/package.json`, `client/package-lock.json`, `client/tsconfig.json`.
- `client/src/pages/Wallet.tsx` (`Wallet`, `createSession`, `onConnect`, `disconnect`,
  `WalletInfo`, lifecycle effects).
- `client/src/features/wallet/nwc.ts` (`APPROVED_RELAYS`, `parseNwcUri`,
  `sanitizeGetInfoResponse`, `describeWalletError`, `requestGetInfo`,
  `WalletClientSession`).
- `client/src/features/wallet/WalletMethods.tsx`, `methods.ts`, `activity.ts`,
  `WalletActivityCallout.tsx`.
- `client/src/App.tsx`, `client/src/components/Layout.tsx`,
  `client/src/components/ProtectedRoute.tsx`.
- `server/src/app.ts` (production CSP), `server/src/logger.ts`,
  `server/src/middleware/errors.ts`, `server/src/middleware/origin.ts`.
- `server/test/wallet.test.ts`, `wallet-methods.test.ts`, `static.test.ts`, `helpers.ts`.
- `reports/S5-NWC-WEBSITE-IMPLEMENTATION-REPORT.md` (S5 scope, security, test, and live
  evidence).
- `reports/S5-NWC-LOCAL-VALIDATION-REPORT.md` (S5 local validation context; untracked file).
- `reports/S2-PLANNING-AND-ROADMAP-REPORT.md` §5.7–5.8 and
  `reports/ZERO-BUDGET-FEASIBILITY-ADDENDUM.md` (prior S6a/S6b planning; architecture
  re-scoped by this plan).
- `reports/KAOS-ACADEMY-REMAINING-ROADMAP-AND-IMPLEMENTATION-GAP-AUDIT.md` (S6 gap and
  funding/AC-014 interpretation).

Installed package sources/types:

- `client/node_modules/@getalby/sdk/package.json` (9.0.0; `exports` map: `.`, `./lnclient`,
  `./nwc`, `./oauth`, `./webln`, `./utils`).
- `client/node_modules/@getalby/sdk/dist/types/nwc.d.ts` (NWC types and methods; `NWCClient`
  declaration at line 259 with public `pool`/`relayUrls`/`walletPubkey`/`signEvent`/`encrypt`/
  `decrypt` and private `executeNip47Request`/`_checkConnected`/`_selectEncryptionType`/
  `_findPreferredEncryptionType` at lines 309–312; `ReconnectingPool` declaration at line 222;
  export lists at lines 443–444; `nostr-tools` type import at line 1).
- `client/node_modules/@getalby/sdk/dist/types/index.d.ts` (root export lists, lines 956–957;
  `nostr-tools` type import at line 2).
- `client/node_modules/@getalby/sdk/dist/esm/nwc.js` (`getInfo`, `payInvoice`,
  `makeInvoice`, `lookupInvoice`, `executeNip47Request` at lines 7725–7812 with the
  kind-23194 template, kind-23195 `#e` correlation filter, publish, decrypt/parse, error
  mapping, reply/publish timeouts and subscription cleanup; `_checkConnected`,
  `_selectEncryptionType`, `_findPreferredEncryptionType` at lines 7813–7851; the
  `NWCWalletService` `result_type` write at line 8178; timeouts and console errors).
- `client/node_modules/@getalby/lightning-tools/package.json` (9.0.2; exports).
- `client/node_modules/@getalby/lightning-tools/dist/types/bolt11.d.ts`.
- `client/node_modules/@getalby/lightning-tools/dist/esm/bolt11.js` (`decodeInvoice`,
  `validatePreimage`, `Invoice` behavior).

Authoritative protocol/SDK documentation accessed:

- NIP-47, Nostr Wallet Connect:
  `https://raw.githubusercontent.com/nostr-protocol/nips/master/47.md` — methods,
  `pay_invoice`, `make_invoice`, `lookup_invoice`, error codes, notification/encryption
  context.
- BOLT #11, Invoice Protocol for Lightning Payments:
  `https://raw.githubusercontent.com/lightning/bolts/master/11-payment-encoding.md` —
  invoice prefixes, amount encoding, default expiry, requirements.
- Alby JS SDK NWC documentation:
  `https://raw.githubusercontent.com/getAlby/js-sdk/master/docs/nwc.md` — `NWCClient`,
  initialization, method usage.
- Alby JS SDK LN documentation:
  `https://raw.githubusercontent.com/getAlby/js-sdk/master/docs/lnclient.md` — higher-level
  `LN` behavior and receiving notes.
- NWC project overview: `https://nwc.dev/`.
- Installed SDK README: `client/node_modules/@getalby/sdk/README.md`.

## Appendix B — Inaccessible, not inspected, or not performed

- No Coinos or ZEUS wallet-provider capability documentation was inspected. Their support
  for `make_invoice`, `lookup_invoice`, or `pay_invoice` is not claimed.
- No live relay, wallet, invoice, payment, settlement, or `lookup_invoice` test was performed
  for this plan. The only live evidence is the owner’s S5 `get_info` result.
- **The low-level NIP-47 adapter approach was not implemented, prototyped, or exercised.** It
  is recorded as **UNVERIFIED** in section 6.6. No request was signed, encrypted, published,
  or subscribed to; no envelope was decrypted; no `result_type` was validated; and no
  timeout or cleanup path was observed. The read-only inspection in section 6.6 covers
  declarations and source only, and does not establish runtime behavior.
- The public availability and suitability of `nostr-tools` types (`Filter`, `Event`,
  `EventTemplate`, `Relay`) for application use was not established; they are not re-exported
  by the SDK and `nostr-tools` is not a direct client dependency.
- No production deployment, Android Chrome walkthrough, browser automation, screen-reader
  test, or responsive QA was performed. Those remain S7 or separate acceptance work.
- The Alby class reference site (`getalby.github.io`) was not needed; installed types/source
  and repository docs were used instead.
- No SDK source map or minified bundle internals were audited beyond the readable installed
  ESM implementation.
- The database-backed S1 test was not run for this plan; its prerequisite environment was not
  changed.
- No secrets, real NWC URIs, full invoices, payment hashes, or preimages are included in this
  report.

## Appendix C — Planning verification and report integrity

- The report was reviewed for the required topics, unsupported claims, scope creep,
  contradictions, and missing decisions.
- `PRD.md` SHA-256 was rechecked after writing; the value must remain
  `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`.
- The report was copied to
  `/storage/emulated/0/Download/KAOS-Bitcoin-Academy/reports/S6-IMPLEMENTATION-PLAN.md`
  and checked with `cmp` for byte equality. The final SHA-256 is recorded in the task
  completion summary, not embedded here (embedding a hash changes the hash).
- No source, configuration, manifest, lockfile, environment, PRD, git branch, commit, or
  deployment was changed by this planning task. Only this report was added.
