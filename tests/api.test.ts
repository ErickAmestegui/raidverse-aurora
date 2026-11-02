import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { Store } from '../server/store';
import { createApp, type AppConfig } from '../server/app';

let dir: string, store: Store, app: ReturnType<typeof createApp>, origin: string;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'raidverse-api-')); store = new Store(dir);
  const config: AppConfig = { origin: 'http://127.0.0.1:0', clientId: '', clientSecret: '', secureCookies: false, rehearsal: true };
  app = createApp(store, config); await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`; config.origin = origin;
});
afterEach(async () => { await app.close(); store.close(); rmSync(dir, { recursive: true, force: true }); });
const post = (path: string, data: unknown, cookie = '', csrf = '', from = origin) => fetch(origin + path, { method: 'POST', headers: { Origin: from, Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(data) });
async function rehearsal() {
  const r = await post('/api/rehearsal/start', {}); const cookie = r.headers.get('set-cookie')!.split(';')[0];
  const me = await (await fetch(origin + '/api/me', { headers: { Cookie: cookie } })).json(); return { cookie, csrf: me.csrf };
}
describe('HTTP integration and security boundaries', () => {
  it('serves honest health and signed-out status', async () => {
    expect(await (await fetch(origin + '/api/health')).json()).toMatchObject({ ok: true, twitchConfigured: false });
    expect(await (await fetch(origin + '/api/me')).json()).toMatchObject({ mode: null, channelIds: [] });
  });
  it('isolates two LIVE browser cookies and logs out only the chosen session', async () => {
    for (const id of ['channel-a', 'channel-b']) app.domain.register(id, id, id, 'LIVE');
    const a = store.createSession('channel-a'); const b = store.createSession('channel-b');
    const cookieA = `rv_session=${a.token}`; const cookieB = `rv_session=${b.token}`;
    const identity = async (cookie: string) => (await fetch(origin + '/api/me', { headers: { Cookie: cookie } })).json();
    expect(await identity(cookieA)).toMatchObject({ channelIds: ['channel-a'], mode: 'LIVE' });
    expect(await identity(cookieB)).toMatchObject({ channelIds: ['channel-b'], mode: 'LIVE' });
    const settings = { type: 'settings', enabled: true, incoming: true, allowMods: false };
    expect((await post('/api/control/channel-b', settings, cookieA, a.session.csrf)).status).toBe(400);
    expect((await post('/api/control/channel-b', settings, cookieB, a.session.csrf)).status).toBe(400);
    expect((await post('/api/control/channel-b', settings, cookieB, b.session.csrf)).status).toBe(200);
    expect((await post('/api/logout', {}, cookieB, b.session.csrf)).status).toBe(200);
    expect(await identity(cookieB)).toMatchObject({ channelIds: [], mode: null });
    expect(await identity(cookieA)).toMatchObject({ channelIds: ['channel-a'], mode: 'LIVE' });
    expect((await post('/api/control/channel-a', settings, cookieA, a.session.csrf)).status).toBe(200);
  });
  it('rejects unauthorized control, cross-site POST and forged CSRF', async () => {
    expect((await post('/api/control/live', { type: 'clear' })).status).toBe(400);
    expect((await post('/api/rehearsal/start', {}, '', '', 'https://evil.example')).status).toBe(403);
    const s = await rehearsal(); expect((await post('/api/control/rehearsal-a', { type: 'clear' }, s.cookie, 'fake')).status).toBe(400);
  });
  it('cannot control LIVE channels through a rehearsal session', async () => {
    app.domain.register('live-owner', 'live', 'Live', 'LIVE'); const s = await rehearsal();
    const r = await post('/api/control/live-owner', { type: 'settings', enabled: true, incoming: true, allowMods: false }, s.cookie, s.csrf);
    expect(r.status).toBe(400); expect(store.read().channels.find(c => c.id === 'live-owner')?.enabled).toBe(false);
  });
  it('cannot inject synthetic messages from a LIVE session', async () => {
    const live = store.createSession('live-owner');
    const r = await post('/api/rehearsal/forge', { channelId: 'rehearsal-a', element: 'fire', viewer: 1 }, `rv_session=${live.token}`, live.session.csrf);
    expect(r.status).toBe(400);
  });
  it('enforces overlay viewing key and emergency clear independently of public history', async () => {
    const s = await rehearsal(); const send = (d: unknown) => post('/api/control/rehearsal-a', d, s.cookie, s.csrf);
    await send({ type: 'settings', enabled: true, incoming: true, allowMods: false }); await send({ type: 'create', name: 'Visible' });
    expect((await fetch(origin + '/api/overlay/rehearsal-a?key=wrong')).status).toBe(403);
    const result = await (await post('/api/overlay-link', { channelId: 'rehearsal-a' }, s.cookie, s.csrf)).json(); expect(result.url).toContain('#key=');
    const key = result.url.split('#key=')[1]; const state = await (await fetch(origin + `/api/overlay/rehearsal-a?key=${key}`)).json(); expect(state.hidden).toBe(false);
    await send({ type: 'clear' }); expect((await (await fetch(origin + `/api/overlay/rehearsal-a?key=${key}`)).json()).hidden).toBe(true);
    expect((await (await fetch(origin + '/api/snapshot')).json()).artifacts[0].name).toBe('Visible');
    await send({ type: 'rotate-overlay' }); expect((await fetch(origin + `/api/overlay/rehearsal-a?key=${key}`)).status).toBe(403);
  });
  it('broadcasts snapshots and forbids WebSocket commands', async () => {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/socket', { origin });
    const message = await new Promise<string>(resolve => ws.once('message', m => resolve(m.toString()))); expect(JSON.parse(message).type).toBe('snapshot');
    const closed = new Promise<number>(resolve => ws.once('close', code => resolve(code))); ws.send('{"type":"accept"}'); expect(await closed).toBe(1008);
  });
  it('rejects forged OAuth callbacks before any token request', async () => {
    const r = await fetch(origin + '/auth/callback?code=forged&state=invalid'); expect(r.status).toBe(400); expect(await r.json()).toMatchObject({ error: 'OAuth state expired or invalid' });
  });
  it('rejects arbitrary actions and validates JSON fields', async () => {
    const s = await rehearsal(); expect((await post('/api/control/rehearsal-a', { type: 'exec', url: 'https://evil.example' }, s.cookie, s.csrf)).status).toBe(400);
  });
  it('allows only the authenticated owning channel to rename its artifact', async () => {
    for (const id of ['owner', 'other']) {
      app.domain.register(id, id, id, 'LIVE');
      app.domain.action(id, { type: 'settings', enabled: true, incoming: true, allowMods: false });
    }
    app.domain.action('owner', { type: 'create', name: 'Original' });
    const artifactId = store.read().channels.find(c => c.id === 'owner')!.artifactId;
    const owner = store.createSession('owner'); const other = store.createSession('other');
    const rename = { type: 'rename', name: 'Aurora live' };
    expect((await post('/api/control/owner', rename, `rv_session=${other.token}`, other.session.csrf)).status).toBe(400);
    expect((await post('/api/control/owner', rename, `rv_session=${owner.token}`, 'forged')).status).toBe(400);
    expect((await post('/api/control/owner', { type: 'rename', name: ' ' }, `rv_session=${owner.token}`, owner.session.csrf)).status).toBe(400);
    expect(store.read().artifacts[0].name).toBe('Original');
    expect((await post('/api/control/owner', rename, `rv_session=${owner.token}`, owner.session.csrf)).status).toBe(200);
    const snapshot = await (await fetch(origin + '/api/snapshot')).json();
    expect(snapshot.artifacts[0]).toMatchObject({ id: artifactId, name: 'Aurora live', ownerId: 'owner' });
    expect(snapshot.artifacts[0].history.at(-1)).toMatchObject({ kind: 'RENAMED', evidence: 'CONTROL' });
    const synthetic = await rehearsal();
    expect((await post('/api/control/owner', { type: 'rename', name: 'Synthetic override' }, synthetic.cookie, synthetic.csrf)).status).toBe(400);
    expect(store.read().artifacts[0].name).toBe('Aurora live');
  });
});
