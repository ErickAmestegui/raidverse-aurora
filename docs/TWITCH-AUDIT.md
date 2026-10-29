# Twitch integration audit — Aurora checkpoint

Reviewed October 29, 2026 against the official documentation linked below. This is a source/protocol audit with local fixtures. **No authentic OAuth grant, chat message, EventSub subscription, raid, or OBS session was exercised during this audit.** The local `.env` file was absent when checked; no credential values were read or printed.

## Authorization and permissions

The server uses the confidential-app authorization-code flow. The browser receives an opaque, HttpOnly session cookie rather than Twitch tokens. Callback state is random, cookie-bound, expiring, stored server-side, and consumed once before code exchange. Each LIVE session owns one Twitch user ID; rehearsal uses a separate session and cannot operate a LIVE channel. Server-side token exchange validates client ID, granted `user:read:chat` scope and user ID, then checks the Helix user identity before registering it. Stored credentials use authenticated encryption with a local private vault key.

Only `user:read:chat` is requested. Each broadcaster authorizes as both the chat-reading user and the broadcaster. This is the self-chat user-token arrangement, not an app-token bot arrangement; no `user:bot`, `channel:bot`, chat-writing or raid-initiation permission is requested. The raid subscription uses `from_broadcaster_user_id` only. There is no additional raid scope. See [subscription authorization](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/) and [WebSocket token requirements](https://dev.twitch.tv/docs/eventsub/manage-subscriptions/).

Startup and hourly token validation are implemented. Refresh is serialized per user, refreshed token pairs are persisted, and terminal token failures revoke local sessions and disable that channel. Revocation notices stop EventSub. See [token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/) and [refresh behavior](https://dev.twitch.tv/docs/authentication/refresh-tokens/).

## EventSub and contribution path

The backend opens an outgoing TLS WebSocket to Twitch; notifications never enter through a browser-controlled LIVE endpoint. It subscribes to `channel.chat.message` and `channel.raid`, using the received session ID and a user access token. Returned subscription IDs are recorded and notification source conditions checked. Shared-chat messages from another source broadcaster are excluded. Parsed commands pass through domain freshness, deduplication, allowlist, cooldown, round, channel enablement and contribution-limit checks before SQLite persistence and read-only state synchronization.

Socket loss clears subscription indicators and triggers backoff plus new subscriptions. Twitch-requested migration keeps the old socket until the new welcome and preserves subscriptions. The `ws` library handles standard ping/pong; RAIDVERSE sends no application traffic to the EventSub socket. The welcome subscription deadline is addressed by refreshing tokens before connecting. See [EventSub WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

**Lost-event limitation:** Twitch does not replay notifications missed during a broken connection. RAIDVERSE reports the connection interruption and does not synthesize replacement messages or raids. A prepared transfer cannot complete from an assumed raid. Temporary validation failure at startup now retries with exponential backoff (one second up to thirty seconds), while reporting an attention state. Revoked grants are removed and do not retry; stopping the application cancels retries. Established-socket loss also retries automatically.

## Correction made in Aurora

A delayed subscription response could arrive after token revocation and incorrectly restore `chat=true`, `raid=true`, and a Connected label. The new regression reproduced that failure before the fix. Lifecycle guards now discard completion/errors from stopped or replaced connections and prevent late subscription responses from reviving connectivity. This matters because interface readiness must reflect the active connection, not a completed HTTP request from an invalid session.

A second reproduced race let an in-flight refresh restore credentials after revocation. Refresh completion now checks that its original grant still exists unchanged before persisting; late failures cannot revoke a newer replacement grant. Temporary startup validation failures now retry safely, rather than leaving the connection idle until a manual reconnect.

Executed `npm.cmd test -- tests/twitch.test.ts`: **21/21 passed**. The existing eleven tests remain. Additional coverage exercises all four command types through a local WebSocket, client/scope/user identity mismatches, EventSub revocation, delayed-response races, safe startup retries, no retry for revoked grants and cancellation on shutdown. Fixtures sometimes pass `mode: LIVE` or store `evidence: TWITCH` to exercise adapter branches; those test databases are temporary and are never live evidence or application demonstration statistics.

## Authentic validation still required

1. In the [Twitch developer console](https://dev.twitch.tv/console/apps), register a confidential application with callback `http://localhost:3000/auth/callback`.
2. Put the actual client ID and client secret only in local `raidverse/.env`, using `.env.example`. Never send them in chat, put them in screenshots or commit them. Restart the local server.
3. Authorize each consenting broadcaster in a separate browser profile. Confirm exact identities and both enabled subscriptions, then enable participation and incoming invitations deliberately.
4. Send each of the four commands in actual Twitch chat during an open round. Record message IDs, verified chatter IDs, persistent counts, synchronized visual changes and rejected spam without exposing credentials.
5. Finish the round, prepare the exact receiver, perform a genuine Twitch raid, inspect the matching EventSub ID/source/destination/time, and accept in the receiver's profile. Confirm the same artifact identity, history and counts, portal, new contributions and persistence after restart.
6. Exercise interruption/reconnection and revoke/re-authorize safely. Check the actual OBS Browser Source at 1080p and 720p, compositing, clear/restore, source refresh and stream load. Chromium-only canvas checks cannot certify OBS.

The artifact moves through RAIDVERSE's own backend only after matched raid evidence and explicit receiver approval. `channel.raid` itself transports neither the artifact nor individual viewer participation. Receivers must register on the same server and opt in; the application never edits their OBS scenes.

The remaining external gate is account/application authorization and a genuine two-channel broadcast rehearsal. Source correctness and passing protocol fixtures do not remove that gate. See also [OAuth flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow) and [TESTING.md](TESTING.md).
