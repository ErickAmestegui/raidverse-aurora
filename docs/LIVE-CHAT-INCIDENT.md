# LIVE chat counter investigation — 2026-11-02 UTC

## Evidence, not assumptions

The incident report described three real `!forge light` messages and a visible zero
counter. Inspection found the existing LIVE artifact **Aether 001** with one light
contribution from its own broadcaster. The channel was enabled and its current
round was open. No data, credentials, channel settings or artifact identity were reset.

Read-only calls to Twitch returned HTTP 200 for token validation and the subscription
list. The grant matched the registered channel and application and included
`user:read:chat`. Both `channel.chat.message` and `channel.raid` were enabled on the
same WebSocket session, with the expected broadcaster and chat-reader conditions.
The clock difference was approximately two seconds, inside the two-minute freshness
limit. See [Twitch's subscription requirements](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

The existing database contained three recognized LIVE chat ingress records:

| UTC receipt | State at that point | Persisted contribution |
|---|---|---|
| 02:46:20.323 | Before artifact creation | No |
| 02:47:50.199 | Artifact existed; first round had not opened | No |
| 02:49:06.168 | First round open | Yes; its message ID matches the light contribution |

The artifact was created at 02:47:38.420 UTC and the first round opened at
02:48:53.658 UTC. Rejected records retain deduplication so old commands cannot become
contributions when the streamer later opens a round. The historical ingress table
does not retain each rejection's text, author or exact reason: the first two records
cannot be presented as full packet traces. The user reported their commands; the
database proves their timing and that the third record was accepted.

## Reproduced synchronization defect and correction

The client independently applied its initial HTTP snapshot and every WebSocket
snapshot, without comparing revisions. A late HTTP response containing zero could
overwrite a newer WebSocket state containing a contribution. A controlled regression
reproduced this rollback, then passed after `latestSnapshot()` rejected older revisions.
This is a confirmed client defect; the original screenshots alone cannot establish
whether this race specifically occurred in that browser session.

Both transports now apply monotonically increasing revisions. The client also
reconciles authoritative state by HTTP every ten seconds so a missed socket update
does not leave a stale counter indefinitely. The layout and renderer are unchanged.

## Safe temporary diagnostics

`RAIDVERSE_CHAT_DEBUG=1` enables server-side structured traces for receipt, command
recognition, validation, rejection reason, durable commit, acceptance and WebSocket
broadcast. Correlations are hashed. Logs exclude raw messages, display names, raw
user/message/session identifiers, OAuth values, headers, cookies and overlay links.
The flag is passed to the diagnostic process, not written into `.env`. It is disabled
by default on subsequent normal starts. Diagnostic files remain local and ignored
by Git. Do not publish runtime logs or private data.

Reasons distinguish unknown commands, disabled channels, absent artifacts, closed
rounds, cooldown, round cap, channel rate cap, duplicates, stale/shared input,
invalid envelopes and mismatched subscription conditions. Invalid events still
cannot contribute. Viewer registration is not required; only the channel must be
registered. Broadcasters use the same forging limits as viewers.

Regression coverage includes broadcaster/spectator field mapping, unregistered
viewers, the three-step creation/round/message sequence, cooldown and round caps,
closed-round replay, duplicate messages, wrong reader conditions, diagnostics privacy
and out-of-order state updates. Protocol tests use temporary local fixtures; they are
not proof of a new LIVE message.

## Final LIVE gate

- Executed final suite: **64/64 tests passed**, including all 53 pre-incident tests.
- Executed `npm.cmd run build`: **TypeScript and production build passed**. The
  existing large-bundle advisory remains; no visual redesign was made.
- Production Chromium loaded the actual public Aether 001 page and displayed one
  total contribution, one light contribution and its rendered canvas. This verifies
  the already-persisted LIVE state, not a new post-fix Twitch contribution.
- Historical authentic light contribution: verified before changes.
- New message after deployment: **confirmed** at 03:26:26 UTC on November 2.
  Safe correlated traces record received, validation, recognized, persisted (round 3,
  revision 52, contributions 2), accepted and WebSocket broadcast. The user confirmed
  the live counter changed from 1 to 2. Subsequent production Chromium inspection
  displayed two contributions and two Twitch-verified history entries.
- `output/live/evidence.json` preserves public state and the correlated safe trace.
  A private consistent SQLite backup, including its original vault key, was created
  outside the source delivery. No production restart was necessary in this final
  preparation step; post-second-message restart persistence is not newly claimed.
- No raid, second-channel handoff or OBS validation is claimed by this incident report.
