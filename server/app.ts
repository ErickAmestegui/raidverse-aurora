import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import WebSocket, { WebSocketServer } from 'ws';
import { z } from 'zod';
import { actionSchema, Domain } from './domain.js';
import { Store, type Session } from './store.js';
import { Twitch, type TwitchConfig } from './twitch.js';
import { traceChat } from './chat-diagnostics.js';

export interface AppConfig extends TwitchConfig { secureCookies: boolean; rehearsal: boolean }
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function cookie(req: IncomingMessage, name: string) { return (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) ?? ''; }
async function body(req: IncomingMessage) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('JSON body required');
  let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 8192) throw new Error('Request too large'); }
  return JSON.parse(text);
}
export function createApp(store: Store, config: AppConfig) {
  let fallback: (req: IncomingMessage, res: ServerResponse) => void = (_req, res) => { res.writeHead(404); res.end('Not found'); };
  const clients = new Set<WebSocket>(); let broadcastTimer: ReturnType<typeof setTimeout> | null = null;
  const broadcast = () => {
    if (broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null; const snapshot = store.public(); const text = JSON.stringify({ type: 'snapshot', data: snapshot });
      for (const ws of clients) if (ws.readyState === WebSocket.OPEN) { if (ws.bufferedAmount > 2_000_000) ws.terminate(); else ws.send(text); }
      traceChat('websocket', { revision: snapshot.revision, clients: [...clients].filter(ws => ws.readyState === WebSocket.OPEN).length });
    }, 80);
  };
  const domain = new Domain(store, broadcast); const twitch = new Twitch(store, domain, config, broadcast);
  const rates = new Map<string, { n: number; at: number }>();
  function allowed(req: IncomingMessage) {
    const ip = req.socket.remoteAddress ?? 'unknown'; const now = Date.now(); let rate = rates.get(ip);
    if (!rate || now - rate.at > 60_000) { rate = { n: 0, at: now }; rates.set(ip, rate); }
    return ++rate.n <= 240;
  }
  function session(req: IncomingMessage) { return store.session(cookie(req, 'rv_session')); }
  function requireSession(req: IncomingMessage) {
    const s = session(req); if (!s) throw new Error('Sign in first');
    if (!safeEqual(String(req.headers['x-csrf-token'] ?? ''), s.csrf)) throw new Error('Session verification failed');
    return s;
  }
  function own(s: Session, id: string) {
    const c = store.read().channels.find(c => c.id === id);
    if (!c || (s.rehearsal ? c.mode !== 'REHEARSAL' || !['rehearsal-a', 'rehearsal-b'].includes(id) : c.mode !== 'LIVE' || c.id !== s.user)) throw new Error('Not authorized for this channel');
    return c;
  }
  const sendCookie = (name: string, value: string, seconds: number) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${config.secureCookies ? '; Secure' : ''}`;
  const server = createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Cache-Control', 'no-store');
    route(req, res).catch(error => {
      if (res.headersSent) { res.end(); return; }
      const message = error instanceof z.ZodError ? 'Invalid request fields' : error instanceof Error ? error.message : 'Request failed';
      res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: message.startsWith('Twitch request') ? 'Twitch authorization failed. Please reconnect.' : message }));
    });
  });
  async function route(req: IncomingMessage, res: ServerResponse) {
    if (req.headers.host !== new URL(config.origin).host) { res.writeHead(403); res.end('Invalid host'); return; }
    const url = new URL(req.url ?? '/', config.origin); const path = url.pathname;
    const json = (value: unknown, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (path.startsWith('/api/') || path.startsWith('/auth/')) {
      if (!allowed(req)) { json({ error: 'Too many requests. Try again in a minute.' }, 429); return; }
      if (!['GET', 'POST'].includes(req.method ?? '')) { json({ error: 'Method not allowed' }, 405); return; }
      if (req.method === 'POST' && req.headers.origin !== config.origin) { json({ error: 'Invalid request origin' }, 403); return; }
      if (req.method === 'GET' && path === '/api/health') { json({ ok: true, twitchConfigured: twitch.configured, version: '0.1.0' }); return; }
      if (req.method === 'GET' && path === '/api/snapshot') { json(store.public()); return; }
      if (req.method === 'GET' && path === '/api/me') {
        const s = session(req); json({ channelIds: s ? s.rehearsal ? ['rehearsal-a', 'rehearsal-b'] : [s.user] : [], mode: s ? s.rehearsal ? 'REHEARSAL' : 'LIVE' : null,
          csrf: s?.csrf ?? '', twitchConfigured: twitch.configured, connections: twitch.infos() }); return;
      }
      if (req.method === 'GET' && path === '/auth/twitch') {
        if (!twitch.configured) { res.writeHead(302, { Location: '/?notice=twitch-setup' }); res.end(); return; }
        const nonce = store.oauthCreate(); const query = new URLSearchParams({ client_id: config.clientId, redirect_uri: `${config.origin}/auth/callback`, response_type: 'code', scope: 'user:read:chat', state: nonce, force_verify: 'true' });
        res.writeHead(302, { Location: `https://id.twitch.tv/oauth2/authorize?${query}`, 'Set-Cookie': sendCookie('rv_oauth', nonce, 600) }); res.end(); return;
      }
      if (req.method === 'GET' && path === '/auth/callback') {
        const nonce = url.searchParams.get('state') ?? '';
        if (!nonce || !safeEqual(nonce, cookie(req, 'rv_oauth')) || !store.oauthConsume(nonce)) throw new Error('OAuth state expired or invalid');
        if (url.searchParams.has('error')) { res.writeHead(302, { Location: '/?notice=authorization-denied', 'Set-Cookie': sendCookie('rv_oauth', '', 0) }); res.end(); return; }
        const code = url.searchParams.get('code'); if (!code) throw new Error('Authorization code missing');
        const user = await twitch.exchange(code); store.logout(cookie(req, 'rv_session')); const next = store.createSession(user.id);
        res.writeHead(302, { Location: '/', 'Set-Cookie': [sendCookie('rv_session', next.token, 12 * 3600), sendCookie('rv_oauth', '', 0)] }); res.end(); return;
      }
      if (req.method === 'POST' && path === '/api/rehearsal/start') {
        if (!config.rehearsal) throw new Error('Rehearsal disabled on this server');
        domain.rehearsal(); store.logout(cookie(req, 'rv_session')); const next = store.createSession('rehearsal-operator', true);
        res.setHeader('Set-Cookie', sendCookie('rv_session', next.token, 12 * 3600)); json({ ok: true }); return;
      }
      if (req.method === 'POST' && path === '/api/logout') {
        requireSession(req); store.logout(cookie(req, 'rv_session')); res.setHeader('Set-Cookie', sendCookie('rv_session', '', 0)); json({ ok: true }); return;
      }
      const control = /^\/api\/control\/([^/]+)$/.exec(path);
      if (req.method === 'POST' && control) {
        const s = requireSession(req); own(s, control[1]); domain.action(control[1], actionSchema.parse(await body(req))); json({ ok: true }); return;
      }
      const overlay = /^\/api\/overlay\/([^/]+)$/.exec(path);
      if (req.method === 'GET' && overlay) {
        const id = overlay[1]; const c = store.read().channels.find(c => c.id === id);
        if (!c || !safeEqual(url.searchParams.get('key') ?? '', c.overlayKey)) { json({ error: 'Overlay access denied' }, 403); return; }
        json({ hidden: c.hidden || !c.enabled, artifactId: c.artifactId, channel: c.name }); return;
      }
      if (req.method === 'POST' && path === '/api/overlay-link') {
        const s = requireSession(req); const data = z.object({ channelId: z.string() }).parse(await body(req)); const c = own(s, data.channelId);
        json({ url: `${config.origin}/overlay/${c.id}#key=${c.overlayKey}` }); return;
      }
      if (req.method === 'POST' && path === '/api/reconnect') {
        const s = requireSession(req); if (s.rehearsal) throw new Error('Synthetic mode has no Twitch connection');
        await twitch.validate(s.user); twitch.connect(s.user); json({ ok: true }); return;
      }
      if (req.method === 'POST' && path === '/api/rehearsal/forge') {
        const s = requireSession(req); if (!s.rehearsal) throw new Error('Synthetic events require REHEARSAL mode');
        const d = z.object({ channelId: z.enum(['rehearsal-a', 'rehearsal-b']), element: z.enum(['light', 'fire', 'storm', 'crystal']), viewer: z.number().int().min(1).max(8) }).parse(await body(req));
        const accepted = domain.chat({ channelId: d.channelId, mode: 'REHEARSAL', userId: `synthetic-viewer-${d.viewer}`, userName: `Rehearsal viewer ${d.viewer}`, messageId: randomUUID(), at: Date.now(), text: `!forge ${d.element}`, moderator: false, shared: false });
        json({ accepted }); return;
      }
      if (req.method === 'POST' && path === '/api/rehearsal/raid') {
        const s = requireSession(req); if (!s.rehearsal) throw new Error('Synthetic events require REHEARSAL mode');
        const d = z.object({ from: z.enum(['rehearsal-a', 'rehearsal-b']), to: z.enum(['rehearsal-a', 'rehearsal-b']) }).parse(await body(req));
        json({ accepted: domain.raid({ ...d, eventId: randomUUID(), at: Date.now(), mode: 'REHEARSAL', viewers: 0 }) }); return;
      }
      json({ error: 'Not found' }, 404); return;
    }
    fallback(req, res);
  }
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', (req, socket, head) => {
    // Vite owns its HMR upgrade path in development. Never destroy its socket here.
    if (req.url !== '/socket') return;
    if (req.headers.host !== new URL(config.origin).host || req.headers.origin !== config.origin || clients.size >= 100) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => {
      clients.add(ws); ws.send(JSON.stringify({ type: 'snapshot', data: store.public() }));
      ws.on('message', () => ws.close(1008, 'Read-only connection')); ws.on('close', () => clients.delete(ws)); ws.on('error', () => clients.delete(ws));
    });
  });
  const timer = setInterval(() => { domain.expire(); const now = Date.now(); for (const [k, r] of rates) if (now - r.at > 60_000) rates.delete(k); }, 1000);
  return { server, domain, twitch, setFallback(fn: typeof fallback) { fallback = fn; }, async close() {
    clearInterval(timer); if (broadcastTimer) clearTimeout(broadcastTimer); twitch.stop();
    for (const ws of clients) ws.terminate(); wss.close(); await new Promise<void>(resolve => server.close(() => resolve()));
  } };
}
