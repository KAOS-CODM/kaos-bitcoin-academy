# Security Policy

## Reporting a vulnerability

**No formal security audit has been carried out on this project.** That is stated plainly so
that nobody mistakes this document for an audit report.

If you find a security issue, please report it **privately** rather than opening a public
issue:

1. Go to this repository on GitHub.
2. Open **Security → Report a vulnerability**.
3. Describe the issue and include the steps to reproduce it.

A private report reaches the maintainer without publishing the details to everyone who has
already cloned the repository.

> **Please do not open a public issue for a vulnerability.** A public issue publishes the
> details immediately and gives anyone reading it a head start.

### What to include

- **What you did** — the steps to reproduce.
- **What you expected** to happen.
- **What happened instead.**
- **The impact** you observed.
- **Your environment** — operating system, browser, and Node.js version.
- **The affected version** — the commit hash or the release you tested.

### What to redact

Remove any of the following before sending a report. They are credentials, and a report is
still a public artefact once it is forwarded:

- Seed phrases and private keys.
- Nostr Wallet Connect connection URIs, including the `secret` parameter.
- Passwords, session cookies, and session identifiers.
- MongoDB connection strings and API keys.
- Real Lightning invoices and payment hashes from a live wallet.

A reproduction that needs a wallet can be described in terms of a throwaway wallet with a
zero-satoshi budget. You never need a real balance to demonstrate a vulnerability.

### What to expect

| Stage | What happens |
| --- | --- |
| Acknowledgement | A maintainer confirms the report, normally within a few days |
| Assessment | The report is reproduced, and its severity is judged |
| Fix | A fix is prepared and, where the issue is a security boundary, a regression test is added alongside it |
| Disclosure | The reporter is credited, unless they ask not to be |

There is no formal SLA. This is a volunteer-maintained project, and an honest estimate is
better than a promise the project cannot keep.

---

## What the project already protects

These controls are implemented in the current codebase and covered by the test suite. They are
listed so that a reporter can tell the difference between a designed boundary and a gap.

### Wallet and credential boundaries

- **The academy server never handles a wallet.** Nostr Wallet Connect requests run from the
  learner's browser to the wallet service over NIP-44. The server has no wallet route, no
  wallet credential store, and no knowledge of any balance.
- **The connection URI is validated locally** before use: scheme, exactly one relay, exactly
  one secret, an allow-listed relay, a valid hex public key and secret, no whitespace, no
  fragment, and a maximum length.
- **The URI lives in page memory only.** It is never sent to the server, never logged, and
  never written to browser storage. The application uses no `localStorage`, no
  `sessionStorage`, no `indexedDB`, and no client-written cookie.
- **The client is closed on disconnect and when the page is hidden**, and a late wallet reply
  can never restore stale state.
- **SDK console output is suppressed** for the duration of every wallet call, so a failure
  cannot print connection details into DevTools.
- **Every NIP-47 reply is validated strictly**: the `result_type` must match the method that
  was asked for, a reply may not carry both an error and a result, and the result shape must
  match before any value is accepted.

### Account and session security

- **Argon2id password hashing** at the OWASP baseline (19 MiB memory cost, 2 iterations).
  Passwords are never logged and never returned by the API.
- **Server-side sessions in MongoDB** with a 7-day TTL. The session identifier is regenerated
  on sign-in and on registration.
- **Hardened cookies** — `httpOnly`, `sameSite=lax`, `secure` in production, and named
  `__Host-kaos_session` in production, which the browser enforces to mean "this exact origin
  only".
- **Rate limiting** on authentication, quiz submission, and the AI Tutor.
- **Zod validation** on every mutating request body, with explicit length and format bounds.

### Transport and headers

- **A strict Content-Security-Policy** in production. `connect-src` lists only the two
  approved relays and is never widened to `wss://*`.
- **HSTS**, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`,
  and `X-Frame-Options: SAMEORIGIN`.
- **CSRF defence** — mutating requests must be JSON and must originate from the request host
  or an explicitly allowed origin.

### Caching and replay

- **The service worker refuses** to cache an `/api/` response, a cross-origin request, or any
  non-`GET` request. A payment, an invoice creation, a lesson completion, or a quiz attempt
  therefore cannot be replayed from a cache.
- **A payment is never reported as successful on its own.** It is described only as
  unverified, preimage-verified, or wallet-reported settled, and the interface always says
  which.
- **An at-most-once guard** prevents the same payment hash from being submitted twice in one
  page session.
- **The offline page states plainly that nothing was sent**, and that no account request,
  wallet request, payment, or invoice can complete while offline.

---

## Scope

| In scope | Out of scope |
| --- | --- |
| The web application in this repository | Third-party services, including relays, the learner's wallet, and OpenRouter |
| The deployed server configuration | Denial of service against a free-tier host, or the cost of a third party's service |
| A learner's own wallet | The learner's own wallet software, keys, or seed phrase |
| The build and deployment tooling | Vulnerabilities in dependencies that have no exploitable path through this application |

**A finding that requires a user to hand over their seed phrase, or that depends on a
third-party wallet service being malicious, is not a vulnerability in this project.**

---

## Licence

This project is released under the [MIT License](./LICENSE). Please read it before reusing
the code.

```
MIT License — Copyright (c) 2026 Isaiah Yemi Adelowo (KAOS-CODM)
```
