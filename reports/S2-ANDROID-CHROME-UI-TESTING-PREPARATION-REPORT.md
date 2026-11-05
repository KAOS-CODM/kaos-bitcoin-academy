# S2 Android Chrome UI Testing Preparation Report

**Date:** 2026-11-05  
**Repository:** `/data/data/com.termux/files/home/kaos-bitcoin-academy`  
**Branch / HEAD:** `main` / `41d37e7df79bdba48b55399ef20fdea0ac7ea4db`  
**Result:** **ISOLATED TEST ENVIRONMENT READY FOR MANUAL ANDROID CHROME TESTING**  
**Application database `kaos_academy`:** **NOT MODIFIED OR SEEDED**  
**Manual UI acceptance:** **PENDING — owner to test in Android Chrome**  
**Deployment / Git commit / Git push:** **NOT PERFORMED**

---

## 1. Preflight findings

### 1.1 Git state

- Branch: `main`
- HEAD: `41d37e7df79bdba48b55399ef20fdea0ac7ea4db`
- 18 modified tracked files, 30 untracked files, 0 staged.
- No commit, push, reset, stash, clean, or discard operation was performed.

### 1.2 Latest readiness report

`reports/S2-UI-TESTING-AND-APPLICATION-DB-READINESS-REPORT.md` records:

- API, database, privacy, reward and automated checks passed.
- Actual browser UI, keyboard, screen-reader and 360 px checks were blocked.
- Phase 2 was not entered.
- The application database was not seeded.

### 1.3 Existing scripts and build

- Root scripts: `dev`, `build`, `start`, `seed`, `typecheck`, `test`.
- Server dev script: `tsx watch src/index.ts`.
- Client dev server: Vite.
- Production client build is served same-origin from `client/dist`.
- `client/dist/index.html` and its assets were current; no file under `client/src` was newer. The build was not rerun in this preparation task.

### 1.4 Running processes and ports

At the start of this preparation run, the existing development app was present on ports `4000` and `5173`, and `http://127.0.0.1:4000/api/health` returned healthy.

Later, when the isolated server was started, those development processes were no longer present. This task issued no stop or kill command against them and did not restart them. The cause was not determined. This is recorded as a limitation in section 11.

The previous isolated server on `4100` was stopped; port `4100` was free before this run.

### 1.5 Test database state before preparation

The actual connected database was positively identified as `kaos_academy_test`, but it was **empty**:

| Collection | Count |
|---|---:|
| courses | 0 |
| lessons | 0 |
| quizzes | 0 |
| achievements | 0 |
| users | 0 |
| progresses | 0 |
| quiz_attempts | 0 |
| xp_events | 0 |
| user_achievements | 0 |
| sessions | 0 |

The prior guarded database suite had cleaned the test database after its run. The empty state was reported before any repair. With explicit owner approval, the test database was reseeded using the existing seeder.

### 1.6 Device-storage report workflow

The established destination is:

```text
/storage/emulated/0/Download/KAOS-Bitcoin-Academy/reports/
```

The report copy is verified byte-for-byte with `cmp` and SHA-256.

---

## 2. Actual test database identity

The configured and actual names were both checked:

```text
configured = kaos_academy_test
actual     = kaos_academy_test
```

The check was performed before seeding and again after the isolated server started. The server launcher refuses to listen if either the configured or actual database name is not exactly `kaos_academy_test`.

The session store is also configured with:

```text
dbName: kaos_academy_test
collectionName: sessions
```

---

## 3. Seeded-content counts

After the approved test-only reseed:

| Content | Expected | Actual |
|---|---:|---:|
| Courses | 8 | 8 |
| Lessons | 22 | 22 |
| Published quizzes | 30 | 30 |
| Published achievements | 3 | 3 |

The content counts match the authored content.

The test database also contains two dedicated test accounts created for this preparation, plus a manually created account observed during the session. Test activity counts change while manual testing is in progress; the content counts above are the stable acceptance baseline.

The seed was performed only against `kaos_academy_test`. No `dropDatabase` was used. Because the database was empty, no destructive reset was required. The first seed attempt failed before any write because of an Atlas DNS timeout; a retry succeeded.

---

## 4. Isolated server startup details

### 4.1 Why a loopback-only launcher was used

The existing server script calls `app.listen(config.port)` without a host, which binds all interfaces. The task explicitly prohibits silently binding to `0.0.0.0`. A temporary launcher was therefore used to bind only to `127.0.0.1`.

The launcher:

- Uses the existing project configuration and `createApp` factory.
- Loads the existing `.env` without modifying it.
- Forces `MONGODB_DB=kaos_academy_test`, `NODE_ENV=test`, `PORT=4100` and `APP_ORIGIN=http://127.0.0.1:4100`.
- Connects through the existing `connectDatabase` function.
- Verifies the actual connected database name is exactly `kaos_academy_test`.
- Uses `MongoStore` with `dbName: kaos_academy_test`.
- Calls `app.listen(4100, '127.0.0.1')`.
- Writes its PID and readiness details to local temporary files.

No repository source file, `.env` file, proxy configuration, or client configuration was changed.

### 4.2 Running process

| Item | Value |
|---|---|
| Process ID | `11122` |
| Host | `127.0.0.1` |
| Port | `4100` |
| Node environment | `test` |
| Actual database | `kaos_academy_test` |
| App origin | `http://127.0.0.1:4100` |
| PID file | `/data/data/com.termux/files/usr/tmp/opencode/s2-android-prep-server.pid` |
| Ready file | `/data/data/com.termux/files/usr/tmp/opencode/s2-android-prep-server-ready.json` |
| Log | `/data/data/com.termux/files/usr/tmp/opencode/s2-android-prep-server.log` |

The process is detached with `nohup` and should survive the OpenCode session. If Termux or Android stops it, use the restart helper in section 9.

### 4.3 Health and exposure checks

```text
GET http://127.0.0.1:4100/api/health
200 {"status":"ok","db":"up"}
```

Loopback-only evidence:

```text
http://127.0.0.1:4100/api/health  -> 200
http://192.168.0.200:4100/api/health -> connection refused
```

The Wi-Fi LAN address is `192.168.0.200`. The isolated server is not reachable there. No public tunnel, router change, firewall change, or `0.0.0.0` binding was used.

`ss`, `netstat` and `lsof` did not expose listener endpoints in this Android environment, so the loopback binding is evidenced by the launcher host argument and the failed LAN connection.

---

## 5. Android Chrome access method and verification

Android Chrome and Termux share the device loopback. This was verified without a public tunnel:

1. A temporary request logger was started on `127.0.0.1:4101` and forwarded to the app on `127.0.0.1:4100`.
2. Chrome was opened at `http://127.0.0.1:4101/`.
3. The logger recorded Chrome requests for:
   - `/`
   - `/assets/index-Db88RVTH.js`
   - `/assets/index-CXkUC2ew.css`
   - `/api/auth/me`
   - `/api/courses`
   - `/api/dashboard`
4. The Chrome user agent recorded was `Chrome/156.0.0.0 Mobile`.
5. The temporary logger was stopped. Port `4101` is closed.
6. Chrome was then opened at the actual app URL, `http://127.0.0.1:4100/`.

This proves that Chrome can reach the Termux loopback and that the app, assets and API load in Chrome. The temporary logger is not part of the test environment and is not running.

No public internet exposure was created.

---

## 6. Exact URL to open

```text
http://127.0.0.1:4100/
```

Use this exact URL in Android Chrome. Do not use the Wi-Fi LAN IP; the isolated server is loopback-only.

---

## 7. Test account instructions

Two dedicated `example.test` accounts were created in `kaos_academy_test`:

| Account | Email | Purpose |
|---|---|---|
| Learner A | `s2-android-a-mw3kce7ymkul@example.test` | Has two saved attempts on the first knowledge check |
| Learner B | `s2-android-b-mw3kce7ymkul@example.test` | Privacy comparison account; no attempts |

Passwords are **not** in this report. They are stored only in this local file:

```text
/data/data/com.termux/files/usr/tmp/opencode/s2-android-test-accounts.txt
```

The file has mode `600` and is outside the repository. Open it in Termux when you need the passwords:

```bash
cat /data/data/com.termux/files/usr/tmp/opencode/s2-android-test-accounts.txt
```

Do not commit, copy into the repository, or include that file in a report.

Learner A was verified through the API to have:

- 2 saved attempts on `btc101-money-problem-check`
- Best score 100%
- 10 XP
- 1 achievement

Learner B was verified to have:

- 0 saved attempts
- 0 XP
- 0 achievements

An additional account with a non-test email was created manually during the session before the two provided accounts. It is not listed here for privacy. It is not one of the dedicated accounts and should not be used for the privacy comparison. Sign out of it and use Learner A and Learner B for formal checks. It was not deleted.

---

## 8. Manual Android Chrome UI testing checklist

### A. Course and lesson visibility

- [ ] Open `http://127.0.0.1:4100/courses`.
- [ ] Confirm **Bitcoin 101** is listed.
- [ ] Open **Bitcoin 101** or go to `http://127.0.0.1:4100/courses/01-bitcoin-101`.
- [ ] Confirm all **8 lessons** are visible across 4 modules.
- [ ] Confirm **What Bitcoin is, in plain language** shows the **Free preview** badge.
- [ ] Open **Money and the problem Bitcoin addresses** or go to `http://127.0.0.1:4100/lessons/btc101-money-problem`.
- [ ] Confirm the lesson content and the **Lesson knowledge check** section appear.

### B. Knowledge checks

Sign in as Learner A first.

- [ ] On `/lessons/btc101-money-problem`, scroll to **Lesson knowledge check**.
- [ ] Submit an incorrect attempt:
  - q1: **Mining speed, wallet design and price charts**
  - q2: **A complete answer to every money problem**
  - Press **Submit answers**.
- [ ] Confirm the result says **Not passed yet**, shows **0 of 2 (0%)**, and shows **Not quite** feedback with explanations.
- [ ] Press **Try again**.
- [ ] Submit a correct attempt:
  - q1: **Purchasing power, movement and permission**
  - q2: **An attempt to address some problems, with real costs and limits**
  - Press **Submit answers**.
- [ ] Confirm the result says **Passed**, shows **2 of 2 (100%)**, shows **Correct** feedback, and shows **+10 XP earned**.
- [ ] Open `http://127.0.0.1:4100/quizzes/btc101-money-problem-check`.
- [ ] Confirm **Your attempts** lists the pre-seeded attempts and the new attempts.

### C. Course assessment

- [ ] Complete the remaining lessons. On each signed-in lesson page, press **Mark as complete** and confirm **Lesson complete** / **Completed**.

| Order | Lesson URL |
|---:|---|
| 1 | `/lessons/btc101-money-problem` |
| 2 | `/lessons/btc101-what-is-bitcoin` |
| 3 | `/lessons/btc101-no-company` |
| 4 | `/lessons/btc101-what-it-is-not` |
| 5 | `/lessons/btc101-keys` |
| 6 | `/lessons/btc101-scams` |
| 7 | `/lessons/btc101-what-you-can-do` |
| 8 | `/lessons/btc101-recap` |

- [ ] Return to `http://127.0.0.1:4100/courses/01-bitcoin-101`.
- [ ] Confirm the course progress reaches **8 of 8 lessons**.
- [ ] Open the assessment with **Start assessment** or go to `http://127.0.0.1:4100/quizzes/btc101-assessment`.
- [ ] Submit a passing attempt. To guarantee a pass, use:
  - q1: **The movement problem**
  - q2: **The exchange holds the keys; the balance depends on it**
  - q3: **Nodes reject the block because it breaks the supply rule**
  - q4: **The person is pseudonymous, and activity can be linked**
  - q5: **Nothing directly, because the exchange held the keys**
  - q6: **Never share it; legitimate support does not need it**
  - q7: **Use a small amount they can afford to lose**
  - q8: **Neither stable purchasing power nor stable price**
- [ ] Confirm the result says **Passed**, **8 of 8 (100%)**, and shows the XP/achievement result.
- [ ] Confirm the course page shows **Course complete**.
- [ ] Open `http://127.0.0.1:4100/dashboard` and confirm the course is complete, XP is present, and achievements are listed.

### D. Saved feedback

- [ ] Open `http://127.0.0.1:4100/quizzes/btc101-money-problem-check` as Learner A.
- [ ] Under **Your attempts**, open **Show saved feedback (2 questions)** for an attempt.
- [ ] Check the question prompt.
- [ ] Check **Your answer:**.
- [ ] Check **Correct answer:**.
- [ ] Check the **Correct** or **Incorrect** badge.
- [ ] Check the explanation.
- [ ] Confirm long question and answer text wraps without horizontal overflow.
- [ ] Repeat for the other saved attempt.

### E. Mobile and accessibility

- [ ] Check the phone's actual viewport at `/courses`, `/courses/01-bitcoin-101`, `/lessons/btc101-money-problem`, `/quizzes/btc101-money-problem-check`, `/quizzes/btc101-assessment` and `/dashboard`.
- [ ] Confirm there is no horizontal scrolling and no clipped text.
- [ ] Open and close the saved-feedback disclosure; confirm the summary text is readable.
- [ ] With a hardware keyboard or Chrome keyboard navigation, Tab through:
  - **Skip to content**
  - Header navigation
  - Quiz radio options
  - **Submit answers**
  - **Show saved feedback**
- [ ] Confirm focus is visible and the disclosure opens with the keyboard.
- [ ] Use arrow keys within a radio group and confirm the selection changes.
- [ ] If TalkBack is available, focus a quiz option and the result. Confirm the question legend, option text, **Correct** / **Not quite**, and the saved-feedback labels **Your answer**, **Correct answer**, **Correct** / **Incorrect** are announced.
- [ ] Treat these as manual observations, not a formal accessibility pass. Existing audit findings about color-only option state remain.

### F. Privacy

- [ ] While signed in as Learner A, note the saved attempts and XP on `/quizzes/btc101-money-problem-check` and `/dashboard`.
- [ ] Press **Sign out** in the header.
- [ ] Sign in as Learner B.
- [ ] Open the same quiz results page.
- [ ] Confirm it says **No submitted attempts yet.**
- [ ] Open `/dashboard` and confirm Learner B has no Learner A attempts, XP or achievements.
- [ ] Confirm Learner B cannot see Learner A's email, attempts, XP or achievements.
- [ ] Sign out of Learner B and sign back in as Learner A when finished.

### G. Guest restrictions

- [ ] Sign out.
- [ ] Open `/lessons/btc101-money-problem`; confirm **Sign in to read this lesson** and the **Read the free preview** button.
- [ ] Open `/quizzes/btc101-what-is-bitcoin-check`; confirm the preview quiz loads and the options are disabled with **Sign in to answer**.
- [ ] Open `/quizzes/btc101-money-problem-check`; confirm **Sign in to take this quiz**.
- [ ] Open `/quizzes/btc101-assessment`; confirm **Sign in to take this quiz**.

---

## 9. Safe server shutdown and restart

### Stop the isolated server

```bash
kill -TERM "$(cat /data/data/com.termux/files/usr/tmp/opencode/s2-android-prep-server.pid)"
```

Verify it stopped:

```bash
curl -sS -m 3 http://127.0.0.1:4100/api/health
```

The request should fail to connect.

Do **not** use `pkill node`, `pkill -f tsx`, or similar broad commands; they could stop unrelated Node processes. Do not touch ports `4000` or `5173`.

### Restart the isolated server

A verified local helper is available:

```bash
bash /data/data/com.termux/files/usr/tmp/opencode/s2-android-prep-start.sh
```

The helper refuses to start if the server is already healthy, starts it detached with `nohup`, and waits for the health check. It uses the same loopback-only launcher and the same `kaos_academy_test` guard.

---

## 10. Final verification and Git state

### Isolated app checks

| Check | Result |
|---|---|
| Actual database identity | `kaos_academy_test` |
| Health | `200 {"status":"ok","db":"up"}` |
| Client root | `200`, title `KAOS Bitcoin Academy` |
| Course API | `200`, Bitcoin 101 present |
| Course detail | `200`, 8 lessons |
| Authenticated lesson | `200`, 9 sections, lesson quiz present |
| Authenticated assessment | `200`, 8 questions, 80% pass mark |
| Guest locked lesson | `401` |
| Guest preview quiz | `200` |
| Guest locked quiz | `401` |
| Guest assessment | `401` |
| Guest results | `401` |
| Learner A results | 2 saved attempts, best 100% |
| Learner B results | 0 saved attempts |
| LAN exposure | `192.168.0.200:4100` unreachable |
| Chrome loopback access | Verified through temporary loopback logger |

### Git and PRD

- `git diff --check`: passed.
- No staged changes, commits or pushes.
- No PRD file was modified.
- `PRD.md` SHA-256: `1e73e32cd99629099ee143ff5377555296c20fb4489263c3c57c3a25dc50c23d`
- `PRD-ORIGINAL.txt` SHA-256: `7a44c87ea4eba3bf1e13a89baa402515d67bbb707fd4c181046b32b8cd86eaed`
- `PRD.txt` SHA-256: `80f7f293030ec9cb8429811b74233d1906500c11b47c9a214a6521db3884d873`

Final `git status --short` summary:

- 18 modified tracked files
- 31 untracked files, including this report
- 0 staged
- 0 commits, 0 pushes

Full final status:

```text
 M client/src/App.tsx
 M client/src/lib/queries.ts
 M client/src/lib/types.ts
 M client/src/pages/CourseDetail.tsx
 M client/src/pages/Dashboard.tsx
 M client/src/pages/Lesson.tsx
 M server/src/app.ts
 M server/src/content/index.ts
 M server/src/content/types.ts
 M server/src/db.ts
 M server/src/lib/progress.ts
 M server/src/routes/courses.ts
 M server/src/routes/dashboard.ts
 M server/src/routes/lessons.ts
 M server/src/routes/progress.ts
 M server/src/seed/seedContent.ts
 M server/test/db.integration.test.ts
 M server/test/http.test.ts
?? S2-SUMMARY.md
?? client/src/components/Quiz.tsx
?? client/src/pages/Quiz.tsx
?? reports/DNS-IMPLEMENTATION-REPORT.md
?? reports/DNS-MONGODB-CUSTOM-RESOLVER-INVESTIGATION.md
?? reports/DNS-MONGODB-INSPECTION-REPORT.md
?? reports/S2-ACCEPTANCE-AUDIT-REPORT.md
?? reports/S2-ANDROID-CHROME-UI-TESTING-PREPARATION-REPORT.md
?? reports/S2-CONCURRENCY-FIX-REPORT.md
?? reports/S2-FEEDBACK-AND-SEEDER-FIX-REPORT.md
?? reports/S2-IMPLEMENTATION-REPORT.md
?? reports/S2-PLANNING-AND-ROADMAP-REPORT.md
?? reports/S2-PRE-IMPLEMENTATION-AUDIT-REPORT.md
?? reports/S2-QUIZ-IMPLEMENTATION-AND-VISIBILITY-AUDIT.md
?? reports/S2-UI-TESTING-AND-APPLICATION-DB-READINESS-REPORT.md
?? server/src/content/achievements.ts
?? server/src/content/quizzes/
?? server/src/lib/dns.ts
?? server/src/lib/quiz.ts
?? server/src/lib/rewards.ts
?? server/src/models/Achievement.ts
?? server/src/models/Quiz.ts
?? server/src/models/QuizAttempt.ts
?? server/src/models/UserAchievement.ts
?? server/src/models/XpEvent.ts
?? server/src/routes/quizzes.ts
?? server/src/schemas/quiz.ts
?? server/test/dns.test.ts
?? server/test/quiz-content.test.ts
?? server/test/quiz.test.ts
?? server/test/rewards.test.ts
```

At the final content check, the stable authored content counts were still:

```text
courses=8
lessons=22
quizzes=30
achievements=3
```

The learner-activity counts changed during the check because manual testing was in progress. That is expected and does not affect the authored-content baseline.

---

## 11. Blockers and limitations

1. **Existing app on ports 4000 and 5173 is no longer running.** It was healthy at the initial preflight and was not present later. This task issued no stop/kill command and did not restart it. The cause was not determined.
2. **Atlas DNS is intermittent.** Seed and read-only checks required retries. The successful writes were guarded by an actual database name check.
3. **Manual UI acceptance is still pending.** This preparation verifies availability and API behavior, not visual acceptance, TalkBack behavior or 360 px layout.
4. **Accessibility is manual-only.** No automated screen-reader or viewport tooling was added.
5. **Test-mode logging is silent.** Chrome reachability was verified with a temporary loopback logger, not server logs.
6. **A non-test account was created manually in the test database during the session.** It is not one of the provided accounts and was not deleted. Use Learner A and Learner B for the privacy test.
7. **The test database is not the application database.** Do not use real learner data or real credentials in it.
8. **Pre-existing audit findings remain.** These include color-only option state and other S2 audit items. They are not fixed by this preparation.
9. **The `PRD.txt` versus `PRD.md` baseline discrepancy remains unresolved.** It was not changed by this task.

---

## 12. Confirmation: `kaos_academy` was not modified or seeded

Every database write in this preparation was preceded by a positive actual-connection check:

```text
configured = kaos_academy_test
actual     = kaos_academy_test
```

The seeder, account creation, attempts, XP, achievements and session store all used `kaos_academy_test`.

The following were not done:

- No connection was made to `kaos_academy` for writes.
- No `npm run seed` was run against the application database.
- No `dropDatabase` was used.
- No application database reset, seed or delete was performed.
- No deployment, commit, push, reset, stash, clean or discard was performed.

**`kaos_academy` was not modified or seeded.**

---

## Device-storage copy

Destination:

```text
/storage/emulated/0/Download/KAOS-Bitcoin-Academy/reports/S2-ANDROID-CHROME-UI-TESTING-PREPARATION-REPORT.md
```

The final copy is verified with `cmp` and SHA-256 after the report is finalized.
