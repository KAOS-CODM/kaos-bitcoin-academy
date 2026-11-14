# KAOS Bitcoin Academy — C6 One-Time Live Settlement Lookup Report

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Operation type: Owner-authorised single live `lookup_invoice`
- Result: **NOT EXECUTED — the lookup could not be performed. The payment remains UNVERIFIED. No wallet method, relay, invoice, payment, source, Git, or database operation was performed.**

> **Status statement:** The authorisation was for exactly one live `lookup_invoice` from the
> owner's already-open browser tab. That operation could not be carried out because no browser
> context capable of reaching the owner's tab is available to this session, and the local
> application servers are no longer running. In line with the instruction *"If you cannot
> interact with the already-open browser tab, do not invent a terminal command or alternate
> execution route"*, no substitute route was attempted. The exact manual action is recorded in
> section 5.

---

## 1. Was the single lookup executed?

**No.** Zero `lookup_invoice` requests were issued. Three independent blockers apply.

### 1.1 No browser is connected to this session

The browser tooling reports:

```
[browser.disconnected] No desktop browser is connected to this session.
Open this session in the desktop app and wait for it to connect.
```

There is therefore **no browser context at all** — let alone the owner's phone browser tab —
through which the "Check payment status" control could be activated.

### 1.2 A different browser context could not perform the original lookup anyway

The original attempt is not reconstructible outside the owner's tab:

| Material | Where it lives | Reachable from another context? |
| --- | --- | --- |
| The attempted invoice | `PaymentPanel` React state (`useState`, `PaymentPanel.tsx:95-99`) | **No** — browser-heap only |
| The attempted payment hash | The same state, plus `PaymentAttemptGuard.attempted` (`payment.ts:307`) | **No** — browser-heap only |
| The NWC connection (pubkey, secret, relay) | `WalletClientSession.client` (`nwc.ts:359`) | **No** — browser-heap only, never persisted or exposed on `window` |
| The authenticated session cookie | The owner's browser profile | **No** — a separate context is redirected to `/login` by `ProtectedRoute` (`App.tsx:37-44`) |

The application's own copy states the rule: *"The URI is kept in this page's memory only. It is
not sent to the academy server, logged, or stored in browser storage."* The readiness audit
already concluded the same and is recorded in
`reports/S6-C6-PAYMENT-SETTLEMENT-READINESS-REPORT.md`.

### 1.3 The local application servers are no longer running

| Probe | Result |
| --- | --- |
| `node` processes (all) | **0** |
| Listening sockets (`/proc/net/tcp`, `/proc/net/tcp6`) | **none** |
| `http://127.0.0.1:5173/` | `http_code=000` (connection failed) |
| `http://127.0.0.1:4000/` | `http_code=000` (connection failed) |

The Vite dev server (5173) and the Express server (4000) have both stopped. The owner's tab
may still be displaying the last-rendered DOM from its already-loaded modules, but the app is
no longer being served.

**No server was started or stopped by this task** — see section 7.

## 2. Precondition status

The instruction required confirming four preconditions. Three could **not** be confirmed
because the owner's tab is not reachable from this session, and one is **likely already broken**:

| # | Precondition | Status |
| --- | --- | --- |
| 1 | The original payment attempt is still retained | **Cannot confirm — and at material risk.** `Wallet.tsx:131-138` binds `resetForLifecycle` to `pagehide`/`pageshow`; it calls `session.disconnect()` and `setInfo(null)`. Because the panels are **keyed on connection state** (`Wallet.tsx:479`, `:486`), clearing `info` **remounts** the payment panel, which discards its `useState` invoice and `useRef` guard. If the tab has been hidden or navigated since the attempt, the retained attempt is already gone. |
| 2 | The Wallet page shows the payment as "unknown" | **Cannot confirm** — the tab is not reachable from this session. |
| 3 | The existing NWC connection is still active | **Cannot confirm**, and **likely not**: the same `pagehide` handler calls `session.disconnect()`, which closes the SDK client. If it fired, `requestEnvelope` would return `stale` without contacting the relay. |
| 4 | The one-shot Check payment status control is available | **Cannot confirm.** It renders only when the phase is `unknown` **and** the invoice is still retained (`PaymentPanel.tsx:477`) — i.e. only if the panel was never remounted. |

Because precondition 1 cannot be established, and reconstructing it would require the invoice
or a new payment, the instruction to **STOP** applies.

## 3. Did the wallet return a valid response?

**No response was requested or received.** There is no wallet reply, no error, no timeout, and
no envelope to validate.

## 4. Resulting payment state and evidence level

| Item | State |
| --- | --- |
| The original `INTERNAL` payment | **Still `unknown` / unverified** — unchanged |
| Evidence level | `none` — unchanged |
| Wallet-reported settlement | **Not established** |
| Receiver confirmation | **Not established** (and not obtainable from payer-side evidence) |
| Whether hash and amount matched | **Not applicable** — no response was received |

The payment state in the owner's tab is exactly as it was before this task: the frozen
classification of the wallet's `INTERNAL` error as an **indeterminate `unknown`** outcome,
with no claim that anything was or was not paid.

**No unsuccessful lookup occurred, so nothing can be inferred about whether the earlier
payment settled.** Its status remains genuinely unknown, which is the honest position and the
one the frozen plan requires.

## 5. Exact manual action required

Perform this **in the owner's own browser tab**. Do not reload the page first.

### Step 1 — inspect the existing tab without touching it

Switch back to the tab that holds the original payment attempt and look at the
**"Pay a Lightning invoice"** section.

**Case A — the section still shows "This payment is unverified" together with a
visible "Check payment status" button:**
the attempt is still retained and the session is still live.

1. Click **"Check payment status"** exactly once.
2. Do not click it again, and do not press "Pay" / "Confirm and pay" under any circumstance.
3. Read the single result line that appears and report it back verbatim (it contains no
   invoice, hash, or credential).

**Case B — the section is gone, the page shows "The page was hidden, so the wallet connection
was closed." or an empty/disconnected wallet page:**
the attempt was discarded by the page-lifecycle handler when the tab was hidden, and the
original payment hash **no longer exists anywhere**. No lookup against it is possible. A fresh
URI would restore connectivity but **not** the original attempt; producing a new attempt would
mean a new payment, which needs separate D08 authorisation and is outside this task.

**Case C — the tab needs a reload to function at all:**
the app must be restarted first (`npm run dev` in the repository). **Restarting the dev server
can trigger a Vite reload in the open tab, which would remount the panel and discard the
retained attempt** — so restart only if the tab is unusable, and accept that Case A may then
no longer be available.

### Why the dev server being down does not by itself block the lookup

The NWC transport is a **direct WebSocket from the browser to the relay**
(`wss://relay.coinos.io` or `wss://relay.getalby.com/v1`), not a call through the local dev
server. A Vite single-page app keeps running from its already-loaded modules after the dev
server stops. So **if the tab is still alive with its session and retained attempt, Case A can
be completed without restarting anything** — which is the preferred sequence, because a
restart risks the remount described above.

## 6. Expected interpretation of the single result

Unchanged and already implemented in `client/src/features/wallet/payment.ts`
(`describePaymentStatus`) and `PaymentPanel.tsx` (`onCheckStatus`):

| Wallet result | Resulting state | Evidence level |
| --- | --- | --- |
| `settled` + matching hash **and** matching amount | `wallet-settled` | **wallet-settled** (wallet-reported only) |
| `settled` + missing or mismatched hash | unchanged (`unknown`) | unverified |
| `settled` + missing or mismatched amount | unchanged (`unknown`) | unverified |
| `pending` | unchanged (`unknown`) | unverified |
| `accepted` | unchanged (`unknown`) | unverified |
| `expired` | unchanged (`unknown`) | unverified; earlier settlement is **not** disproved |
| `failed` | unchanged (`unknown`) | unverified; **not** independently verified non-payment |
| Timeout, wallet error, malformed envelope, unknown state | unchanged (`unknown`) | unverified |

A `wallet-settled` outcome is **payer-side** evidence and must never be presented as
`receiver-confirmed`. An unsuccessful lookup must never be presented as proof that nothing was
paid. The one-shot guard permits **no** second lookup, and no retry is issued automatically.

## 7. Repository preservation and confirmations

| Item | Value |
| --- | --- |
| Branch / HEAD | `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` — unchanged |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |
| Working-tree entries | 39 — unchanged by this task |
| Working-tree fingerprint | `e31571263d5b8873916eb9cb11223179` — identical before and after |
| Source files changed | **None** |
| Tests changed | **None** |
| Existing reports changed | **None** |
| Git operations | **None** — no stage, commit, push, stash, reset, clean, or branch switch |
| Database operations | **None** — the destructive integration suite was not run |
| Servers started or stopped | **None** — the two servers were already down when this task began |
| Wallet methods invoked | **None** — no `lookup_invoice`, `pay_invoice`, `make_invoice`, `get_info`, `get_balance`, or `list_transactions` |
| Relays contacted | **None** |
| Invoices created, published, or paid | **None** |
| Payments attempted or retried | **None** |
| Credentials reconstructed, requested, or exposed | **None** — no URI, invoice, hash, preimage, or secret was read, printed, or recorded |
| Control activated | **Never** |

The only file added by this task is this report.

## 8. Remaining limitations

1. **The settlement question is still unanswered.** The original payment remains **unverified**;
   nothing has been looked up.
2. **The original attempt may no longer exist.** If the tab was hidden since the attempt, the
   lifecycle handler discarded it and the payment hash is unrecoverable — no lookup against it
   is possible at any price.
3. **The authorisation was not used.** The single permitted `lookup_invoice` remains
   **available and unused**; it can be completed by the owner in Case A without any further
   approval, because the operation, the connection, the relay, and the control are all already
   in place.
4. **A new attempt would need separate D08 authorisation** — it would be a new payment, not a
   status check of the original one.
