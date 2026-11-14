# KAOS Bitcoin Academy — S6 C6 Settlement Evidence Validation Correction Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Change type: Owner-approved correction of a frozen-plan evidence-validation gap
- Result: **CORRECTION COMPLETE — a `lookup_invoice` response may now become `wallet-settled` evidence only when it reports **both** a matching payment hash **and** a matching amount. 234/234 tests pass, both typechecks pass, production build succeeds. No live lookup was executed and no wallet or relay was contacted.**

> **Status statement:** This was a code correction under explicit owner approval of the
> read-only audit findings. No wallet connection, NWC method, invoice, payment, or relay
> operation was performed. The adapter, envelope validation, preimage verification, evidence
> levels, one-shot guard, and receipt gating were not weakened. The frozen PRD and
> implementation plan were not modified.

---

## 1. Background — the audited defect

The read-only audit (`reports/S6-C6-PAYMENT-SETTLEMENT-READINESS-REPORT.md` and the C6
settlement evidence audit) found a deviation from the frozen plan.

**The frozen rule** is stated four times in `reports/S6-IMPLEMENTATION-PLAN.md`:

| Line | Text |
| --- | --- |
| `:681` | *"treat lookup `settled` as wallet-settled evidence **only if the amount/hash still match**"* |
| `:701` | *"`wallet-settled` \| Lookup reports settled **and hash/amount match**"* |
| `:913` | *"`wallet-settled` \| `lookup_invoice` reports `settled`, **with matching hash/amount**"* |
| `:980` | *"if lookupEnvelope.result.state == settled **and hash/amount match** -> wallet-settled"* |

**The defect:** `describePaymentStatus()` in `client/src/features/wallet/payment.ts` required
only a **present and matching `payment_hash`**. The amount was validated *only when present*.
A `lookup_invoice` response with `state: 'settled'`, a **matching** `payment_hash`, and an
**absent** `amount` therefore returned `settledReported: true`, and the panel promoted the
payment to `wallet-settled` evidence and rendered a "Wallet reports the payment settled"
receipt.

That is **weaker than the frozen rule**: an absent `amount` cannot "match". NIP-47 marks
`payment_hash` and `amount` as **required** (not optional) fields of the `lookup_invoice`
response, so a compliant wallet always reports both. The C6 path has no preimage verification,
so the amount check was the only amount confirmation before settlement evidence was raised.

**A second instance of the same deviation** was found on the pre-existing payment **success**
path (`PaymentPanel.tsx`, previously `:254–265`): it promoted to `wallet-settled` on a bare
`state === 'settled'` with **no hash or amount matching at all**.

## 2. Implementation summary

**2.1 The evidence rule — `client/src/features/wallet/payment.ts` (`:533–550`)**

The `settled` branch now requires **both** fields to be present, in addition to the existing
match checks:

```ts
case 'settled': {
  // NIP-47 requires both the payment hash and the amount in a lookup_invoice response, and
  // the frozen plan allows wallet-settled evidence only when the hash/amount still match.
  // A response that does not report both cannot confirm the payment, so it stays
  // unverified rather than becoming settlement evidence.
  if (reportedHash === undefined || reportedAmount === undefined) {
    return { kind: 'unverified', message: PAYMENT_STATUS_UNVERIFIED_MESSAGE, settledReported: false }
  }
  return { kind: 'settled', message: PAYMENT_STATUS_MESSAGES.settled, settledReported: true }
}
```

**2.2 The success path — `client/src/features/wallet/PaymentPanel.tsx` (`:261–271`)**

The pre-existing success path now uses the **same shared rule** instead of a bare state check,
so there is exactly one implementation of the frozen requirement:

```tsx
if (lookup.status === 'ok') {
  // The same hash/amount match rule applies here as in the status control: the frozen
  // plan allows wallet-settled evidence only when both still match.
  const outcome = describePaymentStatus(lookup, {
    paymentHash: invoice.paymentHash,
    amountMsat: invoice.amountMsat,
  })
  if (outcome.settledReported) {
    setState((current) => transitionSend(current, { type: 'wallet-settled' }))
  }
}
```

**2.3 The adapter was deliberately not touched.** `isValidLookupInvoiceResult`
(`nwc-envelope.ts:155–167`) legitimately tolerates absent optional fields at the **shape**
stage — the frozen plan's own §3.3 rule says the adapter must rely on `state` and *"where
available"*, `payment_hash`, `amount`*. The stricter requirement belongs to **evidence
promotion**, and that is exactly where it was applied. No malformed envelope is converted into
a valid wallet error, and the `result_type === method` check is unchanged.

## 3. Exact files changed

| File | Change | Size |
| --- | --- | --- |
| `client/src/features/wallet/payment.ts` | The `settled` branch of `describePaymentStatus()` now requires a present **and** matching `payment_hash` **and** amount | +7 / −3 |
| `client/src/features/wallet/PaymentPanel.tsx` | The payment success path now routes its lookup through `describePaymentStatus()` so both paths share one rule; `describePaymentStatus` added to the imports | +9 / −6 |
| `server/test/wallet-payment-status-control.test.ts` | Two new tests (missing amount; neither field present) and one new test (the success path applies the shared rule) | +93 / −0 |

**Not modified:** `client/src/features/wallet/nwc-envelope.ts` (407 lines, unchanged) ·
`client/src/features/wallet/invoice.ts` (234, unchanged) ·
`client/src/features/wallet/ReceivePanel.tsx` (300, unchanged) ·
`client/src/features/wallet/nwc.ts` · `WalletMethods.tsx` · `WalletActivityCallout.tsx` ·
`client/src/pages/Wallet.tsx` · every other test file · `server/src/**` · every manifest and
lockfile · `PRD.md` · `reports/S6-IMPLEMENTATION-PLAN.md` · every other report.

## 4. Corrected behaviour — verified

| Response | Before | After |
| --- | --- | --- |
| `settled` + matching hash + matching amount | `settled` / `true` | `settled` / `true` — unchanged |
| `settled` + matching hash + **missing amount** | **`settled` / `true`** | **`unverified` / `false`** ✅ |
| `settled` + matching hash + mismatched amount | `unverified` / `false` | unchanged |
| `settled` + mismatched hash + matching amount | `unverified` / `false` | unchanged |
| `settled` + missing hash + matching amount | `unverified` / `false` | unchanged |
| `settled` + neither field | `unverified` / `false` | unchanged |
| `pending` / `accepted` / `expired` / `failed` | `unverified` (phase unchanged) | unchanged |
| timeout / malformed envelope / unknown state | `unverified` | unchanged |

The success path now behaves identically: it can only reach `wallet-settled` when the lookup
reports a **matching hash and a matching amount**.

## 5. Regression tests and results

**Two new tests in `server/test/wallet-payment-status-control.test.ts`:**

| Test | Asserts |
| --- | --- |
| *a settled result whose hash or amount does not match is unverified* (extended) | a `settled` response with a matching hash and **no** `amount` → `kind: 'unverified'`, `settledReported: false` |
| *a settled response that reports neither hash nor amount is unverified* | `settled` with neither field → `unverified`, `settledReported: false` |

**One new test:**

| Test | Asserts |
| --- | --- |
| *the payment success path applies the same hash and amount match rule* | the success path no longer contains a bare `transaction.state === 'settled'` check, and calls `describePaymentStatus(lookup, { paymentHash, amountMsat })` |

### Results

```
wallet-payment-status-control.test.ts   tests 23   pass 23   fail 0
FULL server suite                       tests 234  pass 234  fail 0  skipped 0  todo 0
```

The suite grew from 232 to 234 tests (+2 net: three added, one existing test extended). No
previously passing test was weakened or removed.

## 6. Typecheck and build results

```
cd client && npm run typecheck   ->  pass, no output, no diagnostics
cd server && npm run typecheck   ->  pass, no output, no diagnostics
cd client && npm run build       ->  built in 850ms
                                     dist/assets/index-CX8mLaAS.css  25.06 kB | gzip   5.31 kB
                                     dist/assets/index-CidtUX0l.js  599.61 kB | gzip 176.10 kB
```

The bundle grew by 0.05 kB (599.61 kB vs 599.56 kB). `client/dist` is git-ignored
(`.gitignore:5`), so no tracked generated file was altered. **The destructive database
integration suite was not run.**

## 7. Unchanged invariants — confirmation

| Invariant | Status |
| --- | --- |
| Strict `result_type === method` validation | **Unchanged** — `nwc-envelope.ts` not modified |
| Error/result mutual exclusion | **Unchanged** |
| Method-specific response-shape validation | **Unchanged** — the adapter still tolerates absent optional fields at the shape stage, as the plan requires |
| NIP-44 decryption and envelope parsing | **Unchanged** |
| Payment hash and preimage verification | **Unchanged** — `verifyPreimage` still required before `preimage-verified` |
| Existing payment evidence levels | **Unchanged** — no level added or removed |
| Duplicate-hash guard | **Unchanged** — `PaymentAttemptGuard` untouched |
| No-automatic-retry behaviour | **Unchanged** — the one-shot guard and the payment path are untouched |
| Receipt rendering requirements | **Unchanged** — receipts still render only for `preimage-verified` and `wallet-settled` |
| Payment limits and invoice validation | **Unchanged** |
| Receive flow | **Unchanged** |
| NWC transport / adapter behaviour | **Unchanged** |
| Frozen PRD and implementation plan | **Unchanged** — PRD SHA-256 verified |

**No result creates `receiver-confirmed`.** The only transitions the panel dispatches are
`preimage-verified` (after a verified preimage) and `wallet-settled` (after a validated
lookup match), both through the frozen state machine.

## 8. Zero live wallet and relay operations

**None occurred.** No wallet connection, no NWC URI parsed, no `lookup_invoice`, no
`pay_invoice`, no `make_invoice`, no `get_info`, no `get_balance`, no `list_transactions`, no
relay contacted, no invoice created, published, or paid, no payment attempted or retried, no
settlement checked, no credential or connection generated or modified, and no wallet
permission changed. The status control was **never activated**; the application was not
launched against a wallet. Verification used synthetic fixtures and a fake requester only.

## 9. Git branch, HEAD, and working-tree status

| Item | Before | Now | Change |
| --- | --- | --- | --- |
| Branch | `main` | `main` | none |
| HEAD | `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` | unchanged | none |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` | unchanged | none |
| Working-tree entries | 38 | **38** | none |
| Working-tree fingerprint | `9afba049da830aca1a3549c543b65e6b` | unchanged | none |

**No new file was added by this task** — all three changed files were already tracked in the
working tree as part of the S6 work. The eight tracked modifications and 30 untracked entries
are the same set as before this task; only the content of the three listed files changed.

**No Git operation was performed** — no stage, commit, push, stash, reset, clean, or branch
switch. Every pre-existing modification and untracked file was preserved.

## 10. Remaining limitations and further approvals required

1. **The settlement question is still unanswered.** The earlier `INTERNAL` payment remains
   **unverified**. The control is implemented and the evidence rule is now plan-conformant, but
   nothing has been looked up.
2. **A live lookup still needs separate authorisation**: one `lookup_invoice` against the
   original payment hash, over the existing approved connection and relay, exactly once, as
   scoped in `reports/S6-C6-PAYMENT-SETTLEMENT-READINESS-REPORT.md`.
3. **Practical consequence to be aware of:** because the amount is now required, a wallet that
   omits `amount` from a `lookup_invoice` response will produce an **unverified** outcome
   rather than settlement evidence. That is the intended conservative behaviour under the
   frozen rule, and it is the correct outcome to expect if the wallet's response shape is
   incomplete.
4. **The control still depends on page memory** — the invoice, the hash, and the NWC
   connection exist only while the tab stays open. A reload loses all three and the control
   disappears.
5. **One lookup per attempt by design** — a repeat needs a separate deliberate action and
   approval.
6. **Payer-side evidence only** — even a conformant `settled` answer cannot raise the Academy
   to `receiver-confirmed`.
7. **S7 remains untouched.**
