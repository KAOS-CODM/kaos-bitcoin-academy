# KAOS Bitcoin Academy — S6 Payment "INTERNAL" Forensic Audit

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Audit type: Read-only forensic audit of the failed `pay_invoice` request
- Result: **ROOT CAUSE CONFIRMED — a genuine wallet-returned NIP-47 error envelope (code `INTERNAL`), correctly detected by the strict adapter, but MIS-CLASSIFIED by the Academy as a refusal that asserts "Nothing was paid." That claim is not supported by NIP-47 or by the frozen plan.**

> **Status statement:** This audit changed nothing and recommended a correction without
> implementing it. No wallet connection, NWC method, invoice, lookup, or payment was performed
> at any point.

---

## 1. Root cause

**Confirmed — with the caveat that the Academy's interpretation of the code is itself the
defect.**

The `INTERNAL` is **a genuine wallet-returned NIP-47 error code**, not an SDK artefact, not a
relay failure, not an adapter or validation failure.

**The defect is the Academy's interpretation.** `client/src/features/wallet/payment.ts:326–329`
maps *any* wallet error other than `PAYMENT_FAILED` to a refusal:

```ts
return {
  phase: 'rejected',
  message: `Your wallet refused the request (${code ?? 'unknown reason'}). Nothing was paid.`,
}
```

That contradicts the **frozen plan's own taxonomy**
(`reports/S6-IMPLEMENTATION-PLAN.md:1006`), which defines *Refusal* as exactly seven codes —
`UNAUTHORIZED`, `RESTRICTED`, `QUOTA_EXCEEDED`, `INSUFFICIENT_BALANCE`, `NOT_IMPLEMENTED`,
`RATE_LIMITED`, `UNSUPPORTED_ENCRYPTION`. **`INTERNAL` is not among them**, and the plan
(`:1033`) states even `PAYMENT_FAILED` must be treated as *"Wallet says no, but never assume"*.

Per NIP-47, `INTERNAL` means only *"An internal error."* It is not a refusal code and not the
payment-specific `PAYMENT_FAILED`. **"Nothing was paid" is therefore not justified by the
evidence, and `INTERNAL` should have been classified as ambiguous/unknown, not refused.**

## 2. Error origin

| Candidate | Verdict | Evidence |
| --- | --- | --- |
| Wallet-side | ✅ **CONFIRMED** | `nwc-envelope.ts:337–343` yields `kind:'wallet-error'` **only** when the envelope parsed, `result_type === method` (strict, `:323`), `error` present, `result` absent. A transport, decoding, or validation failure yields `invalid-envelope`, `not-submitted`, `timeout`, or `stale` — all different messages. |
| SDK-generated | Excluded | The adapter does not use `NWCClient.payInvoice()`; it performs the request itself. The SDK's own error classes never surface here. |
| Relay transport | Excluded | `get_info` succeeded over the same relay, and `make_invoice` + `lookup_invoice` succeeded through the same adapter. |
| Envelope validation | Excluded | Strict `result_type` matching **passed** — the envelope named `pay_invoice` correctly. |
| Adapter / local | Excluded | The same adapter served three other methods successfully. |

**Corroborating transport evidence from the rendered page:**
- `get_info` succeeded (full wallet-reported data) → publish, subscribe, NIP-44 decrypt,
  envelope parse, `result_type` match, method-shape validation **all work**.
- The receive panel showed *"Waiting for a payer"* — reachable **only** after a successful
  `make_invoice` (`ReceivePanel.tsx:105` → `:125`) **and** at least one successful
  `lookup_invoice` (`ReceivePanel.tsx:174` sets `waiting` only when `lookup.status === 'ok'`;
  `payment.ts:239–241` guards the transition).

→ **The entire NWC stack is healthy; only `pay_invoice` produced a wallet error envelope.**

## 3. Execution trace

```
PaymentPanel.tsx:118   requester.requestEnvelope('pay_invoice', { invoice: invoice.raw })
  └─ nwc.ts:397        WalletClientSession.requestEnvelope
       ├─ nwc.ts:406    hasTransportMembers(client)            ← public members present
       ├─ nwc.ts:412    new Nip47EnvelopeAdapter({ allowedRelays: APPROVED_RELAYS })
       └─ nwc-envelope.ts:request('pay_invoice', { invoice })
            ├─ :246      relaysApproved()                      ← allowlist enforced
            ├─ :277      transport.encrypt() + signEvent()     ← kind-23194, tags p/v/encryption
            ├─ :364      pool.subscribe(kinds:[23195], "#e":[event.id])   ← BEFORE publish
            ├─ :377      pool.publish(relays, signed)
            └─ :306 handleEvent()
                 ├─ :315  decrypt()  → :316 JSON.parse
                 ├─ :323  result_type !== method  → invalid-envelope     ← STRICT, PASSED
                 ├─ :328  hasError && hasResult → invalid-envelope
                 ├─ :337  hasError → { kind:'wallet-error', code: envelope.error.code ?? 'INTERNAL' }
                 └─ :350  isValidMethodResult()                       ← never reached
  ↓
PaymentPanel.tsx:120   result.status === 'failed'
  └─ payment.ts:313 describeNip47Failure('wallet-error', 'INTERNAL')
       └─ :326  phase 'rejected' → "Your wallet refused the request (INTERNAL). Nothing was paid."
  ↓
PaymentPanel.tsx:389   renders <p>The wallet refused the request</p> + state.message
```

## 4. Protocol assessment

**Request:** `{ method: 'pay_invoice', params: { invoice } }` — matches NIP-47 exactly (`amount`
and `metadata` are optional; the invoice carries its own amount, so omitting `amount` is
correct). Request event: kind 23194, tags `p`/`v`/`encryption`, NIP-44 encrypted content,
signed with the connection secret. ✅

**Response handling:** strict `result_type` match ✅ · error/result mutual exclusion ✅ ·
method-specific shape validation ✅ · preimage verification retained ✅.

**One gap:** `nwc-envelope.ts:340` defaults a missing `error.code` to `'INTERNAL'`, so
`INTERNAL` cannot be distinguished between *"the wallet explicitly sent INTERNAL"* and *"the
wallet sent an error envelope with no code"*. Both remain wallet error envelopes, so the
classification is right, but the diagnosis is ambiguous.

**NIP-47's own pay_invoice flow is the crux.** Per the specification's "Example pay invoice
flow" step 2: *"**wallet service** verifies that the author's key is authorized to perform the
payment, decrypts the payload and sends the payment."* An internal error can therefore occur
**before** the send (authorization/decryption) **or after** it (while constructing the
response). The protocol gives the client **no way to distinguish** the two from an error
envelope alone.

NIP-47 error codes relevant to this case:
- `INTERNAL`: An internal error.
- `PAYMENT_FAILED`: The payment failed. This may be due to a timeout, exhausting all routes,
  insufficient capacity or similar. *(the only pay_invoice-specific failure code)*

## 5. Payment-state assessment

**"Nothing was paid" is NOT justified.** The Academy knows only that the wallet returned a
generic internal error and **no preimage**. It cannot assert non-payment, and it should not
imply payment either.

| Evidence | Present? |
| --- | --- |
| `pay_invoice` result with a preimage | ❌ none (error envelope instead) |
| Preimage verified against the payment hash | ❌ never reached |
| `lookup_invoice` for that payment hash returning `settled` | ❌ not performed (needs authorization) |
| Receiver-side confirmation | ❌ none |

**Correct statement:** *"The wallet reported an internal error. It is not possible to confirm
whether a payment was attempted. Do not pay this invoice again; check your wallet activity."* —
which is exactly the plan's `unknown` phase, whose UI heading is already **"This payment is
unverified"** (`PaymentPanel.tsx:369–377`).

**Safety properties that are already correct:**
- **No automatic retry.** `pay_invoice` is called once, outside any loop or timer
  (`PaymentPanel.tsx:118`).
- **Duplicate-hash guard.** `guard.current.claim(...)` before the request (`:106`) and a
  pre-flight `has()` check (`:77`) prevent a second attempt on the same invoice in the session.
- **Evidence stays empty.** `transitionSend`'s `unknown` case preserves `state.evidence`
  (`payment.ts:192–197`), so no paid receipt can render; the receipt branches require
  `preimage-verified` / `wallet-settled`.

## 6. Settlement assessment — what evidence would establish payment

1. **Preimage in the `pay_invoice` response** → preimage-verified (payer-side evidence).
2. **`lookup_invoice` for that payment hash returning `state: 'settled'`** → wallet-reported
   settlement.
3. **Independent receiver-side confirmation** → receiver-confirmed receipt.

None exists. Obtaining (2) is a **read-only** wallet operation but still requires explicit
owner approval.

## 7. Ranked hypotheses (root cause of the wallet's INTERNAL remains uncertain)

1. **Connection permissions / budget** — the S5 setup guidance explicitly told the owner to
   *"limit the connection to `get_info`"* and *"use the smallest budget"* (`Wallet.tsx:403`
   region). If this connection was created without `pay_invoice` permission, the wallet service
   rejects at its authorization step, and a wallet that mishandles that path returns `INTERNAL`
   rather than `RESTRICTED`/`UNAUTHORIZED`. **Zero code change to test: generate a connection
   with `pay_invoice` explicitly permitted.**
2. **Self-payment.** The pasted invoice was **21 sat**, matching the Academy receive default,
   and the receive flow was concurrently active. Paying an invoice the *same* wallet issued is
   an unusual path; wallet services can error on it. **Zero code change to test: use an invoice
   from a different wallet.**
3. **Wallet-service internal error** during its payment attempt (route/balance/amount
   handling). Not determinable from the client side.
4. **Budget/quota exhausted** would normally be `QUOTA_EXCEEDED`; an `INTERNAL` suggests an
   unhandled path.

## 8. Smallest safe correction (recommendation only — not implemented)

**One function: `describeNip47Failure` in `client/src/features/wallet/payment.ts`.** Split the
`wallet-error` branch by code so it matches the frozen plan's taxonomy:

| Wallet code | Phase | Message |
| --- | --- | --- |
| `UNAUTHORIZED`, `RESTRICTED`, `QUOTA_EXCEEDED`, `INSUFFICIENT_BALANCE`, `NOT_IMPLEMENTED`, `RATE_LIMITED`, `UNSUPPORTED_ENCRYPTION` | `rejected` | *"Your wallet refused the request (&lt;CODE&gt;). Nothing was paid."* — justified: NIP-47 checks authorization **before** sending the payment |
| `PAYMENT_FAILED` | `failed` | unchanged — *"…Check your wallet before paying any other invoice."* |
| `INTERNAL`, `OTHER`, unknown, or absent code | **`unknown`** | *"The wallet reported an internal error. It is not possible to confirm whether a payment was attempted. Do not pay this invoice again; check your wallet activity."* |

This restores conformance with `S6-IMPLEMENTATION-PLAN.md:1006`, removes the unjustified
"Nothing was paid" claim, and moves the UI to the already-correct **"This payment is
unverified"** heading. It touches **no** protocol validation, **no** evidence rule, and adds
**no** retry.

*Optional secondary:* give `nwc-envelope.ts:340` a distinct kind for an error envelope with
**no** code, so "wallet said INTERNAL" and "wallet sent an uncoded error" become
distinguishable.

## 9. Regression tests required

1. `wallet-error` + each of the 7 refusal codes → `rejected`, message may say nothing was paid.
2. `wallet-error` + `INTERNAL` → **`unknown`**, and the message must **not** assert that
   nothing was paid.
3. `wallet-error` + `OTHER` → `unknown`.
4. `wallet-error` + an unrecognised code → `unknown`.
5. `wallet-error` + `PAYMENT_FAILED` → `failed` (unchanged).
6. Assert no `unknown`-phase message contains "Nothing was paid".
7. Adapter: an error envelope **without** `code` is still a wallet error (not
   `invalid-envelope`) — and is distinguishable from a transport failure.
8. Adapter: an error envelope with a **mismatched** `result_type` → `invalid-envelope` — strict
   validation preserved.
9. Adapter: an error envelope carrying **both** `error` and `result` → `invalid-envelope` — strict
   validation preserved.
10. After an indeterminate failure, `evidence` remains `'none'` and no paid-receipt branch can
    render.
11. No automatic retry: a failed `pay_invoice` must not trigger a second `pay_invoice` call, and
    the same payment hash must be refused by the guard.

## 10. Authorization boundary — future live operations needing explicit approval

| Operation | Why it needs approval |
| --- | --- |
| Any retry of `pay_invoice` (same or different invoice) | Real payment attempt |
| `lookup_invoice` for the attempted payment hash | **The decisive diagnostic** for whether the payment settled; read-only but still a wallet method |
| `get_balance` before/after | Would show whether funds moved; wallet method |
| `list_transactions` | Wallet method |
| A new `make_invoice` to create an independent fixture invoice | D11 |
| Creating a new NWC connection with `pay_invoice` permission | New credential; also the likely fix for hypothesis 1 |

**No live wallet operation, invoice creation, lookup, or payment was performed during this
audit.**

## 11. Repository preservation

| Item | Value |
| --- | --- |
| Path | `/data/data/com.termux/files/home/kaos-bitcoin-academy` |
| Branch | `main` — unchanged |
| HEAD | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` — unchanged |
| Working-tree entries | **30** — unchanged |
| Working-tree fingerprint | `a91ed121d62f134d60d4323175180349` — **identical** to the audit-start value |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |
| Files modified/created/deleted | **None** |
| Git operations | **None** (no stage, commit, push, stash, reset, clean, branch switch) |
| Live operations | **None** — no wallet connection, no NWC method, no invoice, no lookup, no payment |
| Scratch files | All under `/data/data/com.termux/files/usr/tmp/opencode/` — outside the repository |
