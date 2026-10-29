# Project handoff / evidence ledger

Read this first when resuming. Do not repeat completed work or claim unrun checks.

## Mission
Build RAIDVERSE for Codex × TwitchCon 2026 with US$0 runtime services. Internal target November 1. Preserve complete real Twitch flow and honest evidence.

## Initial inspection — 2026-10-29
- Workspace empty; no existing Git repository or prior product.
- Node 24.16.0, npm 11.13.0, Git available. `rg` unavailable.
- PowerShell blocks npm.ps1; use npm.cmd. Default npm cache inaccessible in sandbox; use workspace-local cache.
- Created fresh project skeleton; no existing work replaced.
- Twitch credentials and two authenticated channels not available yet.
- LIVE chat/raid tests: NOT RUN.

## Plan
1. Auth + EventSub + visible authentic chat state; external verification requires two broadcasters.
2. Persistent deterministic artifact + secure transfer state machine.
3. Dashboard, OBS overlay, legacy and cinematic portal.
4. Automated tests, browser QA, live evidence and submission assets.

## Restoration
Before future large changes, inspect Git and propose a restore point. Initial scaffold has no prior state to restore. Do not publish or make destructive changes without permission.

## Hito: functional rehearsal MVP — 2026-10-29
- Implemented: OAuth authorization code, encrypted tokens, hourly/startup validation, refresh, EventSub chat/outgoing raids, reconnect/migration, provider envelope validation. LIVE NOT VERIFIED.
- Implemented: SQLite persistence, artifact identity/counts/history, participation limits, expiry/reject/cancel/approval, read-only state WebSocket, CSRF/Origin/Host checks, owner controls, opt-in moderator chat controls, emergency overlay clearing and viewing-key rotation.
- Implemented: Three.js artifact and four effects, procedural portal, dashboard, legacy archive/page, transparent overlay and separate synthetic rehearsal input.
- Executed `npm test`: 36/36 passed (20 domain, 8 HTTP, 8 Twitch adapter fixtures). Tests use temporary databases and local protocol fixtures, NOT real Twitch.
- Executed initial `npm run build`: TypeScript and production bundle passed. Removed an empty CSS import warning afterwards; final rebuild pending. Bundle-size advisory remains.
- Browser Chromium: entered rehearsal, contributed all four elements as synthetic viewers, prepared ORBITAL → NOVA, simulated raid, explicitly accepted, captured portal, began evolution, contributed again in NOVA. Assertions verified the same ID, two communities, exactly one completed transfer, crystal count 2 and no TWITCH evidence in rehearsal records.
- Actual server restart retained artifact and first two contributions. Browser reload reconnected.
- Found/fixed development HMR socket collision (application upgrade handler destroyed Vite's socket); reload then showed zero console errors. React StrictMode produces an expected development socket-close warning.
- Windows `npm.cmd` multiline script arguments lost quoting; added scripts/browser-cli.mjs which passes code directly without cmd re-parsing.
- Browser assets in output/playwright are REHEARSAL material, not submission evidence.
- Git initialized locally. Elevated tool user differs from sandbox owner; use per-command safe.directory only if necessary, never a global trust change.
- Twitch .env absent as of this checkpoint. Real OAuth, authentic chat, subscriptions against Twitch, two real channels, raid/OBS recording and live end-to-end remain blocked on user setup.

## Final local validation checkpoint — 2026-10-29
- Local restoration commit: c267655 (initial functional MVP); subsequent QA/docs fixes are recorded in Git.
- Expanded `npm test`: **39/39 passed** (20 domain, 8 HTTP, 11 Twitch fixtures). Added simultaneous channel fixture connections, raid notification routing and subscription-401 reauthorization. Refreshed expiring tokens before opening EventSub to respect the welcome subscription deadline.
- Final `npm run build`: **passed**, including TypeScript. Advisory: the authored Three.js + React entry bundle is ~749 kB / ~204 kB gzip; not a build failure. No claim of optimized low-end-device performance.
- `npm audit --omit=dev`: zero known vulnerabilities at the last executed check. tsx classified as a runtime dependency because npm start uses it. Audit results are time-bound, not a security guarantee.
- Browser: transparent overlay at 1920×1080 and 1280×720; synthetic watermark; actual dashboard clear/restore; no horizontal overflow at 1280×720 or 390×844; legacy page and mobile navigation checked.
- Browser rAF sample: 151 callbacks over 2.5 seconds, about 60 callbacks/s. This is not OBS or a GPU benchmark.
- Switched the real local process from development to **production on http://localhost:3000**. Data retained the same artifact 5e31b038-2e10-4bf7-8e0b-63cb845c4e57, owner NOVA, two communities, counts light=1/fire=1/storm=1/crystal=2.
- Production browser QA: **passed**; zero page exceptions, CSP present, emergency clear/restore worked, public legacy retained data. Actual canvas pixel sample: 1,396,427 fully transparent and 145,333 visible pixels; establishes alpha output for that frame, not OBS compositing certification.
- Improved functional text readability, sticky emergency control, mobile navigation, legacy pagination, selected-channel restoration and clear feedback after overlay-key rotation.
- English README, architecture, testing guide, criterion-by-criterion audits, Devpost draft, 2:45 video shot list and third-party notes prepared.
- Source-only package and rehearsal screenshots can be shared; exclude data, vault key, .env, browser logs/storage, node_modules and caches.

## Next action / hard external gate
The user must register a confidential Twitch application with callback http://localhost:3000/auth/callback and save credentials locally in raidverse/.env, never in chat or Git. Confirm two consenting real channels. Restart the server, authorize them in separate browser profiles, then execute docs/TESTING.md's LIVE checklist. Until that passes, **RAIDVERSE is not complete and not ready to submit**.

No remote deployment, repository publication, YouTube upload or Devpost submission has been performed. Those need a concrete review and the user's publication approval. No paid AI API, promotional credits or new paid service was used.
