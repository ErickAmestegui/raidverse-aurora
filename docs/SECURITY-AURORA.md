# Aurora security review and editable identity

Review date: 2026-10-29. This is a source and local-test review, not certification of Twitch or OBS operation.

## Editable artifact names

The existing control endpoint now accepts:

```http
POST /api/control/:channelId
Content-Type: application/json
X-CSRF-Token: <the current session token>

{"type":"rename","name":"Aurora prism"}
```

The request uses the existing HttpOnly session, exact Origin/Host checks, CSRF verification and server-side channel ownership check. LIVE sessions can control only their own LIVE channel. REHEARSAL sessions cannot rename LIVE artifacts. No new endpoint, permission, credentials or storage architecture is introduced.

Names are trimmed, 1–48 characters, and cannot contain ASCII control characters. Normal text and Unicode display names remain supported. React renders names as text; a name does not become executable HTML, a file, a URL or a viewer command. The name validator applies to newly created artifacts too. Existing stored names are not migrated or overwritten.

Only an artifact in the current channel's active slot can be renamed. Both `PREPARED` and `PENDING_APPROVAL` outgoing transfers freeze its name until completed, cancelled, rejected or expired. This keeps the invitation stable while the receiver decides. Renaming during an open contribution round preserves its phase, round, seed, energy, ownership, communities and earlier history. An append-only `RENAMED` control record stores the change, with no invented Twitch contribution credit. Renaming to the same value adds no history entry. After a successful transfer the receiver holds rename control; the sender has no active artifact to rename.

## Checks executed

- `npm.cmd test -- tests/domain.test.ts tests/api.test.ts`: **32/32 passed** (23 domain + 9 HTTP integration), including the existing tests and four new tests.
- New checks cover persistence after reopening SQLite, identity/round/contribution preservation, invalid and no-op names, stable transfer invitations, receiver ownership after acceptance, wrong-owner sessions, forged CSRF, and REHEARSAL-to-LIVE denial.
- These focused domain/API checks are independent of provider fixtures and browser checks. Use the final coordinated test run in `PROGRESS.md` as the release regression result.

## Existing boundaries reviewed

- Session channel identities are checked on the server, rather than accepted from frontend controls.
- Public snapshots omit private overlay keys; viewing links cannot execute dashboard controls.
- Duplicate chat/raid ingress is stored transactionally in SQLite. Transfer acceptance requires the matching raid, enabled source/receiver, opt-in receiver and an empty receiving slot.
- EventSub verification, OAuth token lifecycle and subscription recovery are reviewed separately in `TWITCH-AUDIT.md`.
- No new network service, paid API, dependency, arbitrary upload or OS/OBS control has been added.

## Remaining external evidence

Local protocol fixtures and session fixtures do not establish that OAuth, real chat or a real raid has succeeded against Twitch. Those need two consenting authorized broadcasters. Browser alpha captures do not establish OBS compositing, source refresh recovery or performance during a stream. Those need OBS Studio and an actual local run. No such evidence is claimed by this review.
