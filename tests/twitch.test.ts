import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket, { WebSocketServer } from 'ws';
import type { AddressInfo } from 'node:net';
import { Store } from '../server/store';
import { Domain } from '../server/domain';
import { Twitch } from '../server/twitch';

let store: Store, domain: Domain, twitch: Twitch, dir: string, wss: WebSocketServer;
let remote: WebSocket; let calls: { url: string; body: Record<string, unknown> }[]; let notifications: number;
const id = '100';
const welcome = (session = 'session-1') => ({ metadata: { message_id: 'welcome', message_type: 'session_welcome', message_timestamp: new Date().toISOString() }, payload: { session: { id: session, keepalive_timeout_seconds: 30 } } });
const send = (value: unknown) => remote.send(JSON.stringify(value));
async function waitFor(fn: () => boolean) { await vi.waitFor(() => expect(fn()).toBe(true), { timeout: 5000, interval: 25 }); }
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'raidverse-twitch-')); store = new Store(dir); domain = new Domain(store); calls = []; notifications = 0;
  twitch = new Twitch(store, domain, { clientId: 'client', clientSecret: 'secret-test-only', origin: 'http://localhost:3000' }, () => notifications++);
  wss = new WebSocketServer({ port: 0, host: '127.0.0.1' }); await new Promise<void>(resolve => wss.once('listening', resolve));
  twitch.socketFactory = () => new WebSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
  wss.on('connection', ws => { remote = ws; ws.send(JSON.stringify(welcome())); });
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    const body = options?.body instanceof URLSearchParams ? Object.fromEntries(options.body) : options?.body ? JSON.parse(String(options.body)) : {};
    calls.push({ url, body });
    if (url.endsWith('/oauth2/validate')) return Response.json({ client_id: 'client', user_id: id, login: 'orbital', scopes: ['user:read:chat'], expires_in: 3600 });
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 });
    if (url.endsWith('/helix/users')) return Response.json({ data: [{ id, login: 'orbital', display_name: 'Orbital' }] });
    if (url.endsWith('/eventsub/subscriptions')) return Response.json({ data: [{ id: body.type, status: 'enabled' }] }, { status: 202 });
    throw new Error('Unexpected test request');
  }));
  domain.register(id, 'orbital', 'Orbital', 'LIVE'); domain.action(id, { type: 'settings', enabled: true, incoming: true, allowMods: false });
  domain.action(id, { type: 'create', name: 'Live protocol test' }); domain.action(id, { type: 'start' });
  store.putCredentials(id, { access: 'test-access', refresh: 'test-refresh', expiresAt: Date.now() + 3600_000 });
});
afterEach(async () => {
  vi.useRealTimers();
  twitch.stop(); for (const ws of wss.clients) ws.terminate(); await new Promise<void>(resolve => wss.close(() => resolve()));
  store.close(); rmSync(dir, { recursive: true, force: true }); vi.unstubAllGlobals();
});
async function connect() { twitch.connect(id); await waitFor(() => twitch.infos()[id]?.chat && twitch.infos()[id]?.raid); }
function message(extra: Record<string, unknown> = {}, eventId = 'chat-1', subId = 'channel.chat.message') {
  return { metadata: { message_id: `envelope-${eventId}`, message_type: 'notification', message_timestamp: new Date().toISOString() }, payload: {
    subscription: { id: subId, type: 'channel.chat.message', condition: { broadcaster_user_id: id, user_id: id } },
    event: { broadcaster_user_id: id, chatter_user_id: 'viewer', chatter_user_name: 'Real protocol fixture', message_id: eventId, message: { text: '!forge crystal' }, badges: [], ...extra },
  } };
}
describe('Twitch adapter with local protocol fixtures — NOT live Twitch evidence', () => {
  it('subscribes to self chat and outgoing raids using user transport', async () => {
    await connect(); const subs = calls.filter(c => c.url.endsWith('/subscriptions')); expect(subs).toHaveLength(2);
    expect(subs[0].body).toMatchObject({ type: 'channel.chat.message', condition: { user_id: id, broadcaster_user_id: id }, transport: { method: 'websocket', session_id: 'session-1' } });
    expect(subs[1].body).toMatchObject({ type: 'channel.raid', condition: { from_broadcaster_user_id: id } });
    expect(subs[1].body.condition).not.toHaveProperty('to_broadcaster_user_id');
  });
  it('consumes a validated chat envelope once, without trusting browser input', async () => {
    await connect(); send(message()); send(message()); await waitFor(() => store.read().artifacts[0].energy.crystal === 1);
    expect(store.read().artifacts[0].history.filter(h => h.kind === 'CONTRIBUTION')).toHaveLength(1);
  });
  it('maps real-shaped broadcaster and spectator messages without requiring viewer registration', async () => {
    await connect();
    send(message({ chatter_user_id: id, chatter_user_name: 'Broadcaster', message: { text: '!forge light', fragments: [{ type: 'text', text: '!forge light' }] }, badges: [{ set_id: 'broadcaster', id: '1', info: '' }], source_broadcaster_user_id: null }, 'owner-chat-id'));
    send(message({ chatter_user_id: 'new-spectator', message: { text: '!forge fire' }, source_broadcaster_user_id: null }, 'spectator-chat-id'));
    await waitFor(() => store.read().artifacts[0].energy.light === 1 && store.read().artifacts[0].energy.fire === 1);
    expect(store.read().channels).toHaveLength(1);
    expect(store.read().artifacts[0].history.filter(h => h.kind === 'CONTRIBUTION')).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: id, eventId: 'owner-chat-id', evidence: 'TWITCH', element: 'light' }),
      expect.objectContaining({ userId: 'new-spectator', eventId: 'spectator-chat-id', evidence: 'TWITCH', element: 'fire' }),
    ]));
  });
  it('does not credit duplicate broadcaster messages or replay messages from a closed round', async () => {
    await connect(); domain.action(id, { type: 'stop' });
    const closed = message({ chatter_user_id: id }, 'closed-owner-message'); send(closed);
    await new Promise(resolve => setTimeout(resolve, 50));
    domain.action(id, { type: 'start' }); send(closed);
    const fresh = message({ chatter_user_id: id }, 'open-owner-message'); send(fresh); send(fresh);
    await waitFor(() => store.read().artifacts[0].energy.crystal === 1);
    expect(store.read().artifacts[0].history.filter(h => h.kind === 'CONTRIBUTION')).toHaveLength(1);
  });
  it('rejects a notification whose chat reader condition does not match the authenticated user', async () => {
    await connect(); const forged = message({}, 'wrong-reader'); forged.payload.subscription.condition.user_id = 'other'; send(forged);
    send(message({}, 'valid-reader')); await waitFor(() => store.read().artifacts[0].energy.crystal === 1);
    expect(store.read().artifacts[0].history.filter(h => h.kind === 'CONTRIBUTION').map(h => h.eventId)).toEqual(['valid-reader']);
  });
  it('persists all four allowlisted powers from independently identified chatters', async () => {
    await connect();
    for (const element of ['light', 'fire', 'storm', 'crystal']) {
      send(message({ chatter_user_id: `viewer-${element}`, message: { text: `!forge ${element}` } }, `power-${element}`));
    }
    await waitFor(() => Object.values(store.read().artifacts[0].energy).every(n => n === 1));
    const contributions = store.read().artifacts[0].history.filter(h => h.kind === 'CONTRIBUTION');
    expect(contributions).toHaveLength(4);
    expect(contributions.every(h => h.evidence === 'TWITCH' && h.eventId?.startsWith('power-') && h.userId?.startsWith('viewer-'))).toBe(true);
    // TWITCH here is the adapter's domain classification; this entire test is a local fixture.
  });
  it('rejects unrelated subscription IDs, wrong broadcasters and shared chat', async () => {
    await connect(); send(message({}, 'wrong-sub', 'forged-subscription')); send(message({ broadcaster_user_id: 'other' }, 'wrong-channel')); send(message({ source_broadcaster_user_id: 'other' }, 'shared'));
    const before = notifications; send({ metadata: { message_id: 'tick', message_type: 'notification', message_timestamp: new Date().toISOString() }, payload: { subscription: { id: 'ignored', type: 'ignored', condition: {} } } });
    await new Promise(resolve => setTimeout(resolve, 100)); expect(store.read().artifacts[0].energy.crystal).toBe(0);
  });
  it('refreshes an expiring token once for concurrent requests', async () => {
    store.putCredentials(id, { access: 'old', refresh: 'old-refresh', expiresAt: Date.now() - 1000 });
    const result = await Promise.all([twitch.access(id), twitch.access(id)]); expect(result[0].access).toBe('new-access');
    expect(calls.filter(c => c.url.endsWith('/token'))).toHaveLength(1); expect(store.credentials(id)?.refresh).toBe('new-refresh');
  });
  it('does not restore credentials if authorization is revoked during refresh', async () => {
    store.putCredentials(id, { access: 'old', refresh: 'old-refresh', expiresAt: Date.now() - 1000 });
    let release!: () => void;
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise<void>(resolve => { release = resolve; });
      return Response.json({ access_token: 'late-access', refresh_token: 'late-refresh', expires_in: 3600 });
    }));
    const pending = twitch.access(id); const assertion = expect(pending).rejects.toThrow();
    twitch.invalidate(id); release(); await assertion;
    expect(store.credentials(id)).toBeNull();
  });
  it('ends authorization and sessions when validation is revoked', async () => {
    const session = store.createSession(id); vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    await expect(twitch.validate(id)).rejects.toThrow(); expect(store.session(session.token)).toBeNull(); expect(store.credentials(id)).toBeNull(); expect(store.read().channels[0].enabled).toBe(false);
  });
  it.each([
    { client_id: 'another-client', user_id: id, scopes: ['user:read:chat'] },
    { client_id: 'client', user_id: id, scopes: [] },
    { client_id: 'client', user_id: 'another-user', scopes: ['user:read:chat'] },
  ])('rejects token identity or minimum-scope mismatch: %j', async mismatch => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ login: 'orbital', expires_in: 3600, ...mismatch })));
    const session = store.createSession(id);
    await expect(twitch.validate(id)).rejects.toThrow();
    expect(store.credentials(id)).toBeNull(); expect(store.session(session.token)).toBeNull();
  });
  it('ends authorization on an EventSub revocation message', async () => {
    await connect(); const session = store.createSession(id);
    send({ metadata: { message_id: 'revocation', message_type: 'revocation', message_timestamp: new Date().toISOString() }, payload: { subscription: { id: 'channel.chat.message', type: 'channel.chat.message', status: 'authorization_revoked' } } });
    await waitFor(() => store.credentials(id) === null);
    expect(store.session(session.token)).toBeNull(); expect(twitch.infos()[id]).toMatchObject({ chat: false, raid: false });
  });
  it('exchanges code server-side and verifies identity and minimum scope', async () => {
    const result = await twitch.exchange('authorization-code'); expect(result.id).toBe(id);
    const token = calls.find(c => c.url.endsWith('/token'))!; expect(token.body).toMatchObject({ grant_type: 'authorization_code', redirect_uri: 'http://localhost:3000/auth/callback' });
    expect(store.credentials(id)?.access).toBe('new-access'); await waitFor(() => Boolean(twitch.infos()[id].raid));
  });
  it('migrates reconnect sessions without creating duplicate subscriptions', async () => {
    await connect(); const before = calls.filter(c => c.url.endsWith('/subscriptions')).length;
    send({ metadata: { message_id: 'reconnect', message_type: 'session_reconnect', message_timestamp: new Date().toISOString() }, payload: { session: { reconnect_url: 'wss://eventsub.wss.twitch.tv/ws?reconnect=test-fixture' } } });
    await waitFor(() => twitch.infos()[id].status === 'Connected' && wss.clients.size === 1);
    expect(calls.filter(c => c.url.endsWith('/subscriptions'))).toHaveLength(before);
  });
  it('reconnects and resubscribes after transport loss', async () => {
    await connect(); remote.terminate(); await waitFor(() => calls.filter(c => c.url.endsWith('/subscriptions')).length === 4);
    expect(twitch.infos()[id].raid).toBe(true);
  });
  it('keeps two independently authenticated channel connections active', async () => {
    domain.register('200', 'nova', 'Nova', 'LIVE');
    store.putCredentials('200', { access: 'second-test-access', refresh: 'second-test-refresh', expiresAt: Date.now() + 3600_000 });
    await connect(); twitch.connect('200'); await waitFor(() => Boolean(twitch.infos()['200']?.chat && twitch.infos()['200']?.raid));
    expect(wss.clients.size).toBe(2); expect(twitch.infos()[id].chat).toBe(true);
    const conditions = calls.filter(c => c.url.endsWith('/subscriptions')).map(c => c.body.condition);
    expect(conditions).toContainEqual({ broadcaster_user_id: '200', user_id: '200' });
  });
  it('routes a matching raid notification to receiver approval', async () => {
    domain.register('200', 'nova', 'Nova', 'LIVE'); domain.action('200', { type: 'settings', enabled: true, incoming: true, allowMods: false });
    domain.action(id, { type: 'stop' }); domain.action(id, { type: 'prepare', target: '200' }); await connect();
    send({ metadata: { message_id: 'raid-fixture', message_type: 'notification', message_timestamp: new Date().toISOString() }, payload: {
      subscription: { id: 'channel.raid', type: 'channel.raid', condition: { from_broadcaster_user_id: id } },
      event: { from_broadcaster_user_id: id, to_broadcaster_user_id: '200', viewers: 5 },
    } });
    await waitFor(() => store.read().transfers[0].status === 'PENDING_APPROVAL');
    expect(store.read().transfers[0].raidEventId).toBe('raid-fixture'); expect(store.read().artifacts[0].ownerId).toBe(id);
  });
  it('requires reauthorization immediately when subscription access is denied', async () => {
    const s = store.createSession(id); vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    twitch.connect(id); await waitFor(() => store.credentials(id) === null);
    expect(store.session(s.token)).toBeNull(); expect(twitch.infos()[id].chat).toBe(false);
  });
  it('never restores connected indicators after revocation during subscription setup', async () => {
    const originalFetch = globalThis.fetch; let release!: () => void; let pending = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/eventsub/subscriptions') && !pending) {
        pending = true; await new Promise<void>(resolve => { release = resolve; });
      }
      return originalFetch(url, options);
    }));
    twitch.connect(id); await waitFor(() => pending); twitch.invalidate(id); release();
    await waitFor(() => calls.some(c => c.url.endsWith('/subscriptions')));
    expect(twitch.infos()[id]).toMatchObject({ chat: false, raid: false });
    expect(twitch.infos()[id].status).not.toBe('Connected');
    expect(store.credentials(id)).toBeNull();
  });
  it('retries a temporary startup validation failure before connecting', async () => {
    vi.useFakeTimers(); const originalFetch = globalThis.fetch; let validationRequests = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/oauth2/validate') && ++validationRequests === 1) return new Response('', { status: 503 });
      return originalFetch(url, options);
    }));
    const connect = vi.spyOn(twitch, 'connect').mockImplementation(() => {});
    await twitch.start(); expect(connect).not.toHaveBeenCalled();
    expect(twitch.infos()[id]).toMatchObject({ chat: false, raid: false });
    expect(twitch.infos()[id].status).toContain('retry');
    await vi.advanceTimersByTimeAsync(1000);
    expect(validationRequests).toBe(2); expect(connect).toHaveBeenCalledExactlyOnceWith(id);
  });
  it('does not retry startup authorization that Twitch has revoked', async () => {
    vi.useFakeTimers(); const fetch = vi.fn(async () => new Response('', { status: 401 })); vi.stubGlobal('fetch', fetch);
    const connect = vi.spyOn(twitch, 'connect').mockImplementation(() => {});
    await twitch.start(); await vi.advanceTimersByTimeAsync(30_000);
    expect(store.credentials(id)).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1); expect(connect).not.toHaveBeenCalled();
    expect(twitch.infos()[id]).toMatchObject({ chat: false, raid: false });
  });
  it('cancels pending startup validation retries when stopped', async () => {
    vi.useFakeTimers(); const fetch = vi.fn(async () => new Response('', { status: 503 })); vi.stubGlobal('fetch', fetch);
    const connect = vi.spyOn(twitch, 'connect').mockImplementation(() => {});
    await twitch.start(); twitch.stop(); await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1); expect(connect).not.toHaveBeenCalled();
  });
});
