# S4 Closure and S5 Readiness Report

**Date:** 2026-11-07  
**Repository:** `/data/data/com.termux/files/home/kaos-bitcoin-academy`  
**Branch / HEAD:** `main` / `39093b3f94f93f2dd15f7ca264c8583df1420187`  
**Authoritative specification:** `PRD.md`  
**PRD SHA-256:** `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` (unchanged)  
**S4 status:** **COMPLETE**  
**S5 status:** **NEXT — NOT IMPLEMENTED**  
**Task mode:** Documentation-only S4 closure plus read-only S5 inspection. No S5 implementation, dependency installation, database change, wallet connection, invoice generation, payment, settlement, deployment, or Git write was performed.

---

## 1. Executive summary

S4 is closed as **COMPLETE** on the basis of the project owner's manual end-to-end browser acceptance, recorded separately from the automated implementation tests.

S5 — **Wallet Connection and Invoice Literacy** — is the next phase. It is not started. The repository contains relevant educational content and a fictional wallet playground, but it has no actual wallet connection, no NWC or LNbits integration, no invoice parser or inspector, no wallet route, no wallet model, and no wallet UI.

The smallest defensible S5 scope is:

1. A protected learner-facing wallet page that connects to a compatible Lightning wallet over NWC using a browser-held, memory-only connection secret.
2. A live `get_info` handshake that proves the wallet answered, with honest capability and status display.
3. A disconnect action that removes the browser-held connection.
4. An invoice-literacy panel using a clearly labelled fictional sample invoice, with field-by-field explanation and an explicit "not payable" state.

This minimal scope deliberately excludes real payment execution, invoice settlement, payment intents, receipts, real invoice generation, and AC-013/AC-014/AC-015 claims. Those belong to S6a and S6b.

A real S5 wallet connection cannot be implemented with the current direct dependencies. It needs an approved NIP-47 client capability, and the current production CSP only allows same-origin connections. Those are owner decisions, not implementation choices to be made silently.

---

## 2. S4 closure record

### 2.1 Status

S4 is recorded as **COMPLETE** as of 2026-11-07.

The S4 implementation is the existing AI Tutor delivered through the academy's Node/Express, TypeScript, MongoDB, Zod, Pino, React, and React Query stack. It uses server-side OpenRouter `openrouter/auto`, authenticated learner access, and session-only conversation history.

### 2.2 Automated evidence

The S4 report records the following automated verification from the implementation phase:

| Check | Recorded result |
| --- | --- |
| `npm run typecheck` | Passed: server and client |
| `npm --prefix client run build` | Passed |
| `npm run build` | Passed: server and client |
| `npm --prefix server test` | 90 tests passed, 0 failed |
| `git diff --check` | Passed |
| PRD SHA-256 | Unchanged |

Tutor-specific automated coverage includes the `openrouter/auto` model identifier, server-side key handling, input validation, disabled/missing-key behavior, provider-failure safety, grounding context, bounded history, rejection of client-supplied system messages, and the absence of server secrets in the client bundle.

These results were not re-run during this documentation-only closure. They are reported as recorded in `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md`.

### 2.3 Manual end-to-end browser acceptance (project owner)

The project owner manually tested the actual running application and confirmed end-to-end operation.

Acceptance evidence:

- The `/tutor` page loaded in the actual academy.
- A learner submitted a Bitcoin question.
- The application successfully communicated with OpenRouter.
- The configured model identifier was `openrouter/auto`.
- The tutor returned an answer successfully.
- The response appeared in the browser conversation.
- The tutor provided a beginner-friendly explanation and referenced relevant academy lessons.
- Owner statement: **"It works end to end."**

This is manual functional browser acceptance. It is separate from, and additional to, the automated evidence above.

Limits of the evidence:

- OpenCode did not independently observe the owner's browser session, capture network logs, or inspect the owner's provider dashboard.
- The owner did not report browser name, device, operating system, or exact inputs. Those details are not inferred.
- The acceptance establishes the tested functional path, not production quota, billing, or privacy-policy verification.
- It does not establish screen-reader conformance, formal accessibility conformance, or 360 px/mobile acceptance.

### 2.4 Not performed or not claimed

The following were not performed and are not claimed as passed:

- Database integration tests (`RUN_DB_TESTS=1` was not set).
- Formal screen-reader testing.
- Formal mobile-viewport or 360 px acceptance.
- Independent OpenCode browser testing with a live provider.
- Production OpenRouter terms, quota, retention, or training-policy verification.
- Any wallet, invoice, payment, or settlement test.

### 2.5 S4 preservation

The S4 closure follows the owner's preservation rules:

- The AI Tutor was not reimplemented.
- Its interface was not redesigned.
- OpenRouter was not replaced.
- `openrouter/auto` was not changed.
- No custom model rotation was introduced.
- No new provider fallback was added.
- Completed S4 decisions were not reopened.
- No S1–S3 application logic was modified by this documentation task.

### 2.6 Deferred S4 scope

The S4 report already records these deferred items. They remain deferred and are not claimed complete:

- `GET /api/tutor/conversations` and `GET /api/tutor/conversations/:id` are not implemented because chat-history database persistence was excluded from the initial version.
- Persisted or graded AI-generated practice questions are not implemented. The tutor can discuss practice questions in conversation, but it does not create reviewed quiz content or award XP for generated questions.

---

## 3. S5 requirements and boundaries

### 3.1 PRD and roadmap requirements

The S5 requirements below are taken from the authoritative PRD and the existing S5 planning documentation. IDs beginning `S5-` are audit labels for traceability, not new product requirements.

| ID | Requirement | Source | Current status |
| --- | --- | --- | --- |
| S5-01 | Users can connect a compatible Lightning wallet | PRD FR-009; §5.1 Module E; §12 | NOT IMPLEMENTED |
| S5-02 | A compatible wallet connection can be demonstrated by a real wallet response | PRD AC-012; S2 planning S5 | NOT IMPLEMENTED |
| S5-03 | Wallet secrets are not exposed in logs or frontend bundles | PRD AC-016; §12 wallet security | NOT IMPLEMENTED for wallet data; existing bundle scan is not wallet evidence |
| S5-04 | Explain wallet functionality and receiving/sending concepts | PRD §5.1 Module E | PARTIAL: lesson content only |
| S5-05 | Explain Lightning invoices | PRD §5.1 Module E | PARTIAL: lesson content only |
| S5-06 | Explain payment authorization | PRD §5.1 Module E | PARTIAL: lesson content only |
| S5-07 | Provide guided safety instructions for wallet interaction | PRD §5.1 Module E; §12 | PARTIAL: lesson content and playground safety text |
| S5-08 | Inspect an invoice field by field and distinguish a sample from a real payable invoice | S2 planning S5 | NOT IMPLEMENTED |
| S5-09 | Show connection capabilities and status honestly; support disconnect | S2 planning S5; architecture correction | NOT IMPLEMENTED |
| S5-10 | Evaluate NWC and LNbits before selecting an integration | PRD §5.1 Module E; §9.1; §12 | NOT PERFORMED in this repository inspection |
| S5-11 | Wallet operations remain isolated from the general learning API | PRD §9.2; §13 payment security | NOT IMPLEMENTED |

### 3.2 S5 versus S6 boundary

S5 is educational wallet connection and invoice literacy. S6a and S6b are the payment phases.

| Concern | S5 | S6a / S6b |
| --- | --- | --- |
| Connect a learner wallet over NWC | Yes | Reuses the S5 connection contract |
| `get_info` capability handshake | Yes | Reuses it |
| Show wallet status and capabilities | Yes | Reuses it |
| Disconnect | Yes | Reuses it |
| Inspect a clearly labelled sample invoice | Yes | Can be replaced or supplemented by a real invoice |
| Parse an arbitrary pasted invoice | Optional S5 increment | Useful for payment preparation |
| Create a real invoice for the academy | No, unless the owner separately approves a receiving wallet | S6a/S6b |
| Execute `pay_invoice` | **No** | S6a/S6b, with explicit confirmation |
| Payment intent, state machine, receipt | **No** | S6a |
| Settlement verification | **No** | S6b |
| AC-013 / AC-014 / AC-015 claims | **No** | S6a/S6b |

A wallet connection may advertise `pay_invoice` as a capability. S5 may display that capability, but it must not expose any action that calls it.

---

## 4. Read-only inspection baseline

### 4.1 Repository state

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `39093b3f94f93f2dd15f7ca264c8583df1420187` |
| Remote | None configured |
| Working tree | S4 implementation changes remain uncommitted; the S4 report and roadmap audit are untracked; this combined report was created by this task |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` |
| S1–S4 source | Present |
| S5 wallet source | Absent |
| Wallet/API dependencies | Absent from direct dependencies |
| Database schema for wallets | Absent |
| Wallet connection or payment call | None made |

The repository contains 100 files under `server/src` and `client/src`. No wallet route, wallet model, wallet service, wallet schema, invoice utility, NWC client, LNbits client, BOLT11 decoder, QR scanner, or wallet page is present.

### 4.2 Documentation baseline

The root files `ARCHITECTURE.md`, `IMPLEMENTATION-PLAN.md`, `CHANGELOG.md`, and `TEST-REPORT.md` are empty. The active implementation evidence is therefore in the reports directory, especially:

- `reports/S3-BITCOIN-PLAYGROUND-IMPLEMENTATION-REPORT.md`
- `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md`
- `reports/KAOS-ACADEMY-REMAINING-ROADMAP-AND-IMPLEMENTATION-GAP-AUDIT.md`
- `reports/S2-PLANNING-AND-ROADMAP-REPORT.md` (S5 slice definition)
- `reports/ARCHITECTURE-CORRECTIONS-REPORT.md` (NWC lifecycle and LNbits findings)
- `reports/ZERO-BUDGET-FEASIBILITY-ADDENDUM.md` (historical feasibility, not current approval)

This report does not treat the zero-budget addendum's dated provider or wallet claims as current requirements.

---

## 5. What S5 functionality is already present

### 5.1 Educational content

The curriculum already teaches wallet and invoice concepts in text form:

| Course / lesson | Existing content | S5 relevance |
| --- | --- | --- |
| `04-bitcoin-wallets` / `wallets-keys` | Wallet stores keys, not bitcoin; private key vs public address; watch-only wallets; backup mistakes | Module E wallet explanation |
| `04-bitcoin-wallets` / `wallets-seed` | Seed phrase meaning, backup routine, "never type your seed into a website" | Wallet safety |
| `05-using-bitcoin` / `using-receive` | Receiving to an address, confirmations, mempool, address mistakes | Receiving concepts |
| `05-using-bitcoin` / `using-fees` | Fee market, confirmation times, Lightning as the small-payment case | Sending concepts |
| `06-lightning-network` / `ln-scaling` | On-chain vs off-chain, channels, liquidity, Lightning trade-offs | Lightning foundation |
| `06-lightning-network` / `ln-channels` | Inbound/outbound liquidity, invoice fields, expired vs failed, "your wallet authorises, not the website" | Invoice literacy and authorization |
| `07-staying-safe` / `safe-scams` | Phishing, impersonation, verification through a channel you chose | Wallet safety |
| `07-staying-safe` / `safe-checklist` | Five-point pre-send checklist, test payments, compromise response | Guided safety |

Existing quizzes also test invoice fields and the distinction between an expired invoice and a failed payment.

This is useful S5 context, but it is **content only**. It does not provide an interactive wallet connection or invoice inspector.

### 5.2 Fictional wallet playground

The S3 playground contains:

- `client/src/features/playground/simulations/WalletCreationSimulation.tsx`
- `client/src/features/playground/simulations/KeyRelationshipsSimulation.tsx`
- `client/src/features/playground/simulations/TransactionConstructionSimulation.tsx`
- `client/src/features/playground/data.ts`

These use deliberately fictional, non-valid demonstration values and explicitly state that they do not create a wallet, address, transaction, or network connection. They are not an S5 wallet integration and must not be repurposed as one.

The playground does not contain an invoice-inspection lab. Its six labs are wallet creation, key relationships, transaction construction, broadcasting/confirmation, block formation, and mining.

### 5.3 Existing backend and frontend foundations

The following existing foundations are reusable:

| Foundation | Evidence | S5 use |
| --- | --- | --- |
| Session authentication and protected routes | `server/src/middleware/auth.ts`; `client/src/components/ProtectedRoute.tsx` | Protect `/wallet` |
| Zod request validation | `server/src/middleware/validate.ts`; `server/src/schemas/` | Validate any wallet metadata or invoice input |
| Central error handling | `server/src/middleware/errors.ts` | Safe wallet error responses |
| Rate limiting | `express-rate-limit`; existing auth/tutor limiters | Limit connection attempts or invoice parsing |
| Pino redaction | `server/src/logger.ts` | Extend for NWC URI, secret, invoice, and payment fields |
| React Query and typed API client | `client/src/lib/queries.ts`; `client/src/lib/api.ts` | Wallet page state and errors |
| Tailwind design system | `client/src/index.css` | Consistent protected page |
| Node test runner with `tsx` | `server/test/` | Unit and route tests without a new test framework |
| Static bundle secret scan | `server/test/static.test.ts` | Extend for wallet secret markers |

These foundations reduce S5 work, but they do not provide the wallet protocol itself.

---

## 6. What remains unimplemented

### 6.1 Wallet connection

Missing:

- A wallet page and route.
- A protected navigation entry point.
- NWC URI parsing and validation.
- A NIP-47 relay client.
- `get_info` capability handshake.
- Wallet connection state machine.
- Capability and network display.
- Disconnect behavior.
- Browser-memory-only secret handling.
- A documented decision on whether any metadata is stored server-side.
- A wallet connection model, if metadata storage is approved.
- Tests for connect, refusal, timeout, relay failure, and disconnect.

### 6.2 Invoice literacy

Missing:

- An invoice inspection panel.
- A sample invoice with known fields.
- Field-by-field explanation in the UI.
- A clear "sample, not payable" state.
- Optional arbitrary BOLT11 parsing.
- Validation and error states for malformed input.
- Tests for invoice field rendering and sample/real distinction.

### 6.3 Security and operations

Missing:

- Wallet-specific log redaction.
- Wallet secret bundle scan.
- CSP allowance for an NWC relay, if the browser connects directly.
- A decision on whether the relay is contacted by the browser or through a server adapter.
- Rate limits for connection attempts.
- A real-wallet acceptance test for AC-012.
- A secret-exposure acceptance test for AC-016.
- A wallet validation spike (D-11) and a documented custody decision (D-02).

### 6.4 Not part of S5

Missing but intentionally excluded from S5:

- Payment intent model.
- Payment state machine.
- `pay_invoice` execution.
- Real invoice creation for the academy.
- Receiving wallet and inbound liquidity.
- Settlement verification.
- Receipt UI.
- Failure taxonomy for payment outcomes.
- AC-013, AC-014, and AC-015 evidence.

---

## 7. Existing wallet-related code and integration points

### 7.1 Existing code that mentions wallets

| Path | Role | S5 action |
| --- | --- | --- |
| `client/src/features/playground/simulations/WalletCreationSimulation.tsx` | Fictional wallet demonstration | Do not modify; do not treat as real wallet |
| `client/src/features/playground/simulations/KeyRelationshipsSimulation.tsx` | Fictional key/address demonstration | Do not modify |
| `client/src/features/playground/simulations/TransactionConstructionSimulation.tsx` | Fictional transaction arithmetic | Do not modify |
| `client/src/features/playground/data.ts` | Fictional demo values and safety text | Do not modify |
| `server/src/content/courses/04-bitcoin-wallets.ts` | Wallet curriculum | Reuse as lesson context; no source change needed |
| `server/src/content/courses/05-using-bitcoin.ts` | Receiving/sending curriculum | Reuse as lesson context |
| `server/src/content/courses/06-lightning-network.ts` | Invoice and channel curriculum | Reuse as invoice-literacy source |
| `server/src/content/courses/07-staying-safe.ts` | Wallet safety content | Reuse as safety source |

### 7.2 Integration points likely to change in S5

| Path | Likely change | Approval needed |
| --- | --- | --- |
| `client/src/App.tsx` | Add protected `/wallet` route | Yes for implementation |
| `client/src/components/Layout.tsx` | Add Wallet navigation entry for signed-in learners | Yes |
| `client/src/features/wallet/` | New NWC client, invoice inspector, sample invoice, types | Yes |
| `client/src/pages/Wallet.tsx` | New learner-facing page | Yes |
| `server/src/app.ts` | Mount wallet metadata routes, if approved; adjust CSP for relay if needed | Yes |
| `server/src/config.ts` | Wallet feature flag and relay/allowlist settings, if needed | Yes |
| `server/src/logger.ts` | Redact NWC/secret/invoice fields | Yes |
| `server/.env.example` | Document any approved wallet settings | Yes |
| `server/src/routes/wallet.ts` | Metadata/status routes, only if Option B is approved | Yes |
| `server/src/schemas/wallet.ts` | Strict metadata validation | Yes |
| `server/src/models/WalletConnection.ts` | Metadata-only model, only if Option B is approved | Yes, plus database approval |
| `server/test/wallet.test.ts` | Unit/route tests | Yes |
| `server/test/static.test.ts` | Wallet secret bundle scan | Yes |
| `server/test/http.test.ts` | Route mounting/auth tests | Yes |

No source file was changed during this inspection.

---

## 8. Existing invoice-related functionality

### 8.1 Content

`server/src/content/courses/06-lightning-network.ts` already includes:

- The lesson `ln-channels`, "Channels, liquidity and invoices".
- A section titled "What an invoice contains".
- Fields: amount, description or payment hash, recipient, expiry, and network marker.
- The distinction between an expired invoice and a failed payment.
- The rule that the wallet authorises, not the website.
- A "Read before you pay" safety tip.

`server/src/content/quizzes/06-lightning-network.ts` tests invoice fields, expiry versus failure, and channel behavior.

### 8.2 UI and code

There is no:

- Invoice inspector page or component.
- Sample invoice data file.
- BOLT11 decoder.
- LNURL handling.
- QR code generation or scanning.
- Invoice API route.
- Invoice model.
- Invoice test.

The S3 playground has no invoice lab. Invoice literacy is therefore a content-only capability today.

---

## 9. Dependencies and infrastructure already available

### 9.1 Available

| Capability | Evidence | Suitability for S5 |
| --- | --- | --- |
| Node.js 26.4.0 | `node -v` | Modern runtime; native `fetch` and WebSocket APIs available for a spike |
| Express 5 | `server/package.json` | Route mounting and middleware |
| Mongoose 9 | `server/package.json`; existing models | Available if metadata storage is approved |
| Zod 4 | `server/package.json` | Strict request validation |
| `express-rate-limit` 8 | `server/package.json` | Connection-attempt limits |
| Pino with redaction | `server/src/logger.ts` | Extend for wallet secrets |
| React 19, React Router 7, React Query 5 | `client/package.json` | Wallet page, route, state |
| Tailwind 4 | `client/package.json` | Consistent UI |
| Node test runner with `tsx` | `server/test/` | Tests without a new framework |
| Existing static bundle scan | `server/test/static.test.ts` | Extend for NWC/secret markers |

### 9.2 Missing

No direct dependency provides:

- NIP-47 / NWC client behavior.
- Nostr event signing, encryption, or relay subscription.
- secp256k1 operations for NWC.
- BOLT11 invoice decoding.
- QR code generation or scanning.
- A wallet protocol test harness.

The exact dependency choice is an owner decision under the project's dependency-approval rule. No package was installed or evaluated at runtime during this inspection.

### 9.3 CSP and network constraint

`server/src/app.ts` sets production `connect-src` to `["'self'"]`. A browser that connects directly to an NWC relay over WebSocket would be blocked unless the CSP is changed to allow the specific relay origin or the connection is proxied through the academy server. This is a security-sensitive decision and must be explicit.

---

## 10. S5 gap matrix

| S5 item | Requirement | Current state | Gap |
| --- | --- | --- | --- |
| S5-01 | Connect a compatible Lightning wallet | No wallet code | Full implementation |
| S5-02 | Prove connection with a real wallet response | No NWC handshake | `get_info` round trip and AC-012 evidence |
| S5-03 | Keep wallet secrets out of logs and bundles | No wallet code; existing scan only | Wallet-specific redaction and bundle scan |
| S5-04 | Explain wallet functionality in an interactive flow | Text lessons only | UI integration and learner interaction |
| S5-05 | Explain Lightning invoices in an interactive flow | Text lesson and quiz only | Invoice inspector |
| S5-06 | Explain payment authorization | Text lesson only | Guided authorization explanation; no payment execution |
| S5-07 | Provide guided safety instructions | Text and playground safety only | Wallet-specific safety panel |
| S5-08 | Distinguish sample and real payable invoices | No UI | Sample invoice with explicit "not payable" label |
| S5-09 | Show capabilities/status and support disconnect | No UI | Connection state machine and disconnect |
| S5-10 | Evaluate NWC and LNbits before selection | No runtime spike in this inspection | D-11 spike and documented selection |
| S5-11 | Isolate wallet operations from learning API | No wallet operations | Service/route boundary and security review |

---

## 11. Smallest implementation scope needed to satisfy S5

### 11.1 Recommended minimum

The smallest scope that satisfies the S5 definition without entering payment settlement is:

1. **Protected wallet page**
   - New `/wallet` route behind the existing authentication guard.
   - Signed-in navigation entry.
   - Clear explanation that this is an educational connection, not a guarantee of safety.

2. **Browser-held NWC connection**
   - Learner pastes an NWC connection URI.
   - The URI is parsed and validated in the browser.
   - The connection secret remains in memory only; it is not written to local storage, session storage, cookies, logs, analytics, or a server request.
   - No silent reconnect after refresh.

3. **Live capability handshake**
   - Send `get_info` to the wallet over the relay.
   - Show only what the wallet actually returned: alias, network, methods, and any supported permission information.
   - Treat a timeout or relay failure as `unreachable` or `unknown`, not as "disconnected" or "revoked".
   - Do not treat a posted alias as proof of a live connection.

4. **Status and disconnect**
   - Show connection state: unknown, checking, connected, unavailable, refused.
   - Disconnect removes the browser-held connection.
   - State that wallet-side revocation must be performed in the learner's wallet.

5. **Invoice literacy panel**
   - Use a clearly labelled fictional sample invoice with known fields.
   - Show amount, description/payment hash, recipient, expiry, and network marker.
   - Explain what each field means and why an invoice can be expired without a payment having failed.
   - Mark the sample visibly as "SAMPLE — NOT PAYABLE".
   - Include the rule that the wallet authorises, not the academy website.

6. **Safety and secret handling**
   - Never ask for a seed phrase or private key.
   - Never accept a seed phrase, private key, `nsec`, `xprv`, or mnemonic in a wallet form.
   - Reject secret-bearing fields with a generic validation error.
   - Add NWC/secret/invoice fields to logger redaction.
   - Extend the static bundle scan for `nostr+walletconnect://`, `secret=`, `nwc`, and related markers.

7. **Tests**
   - Unit tests for URI validation and safe error mapping.
   - Mocked `get_info` success, refusal, timeout, and relay failure.
   - Disconnect test.
   - Sample invoice rendering and "not payable" assertion.
   - Static bundle secret scan.
   - Route authentication test.
   - Real-wallet AC-012 test after the owner approves a test wallet and relay.
   - AC-016 secret-exposure test.

### 11.2 Recommended data model decision

There are two viable minimal shapes:

| Option | Description | Pros | Cons |
| --- | --- | --- | --- |
| **A. Client-only connection (recommended minimum)** | The browser holds the NWC secret and connection state. No wallet database record. | No secret storage, no database change, smallest attack surface, easiest to keep AC-016 clean | No account-linked connection history; PRD's proposed wallet endpoints are not implemented |
| **B. Metadata-only server record** | Browser holds the secret; server stores public metadata such as wallet pubkey, relay, alias, methods, verification level, and timestamps. | Supports account-linked status and future S6a intent linkage | Requires a new model, schema, routes, and database approval; must never store the secret |

For the smallest S5, **Option A** is recommended. Option B can be added when S6a needs account-linked payment intents. The PRD's wallet endpoints are described as proposed and subject to final design; choosing Option A is a scope decision that requires explicit owner approval.

### 11.3 Dependency decision

A real NWC connection requires NIP-47 event handling and cryptographic operations. The repository has no direct dependency for this. A vetted client library is the safer minimal route compared with hand-rolling cryptography.

The owner must approve:

- The exact package and version.
- Whether it runs in the browser, the server, or both.
- Whether the relay is contacted directly or proxied.
- The CSP change, if direct browser access is used.
- The supply-chain and bundle-size impact.

No dependency was installed or tested during this inspection. If dependency approval is withheld, the only honest S5 fallback is the invoice-literacy sample panel; that would **not** satisfy FR-009 or AC-012.

### 11.4 What is deliberately excluded

The following are not part of S5:

- `pay_invoice` execution.
- Payment intent creation.
- Payment state machine.
- Payment receipt.
- Settlement verification.
- Real invoice generation for the academy.
- Receiving wallet and inbound liquidity.
- Funding decisions.
- AC-013, AC-014, or AC-015 claims.
- Any claim that a connection makes a learner immune to financial loss.

### 11.5 Optional S5 increment

If the owner wants learners to inspect an arbitrary pasted invoice, add a read-only BOLT11 decoder after dependency approval. The decoder should:

- Parse the invoice without contacting the network.
- Show amount, description, payment hash, recipient, expiry, and network.
- Mark whether the invoice is expired at the current time.
- Never mark an invoice as paid.
- Never execute a payment.

This is optional. A clearly labelled sample invoice is sufficient for the smallest S5 literacy scope.

---

## 12. Proposed files and functionality affected

These are proposals only. No file below was created or modified during this inspection.

### 12.1 New files, Option A minimum

| Proposed file | Purpose |
| --- | --- |
| `client/src/pages/Wallet.tsx` | Protected wallet connection and invoice literacy page |
| `client/src/features/wallet/nwcClient.ts` | NWC URI parsing, relay connection, `get_info`, disconnect |
| `client/src/features/wallet/InvoiceInspector.tsx` | Sample invoice field display and explanations |
| `client/src/features/wallet/sampleInvoice.ts` | Clearly fictional sample invoice data |
| `client/src/features/wallet/types.ts` | Wallet connection and invoice view types |
| `server/test/wallet.test.ts` | Unit/render/secret-scan tests for S5 |
| `reports/S5-...` | Implementation report after approval |

### 12.2 New files, Option B only

| Proposed file | Purpose |
| --- | --- |
| `server/src/routes/wallet.ts` | Metadata-only connect/status/disconnect routes |
| `server/src/schemas/wallet.ts` | Strict metadata validation; reject secret-bearing fields |
| `server/src/models/WalletConnection.ts` | Non-secret wallet metadata model |

### 12.3 Existing files likely to change

| File | Change |
| --- | --- |
| `client/src/App.tsx` | Add `/wallet` protected route |
| `client/src/components/Layout.tsx` | Add Wallet navigation entry |
| `server/src/app.ts` | Mount metadata routes if Option B; adjust CSP if direct relay access is approved |
| `server/src/config.ts` | Add approved wallet feature settings |
| `server/src/logger.ts` | Redact NWC, secret, invoice, and payment fields |
| `server/.env.example` | Document approved wallet settings |
| `server/test/static.test.ts` | Extend bundle scan for wallet secrets |
| `server/test/http.test.ts` | Add route auth/mounting checks |

### 12.4 Deliberately unchanged

- S3 playground source and behavior.
- S4 tutor source, prompt, model, and UI.
- Quiz scoring, XP, achievements, course completion, and progress logic.
- Authentication and session behavior.
- Existing course content, unless a later owner-approved S5 task explicitly adds a lesson link.
- PRD and PRD checksum files.

---

## 13. Risks and blockers

| Risk / blocker | Impact | Mitigation |
| --- | --- | --- |
| D-11 wallet validation spike not performed | S5 may be built against an untested wallet/relay | Run a zero-funds spike before implementation |
| D-02 custody model not formally selected | Secret handling could be inconsistent | Adopt browser-memory-only for S5; document it |
| D-10 dependency not approved | No real NWC connection is possible | Approve exact package and version before coding |
| CSP blocks relay access | Browser connection fails in production | Allowlist the relay or proxy through the server; security review |
| Wallet compatibility varies | `get_info` or capability display may be misleading | Trust only a live wallet response; show `unknown` honestly |
| Relay unavailable | Connection may fail during a demo | Clear retry/error states; do not claim disconnect |
| No receiving wallet | Real invoice creation is impossible | Use a sample invoice in S5; defer real invoice to S6a/S6b |
| Secret leakage | AC-016 failure and learner harm | Memory-only secret, redaction, bundle scan, no analytics |
| Over-scoping into payment | S5 becomes S6 and risks false settlement claims | Enforce the S5/S6 boundary in UI and code |
| S2 formal browser/accessibility acceptance still open | Overall project acceptance remains incomplete | Do not treat S3/S4 evidence as S2 acceptance |
| S4 deferred items | Module C and conversation retrieval are not complete | Keep them documented; do not silently claim them |

---

## 14. Approval gates before S5 implementation

1. Owner reviews and accepts this S5 readiness report.
2. Owner decides **Option A (client-only)** or **Option B (metadata-only server record)**.
3. Owner approves or rejects the exact NWC dependency and version.
4. Owner approves the D-11 zero-funds wallet spike: test wallet, relay, and test procedure.
5. Owner approves the D-02 custody model: browser-held, memory-only secret.
6. Owner decides whether S5 invoice literacy is sample-only or includes a read-only BOLT11 decoder.
7. Owner approves any CSP change for relay access.
8. Owner approves the S5 file scope and test plan.
9. Only then may S5 implementation begin.
10. S6a/S6b, real invoices, payments, and settlement require separate approval.

---

## 15. What this task changed

### 15.1 Repository files

| File | Change |
| --- | --- |
| `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md` | Added S4 manual acceptance evidence, separated automated/manual/unperformed evidence, and recorded S4 closure |
| `reports/KAOS-ACADEMY-REMAINING-ROADMAP-AND-IMPLEMENTATION-GAP-AUDIT.md` | Added current status update; marked S3/S4 complete; marked S5 next |
| `reports/S4-CLOSURE-AND-S5-READINESS-REPORT.md` | New combined closure and readiness report |

No application source, dependency manifest, lockfile, database model, seed, migration, environment file, PRD, or PRD checksum file was changed.

The pre-existing uncommitted S4 implementation changes in the working tree were not modified by this documentation task.

### 15.2 Device copies

The updated S4 report and this combined report are copied to:

`/storage/emulated/0/Download/KAOS-Bitcoin-Academy/reports/`

The copies are verified by byte comparison after writing.

### 15.3 Not performed

- No S5 implementation.
- No dependency installation.
- No database structure or data change.
- No wallet connection, NWC/LNbits call, invoice generation, payment, or settlement.
- No external provider or relay call.
- No deployment.
- No Git commit, push, branch, or remote operation.

---

## 16. Verification performed for this task

| Check | Result |
| --- | --- |
| Read-only S5 source inspection | Completed |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` (unchanged) |
| `git diff --check` | Passed; no tracked whitespace errors (the reports are untracked, so this check does not cover them) |
| Application source changes | None |
| Dependency/lockfile changes | None |
| Database changes | None |
| External wallet/AI/payment calls | None |
| Device copy byte comparison | Verified after copy |

---

## 17. Conclusion

S4 is complete and closed on the project owner's confirmed end-to-end browser acceptance. Its implementation and deferred scope are documented, and its working behavior is not to be reworked during S5.

S5 is the next phase. The repository is ready for a **read-only wallet spike and a small, explicitly bounded S5 implementation**, but it is not ready for immediate coding because the NWC dependency, custody model, relay/CSP decision, and wallet validation spike remain owner decisions.

The smallest honest S5 is a protected wallet page that connects over NWC with a memory-only secret, proves liveness with `get_info`, shows capabilities and disconnect honestly, and teaches invoice anatomy with a clearly labelled sample invoice. It must stop there. Real invoice generation, payment authorization execution, settlement, and receipts belong to S6a/S6b and require separate approval.
