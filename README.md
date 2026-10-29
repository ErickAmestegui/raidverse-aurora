# RAIDVERSE

**Raids move viewers. RAIDVERSE carries what they create.**

A new local-first Twitch experience built with Codex. A persistent, deterministic energy artifact evolves through four chat commands, crosses communities only after a verified raid and receiver approval, and keeps a public legacy.

## Status

In development. No live Twitch integration has been verified yet. Rehearsal events are synthetic and never count as live evidence. See `docs/PROGRESS.md` for actual checks and outstanding work.

## Development

Node.js 24+. On Windows PowerShell use `npm.cmd` if execution policy blocks `npm.ps1`.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Open http://localhost:3000. No paid AI service is used at runtime.

## Twitch setup

Create an application in https://dev.twitch.tv/console/apps with OAuth redirect URL **http://localhost:3000/auth/callback** and confidential client type. Save its client ID and client secret only in `.env`. Never paste secrets into chat or commit them. Each broadcaster authorizes independently in a separate browser profile. Two real channels and a real raid are required to validate the core LIVE flow.

## Project record

- Principal Codex session: `01a18894-cb84-7530-8113-1b14124a414e`
- Created from an empty workspace on October 29, 2026.
- Not submitted, published, or deployed.
