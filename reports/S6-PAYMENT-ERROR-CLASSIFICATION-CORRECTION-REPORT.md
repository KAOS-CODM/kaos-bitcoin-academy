# KAOS Bitcoin Academy — S6 Payment Error Classification Correction Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Change type: Owner-authorized source correction (implementation only)
- Result: **CORRECTION COMPLETE — a wallet-returned `INTERNAL` error is now classified as an indeterminate `unknown` outcome instead of a definite refusal. 211/211 tests pass, both typechecks pass, production build succeeds. No live wallet or relay operation was performed.**

> **Status statement:** This was an implementation task, not an audit. Only the approved
> classification code and focused test files were touched. The NWC adapter, NIP-47 envelope
> validation, payment execution, preimage verification, evidence levels, duplicate-hash guard,
> retry behaviour, payment limits, invoice validation, the receive flow, the frozen PRD, and the
> frozen implementation plan were **not** modified. No wallet or relay was contacted.

---

## 1. Implementation summary

The forensic audit (`reports/S6-PAYMENT-INTERNAL-FORENSIC-AUDIT-REPORT.md`) confirmed that
`describeNip47Failure()` treated **every** wallet error other than `PAYMENT_FAILED` as a
refusal, so a genuine wallet `INTERNAL` error produced:

> "Your wallet refused the request (INTERNAL). Nothing was paid."

NIP-47 defines `INTERNAL` only as *"An internal error"*, and the frozen plan's own taxonomy
(`reports/S6-IMPLEMENTATION-PLAN.md:1006`) lists *Refusal* as exactly seven codes that do not
include `INTERNAL`. The plan also states (`:1033`) that even `PAYMENT_FAILED` must not be
assumed to mean no payment occurred.

The correction splits the wallet-error branch by code:

- the **seven explicit refusal codes** keep the existing `rejected` behaviour and wording,
  which remains justified because NIP-47 has the wallet service verify authorization
  **before** it sends any payment;
- **`PAYMENT_FAILED`** keeps its existing `failed` behaviour and wording unchanged;
- **every other wallet error** (`INTERNAL`, `OTHER`, an unrecognised code, or an absent code)
  becomes the **`unknown`** phase, which never claims that nothing was paid, never claims
  success, never claims definite failure, and never encourages another attempt.

An unrecognised code is deliberately **not** echoed into the message, because an
unrecognised code is arbitrary wallet-supplied text of unbounded length.

## 2. Exact files changed

| File | Change | Size |
| --- | --- | --- |
| `client/src/features/wallet/payment.ts` | Added the `PAYMENT_REFUSAL_CODES` constant and rewrote the `case 'wallet-error':` branch of `describeNip47Failure()` | +39 / −6 |
| `server/test/wallet-payment-classification.test.ts` | **New** — 16 focused regression tests for the corrected classification and the safety invariants | new, 278 lines |
| `server/test/wallet-nip47-adapter.test.ts` | **One test added** — an error envelope without a code stays a wallet error, not a transport failure | +24 / −0 |

**Not modified:** `client/src/features/wallet/nwc-envelope.ts` (mtime unchanged at 09:27),
`client/src/features/wallet/invoice.ts`, `client/src/features/wallet/PaymentPanel.tsx`,
`client/src/features/wallet/ReceivePanel.tsx`, `client/src/features/wallet/nwc.ts`,
`client/src/pages/Wallet.tsx`, every other test file, `server/src/**`, every manifest and
lockfile, `PRD.md`, and both frozen documents.

The adapter was verified unchanged by mtime and by source assertions in the new test file
(strict `result_type` comparison, error/result mutual exclusion, and the `INTERNAL` fallback
are all still present verbatim).

## 3. Classification table

### Before → after

| Wallet error code | Before | After | Changed |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | `rejected` | `rejected` | no |
| `RESTRICTED` | `rejected` | `rejected` | no |
| `QUOTA_EXCEEDED` | `rejected` | `rejected` | no |
| `INSUFFICIENT_BALANCE` | `rejected` | `rejected` | no |
| `NOT_IMPLEMENTED` | `rejected` | `rejected` | no |
| `RATE_LIMITED` | `rejected` | `rejected` | no |
| `UNSUPPORTED_ENCRYPTION` | `rejected` | `rejected` | no |
| `PAYMENT_FAILED` | `failed` | `failed` | no |
| **`INTERNAL`** | **`rejected`** | **`unknown`** | **YES** |
| **`OTHER`** | **`rejected`** | **`unknown`** | **YES** |
| **unrecognised code** | **`rejected`** | **`unknown`** | **YES** |
| **absent code** | **`rejected`** | **`unknown`** | **YES** |

### Messages after the change

| Case | Message |
| --- | --- |
| Refusal codes | *"Your wallet refused the request (`&lt;CODE&gt;`). Nothing was paid."* — unchanged |
| `PAYMENT_FAILED` | *"Your wallet reported that the payment failed. Check your wallet before paying any other invoice."* — unchanged |
| `INTERNAL` | *"The wallet reported an internal error. It is not possible to confirm whether a payment was attempted. Do not pay this invoice again; check your wallet activity."* |
| `OTHER` / unrecognised / absent | *"The wallet reported an error without a usable reason. It is not possible to confirm whether a payment was attempted. Do not pay this invoice again; check your wallet activity."* |

The `INTERNAL` wording matches the specified text exactly. The parallel wording for
`OTHER`, unrecognised, and absent codes is used because "an internal error" would be
factually wrong for those cases; it is an equally precise equivalent that satisfies the same
constraints.

## 4. Regression tests and results

**New file `server/test/wallet-payment-classification.test.ts` — 16 tests:**

| # | Test | Requirement |
| --- | --- | --- |
| 1 | each of the seven refusal codes is classified as a rejection | 1 |
| 2 | an INTERNAL wallet error is classified as unknown, not as a rejection | 2 |
| 3 | OTHER, an unrecognised code, and a missing code are classified as unknown | 3, 4, 5 |
| 4 | PAYMENT_FAILED keeps its existing failed behaviour and wording | 6 |
| 5 | an unknown outcome never claims that nothing was paid | 7 |
| 6 | an unknown outcome never claims that the payment succeeded or definitely failed | 8 |
| 7 | an unknown outcome never encourages another payment attempt | — (message constraint) |
| 8 | an unknown outcome preserves empty payment evidence | 9 |
| 9 | an unknown outcome cannot be advanced to a paid receipt | 10 |
| 10 | a failed or ambiguous payment cannot be resubmitted from its terminal phase | 11 |
| 11 | the duplicate-hash guard still refuses a second attempt on the same payment hash | 12 |
| 12 | the payment panel issues exactly one pay_invoice request and no automatic retry | 11 |
| 13 | the payment panel claims the payment hash before the request is issued | 11, 12 |
| 14 | the strict envelope validation in the adapter is unchanged | invariants |
| 15 | the preimage verification requirement is unchanged | invariants |
| 16 | the payment limits and invoice validation are unchanged | invariants |

**Adapter file `server/test/wallet-nip47-adapter.test.ts` — one test added:**

- *an error envelope without a code stays a wallet error, not a transport failure* — asserts the
  adapter returns `{ status: 'failed', kind: 'wallet-error', code: 'INTERNAL' }` and that the
  kind is **not** `not-submitted`, `timeout`, `invalid-envelope`, or `stale`.

### Results

```
wallet-payment-classification.test.ts   tests 16   pass 16   fail 0
wallet-nip47-adapter.test.ts            tests 19   pass 19   fail 0
full server suite                       tests 211  pass 211  fail 0  skipped 0  todo 0
```

The two pre-existing adapter invariants were confirmed still covered by existing tests:
*mismatched `result_type` remains invalid* (line 158) and *an envelope containing both
`error` and `result` remains invalid* (line 188). The *missing `result_type`* case was already
covered (line 168).

## 5. Typecheck results

```
cd client && npm run typecheck   ->  pass, no output, no diagnostics
cd server && npm run typecheck   ->  pass, no output, no diagnostics
cd client && npm run build       ->  built in 851ms
                                     dist/assets/index-CX8mLaAS.css  25.06 kB | gzip 5.31 kB
                                     dist/assets/index-CvggaT0V.js  596.27 kB | gzip 175.31 kB
```

The production bundle grew by 0.57 kB (596.27 kB vs 595.70 kB) because of the added
classification constant and branch. `client/dist` is git-ignored, so no generated tracked file
was altered.

**The destructive database integration suite was not run**, as instructed.

## 6. Confirmation of unchanged protocol and payment safety invariants

| Invariant | Status | How verified |
| --- | --- | --- |
| Strict `result_type === method` validation | **Unchanged** | `nwc-envelope.ts` not modified (mtime 09:27); asserted by the new test file |
| Error/result mutual-exclusion validation | **Unchanged** | Same; existing adapter test at line 188 still passes |
| Method-specific response-shape validation | **Unchanged** | Same; `isValidMethodResult` untouched |
| NIP-44 decryption and envelope parsing | **Unchanged** | Same; `handleEvent` untouched |
| Payment hash and preimage verification | **Unchanged** | `verifyPreimage(preimage, invoice.paymentHash)` still required before evidence; asserted |
| Existing payment evidence levels | **Unchanged** | `PaymentEvidence` union untouched; `unknown` preserves `state.evidence` |
| Duplicate-hash guard | **Unchanged** | `PaymentAttemptGuard` untouched; behaviour asserted |
| No-automatic-retry behaviour | **Unchanged** | One `pay_invoice` call, no loop/timer/retry; the hash is claimed before the request; asserted |
| Receipt rendering requirements | **Unchanged** | Receipts render only for `preimage-verified` / `wallet-settled`; asserted |
| Payment limits | **Unchanged** | `PRACTICE_*` constants untouched; asserted |
| Invoice validation | **Unchanged** | `invoice.ts` not modified; asserted |
| Receive flow | **Unchanged** | `ReceivePanel.tsx` not modified |
| NWC transport / adapter behaviour | **Unchanged** | `nwc-envelope.ts` not modified; `nwc.ts` not modified by this task |
| Malformed envelopes are never converted into valid wallet errors | **Unchanged** | No fallback added; an envelope with a mismatched `result_type` or with both `error` and `result` still yields `invalid-envelope` |

**An `unknown` outcome produces no paid receipt and populates no payment evidence.** The panel's
failure branch sets the `unknown` phase and returns immediately
(`PaymentPanel.tsx:123–129`), before the preimage branch can run; the receipt blocks render
only for `preimage-verified` and `wallet-settled`.

## 7. Confirmation of zero live wallet/relay operations

**None were performed.** Specifically, during this task there was:

- no wallet connection and no NWC URI parsed;
- no invocation of `get_info`, `get_balance`, `pay_invoice`, `make_invoice`,
  `lookup_invoice`, or `list_transactions`;
- no NWC relay contacted, no invoice created, published, or looked up;
- no payment attempted or retried, and no settlement checked;
- no NWC connection generated and no wallet permission changed.

All verification used the in-memory fake transport and synthetic fixtures only.

## 8. Git branch, HEAD, and working-tree status

| Item | Audit baseline | Now | Change |
| --- | --- | --- | --- |
| Branch | `main` | `main` | none |
| HEAD | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` | none |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | none |
| Working-tree entries | 30 | 34 | +4 |

**The four added entries are all documentation, not code:**

| Entry | Origin |
| --- | --- |
| `?? reports/S6-WALLET-PAGE-DUPLICATE-RENDERING-AUDIT-REPORT.md` | written after the audit baseline |
| `?? reports/S6-NWC-INTERNAL-ERROR-INVESTIGATION-REPORT.md` | written after the audit baseline |
| `?? reports/S6-PAYMENT-INTERNAL-FORENSIC-AUDIT-REPORT.md` | written after the audit baseline |
| `?? server/test/wallet-payment-classification.test.ts` | **this task** |

**This task's code changes** are confined to the two files already listed in section 2
(`payment.ts`, which is an untracked S6 file, and `wallet-nip47-adapter.test.ts`, which gained
one test). The eight tracked modifications shown by `git diff --stat`
(`client/package.json`, `client/package-lock.json`, `WalletActivityCallout.tsx`,
`WalletMethods.tsx`, `nwc.ts`, `Wallet.tsx`, `wallet-methods.test.ts`, `wallet.test.ts`) are
**pre-existing dirty work from earlier S6 tasks** and were not altered here — confirmed by
mtime (`nwc.ts` 13:07, `Wallet.tsx` earlier) versus this task's files (14:11–14:16).

**No Git operations were performed:** no stage, commit, push, stash, reset, clean, or branch
switch. Every pre-existing modification and untracked file was preserved.

## 9. Remaining issues and follow-up approvals required

1. **The wallet's `INTERNAL` cause is still unknown.** The correction fixes the *reporting*, not
   the wallet behaviour. The leading hypotheses from the audit remain: connection permissions
   (the S5 guidance asked for a `get_info`-only connection) and a self-payment (the invoice
   matched the Academy's own 21-sat receive invoice). Both are testable by the owner with no
   code change.
2. **Live verification still requires separate approval** — a `lookup_invoice` for the attempted
   payment hash is the decisive read-only diagnostic for whether a payment settled. It is
   explicitly **not** authorised by this task.
3. **Optional refinement, not implemented:** `nwc-envelope.ts:340` defaults a missing
   `error.code` to `'INTERNAL'`, so "the wallet said INTERNAL" and "the wallet sent an uncoded
   error" remain indistinguishable at the adapter level. The correction handles both safely
   (both → `unknown`); a distinct kind would improve diagnosis only.
4. **Optional alignment, not implemented:** the standalone S5 harness
   (`tools/s5-nwc-validation/src/main.js:71–87`) carries its own copy of the older error
   taxonomy. It is the owner's tool, not the application, so it was left untouched.
5. **S7 remains untouched** — no UI polish, PWA, performance, accessibility, cross-browser, or
   deployment work was started.
