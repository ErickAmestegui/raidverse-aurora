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

## Aurora Edition visual transformation & hardening — 2026-10-29
- Redesigned the visual experience according to the approved **RAIDVERSE — Aurora Edition** direction:
  - Central design tokens: Electric Violet (`#8054FF`), Cosmic Pink (`#FF609E`), Aurora Teal (`#37DCD0`), Warm Gold (`#FFBC69`), Midnight Blue (`#141633`), Lavender White (`#F7F5FF`).
  - Authored 3D Relic in Three.js: faceted jewel geometry, chromatic edge dispersion, glowing inner 8-point golden star core, tiered plinth with neon concentric rings for dashboard, floating multifaceted crystal shards and orbiting energy halos. Preserves 100% canvas transparency in OBS overlay (`plinth.visible = !transparent`).
  - Streamlined navigation: Home, My Artifact, Transfers, Memories, Settings.
  - Primary headline: "Create something together. Your community builds it. Your next raid carries it forward."
  - 3-step primary flow: **CREATE → EVOLVE → SEND**.
  - Community Powers cards: Light (golden 8-point star), Fire (stylized flame crest), Storm (celestial vortex), Crystal (faceted gem), with instant 1-click clipboard copy.
  - Interactive Transfers: clear route display, waiting for raid, receiver acceptance, and procedural portal animation.
  - Memories: emotional visual cards and timeline, linking to public `/legacy/:id` route.
  - Clear state indicators: REHEARSAL MODE vs TWITCH LIVE vs DISCONNECTED vs NEEDS ATTENTION.
  - Emergency hide: decoupled from dashboard operations, immediately hides overlay and persists across reloads.
- Expanded automated test suite: **53/53 tests passed** (api.test.ts, domain.test.ts, twitch.test.ts).
- TypeScript and production bundle: **passed** (`tsc --noEmit && vite build`).
- Browser Playwright QA:
  - `aurora.js`: verified rename, copy commands, 4 powers, transfer preparation, simulation, receiver approval, portal, and evolution.
  - `aurora-safety.js`: verified emergency button while an operation is busy, keyboard skip link, and persistent mobile safety control after scroll.
  - Verified no horizontal overflow across 1920, 1440, 1280, 820, and 390 px viewports.
  - Verified OBS overlay canvas transparency (zero alpha pixels outside artwork).

## Current next action / hard external gate
One real channel has authorized successfully and authentic chat works. Do not
repeat application registration or replace its credentials. Follow
[SECOND-CHANNEL.md](SECOND-CHANNEL.md) to authorize a consenting receiver in an
independent browser profile on the same server, then perform the actual raid,
approval, receiver contribution and native OBS checks. Until then the complete
LIVE handoff is not verified. SUBMISSION.md includes a truthful one-channel
fallback; the final video and publication remain open.

No remote deployment, repository publication, YouTube upload or Devpost submission has been performed. Those need a concrete review and the user's publication approval. No paid AI API, promotional credits or new paid service was used.

## Authentic LIVE checkpoint — November 1 Bolivia / November 2 UTC

- Genuine token validation and enabled chat/raid subscriptions inspected; one real
  channel authorized. No credential or application change was required.
- Aether 001 retains two authentic light contributions. The new message arrived at
  03:26:26 UTC, was accepted in round 3, persisted and broadcast at revision 52.
  The user confirmed the visible 1→2 increase. Chromium confirmed two verified
  history rows and the rendered relic, with no console errors/warnings.
- Safe public evidence and screenshots are under output/live/. A consistent private
  SQLite backup and original vault key are excluded from source delivery.
- Restoration branch checkpoint/pre-final-delivery-c96b7c8 precedes this work.
- Final suite **66/66 passed**: 28 domain, 10 API, 24 local Twitch fixtures, two
  snapshot-ordering and two diagnostic-privacy tests. Added independent-session/logout
  and completed-transfer/reopen regressions. Fixtures do not authenticate real users.
- TypeScript + production build passed; existing ~773 kB bundle advisory remains.
  Runtime npm audit returned zero known vulnerabilities at this check.
- Source security review found no P0/P1 authorization/transfer blocker. It is not a
  penetration test. Mode isolation, opt-in, approval, expiry and dedup remain enforced.
- Updated English submission, judge guide, receiver guide, Codex session reference
  and 2:40 recording plans. A silent real-legacy Chromium B-roll clip was recorded;
  it does not depict a new chat arrival, raid or native OBS. Final video is not made.
- Only one LIVE channel is registered. Authentic raid, B approval/evolution and OBS
  remain pending operator availability. OBS was not found at standard install paths
  or as running obs64; this does not prove it is absent everywhere.
- Rules/FAQ disagree on UTC deadline. Use **17:00 Bolivia November 2** as a conservative
  cutoff; see SUBMISSION.md. No external publication occurred.
- No production data reset, design change, new feature, dependency install or paid
  service. Production restart after the latest real message was not run this step.
