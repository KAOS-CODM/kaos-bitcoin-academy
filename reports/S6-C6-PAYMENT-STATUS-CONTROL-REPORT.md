# KAOS Bitcoin Academy — S6 C6 One-Shot Payment Status Control Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Change type: Owner-authorized UI implementation (local validation only)
- Result: **IMPLEMENTATION COMPLETE — a one-shot, user-triggered payment-status control is available in the `unknown` payment state. 232/232 tests pass, both typechecks pass, production build succeeds. NO live lookup was executed, and no wallet or relay was contacted.**

> **Status statement:** This task implemented a UI affordance only. The control was **never
> activated**. No wallet connection, NWC method, invoice, payment, or relay operation was
> performed at any point — not during implementation, not during testing, and not during
> browser verification (no browser was launched). Verification used synthetic fixtures and a
> fake requester exclusively.

---

## 1. Implementation summary

A **"Check payment status"** control now appears in the Wallet payment panel while a payment
outcome is **unverified**. It issues a single, explicitly triggered `lookup_invoice` request
carrying **only the retained payment hash**, and presents the wallet's answer conservatively.

Three pieces were added:

| Piece | Location | Purpose |
| --- | --- | --- |
| `PaymentStatusLookup` + `describePaymentStatus` + `PaymentStatusRequester` | `client/src/features/wallet/payment.ts` | One-shot guard, request shape, and conservative result interpretation |
| `PaymentStatusControl` + panel wiring | `client/src/features/wallet/PaymentPanel.tsx` | Presentational control and its local state |
| Focused regression suite | `server/test/wallet-payment-status-control.test.ts` | 21 tests over the control, the guard, and the result mapping |

The helper is necessary rather than cosmetic: without it, the one-shot guard and the result
mapping would live inline inside the component, where neither can be exercised without a
browser DOM. Extracting them into the existing payment domain module makes both directly
testable with a fake requester, and adds no new file, dependency, or mechanism.

## 2. Exact files changed

| File | Change | Size |
| --- | --- | --- |
| `client/src/features/wallet/payment.ts` | Added the status-lookup section: `PaymentStatusRequester`, `PaymentStatusKind`, `PaymentStatusOutcome`, `PaymentStatusExpectation`, the message constants, `describePaymentStatus()`, and the `PaymentStatusLookup` one-shot guard | +187 / −0 |
| `client/src/features/wallet/PaymentPanel.tsx` | Added the exported `PaymentStatusControl` component, the `statusOutcome` / `statusBusy` state, the `statusLookup` ref, the `onCheckStatus` handler, the control's render, and reset handling. `PaymentRequester` is now an alias of the shared `PaymentStatusRequester` so the structural interface is defined once | +98 / −5 |
| `server/test/wallet-payment-status-control.test.ts` | **New** — 21 focused tests | new, 296 lines |

**Not modified by this task** (verified by content signature and by the absence of this task's
symbols in each file):

`client/src/features/wallet/nwc-envelope.ts` (407 lines, unchanged) ·
`client/src/features/wallet/invoice.ts` (234 lines, unchanged) ·
`client/src/features/wallet/ReceivePanel.tsx` (300 lines, unchanged) ·
`client/src/features/wallet/nwc.ts` (494 lines) ·
`client/src/features/wallet/WalletMethods.tsx` (68 lines) ·
`client/src/features/wallet/WalletActivityCallout.tsx` (80 lines) ·
`client/src/pages/Wallet.tsx` · every other test file · `server/src/**` · every manifest and
lockfile · `PRD.md` · both frozen documents · every other report.

> The three tracked wallet files whose line counts differ from the **original** S6
> implementation baseline (`nwc.ts`, `WalletMethods.tsx`, `WalletActivityCallout.tsx`) were
> changed by **earlier, separately authorized corrections in this session** — the honest-copy
> update and the wallet-error attribution fix. Their content markers for those corrections
> were re-verified as intact, and none of them contains any symbol introduced by this task.

## 3. The one-shot lookup interaction

The control is offered **only** while the payment phase is `unknown` and the attempted invoice
is still retained:

```
Check payment status
Check whether your wallet reports this invoice as settled. This does not make another payment.
```

On an explicit click it calls, through the existing session and adapter:

```ts
requester.requestEnvelope('lookup_invoice', { payment_hash: expectation.paymentHash })
```

The invoice string is **not** sent. The adapter forwards the params unchanged, and NIP-47
requires only one of `payment_hash` or `invoice`, so `payment_hash` alone is sufficient and the
lookup is a **read-only status read** — it creates, publishes, and pays nothing.

**Guard behaviour** (`PaymentStatusLookup`, held in a `useRef` so it survives re-renders):

| Guard property | Implementation |
| --- | --- |
| At most one request per activation | `started` flag set before the request; `run()` returns the cached outcome afterwards |
| No duplicate concurrent requests | an in-flight promise is returned to a second caller instead of issuing another request |
| No automatic retry | there is no retry path at all; a failure settles once |
| No polling | exactly one `requestEnvelope` call, no timer, no interval |
| No repeat after timeout or error | the outcome is cached, so a later activation returns it unchanged |
| Not triggered by re-render or Strict Mode | the request is issued only from the click handler; there is no effect that triggers it |
| Not silently retried when the connection is stale | a stale session yields the unverified outcome and no further request |
| The payment hash and attempt guard are preserved | `PaymentAttemptGuard` is untouched and still claims the hash before any payment |
| A lookup result cannot initiate a payment | the lookup path never calls `pay_invoice` |

The guard resets only in `reset()` ("Start over"), which begins a **new attempt** — a new
intent, not a repeat of the same one.

## 4. Confirmation that no lookup executes automatically

The only call site of `requestEnvelope('lookup_invoice', …)` in the new path is inside
`PaymentStatusLookup.perform()`, which is reached only from `PaymentStatusLookup.run()`, which
is reached only from `onCheckStatus`, which is bound **solely** to the button's `onClick`.

There is no `useEffect`, no mount handler, no state-transition trigger, no reconnect trigger,
and no page-load trigger. The presentational component is inert: it renders a button and does
nothing until clicked. This is asserted directly by the test *"no lookup happens automatically
when the control renders"*, and structurally by the absence of any effect in the panel.

## 5. Confirmation that no lookup was executed during implementation or testing

**No live lookup was performed at any point.** Concretely:

- no wallet connection and no NWC URI was parsed;
- `lookup_invoice` was never invoked against a real wallet;
- `pay_invoice`, `make_invoice`, `get_info`, `get_balance`, and `list_transactions` were never
  invoked;
- no NWC relay was contacted;
- no invoice was created, published, or paid;
- no payment was attempted or retried, and no settlement was checked;
- no NWC connection was generated or modified, and no wallet permission was changed;
- the application was **not** launched against a wallet; the new control was never clicked.

All verification used synthetic fixtures and a fake requester that records calls and returns a
scripted result.

## 6. Result handling and evidence-transition behaviour

| Wallet result | Outcome kind | `settledReported` | Message |
| --- | --- | --- | --- |
| `settled` | `settled` | **true** | "Your wallet reports that this invoice was settled." |
| `pending` | `pending` | false | "Your wallet reports a pending payment state. Settlement is not confirmed." |
| `accepted` | `accepted` | false | "Your wallet accepted the payment request, but settlement is not confirmed." |
| `expired` | `expired` | false | "Your wallet reports that this invoice has expired. Its earlier settlement status remains unverified." |
| `failed` | `failed` | false | "Your wallet reports a failed payment. Check your wallet activity before taking further action." |
| error, timeout, malformed envelope, unknown state | `unverified` | false | "Payment status could not be verified. Check your wallet activity." |

### Evidence transition

A `settled` result uses the **smallest existing supported transition**: the frozen state
machine's existing `wallet-settled` case (`payment.ts`), which sets phase `wallet-settled` and
evidence `wallet-settled`. **No new transition, evidence level, or invariant was added or
changed.**

Two guards are applied before a result can raise that evidence, both required by the frozen
plan ("treat lookup `settled` as wallet-settled evidence **only if the amount/hash still
match**"):

1. The response's `payment_hash`, when reported, must equal the requested hash.
2. The response's `amount`, when reported, must equal the attempted invoice's amount in
   millisatoshis.

If either mismatches, or the response reports `settled` **without** identifying the payment
hash, the result is **unverified** — inconsistent payment data is never settlement evidence.

### Rules honoured

- A `settled` result establishes **`wallet-settled`** only. It **never** establishes
  `receiver-confirmed` — this lookup runs against the **payer's own** wallet, so it is payer-side
  evidence and can never raise the Academy to independent receiver confirmation. The existing
  receipt copy for that level already says so.
- `pending`, `accepted`, `expired`, and `failed` never change the payment phase or evidence.
  The payment stays `unknown` with evidence `none`.
- No `unpaid` state is invented or accepted. `unpaid` is not a NIP-47 `lookup_invoice` state,
  so the strict adapter already rejects it; the mapping's default branch treats any
  unrecognised state as unverified as well.
- A successful *request* is never treated as proof of settlement — only the validated
  `settled` state with matching data is.
- Preimage verification requirements are untouched.
- Receipt rendering conditions are untouched: receipts still render only for
  `preimage-verified` and `wallet-settled`.
- No new evidence level was created.

## 7. Regression tests and results

**New file `server/test/wallet-payment-status-control.test.ts` — 21 tests**, covering all
seventeen required cases:

| # | Required case | Test |
| --- | --- | --- |
| 1 | control appears only for `unknown` outcomes | *the control appears only for an unverified payment outcome* |
| 2 | no automatic lookup on render | *no lookup happens automatically when the control renders* |
| 3 | one click → exactly one lookup | *one activation initiates exactly one lookup_invoice* |
| 4 | request contains only the payment hash | *the request contains only the original payment hash* |
| 5 | rapid clicks → no duplicate requests | *rapid repeated activations do not create duplicate concurrent requests* (+ *a second activation after completion issues no further request*) |
| 6 | loading state disables the control | *the loading state disables the control* |
| 7 | `settled` shown as wallet-reported settlement | *a settled result is displayed as wallet-reported settlement* |
| 8 | `pending` claims no settlement | *a pending result does not claim settlement* |
| 9 | `accepted` claims no settlement | *an accepted result does not claim settlement* |
| 10 | `expired` claims no non-payment | *an expired result does not claim that the earlier payment never settled* |
| 11 | `failed` claims no verified non-payment | *a failed result does not claim independently verified non-payment* |
| 12 | timeout / malformed → unverified | *a timeout or malformed response leaves settlement unverified* (+ *a settled result whose hash or amount does not match is unverified*, *an unrecognised lookup state is not accepted as settlement evidence*) |
| 13 | no automatic retry | *no error result triggers an automatic retry* |
| 14 | no lookup result invokes `pay_invoice` | *no lookup result invokes pay_invoice* |
| 15 | no false `receiver-confirmed` | *no lookup result produces receiver confirmation* |
| 16 | preimage + receipt requirements intact | *the existing preimage-verification and receipt requirements remain intact* |
| 17 | duplicate-payment guard intact | *the existing duplicate-payment guard remains intact* |

Plus a privacy check: *the control never exposes a payment hash, invoice, or preimage*.

### Results

```
wallet-payment-status-control.test.ts   tests 21   pass 21   fail 0
wallet-payment-state.test.ts            + wallet-payment-classification.test.ts   tests 32   pass 32   fail 0
wallet-nip47-adapter.test.ts            tests 19   pass 19   fail 0   (fake transport only)
wallet-payments-ui.test.ts             + wallet-page-structure.test.ts            tests 15   pass 15   fail 0
FULL server suite                       tests 232  pass 232  fail 0  skipped 0  todo 0
```

The full suite grew from 211 to 232 tests (+21). No previously passing test was weakened or
removed.

## 8. Typecheck and build results

```
cd client && npm run typecheck   ->  pass, no output, no diagnostics
cd server && npm run typecheck   ->  pass, no output, no diagnostics
cd client && npm run build       ->  built in 812ms
                                     dist/assets/index-CX8mLaAS.css  25.06 kB | gzip   5.31 kB
                                     dist/assets/index-BqM6J4iV.js  599.56 kB | gzip 176.09 kB
```

The bundle grew by 3.29 kB (599.56 kB vs 596.27 kB) for the new control and helper.
`client/dist` is git-ignored (`.gitignore:5`), so no tracked generated file was altered.

**The destructive database integration suite was not run**, as instructed.

## 9. Confirmation of unchanged NIP-47 validation and payment safety invariants

| Invariant | Status | Evidence |
| --- | --- | --- |
| Strict `result_type === method` validation | **Unchanged** | `nwc-envelope.ts` not modified (407 lines); asserted by the existing adapter test |
| Error/result mutual exclusion | **Unchanged** | Same file untouched; existing adapter test still passes |
| Method-specific response-shape validation | **Unchanged** | Same; `isValidLookupInvoiceResult` untouched |
| NIP-44 decryption and envelope parsing | **Unchanged** | Same |
| Payment hash and preimage verification | **Unchanged** | `verifyPreimage(preimage, invoice.paymentHash)` still required before preimage evidence |
| Existing payment evidence levels | **Unchanged** | `PaymentEvidence` union untouched; no level added |
| Duplicate-hash guard | **Unchanged** | `PaymentAttemptGuard` untouched; still claims the hash before a payment |
| No-automatic-retry behaviour | **Unchanged** | The payment path is untouched; the new path adds one non-repeating request |
| Receipt rendering requirements | **Unchanged** | Receipts still render only for `preimage-verified` / `wallet-settled` |
| Payment limits and invoice validation | **Unchanged** | `invoice.ts` untouched (234 lines) |
| Receive flow | **Unchanged** | `ReceivePanel.tsx` untouched (300 lines) |
| NWC transport / adapter behaviour | **Unchanged** | `nwc-envelope.ts` and `nwc.ts` untouched |
| No malformed envelope becomes a valid wallet error | **Unchanged** | No fallback added; the strict path is identical |
| Frozen PRD and implementation plan | **Unchanged** | Both untouched; PRD SHA-256 verified |

## 10. Confirmation of zero live wallet and relay operations

**None occurred.** No wallet connection, no NWC method, no relay contact, no invoice
creation, publication, or payment, no settlement check, no NWC connection generated or
modified, and no wallet permission change. The new control was never activated. The application
was not launched against a wallet.

## 11. Git branch, HEAD, and working-tree status

| Item | Before this task | Now | Change |
| --- | --- | --- | --- |
| Branch | `main` | `main` | none |
| HEAD | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` | unchanged | none |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | unchanged | none |
| Working-tree entries | 36 | **37** | +1 |

**The single new entry is this task's test file:**

```
?? server/test/wallet-payment-status-control.test.ts
```

The eight tracked modifications shown by `git diff --stat` are **pre-existing dirty work from
earlier S6 tasks in this session** and were not altered here. All pre-existing modifications
and untracked files were preserved.

**No Git operation was performed** — no stage, commit, push, stash, reset, clean, or branch
switch.

## 12. Remaining limitations and further approvals required

1. **The control is deliberately inert.** It requires the owner's explicit click, and the
   earlier `INTERNAL` payment remains **unverified** until it is activated.
2. **A live lookup still needs separate authorisation.** One `lookup_invoice` against the
   original payment hash, over the existing approved connection and relay, exactly once — as
   scoped in `reports/S6-C6-PAYMENT-SETTLEMENT-READINESS-REPORT.md`.
3. **The control only works while the tab is open.** The invoice, the hash, and the NWC
   connection all live in page memory; a reload loses them and the control disappears. A
   reload would also require a fresh connection.
4. **One lookup per attempt, by design.** A second check needs a separate deliberate action
   and approval; repeat-lookup functionality was not implemented, per the authorisation.
5. **The lookup is payer-side.** Even a `settled` answer is wallet-reported settlement and
   cannot raise the Academy to `receiver-confirmed`; independent receiver confirmation would
   need separate evidence.
6. **The control depends on the wallet reporting `lookup_invoice`.** If the connected wallet
   does not report it, the lookup would fail and settlement would remain unverified. The
   control is still offered so the attempt can be made and its failure explained.
7. **S7 remains untouched** — no UI polish, PWA, performance, accessibility, cross-browser,
   or deployment work was started.
