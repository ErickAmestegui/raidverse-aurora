import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Artifact, Channel, Snapshot, Transfer } from '../src/shared.js';

export const secret = () => randomBytes(32).toString('base64url');
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export interface State extends Snapshot { channels: (Channel & { overlayKey: string })[] }
export interface Credentials { access: string; refresh: string; expiresAt: number }
export interface Session { user: string; rehearsal: boolean; csrf: string; expires: number }

export class Store {
  db: DatabaseSync;
  private key: Buffer;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true });
    const keyPath = join(directory, 'vault.key');
    if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: 'wx' });
    this.key = readFileSync(keyPath);
    if (this.key.length !== 32) throw new Error('Invalid vault key. Restore the original key; do not replace it.');
    this.db = new DatabaseSync(join(directory, 'raidverse.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS credentials(user TEXT PRIMARY KEY, encrypted TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ingress(id TEXT PRIMARY KEY, at INTEGER NOT NULL);`);
    this.db.prepare('INSERT OR IGNORE INTO state VALUES (1, ?)').run(JSON.stringify({ revision: 0, channels: [], artifacts: [], transfers: [] }));
  }
  read(): State { return JSON.parse((this.db.prepare('SELECT json FROM state WHERE id=1').get() as { json: string }).json); }
  transaction<T>(fn: (state: State) => T, ingressId?: string): T | null {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (ingressId && this.db.prepare('SELECT id FROM ingress WHERE id=?').get(ingressId)) { this.db.exec('ROLLBACK'); return null; }
      const state = this.read();
      const value = fn(state);
      state.revision++;
      this.db.prepare('UPDATE state SET json=? WHERE id=1').run(JSON.stringify(state));
      if (ingressId) this.db.prepare('INSERT INTO ingress VALUES (?, ?)').run(ingressId, Date.now());
      this.db.exec('COMMIT');
      return value;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  public(): Snapshot {
    const state = this.read();
    return { ...state, channels: state.channels.map(({ overlayKey, ...channel }) => channel) };
  }
  putCredentials(user: string, value: Credentials) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    const encrypted = Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64');
    this.db.prepare('INSERT OR REPLACE INTO credentials VALUES (?, ?)').run(user, encrypted);
  }
  credentials(user: string): Credentials | null {
    const row = this.db.prepare('SELECT encrypted FROM credentials WHERE user=?').get(user) as { encrypted: string } | undefined;
    if (!row) return null;
    const bytes = Buffer.from(row.encrypted, 'base64'); const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  }
  revoke(user: string) {
    this.db.prepare('DELETE FROM credentials WHERE user=?').run(user);
    const rows = this.db.prepare('SELECT hash, json FROM sessions').all() as { hash: string; json: string }[];
    for (const row of rows) if (JSON.parse(row.json).user === user) this.db.prepare('DELETE FROM sessions WHERE hash=?').run(row.hash);
  }
  createSession(user: string, rehearsal = false) {
    const token = secret(); const session = { user, rehearsal, csrf: secret(), expires: Date.now() + 12 * 3600_000 };
    this.db.prepare('INSERT INTO sessions VALUES (?, ?)').run(hash(token), JSON.stringify(session));
    return { token, session };
  }
  session(token: string): Session | null {
    const row = this.db.prepare('SELECT json FROM sessions WHERE hash=?').get(hash(token)) as { json: string } | undefined;
    if (!row) return null;
    const session: Session = JSON.parse(row.json);
    return session.expires > Date.now() ? session : null;
  }
  logout(token: string) { this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(token)); }
  oauthCreate() {
    const nonce = secret(); this.db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());
    this.db.prepare('INSERT INTO oauth VALUES (?, ?)').run(hash(nonce), Date.now() + 600_000); return nonce;
  }
  oauthConsume(nonce: string) {
    const row = this.db.prepare('DELETE FROM oauth WHERE hash=? AND expires>? RETURNING hash').get(hash(nonce), Date.now());
    return Boolean(row);
  }
  close() { this.db.close(); }
}
export function current(state: State, channel: Channel): Artifact {
  const artifact = state.artifacts.find(a => a.id === channel.artifactId);
  if (!artifact || artifact.ownerId !== channel.id) throw new Error('No active artifact in this channel.');
  return artifact;
}
export const activeTransfer = (t: Transfer) => t.status === 'PREPARED' || t.status === 'PENDING_APPROVAL';
