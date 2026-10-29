import WebSocket from 'ws';
import { z } from 'zod';
import { Domain } from './domain.js';
import type { Credentials, Store } from './store.js';

const tokenSchema = z.object({ access_token: z.string(), refresh_token: z.string(), expires_in: z.number().positive() });
const validationSchema = z.object({ client_id: z.string(), user_id: z.string(), login: z.string(), scopes: z.array(z.string()), expires_in: z.number() });
const chatSchema = z.object({ broadcaster_user_id: z.string(), chatter_user_id: z.string().min(1), chatter_user_name: z.string(), message_id: z.string(),
  message: z.object({ text: z.string() }), badges: z.array(z.object({ set_id: z.string() })), source_broadcaster_user_id: z.string().nullable().optional() });
const raidSchema = z.object({ from_broadcaster_user_id: z.string(), to_broadcaster_user_id: z.string(), viewers: z.number().int().nonnegative() });
const envelope = z.object({ metadata: z.object({ message_id: z.string(), message_type: z.string(), message_timestamp: z.string() }), payload: z.record(z.string(), z.unknown()) });
export class TwitchError extends Error { constructor(public status: number) { super(`Twitch request failed (${status})`); } }
export interface TwitchConfig { clientId: string; clientSecret: string; origin: string }
export interface ConnectionInfo { status: string; chat: boolean; raid: boolean; lastEvent?: number }

export async function twitchFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new TwitchError(response.status);
  return response.json();
}
export class Twitch {
  readonly connections = new Map<string, EventConnection>();
  private refreshing = new Map<string, Promise<Credentials>>();
  private validationTimer: ReturnType<typeof setInterval> | null = null;
  socketFactory = (url: string): WebSocket => new WebSocket(url, { handshakeTimeout: 15_000, maxPayload: 1024 * 1024 });
  constructor(public store: Store, public domain: Domain, public config: TwitchConfig, public notify: () => void) {}
  get configured() { return Boolean(this.config.clientId && this.config.clientSecret); }
  async exchange(code: string) {
    const data = tokenSchema.parse(await twitchFetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: new URLSearchParams({
      client_id: this.config.clientId, client_secret: this.config.clientSecret, code, grant_type: 'authorization_code', redirect_uri: `${this.config.origin}/auth/callback`,
    }) }));
    const creds = { access: data.access_token, refresh: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 };
    const validated = await this.validateToken(creds.access);
    const userResult = z.object({ data: z.array(z.object({ id: z.string(), login: z.string(), display_name: z.string() })).min(1) }).parse(await twitchFetch('https://api.twitch.tv/helix/users', { headers: this.headers(creds.access) }));
    const user = userResult.data[0];
    if (user.id !== validated.user_id) throw new Error('Twitch identity mismatch');
    this.store.putCredentials(user.id, creds); this.domain.register(user.id, user.login, user.display_name, 'LIVE');
    this.connect(user.id); return user;
  }
  headers(token: string) { return { Authorization: `Bearer ${token}`, 'Client-Id': this.config.clientId, 'Content-Type': 'application/json' }; }
  async validateToken(token: string) {
    const info = validationSchema.parse(await twitchFetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${token}` } }));
    if (info.client_id !== this.config.clientId || !info.scopes.includes('user:read:chat')) throw new TwitchError(401);
    return info;
  }
  async access(user: string): Promise<Credentials> {
    const creds = this.store.credentials(user);
    if (!creds) throw new TwitchError(401);
    if (creds.expiresAt > Date.now() + 60_000) return creds;
    const existing = this.refreshing.get(user); if (existing) return existing;
    const work = (async () => {
      try {
        const token = tokenSchema.parse(await twitchFetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: new URLSearchParams({
          client_id: this.config.clientId, client_secret: this.config.clientSecret, grant_type: 'refresh_token', refresh_token: creds.refresh,
        }) }));
        const result = { access: token.access_token, refresh: token.refresh_token, expiresAt: Date.now() + token.expires_in * 1000 };
        this.store.putCredentials(user, result); return result;
      } catch (e) { if (e instanceof TwitchError && [400, 401, 403].includes(e.status)) this.invalidate(user); throw e; }
      finally { this.refreshing.delete(user); }
    })(); this.refreshing.set(user, work); return work;
  }
  async validate(user: string) {
    try {
      const credentials = await this.access(user); const info = await this.validateToken(credentials.access);
      if (info.user_id !== user) throw new TwitchError(401);
    } catch (e) { if (e instanceof TwitchError && [401, 403].includes(e.status)) this.invalidate(user); throw e; }
  }
  invalidate(user: string) {
    this.store.revoke(user); const connection = this.connections.get(user);
    connection?.stop(); if (connection) connection.info.status = 'Authorization expired — reconnect Twitch';
    this.domain.store.transaction(s => { const c = s.channels.find(c => c.id === user); if (c) c.enabled = false; });
    this.notify();
  }
  connect(user: string) {
    this.connections.get(user)?.stop();
    const connection = new EventConnection(user, this); this.connections.set(user, connection); connection.start();
  }
  async start() {
    if (!this.configured) return;
    for (const channel of this.store.read().channels.filter(c => c.mode === 'LIVE')) {
      if (!this.store.credentials(channel.id)) continue;
      try { await this.validate(channel.id); this.connect(channel.id); }
      catch { /* UI reports disconnected; never silently replace live with rehearsal. */ }
    }
    this.validationTimer = setInterval(() => {
      for (const user of this.connections.keys()) if (this.store.credentials(user)) this.validate(user).catch(() => {
        const c = this.connections.get(user); if (c) c.info.status = 'Token validation failed — check connection'; this.notify();
      });
    }, 3600_000);
  }
  infos() { return Object.fromEntries([...this.connections].map(([id, c]) => [id, c.info])); }
  stop() { if (this.validationTimer) clearInterval(this.validationTimer); for (const c of this.connections.values()) c.stop(); }
}

class EventConnection {
  info: ConnectionInfo = { status: 'Connecting', chat: false, raid: false };
  private socket: WebSocket | null = null;
  private sockets = new Set<WebSocket>();
  private subscriptions = new Map<string, string>();
  private stopped = false;
  private retries = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private last = Date.now();
  private keepalive = 30_000;
  constructor(private user: string, private twitch: Twitch) {}
  start() {
    this.open('wss://eventsub.wss.twitch.tv/ws');
    this.watchdog = setInterval(() => { if (this.socket && Date.now() - this.last > this.keepalive + 10_000) this.socket.terminate(); }, 5000);
  }
  private open(url: string, migration = false) {
    if (this.stopped) return;
    const parsed = new URL(url);
    if (parsed.protocol !== 'wss:' || parsed.hostname !== 'eventsub.wss.twitch.tv') { this.info.status = 'Unsafe reconnect URL rejected'; return; }
    const ws = this.twitch.socketFactory(url); this.sockets.add(ws);
    if (!migration) { this.socket = ws; this.last = Date.now(); this.info.chat = false; this.info.raid = false; this.subscriptions.clear(); }
    ws.on('message', bytes => { this.handle(ws, bytes.toString(), migration).catch(() => { this.info.status = 'EventSub setup failed — retrying'; ws.terminate(); this.twitch.notify(); }); });
    ws.on('error', () => { this.info.status = 'EventSub connection error'; this.twitch.notify(); });
    ws.on('close', () => {
      this.sockets.delete(ws);
      if (this.stopped) return;
      if (this.socket === ws || (migration && this.socket?.readyState !== WebSocket.OPEN)) {
        this.info = { ...this.info, status: 'Disconnected — reconnecting (events may be missed)', chat: false, raid: false };
        if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.open('wss://eventsub.wss.twitch.tv/ws'); }, Math.min(30_000, 1000 * 2 ** this.retries++) + Math.random() * 500);
        this.twitch.notify();
      }
    });
  }
  private async handle(ws: WebSocket, raw: string, migration: boolean) {
    const parsed = envelope.safeParse(JSON.parse(raw)); if (!parsed.success) return;
    const { metadata, payload } = parsed.data; this.last = Date.now();
    if (metadata.message_type === 'session_welcome') {
      const session = z.object({ id: z.string(), keepalive_timeout_seconds: z.number().nullable() }).parse(payload.session);
      const previous = this.socket; this.socket = ws; this.keepalive = (session.keepalive_timeout_seconds ?? 30) * 1000;
      if (previous && previous !== ws) previous.close();
      if (!migration) {
        const credentials = await this.twitch.access(this.user);
        for (const [type, condition] of [
          ['channel.chat.message', { broadcaster_user_id: this.user, user_id: this.user }],
          ['channel.raid', { from_broadcaster_user_id: this.user }],
        ] as const) {
          const result = z.object({ data: z.array(z.object({ id: z.string(), status: z.string() })).min(1) }).parse(await twitchFetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST', headers: this.twitch.headers(credentials.access), body: JSON.stringify({ type, version: '1', condition, transport: { method: 'websocket', session_id: session.id } }),
          }));
          if (result.data[0].status !== 'enabled') throw new Error('Subscription not enabled');
          this.subscriptions.set(result.data[0].id, type);
          if (type === 'channel.raid') this.info.raid = true; else this.info.chat = true;
        }
      }
      this.info.status = 'Connected'; this.retries = 0; this.twitch.notify();
    } else if (metadata.message_type === 'session_reconnect') {
      const session = z.object({ reconnect_url: z.string().url() }).parse(payload.session); this.info.status = 'Migrating connection';
      this.open(session.reconnect_url, true); this.twitch.notify();
    } else if (metadata.message_type === 'revocation') {
      this.twitch.invalidate(this.user);
    } else if (metadata.message_type === 'notification') {
      const sub = z.object({ id: z.string(), type: z.string(), condition: z.record(z.string(), z.unknown()) }).parse(payload.subscription);
      if (this.subscriptions.get(sub.id) !== sub.type) return;
      const at = Date.parse(metadata.message_timestamp); if (!Number.isFinite(at)) return;
      this.info.lastEvent = Date.now();
      if (sub.type === 'channel.chat.message') {
        const e = chatSchema.parse(payload.event);
        if (e.broadcaster_user_id !== this.user || sub.condition.broadcaster_user_id !== this.user) return;
        this.twitch.domain.chat({ channelId: this.user, userId: e.chatter_user_id, userName: e.chatter_user_name,
          text: e.message.text, messageId: e.message_id, at, mode: 'LIVE', moderator: e.badges.some(b => b.set_id === 'moderator'), shared: Boolean(e.source_broadcaster_user_id && e.source_broadcaster_user_id !== this.user) });
      } else if (sub.type === 'channel.raid') {
        const e = raidSchema.parse(payload.event);
        if (e.from_broadcaster_user_id !== this.user || sub.condition.from_broadcaster_user_id !== this.user) return;
        this.twitch.domain.raid({ from: e.from_broadcaster_user_id, to: e.to_broadcaster_user_id, eventId: metadata.message_id, viewers: e.viewers, at, mode: 'LIVE' });
      }
      this.twitch.notify();
    }
  }
  stop() { this.stopped = true; if (this.timer) clearTimeout(this.timer); if (this.watchdog) clearInterval(this.watchdog); for (const s of this.sockets) s.close(); this.info.chat = false; this.info.raid = false; }
}
