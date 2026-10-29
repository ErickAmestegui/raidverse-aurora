# Architecture and Twitch integration

## Local-first, single process

React + TypeScript + Vite renders the dashboard, public legacy and OBS Browser Source. Three.js uses authored geometry and GLSL for the artifact, four elemental effects and the portal. No generated media, paid AI services, cloud database or blockchain is needed.

A Node.js 24 TypeScript server owns all control decisions. SQLite in WAL mode stores a transactional aggregate, an append-only artifact timeline, ingress deduplication IDs, sessions, OAuth nonces and encrypted Twitch credentials. Browser WebSockets are read-only; server snapshots synchronize clients. Mutations use authenticated HTTP with session-bound CSRF and exact Origin/Host checks.

```text
Twitch OAuth → confidential server → encrypted token store
Twitch EventSub WSS → validated subscription & broadcaster → Domain → SQLite transaction
Dashboard → authenticated control → Domain → SQLite transaction
Rehearsal input → synthetic-only route → Domain (REHEARSAL namespace)
SQLite public snapshot → read-only WebSocket → dashboard / legacy / OBS renderer
```

## Minimal Twitch permissions

Each broadcaster independently grants **user:read:chat** via authorization code flow. This is a User Access Token; it reads that broadcaster's own chat with `channel.chat.message`, using the same ID for `broadcaster_user_id` and `user_id`. An outbound `channel.raid` subscription uses only `from_broadcaster_user_id`. It requires no event-specific OAuth scope, but the WebSocket transport still uses a User Access Token. No scope to initiate raids, change broadcasts, write chat, or control OBS is requested.

The server receives the welcome session ID and creates both version-1 subscriptions on the official Helix endpoint. Only known subscription IDs and the expected broadcaster are accepted. Inbound browser payloads never become LIVE events. Shared Chat messages from other source channels are excluded. Identity comes from validated OAuth/Helix and EventSub chatter IDs, not user-supplied names. Verified moderator badges permit only `!rv pause`, `!rv resume`, `!rv clear` when the owner explicitly opts in. They cannot approve a transfer.

Tokens refresh before expiry, validate at startup and hourly, and revoke local sessions if authorization is invalid. A Twitch-requested reconnect migrates subscriptions; unexpected disconnects reconnect with backoff and recreate subscriptions. **Twitch does not replay events lost during a connection gap.** The UI reports this limitation. No retrospective contribution or raid is invented.

## Transfer protocol

Artifact phases follow CREATED → FORGING → READY → RAID_DETECTED → PENDING_APPROVAL → ACCEPTED → TRANSFERRED → EVOLVING. Operational transfer records also use PREPARED, REJECTED, CANCELLED and EXPIRED.

1. Source closes a round and selects an enabled, opt-in receiver on this server. Prepared invitations expire after ten minutes.
2. The streamer performs the raid directly on Twitch. RAIDVERSE does not initiate it.
3. Only an authentic matching source/destination event newer than preparation opens approval. A raid unrelated to a prepared transfer does nothing.
4. Receiver explicitly accepts. In one SQLite transaction, source releases its active slot, receiver becomes owner, the same artifact ID/seed/counts/history remain and an ARRIVAL record starts the portal timeline.
5. An occupied receiver slot is never overwritten. Archive it first. Rejection/cancellation/expiry preserve the origin's creation. Duplicated provider event IDs are consumed once across restarts.

Raid viewer counts are aggregate metadata only. They are never used to identify or credit individual viewers. A contribution requires a verified chat event. The evidence field distinguishes TWITCH, SYNTHETIC and CONTROL (manual streamer action).

## Determinism

Accepted contributions increment one of four integer counters. Identity seed + counts define appearance; animation time supplies rotation, controlled turbulence and portal progression. One accepted message has one effect. Each viewer has a ten-second cooldown and a maximum of three contributions per round per channel. The server accepts at most 20 contributions per second per artifact. Up to 20,000 timeline records per artifact and 100 created/owned artifacts per channel bound this local MVP.

## OBS and safety

The streamer creates a private read-only overlay URL. Its random viewing key lives in the URL fragment; it is not in the public snapshot or normal page request. The overlay uses it on a same-origin API call. Disable, clear or key rotation blanks the overlay on its next one-second safety poll; network failure blanks it rather than retaining stale content. The legacy stays available. Keys never permit commands. A receiver must add its own Browser Source; a raid cannot modify their OBS.

No user files, arbitrary URLs, images, audio, markup, scripts, shell commands or extensions are accepted. Rendering uses React text nodes and authored geometry. Session cookies are HttpOnly/SameSite=Lax; secure cookies are mandatory on remote origins. Stored Twitch credentials use AES-256-GCM with an independently generated vault key. **Windows file permissions must restrict the data directory to the operator.** Encryption does not protect against someone who can read both the database and vault key.

## Running two channels locally

Use one server at http://localhost:3000, two browser profiles with separate Twitch sessions, and two OBS Browser Sources. Authenticate A in one profile and B in the other. Both authorizations and artifacts reside on the same server. Each streamer enables participation and incoming transfers themselves. Rehearsal is a separate explicitly synthetic operator session controlling two synthetic channels.

## Remote hosting (not provisioned or validated)

Remote broadcasters need one shared reachable Node service, HTTPS/WSS, a registered HTTPS OAuth callback, secure cookies, persistent storage, the same private vault key after restarts, backups, and reverse-proxy support for WebSocket upgrades. Set APP_ORIGIN to the exact public origin, HOST appropriately, SECURE_COOKIES=true and optionally ENABLE_REHEARSAL=false. Never expose the Vite development server; build and use npm start. Keep tokens and keys out of reverse-proxy access logs. The current origin/host policy requires the proxy to preserve the public Host.

There is no verified free hosting deployment. Localhost legacy URLs are only shareable on that computer; public Internet sharing requires hosting. This MVP uses full-state SQLite serialization and full snapshots; it is designed for a two-channel demonstration, not proven high-audience scale. Horizontal scaling requires a different state fan-out and database architecture. Do not claim production scalability.

## Official references checked 2026-10-29

- https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage
- https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelraid
- https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
- https://dev.twitch.tv/docs/authentication/validate-tokens/
- https://dev.twitch.tv/docs/authentication/scopes/
