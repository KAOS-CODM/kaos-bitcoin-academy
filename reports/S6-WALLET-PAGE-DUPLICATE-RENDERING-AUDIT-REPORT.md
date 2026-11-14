# KAOS Bitcoin Academy — S6 Wallet Page Duplicate Rendering Audit

- Project: KAOS Bitcoin Academy
- Date: 2026-11-12
- Repository: `/data/data/com.termux/files/home/kaos-bitcoin-academy`
- Branch / HEAD at audit time: `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c`
- Audit type: Read-only rendering audit
- Result: **ROOT CAUSE CONFIRMED — two sibling components shared one React `key` value. Fixed by making the keys unique; a page-level regression test was added.**

> **Status statement:** This audit itself changed nothing. The correction was applied afterwards
> under separate owner approval and is recorded in section 9. No wallet, relay, invoice,
> lookup, or payment operation was performed at any point.

---

## 1. Root cause

**`client/src/pages/Wallet.tsx` lines 478–492 — the payment and receive panels were given the
*same* `key` while being siblings in one children array.**

```tsx
478      <PaymentPanel
479        key={info ? 'wallet-connected' : 'wallet-disconnected'}   ← identical key expression
480        methods={info?.methods ?? []}
481        requester={info ? session : null}
482        maxAmountMsat={PRACTICE_MAX_AMOUNT_SATS * 1000}
483      />
484
485      <ReceivePanel
486        key={info ? 'wallet-connected' : 'wallet-disconnected'}   ← identical key expression
487        methods={info?.methods ?? []}
488        requester={info ? session : null}
489        defaultAmountSats={PRACTICE_DEFAULT_AMOUNT_SATS}
490        maxAmountSats={PRACTICE_MAX_AMOUNT_SATS}
491        expirySeconds={PRACTICE_INVOICE_EXPIRY_SECONDS}
492      />
```

Both are direct children of the page's root `<div>`, so they share one children array. The
key is either `'wallet-disconnected'` or `'wallet-connected'` for **both** panels.

React's own dev build documents the consequence
(`client/node_modules/react-dom/cjs/react-dom-client.development.js:6968`):

> "Encountered two children with the same key, `%s`. Keys should be unique so that components
> maintain their identity across updates. **Non-unique keys may cause children to be duplicated
> and/or omitted** — the behavior is unsupported and could change in a future version."

The collision is **silent on the initial mount** (React's `mountChildFibers` builds no key
map) and only bites during **reconciliation** (`reconcileChildrenArray` → `warnOnInvalidKey`,
`react-dom-client.development.js:6949–6977`). The connect flow triggers exactly that:
`setBusy` → `setStatus` → `setInfo` (`Wallet.tsx:190–200`) each re-render the page, and the
rebuilt children array still carries two identical keys.

This fully accounts for the observed asymmetry — payment sections duplicated while the receive
section appeared once.

## 2. Evidence

| Check | Result |
| --- | --- |
| `grep -rn "PaymentPanel\|ReceivePanel" client/src/` | Exactly **2** hits each: one import + one JSX mount, both in `client/src/pages/Wallet.tsx` |
| `<section` count | `PaymentPanel.tsx` = 1, `ReceivePanel.tsx` = 1, `Wallet.tsx` = 6 (none is the payment section) |
| `"Pay a Lightning invoice"` across the repo (excl. node_modules/dist) | **Exactly 1** — `client/src/features/wallet/PaymentPanel.tsx:186` |
| Same string in `client/dist/assets/*.js` | **Exactly 1** |
| Stray duplicate files / other branches / stashes / worktrees | **None** |
| Route (`client/src/App.tsx:37–44`) | One `<Wallet />` inside `<ProtectedRoute>` — single mount |
| `client/src/main.tsx` | One `createRoot`, one `<div id="root">` in `index.html` |
| Server-side render of the real page | **1** payment section, **1** receive section, correct order |
| React `createElement` spy over the page render | `PaymentPanel[key=wallet-disconnected]  ReceivePanel[key=wallet-disconnected]  <== DUPLICATE KEYS` |
| Module graph served by the dev server | Correct: `Wallet.tsx` → 2 × `PaymentPanel` (import + mount); `PaymentPanel.tsx` → 1 × heading |

**Server-side render of `<Wallet/>` (exact production code):**

```
1. Approved relays
2. Where to get an NWC connection
3. Connect your wallet
4. Connection status
5. Pay a Lightning invoice           ← 1
6. Create a practice receive invoice ← 1
7. Disconnect, privacy, and limitations
```

## 3. Render trace

```
App route /wallet
  └─ ProtectedRoute
      └─ Wallet                       (1 mount)
          └─ page root <div>          ← ONE children array
              ├─ <header>
              ├─ <div> safety notice
              ├─ <section> Approved relays
              ├─ <section> Where to get an NWC connection
              ├─ <section> Connect your wallet
              ├─ <section> Connection status
              ├─ {info ? <WalletInfo/> : null}
              │     → "Wallet-reported information"
              │     → "Methods reported by the connected wallet"
              ├─ <PaymentPanel key="wallet-connected" />
              ├─ <ReceivePanel  key="wallet-connected" />   ← SAME KEY, SAME ARRAY
              ├─ <section> Disconnect, privacy, and limitations
              └─ <nav>
```

- **Static mount count:** `PaymentPanel` × 1, `ReceivePanel` × 1 — correct.
- **Post-connect reconciliation:** the children array is rebuilt with two children carrying
  `key="wallet-connected"`. React's key map collides, and per React's own documented behaviour
  children may be **duplicated and/or omitted** — producing repeated payment sections and a
  receive section that appears only once.

## 4. Independent of the wallet's reported capabilities (verified)

Rendering the panel across capability sets:

```
methods=["get_info"]                                        | pay sections=1 | receive sections=1
methods=["get_info","pay_invoice"]                          | pay sections=1 | receive sections=1
methods=[...,"pay_invoice","make_invoice","lookup_invoice"] | pay sections=1 | receive sections=1
```

A missing `pay_invoice` / `make_invoice` changes only the *body* of the single section
("This wallet does not report the `pay_invoice` method…"). **Capability reporting is not a
factor** — the duplication is a key-identity defect.

## 5. Expected versus actual structure

| Expected | Actual (before fix) |
| --- | --- |
| 1. Connect your wallet | ✅ once |
| 2. Connection status | ✅ once |
| 3. Wallet-reported information | ✅ once |
| 4. Methods reported by the connected wallet | ✅ once |
| 5. **Pay a Lightning invoice** | ❌ **×4** — 3 before "Wallet-reported information", 1 after |
| 6. **Create a practice receive invoice** | ⚠️ ×1 — survives, but its sibling was duplicated |
| 7. Disconnect, privacy, and limitations | ✅ once |

Also present (S5 guidance, legitimate, not in the list): "Approved relays" and "Where to get an
NWC connection". The real page has 9 `<h2>` sections; the list above is the wallet-relevant
subset.

## 6. Test-coverage gap identified

No test rendered the **Wallet page component**:

- `server/test/wallet.test.ts:387,500,568` only *reads* `Wallet.tsx` as text and regex-matches it.
- `server/test/wallet-methods.test.ts` and `server/test/wallet-payments-ui.test.ts` render only
  the **sub-components** in isolation.

A page-level mount bug was therefore invisible to the suite — which is why this shipped.

## 7. Correction applied (under separate owner approval)

**`client/src/pages/Wallet.tsx` — two lines, preserving the remount-on-connect intent:**

```diff
       <PaymentPanel
-        key={info ? 'wallet-connected' : 'wallet-disconnected'}
+        key={info ? 'payment-panel-connected' : 'payment-panel-disconnected'}
         ...
       <ReceivePanel
-        key={info ? 'wallet-connected' : 'wallet-disconnected'}
+        key={info ? 'receive-panel-connected' : 'receive-panel-disconnected'}
         ...
```

Deleting both `key` props would also work (the panels are distinct component types at fixed
positions), but unique keys keep the explicit reset intent obvious.

## 8. Regression tests added — `server/test/wallet-page-structure.test.ts` (7 tests)

| Test | Guards |
| --- | --- |
| the wallet page gives every keyed sibling a unique key | The defect itself; DOM-free — walks the element tree the way the reconciler does |
| the payment section renders exactly once | Page-level mount count (also checks `aria-labelledby="send-heading"`) |
| the receive section renders exactly once | Receive mount count |
| the expected section order | The relevant headings stay in order |
| payment section once for every reported-method set | Including `['get_info']` only |
| receive section once for every reported-method set | Same |
| an unavailable method is explained without removing the section | Capability gating retained |

**Verified that the test catches the defect:** with the shared key temporarily restored, the
key-uniqueness test **failed** (`duplicate sibling key "wallet-disconnected"`); with the fix
restored it **passed**. The other six tests pass in both states — the duplicate key only bites
during client-side reconciliation, not on a fresh mount, which is why the key-uniqueness check
is the essential guard.

## 9. Verification after the fix

| Check | Result |
| --- | --- |
| client typecheck | PASS |
| server typecheck | PASS |
| full server suite | PASS — 194 tests, 0 fail, 0 skipped |
| production build | PASS |
| dev server served module | Unique keys present; `wallet-connected` no longer present |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |

**Owner action required:** a hard reload of the browser tab. The corrupted duplicated DOM was
already painted in the open tab's React tree; the code fix prevents recurrence, but only a
reload clears what is currently rendered. The browser console should also stop showing React's
duplicate-key warning.

## 10. Repository preservation

| Item | Value |
| --- | --- |
| Branch / HEAD | `main` / `d9103fe1e4edc170c63d38dd3ed60db39d6e858c` — unchanged |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` — unchanged |
| Files changed by the audit | **None** (the correction in section 7 was a separate, approved action) |
| Git operations | None (no stage, commit, push, stash, reset, clean, branch switch) |
| Live operations | None — the running dev server and Vite were read over HTTP only |
