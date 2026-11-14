# S5 NWC local validation harness

Local-only, zero-funds browser harness for checking whether a fresh Coinos NWC
connection can answer `get_info` through `@getalby/sdk@9.0.0`.

This directory is isolated from the production client and server. It does not
change the application, its dependencies, its CSP, or its API.

## Scope

- Wallet: Coinos.
- Architecture: browser-only; no backend.
- SDK: `@getalby/sdk@9.0.0` exactly, imported from `@getalby/sdk/nwc`.
- Relay: `wss://relay.coinos.io` only.
- Permitted NWC operation: `get_info` only.
- Spending budget: 0 sats. This harness has no payment, invoice, balance, QR,
  reconnection, or notification feature.

## Install, verify, build, and preview

Run from this directory:

```sh
npm install --no-audit --no-fund
npm run verify
npm run build
npm run preview
```

`npm run preview` binds to `127.0.0.1:4173` only. Do not add `--host 0.0.0.0`.

## Android/Termux access

The preview server runs on the same Android device as Termux:

1. Start `npm run preview` in Termux.
2. Open Chrome on the device.
3. Navigate to `http://127.0.0.1:4173/`.
4. If `termux-open-url` is available, `termux-open-url http://127.0.0.1:4173/`
   can open the same local URL.

The page is not exposed to the local network.

## Owner test procedure

Do not paste the NWC connection URI into chat, a terminal command, an
environment file, a report, or a screenshot.

1. In Coinos, create a fresh NWC connection with a 0 sats budget.
2. Confirm the connection's relay is exactly `wss://relay.coinos.io`.
3. Open the local harness in Chrome.
4. Paste the fresh URI directly into the password-style field.
5. Click **Connect and request `get_info`**.
6. Record only the displayed status and wallet-reported fields. Do not copy the
   URI or secret into the result.
7. Click **Disconnect and clear**.
8. Confirm the URI field is empty, the response section is hidden, and the status
   says the connection state was cleared.
9. Revoke the connection in Coinos if it is no longer needed.
10. Report the result to the project owner. Do not claim success until this
    manual test has actually been performed.

## What the harness does

- Parses the URI locally and rejects non-`nostr+walletconnect://` values.
- Rejects any relay other than `wss://relay.coinos.io`.
- Requires exactly one relay and one 64-hex secret.
- Uses the SDK's NWC subpath and passes only the validated wallet public key,
  approved relay, and secret to `NWCClient`.
- Calls only `client.getInfo()`.
- Displays only an allow-listed subset of the `get_info` response.
- Suppresses console output during the SDK request because the SDK's `getInfo()`
  failure path calls `console.error("Failed to request get_info", error)`.
- Drops the client reference, clears the input, clears the response, and clears
  the connection state on disconnect.
- Uses no `localStorage`, `sessionStorage`, IndexedDB, cookies, analytics, or
  backend calls.

## Known limitations

- JavaScript strings cannot be reliably zeroized. Clearing references and UI
  state is best-effort and must not be described as physical memory erasure.
- The SDK's `close()` closes relay connections but does not wipe its stored
  secret; the harness drops its client reference after calling `close()`.
- The SDK URI parser itself does not require `wss://` or a secret by default, so
  this harness validates both before constructing the client.
- `get_info` proves that the wallet service answered. It does not prove payment
  capability, balance, invoice handling, or settlement.
- No live Coinos connection or `get_info` call is claimed by this document. The
  owner must perform the manual test above.

## Files

- `index.html`: password-style input, status, and response display.
- `src/nwc.js`: local URI parsing, relay allowlist, and response sanitisation.
- `src/main.js`: SDK client lifecycle, `get_info` request, and disconnect cleanup.
- `src/styles.css`: local page styling.
- `vite.config.js`: local-only dev/preview host and port.
- `scripts/verify.mjs`: static and parser checks.
- `package.json` / `package-lock.json`: exact harness dependency manifest.
