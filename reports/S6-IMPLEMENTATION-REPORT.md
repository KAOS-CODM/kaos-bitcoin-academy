# KAOS Bitcoin Academy — S6 Guided Lightning Send and Receive Implementation Report

- Project: KAOS Bitcoin Academy
- Phase: S6 — Guided Lightning Send and Receive
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch: `main`
- Git HEAD before and after this task: `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Result: **IMPLEMENTATION COMPLETE — 194/194 tests pass, both typechecks pass, production build succeeds. Two later defects found by live owner testing were corrected under separate approval (duplicate Wallet page rendering, and wallet-error mis-attribution). No live wallet, relay, invoice, lookup, or payment operation was performed by the agent.**
- Authoritative specification: `PRD.md` (immutable, unmodified)
- PRD SHA-256: `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`
- Frozen plan: `reports/S6-IMPLEMENTATION-PLAN.md` (not modified by this task)
- Adapter evidence: `reports/S6-NIP47-ADAPTER-FEASIBILITY-REPORT.md`

> **Status statement:** The S6 Core code path is implemented, tested against synthetic
> fixtures and an in-memory transport, and integrated into the protected `/wallet` page. It is
> **not** live-verified. Real outgoing payments (D08), live receive-invoice creation (D11),
> and live `lookup_invoice` experiments remain **unauthorized and were not performed**. No
> acceptance criterion that requires a real payment has been claimed.

---

## 1. Executive summary

| Item | Result |
| --- | --- |
| Offline adapter spike (real SDK, zero network) | **Passed — 18/18** |
| NIP-47 envelope adapter | Implemented; strict `result_type` validation |
| BOLT11 invoice decoding and validation | Implemented via the approved direct dependency |
| Guided send flow (inspect → confirm → submit → verify) | Implemented |
| Receive invoice flow (create → display → poll) | Implemented |
| Payment state model and four evidence levels | Implemented |
| Session integration on the protected `/wallet` page | Implemented |
| Automated tests | **194 pass, 0 fail, 0 skipped** (110 before S6; 84 added) |
| Typechecks | Client and server both pass |
| Production build | Succeeds (`594.25 kB` JS, `174.82 kB` gzip) |
| Live wallet operations | **None performed** |

---

## 2. Authorization and boundaries observed

Authorized and used:

- D01 — client-only architecture with the PRD §11 deviation (owner approved).
- D02 — direct `@getalby/lightning-tools@9.0.2` dependency (owner approved).
- Strict NIP-47 `result_type` validation (mandatory).

Still **unauthorized and not performed**:

| Gate | Operation | Status |
| --- | --- | --- |
| D08 | A real outgoing `pay_invoice` payment | Not authorized, not performed |
| D11 | A live `make_invoice` receive invoice | Not authorized, not performed |
| C6 | A live `lookup_invoice` experiment | Not authorized, not performed |

Every automated test uses a fake transport, a fake requester, or a published decoding fixture.
No test opens a socket, connects to a relay, or contacts a wallet.

Boundaries held: no PRD edit, no backend wallet route, no database, no proxy, no new relay,
no automatic payment retry, no fabricated success state, no weakening of envelope validation,
no unapproved dependency, no destructive Git operation, no commit, no push.

---

## 3. Offline adapter spike

The spike ran **before** any application functionality was written, as the frozen plan
requires. It drove the **real installed `@getalby/sdk@9.0.0`** over an in-memory transport so
the SDK performed real NIP-44 encryption, real event signing, and real envelope parsing with
no socket ever opened.

**Method.** `NWCClient.pool` is a public, non-readonly property. The spike replaced only that
property with `FakeNip47Pool` (`server/test/fixtures/nip47-fake-relay.ts`), which decrypts each
published request with the real NIP-44 conversation key, reads the requested method, and
answers with a synthetic kind-23195 response event. No private field, reflection,
monkey-patching, or `node_modules` modification was used.

**Results — 18/18 passed.**

| Verified behavior | Evidence |
| --- | --- |
| The real SDK negotiates NIP-44 v2 against the in-memory transport | `encryptionType === 'nip44_v2'`; the published request decrypts to `"method":"get_info"` |
| A well-formed `pay_invoice` response is accepted and the preimage is readable | `status: 'ok'`, preimage and `fees_paid` returned |
| A **mismatched** `result_type` is rejected | `invalid-envelope` |
| A **missing** `result_type` is rejected | `invalid-envelope` |
| **Malformed JSON** is rejected | `invalid-envelope` |
| A response carrying **both `error` and `result`** is rejected | `invalid-envelope` |
| A **malformed method response** (bad preimage) is rejected | `invalid-envelope` |
| An invalid `fees_paid` value is rejected | `invalid-envelope` |
| A wallet error envelope is reported with its code | `wallet-error`, `PAYMENT_FAILED` |
| A reply that never arrives times out and closes the subscription | `timeout`, `closeCount === 1` |
| A **late** response after a timeout settles the promise exactly once | `closeCount` stays `1` |
| A subscription is closed after a successful response | `closed === true`, `closeCount === 1` |
| A transport outside the allowlist is refused | `relay-not-approved`, nothing published |
| A stale session discards the response | `stale` |
| The adapter refuses to send before negotiation completed | `encryption-unavailable` |
| The reply is correlated to the request through the `#e` filter | filter equals `[requestEventId]` |
| The request template carries the NIP-47 tags | kind 23194 with `p`, `v`, `encryption` |
| A transport that throws while publishing settles the request | `not-submitted` (regression test) |

**Adapter feasibility status: FEASIBLE**, confirmed by execution rather than by inspection
alone.

---

## 4. Features implemented

### 4.1 NIP-47 envelope adapter — `client/src/features/wallet/nwc-envelope.ts`

Performs the NIP-47 lifecycle itself so the raw decrypted envelope, including `result_type`,
is available for strict validation. Uses only public `NWCClient` members:
`relayUrls`, `walletPubkey`, `encryptionType`, `encrypt`, `decrypt`, `signEvent`, `pool`.

- Subscribes **before** publishing, filtering kind 23195 by author and the `#e` request id.
- Requires `result_type` to equal the requested method.
- Requires error/result consistency; a reply carrying both is malformed.
- Applies method-specific shape rules: `pay_invoice` requires a 64-hex preimage and validates
  an optional `fees_paid`; `make_invoice` requires a 64-hex payment hash and a positive amount
  with an optional invoice; `lookup_invoice` accepts only the protocol states
  `pending`, `settled`, `accepted`, `expired`, `failed` and treats a missing `invoice` field
  as inconclusive, never as failure.
- Publishes and subscribes only to the approved relay list.
- Enforces a bounded reply timeout, closes the subscription on every terminal path, and
  settles the promise exactly once.

### 4.2 Invoice decoding and validation — `client/src/features/wallet/invoice.ts`

- Decodes with `decodeInvoice` and verifies preimages with `validatePreimage` from
  `@getalby/lightning-tools@9.0.2`.
- Normalizes an optional `lightning:` wrapper, rejects whitespace and control characters, and
  bounds input length.
- Rejects non-invoice text, wrong networks, amountless invoices, expired invoices, and
  invoices above the provisional practice limit.
- Uses the integer millisatoshi value for money decisions and never rounds a payable amount
  down; applies the BOLT11 default expiry of 3600 seconds when the tag is absent.
- States in code and in the UI that the decoder validates structure and checksum but **not**
  the BOLT11 signature.

### 4.3 Payment state model — `client/src/features/wallet/payment.ts`

- Four evidence levels kept distinct and never collapsed: `request-returned`,
  `preimage-verified`, `wallet-settled`, `receiver-confirmed`.
- A payment is submitted only from the explicit confirmation phase.
- `unknown` is never reclassified as a failure by the passage of time.
- `PaymentAttemptGuard` claims the payment hash **before** the request is published, so the
  same invoice cannot be submitted twice in one session.
- `describeNip47Failure` maps every adapter failure to a safe phase and message. A timeout,
  malformed envelope, or ambiguous outcome is never presented as a failure or a success.

### 4.4 Guided send flow — `client/src/features/wallet/PaymentPanel.tsx`

Paste invoice → inspect → review amount, hash, expiry, network and the untrusted description
→ explicit "Pay N sats" → explicit "Confirm and pay N sats" → submit once → verify the
preimage against the payment hash → optional wallet-reported settlement.

No auto-pay, no route-load payment, no automatic retry, and the preimage is validated but
never displayed.

### 4.5 Receive flow — `client/src/features/wallet/ReceivePanel.tsx`

Fixed small practice amount → create invoice → display a copyable invoice with the expiry →
poll `lookup_invoice` with a bounded deadline that stops on settlement, expiry, failure,
disconnect, or unmount.

The UI states that creating an invoice is not receiving money, and that the invoice can be
paid by anyone who receives it.

### 4.6 Session integration — `client/src/features/wallet/nwc.ts`

- `withSuppressedConsole` generalizes the S5 console suppression to every wallet call.
- `WalletClientSession.requestEnvelope` owns the adapter, binds the session attempt token so
  stale replies are discarded, and restricts the adapter to the approved relay list.
- The client object and the connection secret are still never exposed to components.

### 4.7 Page integration — `client/src/pages/Wallet.tsx`

Both panels render inside the existing protected `/wallet` page and are keyed by connection
state so they reset when the wallet disconnects. The page copy now describes the real
behaviour: `get_info` on connect, and `pay_invoice`, `make_invoice`, `lookup_invoice` only
when the learner starts a payment or an invoice.

---

## 5. Files changed

**Modified (8 tracked files):**

| File | Change |
| --- | --- |
| `client/package.json` | Added the D02-approved direct dependency `@getalby/lightning-tools@9.0.2` |
| `client/package-lock.json` | One line: the same dependency in the root package entry (the package was already installed at 9.0.2, so the tree dedupes and nothing was downloaded) |
| `client/src/features/wallet/nwc.ts` | Shared console suppression, runtime transport capability check, `WalletClientSession.requestEnvelope`, and class-based SDK error attribution (see §11.2) |
| `client/src/pages/Wallet.tsx` | Panel integration, honest copy, and unique sibling keys for the two panels (see §11.1) |
| `client/src/features/wallet/WalletMethods.tsx` | Honest copy about which methods the page calls |
| `client/src/features/wallet/WalletActivityCallout.tsx` | Honest copy about the practice section |
| `server/test/wallet.test.ts` | Assertions updated to the new accurate copy |
| `server/test/wallet-methods.test.ts` | One assertion tightened to check the reported-methods list rather than the whole document |

**Added (14 files):**

| File | Lines | Purpose |
| --- | --- | --- |
| `client/src/features/wallet/nwc-envelope.ts` | 407 | NIP-47 request/response adapter with strict envelope validation |
| `client/src/features/wallet/invoice.ts` | 234 | BOLT11 decoding and validation |
| `client/src/features/wallet/payment.ts` | 396 | Payment state model and evidence levels |
| `client/src/features/wallet/PaymentPanel.tsx` | 400 | Guided send UI |
| `client/src/features/wallet/ReceivePanel.tsx` | 300 | Receive invoice UI |
| `server/test/wallet-nip47-adapter.test.ts` | 416 | Offline spike against the real SDK |
| `server/test/wallet-invoice.test.ts` | 205 | Invoice validation tests |
| `server/test/wallet-payment-state.test.ts` | 239 | State model tests |
| `server/test/wallet-payments-ui.test.ts` | 126 | UI render tests |
| `server/test/wallet-s6-security.test.ts` | 150 | Static and security tests |
| `server/test/wallet-page-structure.test.ts` | 277 | Wallet page composition and sibling-key uniqueness (see §11.1) |
| `server/test/wallet-error-attribution.test.ts` | 187 | Real SDK error classes and their attribution (see §11.2) |
| `server/test/fixtures/nip47-fake-relay.ts` | 275 | In-memory fake NIP-47 transport |
| `server/test/fixtures/invoice-vectors.ts` | 38 | Published BOLT11 vectors and a synthetic preimage pair |

**Not modified:** `PRD.md`, `server/src/**`, any other report, any manifest other than the
client dependency declaration.

---

## 6. Tests and build results

```
cd client && npm run typecheck   ->  pass, no output
cd client && npm run build       ->  built in 943ms
                                     dist/assets/index-*.js   594.25 kB | gzip 174.82 kB
                                     dist/assets/index-*.css  25.04 kB | gzip   5.30 kB
cd server && npm run typecheck   ->  pass, no output
cd server && npm test            ->  tests 194, pass 194, fail 0, skipped 0, todo 0
```

Per-file test counts:

| Test file | Tests |
| --- | --- |
| `wallet-nip47-adapter.test.ts` | 18 |
| `wallet-invoice.test.ts` | 16 |
| `wallet-payment-state.test.ts` | 16 |
| `wallet-payments-ui.test.ts` | 8 |
| `wallet-s6-security.test.ts` | 10 |
| `wallet-page-structure.test.ts` | 7 |
| `wallet-error-attribution.test.ts` | 9 |
| **New total** | **84** |
| Pre-existing suite | 110 |
| **Full suite** | **194** |

The database-backed S1 test still requires `RUN_DB_TESTS=1` and `MONGODB_URI`; it was not
run and is not claimed as a pass.

---

## 7. Acceptance criteria status

| Criterion | Status | Evidence |
| --- | --- | --- |
| FR-009 / AC-012 — connect a compatible wallet | Reused, unchanged | S5 `get_info` evidence; no regression in the 194-test suite |
| FR-010 — complete a guided Lightning payment | **Implemented, not live-verified** | Send flow implemented end to end; 42 adapter, state, invoice and UI tests |
| AC-013 — generate or handle a real payment request | **Implemented, not live-verified** | Handle and create paths implemented; no live invoice created because D11 is unauthorized |
| AC-014 — a guided payment completed and verified | **Not met** | Requires a real payment. D08 is unauthorized; no payment was attempted |
| AC-015 — payment failures communicated accurately | **Met by automated coverage** | Nine distinct failure classes mapped to safe phases; ambiguous outcomes never shown as failure or success |
| AC-016 — wallet secrets not exposed | **Met and extended** | New static/security suite; no storage, no console output, no network calls, no embedded credential material |

**Incomplete acceptance criteria: AC-014** (and the live half of AC-013). Both are blocked on
owner authorization, not on implementation.

---

## 8. Security and privacy controls

- The NWC URI, secret, wallet pubkey, and connection object remain browser-memory-only and
  are never exposed to components, logged, stored, or sent to the server.
- Every wallet call runs with console output suppressed, so SDK validation payloads cannot
  reach DevTools.
- No invoice, payment hash, preimage, or full receipt is persisted, logged, or transmitted.
- The preimage is validated and never displayed.
- Invoice descriptions are treated as untrusted creator-supplied text and are bounded.
- Only the two approved relays are contacted; the adapter refuses any transport outside that
  list.
- No automatic retry of a possibly successful payment, and the same invoice hash cannot be
  submitted twice in one session.
- The provisional 21-sat default and 100-sat maximum are documented in code as a user
  interface guard, not a security boundary; the wallet's own spending limits, permissions,
  and authorization remain the primary controls.

---

## 9. Known limitations

1. **No live evidence.** Every payment, invoice, and lookup path is exercised only against
   mocks, synthetic fixtures, and the in-memory transport.
2. **No receiver-side confirmation.** The client can show payer preimage evidence and
   wallet-reported settlement, but not independent confirmation from the receiving side.
3. **No persistence.** A reload loses a pending intent and the in-memory duplicate guard. The
   UI directs the learner to the wallet, which remains the durable source of truth.
4. **`pool` is public by declaration but undocumented by the vendor.** The adapter is
   isolated in one module so the dependency surface stays small and reviewable.
5. **The decoder does not verify the BOLT11 signature.** A decoded invoice is well-formed,
   not proven authentic.
6. **The practice limits are provisional product defaults** pending the D04 owner decision.
7. **The production bundle exceeds 500 kB** and Vite raises its chunk-size warning. Bundle
   work is S7 scope and was not attempted.

---

## 10. Git status and commit status

**No commit, no push, no branch change, no staging.** The instructions forbid committing
without separate authorization.

```
 M client/package-lock.json
 M client/package.json
 M client/src/features/wallet/WalletActivityCallout.tsx
 M client/src/features/wallet/WalletMethods.tsx
 M client/src/features/wallet/nwc.ts
 M client/src/pages/Wallet.tsx
 M server/test/wallet-methods.test.ts
 M server/test/wallet.test.ts
?? client/src/features/wallet/PaymentPanel.tsx
?? client/src/features/wallet/ReceivePanel.tsx
?? client/src/features/wallet/invoice.ts
?? client/src/features/wallet/nwc-envelope.ts
?? client/src/features/wallet/payment.ts
?? server/test/fixtures/
?? server/test/wallet-error-attribution.test.ts
?? server/test/wallet-invoice.test.ts
?? server/test/wallet-nip47-adapter.test.ts
?? server/test/wallet-page-structure.test.ts
?? server/test/wallet-payment-state.test.ts
?? server/test/wallet-payments-ui.test.ts
?? server/test/wallet-s6-security.test.ts
?? package-lock.json
?? reports/S5-NWC-LOCAL-VALIDATION-REPORT.md
?? reports/S6-IMPLEMENTATION-PLAN.md
?? reports/S6-NIP47-ADAPTER-FEASIBILITY-REPORT.md
?? reports/S6-PAYMENT-INTERNAL-FORENSIC-AUDIT-REPORT.md
?? reports/S6-NWC-INTERNAL-ERROR-INVESTIGATION-REPORT.md
?? reports/S6-WALLET-PAGE-DUPLICATE-RENDERING-AUDIT-REPORT.md
?? tools/
```

The last four untracked entries (`package-lock.json`, `reports/S5-NWC-LOCAL-VALIDATION-REPORT.md`,
`reports/S6-IMPLEMENTATION-PLAN.md`, `reports/S6-NIP47-ADAPTER-FEASIBILITY-REPORT.md`, `tools/`)
pre-date this task or were produced by the preceding planning work. All pre-existing working
tree state was preserved; nothing was staged, committed, reset, stashed, or discarded.

---

## 11. Post-implementation corrections

Two defects were found later by **owner-performed live testing** and corrected under separate
explicit approval. Both were documented in dedicated reports, and neither was anticipated by
the original implementation pass.

### 11.1 Duplicate Wallet page rendering

**Symptom:** the Wallet page rendered the "Pay a Lightning invoice" section four times (three
before "Wallet-reported information", one after), while the receive section appeared once.

**Cause:** `client/src/pages/Wallet.tsx` gave `<PaymentPanel>` and `<ReceivePanel>` the **same
`key`** while they are siblings in one children array. React documents that non-unique keys
"may cause children to be duplicated and/or omitted". The collision is silent on mount and
only bites during post-connect reconciliation.

**Fix:** the two keys were made unique, preserving the remount-on-connect intent.

**Regression protection:** `server/test/wallet-page-structure.test.ts` (7 tests) — unique
sibling keys, one payment section, one receive section, section order, and one occurrence
under every reported-capability set. The key-uniqueness test was verified to **fail** when
the shared key was temporarily restored.

**Report:** `reports/S6-WALLET-PAGE-DUPLICATE-RENDERING-AUDIT-REPORT.md`

### 11.2 Wallet-error mis-attribution

**Symptom:** a failed connection displayed *"The wallet returned INTERNAL. No sensitive details
are displayed."*

**Cause:** `describeWalletError` checked the error **code** allow-list before the error
**class**, and `INTERNAL` is the code used by six unrelated SDK failures (relay publish error,
publish timeout, reply timeout, response decoding error, response validation error, and a
genuine wallet error). The SDK sets no `name` on any error class, so the pre-existing timeout
branch was unreachable in production. Five of the six were local failures presented as
wallet-reported errors.

**Fix:** class-based classification using `constructor.name`, with a static message per SDK
error class. Only a genuine `Nip47WalletError` now reports "The wallet returned &lt;code&gt;".

**Regression protection:** `server/test/wallet-error-attribution.test.ts` (9 tests) — real SDK
error classes, distinct descriptions, no local failure attributed to the wallet, and no
leakage of SDK error content.

**Report:** `reports/S6-NWC-INTERNAL-ERROR-INVESTIGATION-REPORT.md`

### 11.3 Payment error classification — corrected

A subsequent live payment attempt surfaced a **third** finding: a genuine wallet `INTERNAL`
error envelope for `pay_invoice` was classified as a refusal asserting *"Nothing was paid."*
Per NIP-47, `INTERNAL` means only "An internal error" and is **not** a refusal code; the
frozen plan's own taxonomy lists the seven refusal codes and does not include it.

**Corrected** under separate owner approval. `describeNip47Failure()` now splits the
wallet-error branch by code:

- the seven explicit refusal codes keep the existing `rejected` behaviour;
- `PAYMENT_FAILED` keeps its existing `failed` behaviour and wording;
- `INTERNAL`, `OTHER`, an unrecognised code, and an absent code all become the **`unknown`**
  phase, which never claims that nothing was paid, never claims success, never claims
  definite failure, and never encourages another attempt.

The NWC adapter, envelope validation, preimage verification, evidence levels, duplicate-hash
guard, no-retry behaviour, payment limits, invoice validation, and the receive flow were **not**
modified. 16 focused regression tests were added.

**Reports:** `reports/S6-PAYMENT-INTERNAL-FORENSIC-AUDIT-REPORT.md` (audit) and
`reports/S6-PAYMENT-ERROR-CLASSIFICATION-CORRECTION-REPORT.md` (correction)

---

## 12. Next practical step toward S7

The remaining S6 work is evidence, not code. The single highest-value next action is a
**separately authorized live compatibility run** on the two already approved wallet/relay
combinations, in this order and each needing its own approval:

1. **D11 — live receive-invoice creation.** Create one real invoice on the approved relay with
   the amount, expiry, permitted payer, and unexpected-payment handling specified in advance.
   Verify creation and the returned payment hash.
2. **C6 — live `lookup_invoice`.** Using an independently obtained invoice or payment hash,
   run one read-only lookup and record the response.
3. **D08 — one real outgoing payment.** Pay a small invoice created outside the Academy,
   record the preimage verification, and confirm the receiving side independently.

If those approvals are not given, S6 Core stands as an implemented and tested feature set, and
the S6 report records AC-014 and the live half of AC-013 as unmet with the reason. In either
case the next milestone is the S7 handoff: UI polish, responsive optimization, PWA support,
performance and bundle work, accessibility review, cross-browser review, and deployment
readiness — none of which was started here.
