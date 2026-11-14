# KAOS Bitcoin Academy — S6 C6 Payment Settlement Verification Readiness Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Report type: Read-only readiness check (no wallet operation performed)
- Result: **READINESS CHECK COMPLETE — the lookup implementation is suitable and the operation is fully specified, but the original payment hash is NOT recoverable from existing local state, and there is currently no execution route for the lookup. Separate owner approval is required before any live call.**

> **Status statement:** No wallet method was invoked. No relay was contacted. No invoice was
> created, published, or paid. No payment was attempted or retried. No settlement was checked.
> No application code, test, configuration, manifest, or existing documentation was modified by
> this readiness check. This report file is the deliverable for the task.

---

## 1. Readiness-check result

| Dimension | Result |
| --- | --- |
| Lookup implementation suitable | **PASS** — verified end to end in source |
| Exact operation fully specified | **PASS** — method, parameters, connection, relay, and count are defined |
| Original payment hash safely identified | **FAIL — NOT AVAILABLE from local state** |
| Execution route available | **FAIL — no existing path performs this lookup** |
| Lookup possible without creating, paying, or publishing an invoice | **PASS — `payment_hash` alone is sufficient per NIP-47** |

**Overall: NOT READY TO EXECUTE.** The blocker is payload and connection availability, not the
code. Two separate things are missing, and both are held only by the owner's live browser tab.

## 2. Was the original payment hash safely identified?

**No. It is not available from any existing local state.** Verified by inspection:

| Source checked | Result |
| --- | --- |
| Repository files (tracked **and** untracked, excluding `node_modules` and `client/dist`) | Only `server/test/fixtures/invoice-vectors.ts`, which holds **published BOLT11 specification vectors** — synthetic fixtures, not the attempted invoice |
| `~/.bash_history` | 0 invoice-like strings |
| `~/.zsh_history` | Not present |
| Files under `$HOME` modified today, outside the repository | None |
| Browser storage profiles (Local Storage / IndexedDB) readable from Termux | None |
| Android Chrome application data | Not readable without root |
| Application source | **No storage API is used by any wallet module** — no `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` in `client/src/features/wallet/` or `client/src/pages/Wallet.tsx` |

The application deliberately keeps the sensitive material in page memory only:

| Material | Where it lives | Lifetime |
| --- | --- | --- |
| NWC URI, secret, relay | `WalletClientSession.client` (`nwc.ts:359`) | Page memory; lost on reload/close |
| The attempted invoice | `PaymentPanel` React state `state.invoice` (`PaymentPanel.tsx:44`) | Page memory |
| The attempted payment hash | `state.invoice.paymentHash` **and** `PaymentAttemptGuard.attempted` (`payment.ts:307`) | Page memory |
| The session's SDK client | Not exposed on `window` | Not reachable from outside the page |

`transitionSend`'s `unknown` case **retains** the invoice (`payment.ts:216`), and the guard
still holds the hash — so **if the owner's tab is still open, both the connection and the
attempted invoice are still in memory there**.

**One non-local source exists and was deliberately not used.** The owner pasted the invoice
string into the conversation earlier. That is conversation text rather than existing local
state, and the invoice is a live payment instrument; decoding it would create a persistent
record of that instrument's identifier in the repository, which the task's "safely" requirement
and the project's no-leak policy both argue against. It was therefore not decoded, not
recorded, and not written to any file.

**Even with that hash, the lookup still could not be executed by this agent**, because the NWC
connection is memory-only in the owner's tab and the session is not exposed on `window`.

## 3. Is the lookup implementation suitable?

**Yes — verified suitable in every respect the task asked about.**

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Uses the approved NWC connection and relay configuration | `WalletClientSession.requestEnvelope` builds the adapter with `allowedRelays: APPROVED_RELAYS` | `nwc.ts:453–475` |
| Relay allowlist enforced before any publish | `relaysApproved()` returns `false` unless **every** transport relay is in the allowlist; the request is then never published | `nwc-envelope.ts:220–224`, `:248–250` |
| Only the two approved relays can be contacted | `relayTargets()` filters to the allowlist | `nwc-envelope.ts:216–218` |
| Exact method and request envelope | kind-23194 request whose content is `{"method":"lookup_invoice","params":{…}}`, NIP-44 encrypted, signed with the connection secret, tagged `p`/`v`/`encryption` | `nwc-envelope.ts:230–242`, `:262–278` |
| Response envelope validated strictly | `result_type` must equal the requested method; an envelope with both `error` and `result` is invalid; the result must pass `isValidLookupInvoiceResult` | `nwc-envelope.ts:322–353`, `:155–167` |
| Subscription and correlation | Subscribes to kind 23195 authored by the wallet pubkey with `#e: [requestEventId]`, **before** publishing | `nwc-envelope.ts:362–376` |
| Exactly one request, no retry, no polling | One `pool.publish` per `request()`; no loop or timer re-publishes | `nwc-envelope.ts:390–404` |
| Bounded timeout and cleanup | Reply timer (default 60 s) closes the subscription and settles once; every terminal path closes it and clears the timer | `nwc-envelope.ts:294–304`, `:382–388` |
| Session staleness honoured | A reply arriving after a disconnect or supersession is discarded | `nwc-envelope.ts:310–313` |
| Console hygiene | The whole call runs inside `withSuppressedConsole` | `nwc.ts:475` |

**The app already exercises `lookup_invoice` today, on two different paths**, which confirms
the implementation is live rather than theoretical:

- `PaymentPanel.tsx:166` — after a **successful** preimage verification, with
  `{ payment_hash, invoice }`.
- `ReceivePanel.tsx:139` — the receive poll, with `{ invoice }`.

**No invoice needs to be created, paid, or published.** NIP-47 states for `lookup_invoice`:
*"payment hash … one of payment_hash or invoice is required"*. A lookup carrying **only**
`payment_hash` is protocol-valid and is a **read-only status read**.

### One nuance worth recording

`NIP47_LOOKUP_STATES` (`nwc-envelope.ts:101–107`) accepts exactly the NIP-47 states
`pending`, `settled`, `accepted`, `expired`, `failed`. NIP-47 does **not** define an `unpaid`
state for `lookup_invoice`. If a wallet were to return `unpaid`, the adapter's strict shape
validation would reject the envelope and the outcome would be recorded as `invalid-envelope`
→ **settlement remains unverified**, which is the conservative result the task requires for an
unrecognised state.

## 4. The exact operation requiring approval

| Field | Value |
| --- | --- |
| Method | `lookup_invoice` |
| Parameters | `{ payment_hash: <hash of the invoice previously submitted to pay_invoice> }` — the `invoice` string is **not** required and is omitted |
| Connection | The existing owner-approved NWC connection (held in memory by the owner's browser tab) |
| Relay | The approved relay named by that connection — Coinos (`wss://relay.coinos.io`) or Alby (`wss://relay.getalby.com/v1`), never anything else |
| Invocation count | **Exactly one.** No polling, no repeat, no retry |
| Prohibited in the same operation | `pay_invoice`, `make_invoice`, `get_balance`, `list_transactions`, `get_info`, any invoice creation or publication, any payment attempt, any new NWC connection, any wallet permission change |

## 5. Execution route — an additional finding

**There is currently no way to perform this lookup, even by the owner, without one of the
following.** The app's two `lookup_invoice` call sites do not cover an attempted-and-failed
payment: `PaymentPanel.tsx:166` runs only after a **successful** preimage verification, and
`ReceivePanel.tsx:139` polls a **created** invoice. After the `INTERNAL` failure the panel
sits in the `unknown` phase and renders no control that performs a lookup.

The prerequisites for the lookup **are** present in the live tab — the session is connected and
`state.invoice` still holds the attempted invoice — but nothing exposes them.

| Route | What it needs | Status |
| --- | --- | --- |
| **A. Minimal app affordance** | A "check status" control on the payment panel that calls `requestEnvelope('lookup_invoice', { payment_hash })` using the existing session and adapter | Requires **new owner approval** — this task's boundary forbids editing application code |
| **B. Outside the Academy app** | The owner performs the lookup with their own URI on their own device (wallet app, or a purpose-built local page) | No code change; the Academy's role is limited to interpreting the result |
| **C. Fresh connection + affordance** | As A, plus a newly pasted NWC connection | Requires **both** a new approval and a new credential |

**Recommendation:** route **A**. It reuses the already-verified adapter, the approved relay
allowlist, the existing session, and the retained `state.invoice`, so it requires **no new
credential, no invoice, and no payment** — and it is the only route that produces evidence the
Academy can interpret under its own strict rules.

## 6. If later authorized — execution and result

**Not executed.** No live `lookup_invoice` was performed for this task; the operation is
recorded here for the owner's decision. The fields below are therefore **not applicable**, and
are left explicitly unasserted rather than guessed.

| Item | Value |
| --- | --- |
| Lookup executed exactly once | **Not executed** — no authorization was given for this task |
| Non-sensitive wallet-reported result | **None captured** — no response was received |
| Settlement established / pending / unverified | **Unverified** — unchanged by this readiness check |

## 7. What evidence level the Academy may legitimately claim

The evidence level depends entirely on the single wallet response, and the mapping is fixed by
the frozen plan's four evidence levels (`reports/S6-IMPLEMENTATION-PLAN.md:786–800`):

| Wallet-reported result | Interpretation | Evidence level the Academy may claim |
| --- | --- | --- |
| `settled` | The wallet reports the invoice was settled | **`wallet-settled`** — wallet-reported settlement |
| `pending` / `accepted` | Non-final state | **No settlement claim.** Payment remains `unknown`; evidence stays `none` |
| `expired` | The invoice expired | **No settlement claim.** Expiry alone does not establish whether an earlier attempt settled before expiry |
| `unpaid` | Wallet reports unpaid at lookup time | **No settlement claim**; and under the adapter's strict state validation an `unpaid` state is not a NIP-47 `lookup_invoice` state, so it would be recorded as an invalid envelope → **unverified** |
| Wallet error, timeout, or malformed envelope | No usable status | **Unverified** |

**A `settled` result is wallet-reported settlement, not independent receiver confirmation.**
Two reasons:

1. This lookup runs against the **payer's own wallet**, reporting on the payment that wallet
   attempted. It is payer-side evidence.
2. The Academy's `receiver-confirmed` level requires **independent** evidence that the
   receiving side received the payment. A payer-side wallet lookup can never raise it.

Consequently, even a `settled` response raises the outcome to at most **`wallet-settled`**.
The receipt rules are unchanged: a receipt renders only for `preimage-verified` or
`wallet-settled`, and no lookup result may be converted into a verified payment receipt beyond
what the existing evidence rules permit.

**Settlement must not be inferred** from the absence of an error, from a successful
connection, from invoice expiry, or from any UI state.

## 8. Confirmation of no other operation

| Prohibited operation | Occurred? |
| --- | --- |
| `pay_invoice` (including any retry of the original payment) | **No** |
| Payment of a replacement invoice | **No** |
| `make_invoice` / creation or publication of an invoice | **No** |
| `get_info` | **No** |
| `get_balance` | **No** |
| `list_transactions` | **No** |
| `lookup_invoice` | **No — not authorized for this task** |
| Contacting an unapproved relay | **No** |
| Generating or modifying an NWC connection | **No** |
| Changing wallet permissions | **No** |
| Repeated lookups or polling | **No** |
| Exposure of NWC credentials, invoice strings, preimages, or private identifiers | **No** — none was read, recorded, or written |

## 9. Repository state and preservation

| Item | Expected | Actual | Change |
| --- | --- | --- | --- |
| Branch | `main` | `main` | none |
| HEAD | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` | none |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | none |
| Working-tree entries | 35 | 35 | none |
| Application source / tests / config / manifests | unchanged | unchanged | none |
| Existing documentation | unchanged | unchanged | none |

**No file was edited during the readiness check** except the addition of this report. All
pre-existing dirty and untracked work was preserved. **No Git operation was performed** — no
stage, commit, push, stash, reset, clean, or branch switch.

The only entry added to the working tree is this report:
`?? reports/S6-C6-PAYMENT-SETTLEMENT-READINESS-REPORT.md`.

## 10. Approval requested

**None yet.** This task's instructions were explicit that approval for this preparation task is
not authorization to execute the lookup, and the lookup has **not** been performed.

To proceed, the owner is asked to authorize **exactly one** operation:

> **`lookup_invoice` with `{ payment_hash: <hash of the invoice previously submitted to pay_invoice> }`, over the existing approved NWC connection and its approved relay, executed exactly once, with no other wallet method before or after it.**

Because of the route finding in section 5, the owner should also choose **how** it is executed:

- **(A)** approve a minimal "check status" affordance in the payment panel (new code, new
  approval) — no new credential, no invoice, no payment; or
- **(B)** execute the lookup outside the Academy app and share only the non-sensitive state
  value (`settled` / `pending` / `expired` / `failed` / error), with no invoice string, hash, or
  credential.

If neither is authorized, the settlement state remains **unverified**, and the earlier
`INTERNAL` outcome remains correctly classified as `unknown`.
