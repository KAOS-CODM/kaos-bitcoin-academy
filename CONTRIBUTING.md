# Contributing to KAOS Bitcoin Academy

Contributions are welcome, and small, focused pull requests are the easiest to accept.

This project teaches Bitcoin to beginners. A change that makes the product clearer, safer, or
more useful to a learner is almost always the right change.

---

## Before you start

Three documents decide what this project is. Please read the relevant ones before you write
code.

| Document | Why it matters |
| --- | --- |
| [`PRD.md`](./PRD.md) | The requirement specification and the source of truth for scope. It is **frozen**: a change that contradicts it is a change of scope, not a bug fix. Raise the question **first**. |
| [`ENGINEERING-DECISIONS.md`](./ENGINEERING-DECISIONS.md) | The decisions already made, including the ones still open. Do not re-litigate a settled decision in a pull request. |
| [`README.md`](./README.md) | The current state of the product: what works, what is planned, and what is explicitly not implemented. |

If you are touching the wallet, read the S6 reports in [`reports/`](./reports/) first. The
wallet boundaries there are deliberate, tested, and load-bearing.

---

## Reporting a bug

Open an issue. A good report contains:

1. **What you did.**
2. **What you expected to happen.**
3. **What happened instead.**
4. **Your environment** — operating system, browser, and Node.js version.
5. **The relevant error message**, with anything sensitive removed.

### Redact before you post

The following are credentials. Remove them from anything you paste into an issue, a pull
request, a screenshot, or a log:

- Seed phrases and private keys.
- Nostr Wallet Connect connection URIs, **including the `secret` parameter**.
- Passwords, session cookies, and session identifiers.
- MongoDB connection strings and API keys.
- Real Lightning invoices and payment hashes from a live wallet.

A reproduction never needs real funds. Use a throwaway wallet with a zero-satoshi budget.

---

## Proposing a change

1. **Open an issue first** for anything substantial. It is cheaper to agree on an approach
   than to review a finished pull request that took the wrong direction.
2. **Fork the repository** and branch from `main`.
3. **Make the change.** Keep it focused; unrelated cleanups in the same pull request make the
   review harder.
4. **Add or update the test that covers it.** A change without a test is a change without
   evidence.
5. **Run the checks** (see below).
6. **Open the pull request**, describing what changed and why it is needed.

---

## Local development

```sh
# The root package holds only the workspace scripts; client/ and server/ have their own
# manifests and lockfiles, so install both.
npm install --prefix client
npm install --prefix server

cp server/.env.example server/.env
cp client/.env.example client/.env.local

# Fill in server/.env — MONGODB_URI and SESSION_SECRET are required.
npm run seed        # seeds the course content into MongoDB

npm run dev         # API on :4000, client on :5173
```

### Before you open a pull request

```sh
npm run build          # build first: two test suites assert against client/dist
npm run typecheck      # server and client
npm --prefix server test
```

The build **must** run before the tests. `server/test/static.test.ts` and
`server/test/s7-product-readiness.test.ts` assert against the built output in
`client/dist`, not against source, so a test run against a stale bundle can hide a packaging
regression.

---

## House rules

These are not stylistic preferences. Each one exists because breaking it would weaken a
guarantee the project makes to its learners.

### The wallet boundary does not move

- **The server must never gain a wallet route**, and no wallet credential, balance, or
  transaction history may be stored server-side.
- **Only the two approved relays** may ever be contacted. `connect-src` in the Content-Security-Policy
  lists exactly those two origins and must never be widened to `wss://*`.
- **The service worker must not gain the ability** to cache an `/api/` response, a
  cross-origin request, or a state-changing request.
- **Never claim a payment succeeded** unless the wallet's own evidence supports it. The
  academy's honesty about payment status is a feature, not a formality.

### No credentials, ever

No seed phrase, private key, connection URI, session secret, database URI, or API key may
appear in the source, the tests, the reports, the documentation, or an issue. Secrets live in
environment variables and nowhere else.

### No new runtime dependency without discussion

The project runs at zero cost and keeps its dependency surface deliberately small. If a change
needs a new runtime package, open an issue first and explain why the existing tools cannot do
the job. Dev-only tooling is a lighter conversation than a runtime dependency, but it is still
worth asking.

### Documentation is part of the change

If you change behaviour, update the affected documentation in the same pull request:

| You changed | Update |
| --- | --- |
| A feature, a limitation, or a roadmap item | `README.md` |
| A deployment step, an environment variable, or an architecture detail | `DEPLOYMENT.md` |
| A security control | `SECURITY.md` |
| A decision and its rationale | `ENGINEERING-DECISIONS.md` |

The requirement specification is the one document you must **not** edit. It is frozen and
integrity-checked; if it needs to change, that is an explicit decision for the project owner.

---

## Style

There is no linter or formatter configured, so consistency is maintained by matching the
surrounding code:

- **TypeScript in `strict` mode**, with `verbatimModuleSyntax` and `isolatedModules`. Both
  projects type-check cleanly and must keep doing so.
- **Comments explain why, not what.** The codebase already does this; a comment that
  restates the line below it is noise.
- **Keep user-facing language plain.** The product teaches beginners. A sentence a
  twelve-year-old cannot follow is a bug in this particular project.
- **Name things for what they are.** `requestAccountBalance` beats `doWalletThing`.

---

## Licence

Contributions are accepted under the [MIT License](./LICENSE), which covers both the
existing code and any contribution you submit. By opening a pull request you confirm that you
are happy for your work to be distributed under that licence.

---

## Code of conduct

There is no `CODE_OF_CONDUCT.md` in this repository yet. Be decent to each other in the
meantime: assume good faith, critique the code rather than the person, and assume good faith
in return.
