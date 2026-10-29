# Submission preparation — NOT SUBMITTED

## Official requirements checkpoint (2026-10-29)

[Official rules](https://twitchcon-codex.devpost.com/rules) and [resources/FAQ](https://twitchcon-codex.devpost.com/resources) were checked.

- Deadline: November 2, 2026, 14:00 PST = 18:00 Bolivia. Internal target: November 1.
- Build a newly created interactive Twitch project using Codex; provide an accessible repository, English description, Codex session ID, and a YouTube demonstration under three minutes showing Twitch functionality and Codex development.
- Provide working installation/testing instructions and access for judging. Confirm entrant eligibility and rights to any third-party material before submitting.
- Four equally weighted criteria: innovation, potential impact, technology and design. Internal scores are not official scores.
- Repository publication, YouTube upload and Devpost submission remain undone. Actual Twitch/OBS footage is missing.

## Devpost English draft (claims must be updated after live verification)

### RAIDVERSE — carry what your community creates

**Raids move viewers. RAIDVERSE carries a living creation.**

We wanted the connection between two Twitch communities to last longer than a raid alert. RAIDVERSE lets chat forge a persistent energy artifact using four carefully constrained commands. A streamer closes a forging round, prepares its next destination, and raids another participating channel. A matching Twitch raid opens an invitation. The receiving streamer decides whether to accept, then a procedural portal materializes the same artifact in their overlay. Their community writes its next chapter without losing the original identity or history.

The project is intentionally useful with a small chat. One person can make a visible contribution; there is no minimum viewer count. The elements work across gaming, music, art and conversation because the creation belongs to the community rather than a specific game.

We built the frontend in React, TypeScript and Three.js and the backend in Node.js with SQLite and read-only WebSocket synchronization. The Twitch adapter implements server-side OAuth and EventSub subscriptions for chat and outgoing raids. The transfer protocol requires a registered receiver, a prepared destination, a matching raid and explicit acceptance. Cooldowns, contribution caps, opt-in moderator controls and an emergency overlay clear button keep the streamer in control.

The public legacy page preserves the artifact's appearance, community lineage and contribution timeline. Synthetic rehearsal events are isolated from LIVE events and visibly labeled throughout the interface.

**Current validation disclosure:** the automated suite and browser rehearsal have been executed. The authentic two-channel Twitch/OBS flow has not yet been verified. This draft is not ready for submission until the live evidence below is completed.

### How Codex was used

Codex created this new project from an empty workspace during the submission period. It implemented the domain model, SQLite transactions, secure control API, Twitch adapter, React dashboard, authored Three.js artifact/portal, automated tests and documentation. It ran build and test commands, used a real Chromium browser to exercise the synthetic flow, inspected captures, and corrected issues found during verification. The user supplies the product direction, authorizations, real channels, footage rights and final publication approval.

Main Codex session: **01a18894-cb84-7530-8113-1b14124a414e**.

## 2:45 demonstration script / shot list

Capture the final video only after real integration passes. All spoken lines below describe intended final shots; they are not a claim those shots exist.

| Time | Shot | Narration / proof |
|---|---|---|
| 0:00–0:20 | Actual receiver approval and OBS portal; clear source and destination labels. | “A Twitch raid moves viewers. What if it could also carry something they made together?” Show authentic event provenance; no synthetic footage as live proof. |
| 0:20–0:55 | Source's real chat and overlay side by side; one command per element. | “Chat forges a living artifact. Four elements produce different visual changes. The streamer controls every round.” Show message identity and accepted count. |
| 0:55–1:35 | End round, prepare receiver, real Twitch raid, receiver accepts, receiver chat evolves it. | “The destination chooses to accept. The artifact keeps the same identity, its earlier evolution and both communities.” Show before/after ID. |
| 1:35–2:10 | Architecture diagram, test run, Codex session building/debugging a concrete feature. | “Codex helped build the state machine, Twitch connection, tests and procedural visual experience. Duplicate events cannot transfer the artifact twice.” Use only executed test output. |
| 2:10–2:45 | Public legacy, clear/restore control, server restart preserving state, final artifact. | “The moment becomes a memory you can revisit. No arbitrary uploads or commands. The streamer stays in control. Made together. Carried forward.” |

## Live evidence still required

1. A and B authenticate in different browser profiles; capture each identity without secrets.
2. Record successful real EventSub subscriptions and authentic chat changing the visible artifact.
3. Perform the actual raid and save the event ID, timestamp and verified source/destination (exclude tokens).
4. Receiver accepts, OBS portal plays, receiver chat evolves the SAME artifact ID.
5. Restart the server and inspect the same legacy. Include clear/restore safety demonstration.
6. Capture Codex implementation work and an executed test command for the video.
7. Review recordings for secrets/rights, edit to under three minutes, get publication approval, upload to YouTube, and insert the actual URL.

## Known limitations for the final entry

- Real Twitch OAuth/chat/raid and OBS end-to-end have not been verified yet.
- Current installation is local; remote streamers and Internet-shareable legacy pages need a shared HTTPS deployment that has not been provisioned.
- EventSub does not replay events lost during a disconnect.
- Full-state SQLite writes/snapshots are appropriate for the local demonstration but have not been load-tested for large audiences.
- Browser QA is Chromium-based; OBS, Firefox and Safari require separate checks.
- Procedural audio, uploads, marketplace, payments, blockchain and generative services are outside the MVP.
- No measured user adoption, impact metrics, awards or guarantees are claimed.
