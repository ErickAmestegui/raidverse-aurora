# Submission package — NOT SUBMITTED

Updated November 1, 2026, Bolivia time. No repository publication, YouTube upload or Devpost submission is recorded. This is a local installation, not a hosted service.

## Official requirements rechecked

The [official rules, sections 1, 3–6](https://twitchcon-codex.devpost.com/rules) were accessible during this review. Submit a newly built Twitch-connected project using Codex, an accessible GitHub/GitLab/Bitbucket repository with runnable source/assets/instructions, a functionality/Codex description, the principal Codex session ID and a YouTube demonstration. Keep the video below three minutes, showing Twitch functionality and Codex development. Provide English materials, authorized assets/integrations and free judging access. Confirm entrant eligibility. The four equally weighted criteria concern innovation, impact, technology and design.

**Deadline discrepancy:** the header says November 2, 2026, 14:00 PST, equivalent to 18:00 Bolivia. Section 1 says 14:00 Pacific Time. The [official FAQ](https://twitchcon-codex.devpost.com/resources) instead lists 21:00 UTC, equivalent to 17:00 Bolivia. These statements conflict. Use **17:00 Bolivia on November 2 as the conservative cutoff**, finish substantially earlier and inspect Devpost's countdown. The original internal target remains November 1.

The FAQ allows unlisted YouTube videos, but judges cannot view private videos. Private repositories must be on GitHub/GitLab and shared with the organizer contact specified in the rules; verify the actual address and access. A saved Devpost draft is not a submitted entry: confirm Submitted status. Do not alter submitted materials after the deadline without organizer permission.

## Evidence and claim boundary

| Capability | Current evidence | Accurate claim |
|---|---|---|
| Twitch OAuth and channel | Genuine authorization/provider validation completed; required permission and actual subscriptions inspected | Verified for one real channel |
| Chat changes Aether 001 | User confirmed 1→2; backend traced the new message to persistence/WebSocket revision 52; Chromium displayed both accepted rows | Real one-channel chat demonstrated; evidence in output/live/ |
| Client synchronization | Monotonic revisions and HTTP reconciliation; regression tests | Implemented and regression tested |
| Two real channels and authentic raid | Not yet demonstrated in current evidence | Implemented; real end-to-end verification pending |
| Approval, transfer persistence, portal | Local domain/fixture tests and labeled browser rehearsal | Locally tested; no authentic raid claim |
| Native OBS | Chromium alpha checks only | OBS verification pending |
| Automated checks | Final preparation: 66/66 tests, TypeScript/build passed; runtime audit zero known vulnerabilities | Local checks executed, not native OBS or live raid evidence |
| Video/repository/Devpost | Preparation documents exist; final public links absent | Not published or submitted |

The three original chat commands were not three accepted contributions: two arrived before an eligible open round and the third persisted. Rejected messages are not contributions. Do not infer participation from raid viewer counts. Preserve Aether 001 and its history; never reset the database for filming.

## Devpost English description — current truthful version

### RAIDVERSE — carry what your community creates

**Raids move viewers. RAIDVERSE carries what they create.**

### Inspiration

A raid briefly connects two communities. We wanted that connection to leave something people can continue creating together: a persistent energy artifact with its own identity and history.

### What it does

Chat can evolve procedural 3D artwork through four predefined commands: `!forge light`, `!forge fire`, `!forge storm` and `!forge crystal`. The streamer controls each round. Accepted contributions change the deterministic state and appearance, and Memories records the creation's evolution.

RAIDVERSE also implements a handoff protocol. The source prepares a registered, enabled receiver. A matching `channel.raid` event can open an invitation, and the receiver must explicitly accept. Our backend transfers the same artifact and preserves its history. Twitch's raid event does not transport the artifact or give us control of the receiver's OBS.

The experience works with small communities: an individual accepted contribution matters, without requiring a large audience or virtual economy.

### How we built it

React, TypeScript and authored Three.js geometry/shaders render the experience. A Node.js backend owns participation rules, SQLite persistence, secure controls and read-only WebSocket synchronization. Twitch OAuth and EventSub provide authenticated identities, chat and raid notifications. The sole requested OAuth scope is `user:read:chat`.

Streamers retain control through opt-in reception, explicit approval, cooldowns and caps, constrained commands, authorized moderator controls and emergency hiding. Tokens remain encrypted on the local server. Clearly labeled REHEARSAL mode allows synthetic practice without presenting it as Twitch evidence.

### What we actually demonstrated

One genuine Twitch channel has authorized RAIDVERSE. Real chat changed Aether 001, with the user confirming its counter increased from 1 to 2 after a synchronization fix. Automated tests, TypeScript and production build passed at the latest recorded checkpoint. Browser rehearsal exercised the full transfer separately.

**Current limitation:** an authentic two-channel raid, receiver approval/continued evolution and the portal inside native OBS Studio have not yet been verified. The project runs locally; remote communities require shared HTTPS hosting. Retain these limitations unless missing real checks are completed and recorded before submission.

### How we used Codex

We directed Codex to build RAIDVERSE from an empty workspace during the hackathon. It implemented the domain model, Twitch adapter, persistence, control API, React interface, procedural artwork, tests and documentation. It ran checks, reviewed browser behavior and diagnosed a real LIVE synchronization issue: a late HTTP snapshot could replace newer WebSocket state. The fix uses monotonic revisions, with regression coverage for that ordering failure. The entrant supplied the concept, design direction, authorizations, real Twitch validation and final publication decisions.

Principal Codex session: **01a18894-cb84-7530-8113-1b14124a414e**.

### What remains

Complete the real receiver handoff and native OBS check, record the result without secrets and publish reproducible source plus a short demonstration. We claim no adoption metrics, large-scale load results or guaranteed score.

## Before the cutoff

If B is available, execute the independent-session receiver guide and [judge walkthrough](JUDGES.md). Record the genuine raid, invitation, acceptance, persistent ownership change and real contribution at B. Update claims only after checking those records.

If B cannot be obtained, use [the truthful one-channel video plan](VIDEO-RECORDING.md). Lead with functioning authentic chat. Describe the transfer as implemented but not real-world verified. Rehearsal may explain the design only with a continuous synthetic label and spoken disclosure. Never call it a completed real raid. This fallback preserves a truthful Twitch-connected submission but weakens evidence for the central promise; it does not establish how judges will assess it. Do not lose recording time waiting indefinitely for B.

## Final publication checklist

- [ ] Review the latest security/test/build report and unresolved limitations.
- [ ] Reproduce [JUDGES.md](JUDGES.md) from a clean install; include lockfile and `.env.example`, never real `.env`, `data/`, browser storage or private overlay links.
- [ ] Obtain approval to publish the reviewed repository; test judge access at its actual GitHub/GitLab/Bitbucket URL.
- [ ] Record actual Twitch functionality and Codex development; review rights/secrets; export below three minutes.
- [ ] Obtain video approval, upload public or unlisted YouTube, verify playback outside the owner account.
- [ ] Insert real repository/video URLs in Devpost; remove placeholders.
- [ ] Include principal session ID, accurate English description, screenshots and testing instructions.
- [ ] Confirm eligibility, ownership and teammate permissions.
- [ ] Retain every unresolved limitation in the submitted text/video.
- [ ] Obtain submission authorization, submit before the conservative cutoff and preserve Submitted confirmation.

## Known limitations

Authentic multi-channel raid/approval/receiver evolution and native OBS remain unverified until separately evidenced. Legacy URLs are local until deployment. EventSub does not replay events lost during disconnects. SQLite snapshots have not been load-tested for large audiences. Chromium viewport checks are not physical-device or OBS performance tests. No paid AI runtime, marketplace, uploads, payments, blockchain or generated-media service is included.
