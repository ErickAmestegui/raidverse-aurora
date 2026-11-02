// Read-only HTTP observation. Never exports credentials, cookies, viewing keys or database files.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const origin = 'http://localhost:3000';
const get = async path => { const r = await fetch(origin + path); if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`); return r.json(); };
const [health, snapshot, me] = await Promise.all([get('/api/health'), get('/api/snapshot'), get('/api/me')]);
const artifacts = snapshot.artifacts.filter(a => a.mode === 'LIVE');
const contributions = artifacts.flatMap(a => a.history.filter(h => h.kind === 'CONTRIBUTION'));
const checks = artifacts.map(a => ({ artifactId: a.id,
  energyMatchesHistory: Object.entries(a.energy).every(([element, n]) => a.history.filter(h => h.kind === 'CONTRIBUTION' && h.element === element).length === n),
  onlyAuthenticContributions: a.history.filter(h => h.kind === 'CONTRIBUTION').every(h => h.evidence === 'TWITCH' && h.eventId && h.userId),
  uniqueMessageIds: new Set(a.history.filter(h => h.kind === 'CONTRIBUTION').map(h => h.eventId)).size === a.history.filter(h => h.kind === 'CONTRIBUTION').length }));
if (checks.some(c => !c.energyMatchesHistory || !c.onlyAuthenticContributions || !c.uniqueMessageIds)) throw new Error('LIVE history consistency check failed');
const eventRefs = new Set(contributions.map(h => createHash('sha256').update(h.eventId).digest('hex').slice(0, 12)));
const path = '.local-logs/live-chat-current-output.log';
const trace = existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/).filter(l => l.startsWith('[raidverse.chat] ')).map(l => JSON.parse(l.slice('[raidverse.chat] '.length))).filter(l => eventRefs.has(l.eventRef) || l.stage === 'websocket' && l.revision === snapshot.revision) : [];
// Domain objects below come from the deliberate public legacy, not the private store.
const evidence = { capturedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  kind: 'AUTHENTIC_LIVE_READ_ONLY_OBSERVATION', origin, health, revision: snapshot.revision,
  channels: snapshot.channels.filter(c => c.mode === 'LIVE').map(c => ({ id: c.id, name: c.name, mode: c.mode, enabled: c.enabled, incoming: c.incoming, artifactId: c.artifactId })),
  connections: Object.fromEntries(Object.entries(me.connections).map(([id, c]) => [id, { status: c.status, chat: c.chat, raid: c.raid, lastEvent: c.lastEvent }])),
  artifacts, transfers: snapshot.transfers.filter(t => t.mode === 'LIVE'), checks, correlatedSafeTrace: trace,
  limits: ['Public state and safe application traces are evidence of observed operation, not independently signed Twitch receipts.', 'Subscription confirmation does not establish a raid occurred.', 'No synthetic event was injected to generate this evidence.', 'Native OBS and two-channel transfer require separate verification.'] };
mkdirSync('output/live', { recursive: true });
writeFileSync('output/live/evidence.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ saved: 'output/live/evidence.json', revision: snapshot.revision, liveChannels: evidence.channels.length, authenticContributions: contributions.length, historyConsistent: true, safeTraceEntries: trace.length }));
