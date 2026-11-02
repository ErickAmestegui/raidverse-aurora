# Two real channels on one local server

This is an operator checklist for the existing product, not a completed test report.
Do not clear data, change credentials, create a second Twitch application or enter
REHEARSAL to complete a LIVE check.

## Preserve A and connect B

1. Keep A's normal browser profile open at **http://localhost:3000**. Confirm its
   channel name, TWITCH LIVE health and existing artifact. Do not sign out.
2. Open a **different browser profile**, or a private window separate from A's
   normal session. A second normal tab is not independent. Multiple private windows
   in the same browser can share one private session; use a distinct profile for
   each additional identity.
3. In B's isolated browser, open the same exact localhost URL and choose Connect
   Twitch / Authorize Twitch. Confirm Twitch is authorizing the receiving account,
   not A. The existing application and callback are reused. Never share cookies,
   CSRF values, credentials or overlay URLs to establish another session.
4. B's dashboard must show B's channel identity and genuine chat/raid subscriptions.
   A's existing dashboard must still show A. Each LIVE session controls only its
   own channel; OAuth replaces only the session in the browser used to authorize.
5. In B's Settings enable RAIDVERSE and **Allow incoming invitations**. Keep its
   active artifact slot empty. If B already has an artifact, Preserve in Memories
   retains it while freeing the slot; do this only with B's consent.

Both profiles use the **same computer and backend**. Another computer's localhost
is a different server. Remote operation needs the documented shared HTTPS hosting;
it has not been deployed. A's receiving toggle is not required for an outgoing raid.

## Set up OBS before approval

In B's own dashboard, generate its private overlay URL. Paste it locally into an
OBS Studio Browser Source, initially 1920×1080, with a transparent background and
the source active. Do not record the source-properties URL or share the key.
Repeat the native compositing check at 1280×720. The source can be blank before an
artifact arrives. Keep it active before acceptance: the portal is tied to the
persisted arrival time and lasts about eight seconds. Opening it later does not
replay a new arrival. RAIDVERSE never adds or changes an OBS scene automatically.

## Authentic handoff

1. Record A's current artifact ID, counts and contribution history (public legacy).
2. Finish A's round. In Transfers select the enabled B and prepare the transfer.
   It is now PREPARED, waiting for a real raid, not transferred. The invitation
   expires in ten minutes. If it expires, prepare again before the raid.
3. A performs a real Twitch raid through Twitch's own controls. RAIDVERSE does not
   initiate it. Follow any live-channel eligibility requirements Twitch displays.
4. Confirm a matching LIVE raid record and PENDING_APPROVAL in B. No invitation
   means investigate subscriptions, destination, preparation time and expiry;
   never substitute a synthetic raid or manually edit the database.
5. Once OBS and recording are ready, B explicitly selects **Accept & open portal**.
   Decline and cancellation are also explicit controls; do not click them on the
   only recording run unless that is the intended safety test.
6. Verify TRANSFERRED, B ownership, A's freed slot, unchanged artifact ID and all
   earlier contributions, plus B in communities. Watch the native OBS portal.
7. B starts evolution and sends a real `!forge fire` (or another allowed command)
   in B's actual chat. Check accepted count, renderer and the same public history.
8. Capture read-only evidence with `node scripts/capture-live-evidence.mjs` and
   screenshots without secrets. Refresh OBS; verify current state recovers without
   creating another transfer. Test Hide overlay / Restore locally with B's consent.
9. After both operators agree, restart the server using LOCAL-STARTUP.md and check
   the same ID, contributions and transfer. A restart creates an EventSub gap;
   do not send test commands while disconnected.

## Evidence boundaries

Automated tests cover wrong owner, absent raid, duplicate raid/acceptance, opt-out,
occupied receiver, rejection, cancellation and expiry. These remain local fixture
checks until repeated with real channels. Record each native OBS resolution, source
refresh, hide/restore and performance observation separately. Chromium alpha tests
are not native OBS validation. If B or OBS is unavailable, disclose that limitation
in the video, README and Devpost entry rather than claim a completed LIVE handoff.
