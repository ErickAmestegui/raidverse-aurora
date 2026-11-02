# Start RAIDVERSE from your Windows terminal

The production command is `npm.cmd start`. One Node process serves the API, WebSocket,
OAuth routes and the compiled Aurora frontend. No separate frontend server is needed.

In PowerShell:

```powershell
Set-Location 'C:\Users\emili\.codync\bots\f5edb330-387d-4087-a503-8a2d3ca0d08e\workspace\raidverse'
.\Start-RAIDVERSE.cmd
```

You can also double-click `Start-RAIDVERSE.cmd` in Explorer. It uses its own folder,
checks that Node/npm/dependencies exist, builds only if the frontend is absent,
then runs the existing `npm.cmd start` command. It does not edit `.env` or data.

Keep that Windows terminal open. It runs under your Windows login independently
of the Codync conversation. Closing the terminal, signing out, restarting or
sleeping the PC can stop or suspend availability. It is not an installed service
and does not start automatically at boot. Use Ctrl+C to stop intentionally.
If the process exits, the launcher leaves the terminal open with its exit code.

From another PowerShell window, verify:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
(Invoke-WebRequest -UseBasicParsing http://localhost:3000).StatusCode
Invoke-RestMethod http://localhost:3000/api/health
```

Expected: a listener, HTTP 200 and `ok: true`. `twitchConfigured: false` means
the site works but OAuth credentials are not configured; it does not prevent
Aurora from loading. Configure OAuth separately, never by sharing secrets.

If port 3000 is already occupied, inspect `OwningProcess` and that process's command
line before taking action. Do not stop unrelated applications. If RAIDVERSE is
already healthy, reuse that instance instead of starting a duplicate.

An earlier agent-managed server stopped between turns. No durable exit record was
available, so its exact termination cause was not established. An agent tool's
running-session identifier is not a Windows service or a persistence guarantee.
