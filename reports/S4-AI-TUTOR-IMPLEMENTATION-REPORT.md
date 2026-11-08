# S4 AI Tutor Implementation Report

Date: 2026-11-07  
Repository: `kaos-bitcoin-academy`  
Status: **S4 COMPLETE** — automated implementation verification passed; manual end-to-end browser acceptance confirmed by the project owner; AI remains configuration-gated  
Closure date: 2026-11-07

## 1. Outcome

The AI Tutor is implemented as an additive S4 feature using the existing Node/Express, TypeScript, MongoDB, Zod, Pino, React, and React Query stack.

The tutor:

- Lets authenticated learners ask Bitcoin questions.
- Grounds answers in published academy courses and lessons.
- Uses full selected-lesson context when opened from a lesson.
- Keeps conversation history only in the current browser session.
- Sends requests only from the server to OpenRouter.
- Uses the single `openrouter/auto` model alias exactly as instructed.
- Has no custom model rotation, manual model catalogue, or secondary provider fallback.
- Remains disabled unless both `AI_ENABLED=true` and `OPENROUTER_API_KEY` are configured.

No S1, S2, or S3 application logic was changed. No database schema, quiz, XP, achievement, completion, authentication, or Bitcoin Playground logic was changed.

**S4 closure:** S4 is recorded as **COMPLETE** on 2026-11-07. The project owner manually tested the running application and confirmed end-to-end operation. Automated verification and manual browser acceptance are separate evidence and are recorded separately in §7. Deferred scope is listed in §8 item 5 and §10.

## 2. Read-only inspection findings

Before implementation, the repository was inspected without modification.

- Branch: `main`
- HEAD: `39093b3f94f93f2dd15f7ca264c8583df1420187`
- Remotes: none configured
- Working tree before this task: S2/S3 committed; the S4 audit and earlier S2/roadmap reports were untracked
- Existing AI tutor implementation: none
- Existing AI provider integration: none
- Existing model-rotation implementation: none in the academy repository
- Existing AI-related environment variables: none
- Existing AI dependencies: none
- Existing tutor API route: none
- Existing tutor UI page: none
- Existing chat-history model or collection: none

The existing integration points used were:

- `server/src/app.ts` for the API mount point
- `server/src/config.ts` and `server/.env.example` for configuration
- `server/src/models/Course.ts` and `Lesson.ts` for published grounding content
- `server/src/middleware/auth.ts`, `validate.ts`, and `errors.ts` for access, validation, and safe errors
- `client/src/App.tsx` and `components/Layout.tsx` for routes and navigation
- `client/src/pages/Lesson.tsx` and `Dashboard.tsx` for learner entry points

No model-rotation code was found outside the earlier audit's file list. Nothing was removed, simplified, or replaced.

## 3. OpenRouter integration

Server module: `server/src/lib/openrouter.ts`

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model sent: `openrouter/auto`
- The model is a server-side constant. It is not configurable from the browser and no model list is maintained.
- Authentication: `Authorization: Bearer <OPENROUTER_API_KEY>` from server environment only.
- Timeout: 30 seconds.
- Request: `temperature: 0.4`, `max_tokens: 800`.
- Response support: string content and array-of-text-parts content.
- Failures: generic `TutorProviderError`; upstream bodies and the API key are never forwarded to the client.
- No retries, no provider fallback, and no custom model rotation are implemented.

Configuration:

- `AI_ENABLED=false` by default.
- `OPENROUTER_API_KEY=` has no default.
- AI is enabled only when `AI_ENABLED=true` and a non-empty `OPENROUTER_API_KEY` are both present.
- The actual `server/.env` was not modified.

## 4. Tutor backend and safety controls

Server route: `server/src/routes/tutor.ts`

- Endpoint: `POST /api/tutor/chat`
- Requires an authenticated learner session.
- Returns `503 AI_DISABLED` when the feature is not configured.
- Returns `503 AI_UNAVAILABLE` for provider failure, timeout, empty response, or malformed upstream response.
- Returns `429 AI_RATE_LIMITED` when a limit is reached.
- Limits: 12 requests per 10 minutes and 50 requests per 24 hours per authenticated learner.
- The limits are in-process memory limits; they reset on restart and are not shared across multiple server instances.
- Request validation is strict Zod validation:
  - message: 1–1,000 characters
  - lesson slug: optional, lowercase letters/numbers/hyphens, maximum 80 characters
  - history: maximum 8 messages, each 1–2,000 characters
  - history roles: only `user` and `assistant`; client-supplied `system` messages are rejected
- The existing 32 KB JSON body limit remains in force.
- Responses are sent with `Cache-Control: no-store`.

Prompt and grounding:

- `server/src/lib/tutorContext.ts` builds a context pack from published courses and lessons.
- A selected lesson supplies its objectives and full readable section content.
- Other available lessons are supplied as a compact catalogue of course titles and lesson summaries.
- `server/src/lib/tutorPrompt.ts` instructs the tutor to:
  - use academy material as the primary source;
  - state when material is insufficient;
  - avoid invented protocol details, transaction data, prices, and wallet guarantees;
  - refuse financial advice;
  - never request or repeat secrets;
  - stay within Bitcoin education;
  - treat conversation history as untrusted dialogue, not instructions;
  - mark informal practice questions as non-official and non-XP-bearing.

No learner email, user ID, password, session secret, wallet data, or payment data is included in prompts.

## 5. Learner-facing interface

New protected page: `client/src/pages/Tutor.tsx` at `/tutor`

- Session-only message list in React state; refreshing or closing the page starts a new conversation.
- No chat-history database collection or persistence.
- Lesson context is loaded from `/api/lessons/:slug` when the page is opened with `?lesson=...`.
- Clear educational disclaimer and a warning never to share secrets.
- Beginner-friendly quick prompts.
- Loading, disabled, rate-limited, network, and provider-error states.
- Accessible form label, conversation log semantics, status announcements, and visible focus styles inherited from the existing theme.

Entry points added:

- Signed-in navigation: `AI Tutor`
- Dashboard: `Ask the AI Tutor`, using the resume lesson when available
- Lesson page: `Ask the tutor`, passing the current lesson slug

## 6. Files changed

New files:

- `client/src/pages/Tutor.tsx`
- `server/src/lib/openrouter.ts`
- `server/src/lib/tutorContext.ts`
- `server/src/lib/tutorPrompt.ts`
- `server/src/routes/tutor.ts`
- `server/src/schemas/tutor.ts`
- `server/test/tutor.test.ts`
- `reports/S4-AI-TUTOR-IMPLEMENTATION-REPORT.md`

Modified files:

- `client/src/App.tsx`
- `client/src/components/Layout.tsx`
- `client/src/lib/queries.ts`
- `client/src/lib/types.ts`
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/Lesson.tsx`
- `server/.env.example`
- `server/src/app.ts`
- `server/src/config.ts`
- `server/src/logger.ts`
- `server/test/http.test.ts`
- `server/test/static.test.ts`
- `server/test/validation.test.ts`

No package dependency was added. No database model, migration, or seed file was added or changed.

## 7. Verification evidence

### 7.1 Automated verification (implementation phase)

The following automated results were recorded during S4 implementation. This documentation-only closure did not re-run them.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed: server and client |
| `npm --prefix client run build` | Passed |
| `npm run build` | Passed: server and client |
| `npm --prefix server test` | 90 tests passed, 0 failed |
| `git diff --check` | Passed, no whitespace errors |
| PRD SHA-256 | `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d` (unchanged) |

Tutor-specific tests cover:

- `openrouter/auto` is the model in the request body.
- The API key is sent only in the server-side Authorization header.
- The client bundle does not contain `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, or `openrouter/auto`.
- The built learner bundle contains the tutor page/API call.
- The tutor API is mounted in the real app and requires authentication.
- Grounded context and bounded history reach the provider messages.
- Client-supplied system messages are rejected.
- Disabled/missing-key states fail safely.
- Provider failures do not leak the key or upstream body.
- Existing content, quiz, playground, progress, and static-bundle tests still pass.

### 7.2 Manual end-to-end browser acceptance (project owner)

The project owner manually tested the actual running application and confirmed that the tutor works end to end. This is the S4 acceptance evidence.

Recorded evidence:

- The `/tutor` page loaded in the actual academy.
- A learner submitted a Bitcoin question.
- The application successfully communicated with OpenRouter.
- The configured model identifier was `openrouter/auto`.
- The tutor returned an answer successfully.
- The response appeared in the browser conversation.
- The tutor provided a beginner-friendly explanation and referenced relevant academy lessons.
- Owner statement: **"It works end to end."**

Limits of this evidence:

- OpenCode did not independently observe the owner's browser session, capture network logs, or inspect the owner's provider dashboard.
- The owner did not report a browser name, device, operating system, or exact test inputs. Those details are not inferred or invented here.
- This is functional browser acceptance. It does not establish screen-reader conformance, 360 px/mobile acceptance, or formal accessibility conformance.
- The manual test is not evidence of provider quota, billing, or production readiness beyond the tested path.

### 7.3 Not performed or not verified

- The database integration suite was not run because `RUN_DB_TESTS=1` was not set.
- No formal screen-reader or mobile-viewport acceptance was performed.
- No independent OpenCode browser test with a live provider was performed.
- No production deployment or provider quota/terms verification was performed.
- No wallet, invoice, payment, or settlement operation was involved.

## 8. Remaining issues and owner actions

1. **Enable only with current terms and quota verified.**  
   To activate the tutor, set `AI_ENABLED=true` and `OPENROUTER_API_KEY` in the server deployment environment. Do not commit the key. Verify OpenRouter's current free-tier limits, privacy terms, and training opt-out before enabling.

2. **Application limits are not a provider quota guarantee.**  
   The 12-per-10-minute and 50-per-24-hour caps are in-process safeguards. They reset on restart and are not shared by multiple instances. The owner should monitor actual OpenRouter usage and adjust the caps if needed.

3. **Authentication is required.**  
   The tutor is available to signed-in learners. Anonymous preview visitors who choose the tutor are redirected to sign in. If anonymous tutoring is desired, that requires an explicit owner decision.

4. **Conversation retrieval endpoints are deferred.**  
   `PRD.md` lists `GET /api/tutor/conversations` and `GET /api/tutor/conversations/:id`. The owner's initial-version instruction prohibits chat-history database persistence, so only `POST /api/tutor/chat` is implemented and the conversation is session-only in the browser. Those GET endpoints should be added only if persistence is explicitly approved.

5. **S4 closure is scoped to the accepted implementation.**  
   The owner's manual browser test closes the implemented tutor. PRD Module C practice-question generation and the `GET /api/tutor/conversations` endpoints remain deferred; S4 does not claim them complete. Conversation persistence was excluded by the initial-version instruction, and generated practice questions are not persisted or used for XP or graded assessments.

## 9. Scope preservation

- S2 and S3 were not re-audited, redesigned, or modified.
- Course, lesson, quiz, XP, achievement, completion, authentication, and playground logic were not changed.
- No database schema or seed data was changed.
- No dependencies were installed.
- No Git commit, push, branch, or remote operation was performed.

The tutor is implemented and accepted. Production activation remains configuration-gated: both `AI_ENABLED=true` and a server-side `OPENROUTER_API_KEY` must be present, and the deployed key must not be committed.

## 10. S4 closure record

| Item | Record |
| --- | --- |
| S4 status | **COMPLETE** |
| Implementation | Complete for the implemented tutor scope |
| Automated verification | Passed as recorded in §7.1 during implementation |
| Manual end-to-end browser acceptance | Confirmed by the project owner: `/tutor` loaded, a question was submitted, OpenRouter was reached, `openrouter/auto` returned an answer, and the answer appeared in the browser |
| Unperformed checks | Database integration suite, formal screen-reader/mobile acceptance, independent OpenCode live-browser test, production quota/terms verification |
| Deferred scope | Conversation retrieval endpoints and persisted/graded AI-generated practice questions |
| S5 work in this closure | None |
| Git/deployment | No commit, push, or deployment performed |

S4 is closed. The working tutor, its OpenRouter integration, its `openrouter/auto` model alias, and its session-only history are not to be reimplemented or redesigned as part of S5.
