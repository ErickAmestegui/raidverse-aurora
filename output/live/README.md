# Authentic Twitch evidence — one channel

Captured November 1 Bolivia / November 2 UTC, without injecting LIVE input.

- `evidence.json`: read-only public snapshot, connection flags, contribution/history
  consistency checks and safe hashed trace correlations. Two accepted light commands,
  one real community, no completed transfer. The trace for the second contribution
  records the real message through persistence and WebSocket revision 52.
- `aether-001-live-1080.png`: inspected production Chromium viewport at 1920×1080,
  showing the actual relic and accepted total of two. This is existing LIVE state,
  not a captured frame of a new command arriving.
- `aether-001-live-history.png`: full-page history capture with both accepted entries.
  The canvas did not appear in that full-page capture; use the 1080p viewport image
  for the rendered relic. This capture issue was resolved by capturing a visible
  viewport; no product renderer or design change was made.

The user independently confirmed the counter changed from one to two in the actual
streamer's browser. The stored counters equal accepted history by element, all
contributions carry TWITCH provenance and message IDs are unique. Application
records are not independently signed Twitch receipts. Subscription health alone
does not prove a raid happened.

A separate local file `deliverables/RAIDVERSE-live-legacy-broll.webm` records the real
legacy's motion and both history entries in Chromium. It is silent B-roll, **not the
final demonstration**, a recording of chat arrival, a raid or native OBS. Keep that
distinction in any edit or submission. It is not needed to run the source.

No OAuth tokens, cookies, CSRF values, private overlay keys, credential files,
database or vault key are included here. Public display names and contribution
identifiers are deliberate legacy fields. Private backups remain outside delivery.

Refresh this observation with `node scripts/capture-live-evidence.mjs` from the
repository root while the existing server is running. It performs only HTTP GETs
and writes this evidence file. It does not forge a contribution or initiate a raid.
