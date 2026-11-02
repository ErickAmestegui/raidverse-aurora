# Judge installation and testing guide

RAIDVERSE — Aurora Edition is a Windows-tested, local-first Node.js application. This guide separates reproducible synthetic testing from real Twitch functionality. No paid service or entrant credentials are supplied.

## Install and start

Prerequisites: Node.js 24+, Chromium, Internet for installation/Twitch and available port 3000. Native OBS checks require OBS Studio.

From the repository root in Windows PowerShell:

```powershell
npm.cmd ci
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
npm.cmd test
npm.cmd run build
.\Start-RAIDVERSE.cmd
```

Keep the terminal open. Visit **http://localhost:3000**; `/api/health` must report `ok: true`. One process serves frontend and backend. Do not start another copy on the same port. See [startup troubleshooting](LOCAL-STARTUP.md).

Private state lives in ignored `data/`, including the database and token-encryption key. Never share it, actual `.env`, browser storage or private overlay links. Tests use temporary databases instead of the real artifact.

## Rehearsal — synthetic evidence only

1. Enter rehearsal and confirm the visible REHEARSAL MODE label.
2. Enable the synthetic source, create an artifact if necessary and open a round.
3. Use Try Demo for the four elements. Respect cooldowns and caps; rejection does not count as a contribution.
4. Close the round. Enable the synthetic receiver and incoming invitations. Prepare it, simulate a raid, then explicitly accept at the destination.
5. Observe the portal, start another receiver round and contribute. Memories must retain identity, lineage and accepted contributions.
6. Test Clear overlay/Restore. A normal server restart must preserve the artifact.

This proves local mechanics, not a real raid or native OBS. Existing state may require closing a round or cancelling a pending invitation; do not delete it to force a test.

## Real Twitch setup

Use an authorized confidential application in the [Twitch developer console](https://dev.twitch.tv/console/apps), with redirect **http://localhost:3000/auth/callback**. Save its client ID/secret only in local `.env`, following `.env.example`. Never send credentials to the entrant or commit them. Restart after editing.

Variables: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `APP_ORIGIN`, `PORT`, `HOST`, `DATA_DIR`, `SECURE_COOKIES`, `ENABLE_REHEARSAL`. The example targets local use. Keep `APP_ORIGIN=http://localhost:3000` and `PORT=3000` aligned. Host/Origin checks deliberately reject inconsistent URLs.

Click **Connect Twitch** and authorize the intended account. Do not open `/auth/callback` manually: Twitch must supply its response and one-time state. The only OAuth scope is `user:read:chat`; RAIDVERSE cannot send chat, start raids or alter OBS scenes.

## Real one-channel test

1. Confirm the intended channel and genuine chat/EventSub subscriptions.
2. Enable the experience, create an artifact and open a round before sending commands.
3. Send `!forge light` in actual Twitch chat. Confirm its accepted count/visual change and Memories provenance.
4. Other commands are `!forge fire`, `!forge storm`, `!forge crystal`. A user has a 10-second cooldown and per-round cap.
5. Closed rounds must reject contributions. Do not count rejected messages as missing accepted history.

The entrant demonstrated authentic chat changing Aether 001. The source does not contain that channel's credentials or authorize judges to control it.

## Optional real receiver handoff

The entrant's [second-channel operator guide](SECOND-CHANNEL.md) provides the same independent-session workflow for the current local installation.

Requires two consenting channels on the same server. Use separate browser profiles, or A's profile plus private window B. Another tab in the same profile shares cookies and is insufficient. Keep A open. Confirm Twitch identifies B before approval; private browsing may require deliberate login.

At B, enable RAIDVERSE, allow incoming transfers and leave its artifact slot empty. Do not create a B artifact just for onboarding. Set up B's own OBS Browser Source with the private URL generated in B's session. Do not record that URL/key.

At A, close the round, select B and prepare. Invitations expire after ten minutes. Perform the actual raid through Twitch, then wait for the matching real event. Only B may accept/reject; A must not control B. Acceptance must preserve artifact identity/history and move ownership to B. Open a new B round and send a real chat command there.

In native OBS at 1920×1080 and 1280×720, check alpha over content, portal, emergency hide/restore and browser-source reload. Chromium alpha checks alone do not certify OBS. Keep the receiving source active during acceptance; opening it later is not proof of the original live animation.

Authentic two-channel and native OBS verification remain pending unless the final entry includes new evidence. Rejection, expiry and duplicate protection have local tests; those tests are not real provider events.

## Access and limitations

A `localhost` link cannot open the entrant's server on a judge's different computer. Install locally or use a separately documented approved deployment. Remote broadcasters need shared HTTPS hosting and a matching callback; hosting is not supplied here. Actual repository/video links belong in Devpost. See [claim boundaries](SUBMISSION.md) and [fixture coverage](TESTING.md). Do not include secrets or raw browser/network exports in bug reports.
