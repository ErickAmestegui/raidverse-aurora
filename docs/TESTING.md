# Validation guide

## Automated checks

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
```

The tests create and remove only their own uniquely named temporary directories. No Twitch credentials, paid service or real raid is needed. Domain tests use deterministic clocks. API tests start an actual local HTTP/WebSocket server. Twitch adapter tests start a local WebSocket fixture server and stub HTTP responses; they verify protocol behavior, **not Twitch service availability**.

Coverage includes strict command parsing, deterministic counts, spam/cooldowns/round caps, restart deduplication, frozen/shared/stale input, moderator controls, matching raids, approval/ownership, preservation of history, rejection/cancellation/expiry, occupied receiver slots, namespace boundaries, encrypted credentials, OAuth nonces, CSRF/Origin/owner checks, overlay viewing-key rotation, read-only browser sockets, token refresh/revocation, EventSub migration, reconnection/resubscription and two simultaneous fixture connections.

## Optional browser QA

```powershell
npm.cmd run dev
# In another terminal:
npm.cmd exec --cache .npm-cache --yes --package @playwright/cli -- playwright-cli --help
node scripts/browser-cli.mjs open http://localhost:3000 --headed
node scripts/browser-cli.mjs snapshot
```

The CLI is optional and does not modify the project's dependencies. It requires an installed compatible browser. Its local cache is ignored by Git.

The scripts in scripts/qa are a **checkpointed operator-assisted sequence**, not an idempotent clean-room test suite. `forge-transfer.js` assumes an existing rehearsal artifact in an open ORBITAL round, with its first crystal/storm contributions already made. `portal.js` assumes a prepared ORBITAL → NOVA transfer. `display-overlay.js` assumes that transferred artifact is active in NOVA. Inspect a fresh snapshot before running a step; do not replay a step into unrelated data.

Executed browser assertions included: full rehearsal transfer and receiver evolution with the same artifact ID; explicit synthetic provenance; transparent overlay styles; emergency clear/restore; visible synthetic watermark; no horizontal overflow at 1280×720 and 390×844; 1920×1080 captures; public legacy. A brief requestAnimationFrame sample in Chromium measured 151 callbacks over 2.5 seconds (~60 callbacks/s). This is **not** a GPU rendering, performance-load or OBS benchmark.

## LIVE checkpoint — one channel verified, remaining checks open

On November 1 Bolivia / November 2 UTC, genuine OAuth and enabled provider
subscriptions were inspected. Authentic chat produced two persisted contributions;
the latest event was traced through commit and broadcast. The user confirmed the
visible 1→2 increase. Production Chromium subsequently showed both accepted history
entries and the current relic, with zero console errors/warnings. See
[evidence](../output/live/README.md). This does not close the receiver/OBS gate.

Latest executed suite: **66/66** (28 domain, 10 HTTP, 24 Twitch fixtures, two
diagnostic-privacy and two snapshot-ordering tests). TypeScript + build passed.
New checks establish isolated LIVE cookies/logout and a completed fixture transfer
with both communities' contributions retained after reopening its temporary DB.
No real account is authenticated by those fixtures.

## Manual LIVE checks — record each result independently

- A verified; authorize B independently using [SECOND-CHANNEL.md](SECOND-CHANNEL.md).
  Verify both identities and genuine chat/raid subscriptions.
- A's real light message and stored ID verified. Verify the other three powers
  against authentic chat; their automated fixture checks already pass.
- Verify the 10-second cooldown, closed round, pause and opted-in moderator controls.
- Prepare A → B; make a real raid from A to B. Verify EventSub's source, destination, event ID and time.
- Accept in B; inspect portal in the actual OBS Browser Source; verify contributions and history persist.
- Reject another invitation, cancel an outgoing one, and allow an invitation to expire.
- Disconnect/reconnect the network. UI must acknowledge any lost-event gap without inventing replay.
- Revoke the Twitch app authorization and verify session termination; reauthorize safely.
- Stop/start the server and verify artifact and accepted transfer persist without duplication.
- Confirm clear/restore and true alpha compositing over game/video content at both OBS output sizes.
- Record the complete two-streamer flow with permission and without tokens/overlay viewing keys.

## Browser matrix

Chromium development and production builds: exercised. Production checks passed with zero page exceptions, a real canvas-alpha sample containing both fully transparent and visible pixels, clear/restore, persistent artifact after switching server versions, CSP and mobile navigation. OBS embedded Chromium, Firefox and Safari: not yet exercised. Mobile checks use a Chromium viewport, not a physical phone. Do not report unrun checks as passed.
