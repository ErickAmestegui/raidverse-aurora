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
