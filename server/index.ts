import { existsSync, readFileSync, createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { parseEnv } from 'node:util';
import { Store } from './store.js';
import { createApp } from './app.js';

if (existsSync('.env')) for (const [k, v] of Object.entries(parseEnv(readFileSync('.env', 'utf8')))) if (process.env[k] === undefined) process.env[k] = v;
const port = Number(process.env.PORT ?? 3000); if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const origin = process.env.APP_ORIGIN ?? `http://localhost:${port}`;
if (new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an origin without a trailing slash');
const secureCookies = process.env.SECURE_COOKIES === 'true';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname) && (!secureCookies || !origin.startsWith('https://'))) throw new Error('Remote hosting requires HTTPS and SECURE_COOKIES=true');
const store = new Store(resolve(process.env.DATA_DIR ?? './data'));
const app = createApp(store, { origin, clientId: process.env.TWITCH_CLIENT_ID ?? '', clientSecret: process.env.TWITCH_CLIENT_SECRET ?? '', secureCookies, rehearsal: process.env.ENABLE_REHEARSAL !== 'false' });
const production = process.argv.includes('--production');
let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | undefined;
if (!production) {
  vite = await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: { server: app.server } }, appType: 'spa' });
  app.setFallback((req, res) => vite!.middlewares(req, res));
} else {
  app.server.on('upgrade', (req, socket) => { if (req.url !== '/socket') socket.destroy(); });
  const root = resolve('dist'); if (!existsSync(resolve(root, 'index.html'))) throw new Error('Run npm run build before npm start');
  const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  app.setFallback((req, res) => {
    let path: string; try { path = resolve(root, '.' + decodeURIComponent(new URL(req.url ?? '/', origin).pathname)); } catch { res.writeHead(400); res.end(); return; }
    if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) path = resolve(root, 'index.html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); createReadStream(path).pipe(res);
  });
}
app.server.listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`RAIDVERSE ${production ? 'production' : 'development'} • ${origin} • Twitch ${app.twitch.configured ? 'configured, awaiting authorization' : 'NOT configured'} • rehearsal is synthetic`));
void app.twitch.start();
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { if (closing) return; closing = true; await vite?.close(); await app.close(); store.close(); process.exit(0); });
