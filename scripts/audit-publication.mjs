// Local-only publication audit. Never prints secret values or sends files to a service.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { createDecipheriv } from 'node:crypto';
import { resolve } from 'node:path';
const git = (...args) => execFileSync('git', args, { maxBuffer: 80 * 1024 * 1024 });
const secrets = [];
function remember(value, category) { if (typeof value === 'string' && value.length >= 12) secrets.push({ bytes: Buffer.from(value), category }); }
const env = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
for (const key of ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET']) remember(env[key], 'configured_application_credential');
const privateDir = resolve(env.DATA_DIR ?? './data');
if (existsSync(privateDir + '/raidverse.sqlite')) {
  const db = new DatabaseSync(privateDir + '/raidverse.sqlite', { readOnly: true });
  try {
    const state = JSON.parse(db.prepare('SELECT json FROM state WHERE id=1').get().json);
    for (const c of state.channels) remember(c.overlayKey, 'private_overlay_key');
    for (const row of db.prepare('SELECT json FROM sessions').all()) remember(JSON.parse(row.json).csrf, 'private_session_csrf');
    const vault = readFileSync(privateDir + '/vault.key');
    secrets.push({ bytes: vault, category: 'private_vault_key' });
    for (const row of db.prepare('SELECT encrypted FROM credentials').all()) {
      const bytes = Buffer.from(row.encrypted, 'base64');
      const d = createDecipheriv('aes-256-gcm', vault, bytes.subarray(0, 12)); d.setAuthTag(bytes.subarray(12, 28));
      const grant = JSON.parse(Buffer.concat([d.update(bytes.subarray(28)), d.final()]).toString());
      remember(grant.access, 'stored_oauth_token'); remember(grant.refresh, 'stored_oauth_token');
    }
  } finally { db.close(); }
}
const forbidden = p => /(^|\/)(?:\.env(?:\..*)?|data(?:-.*)?|\.local-backups|\.local-logs|node_modules|\.npm-cache|\.auth)(?:\/|$)|\.(?:sqlite(?:-wal|-shm)?|db|key|pem|p12|pfx|bak|backup|zip)$|storage[-_]?state.*\.json$/i.test(p) && p !== '.env.example';
const patterns = [
  ['github_token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g],
  ['github_fine_grained_token', /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g],
  ['private_key_material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['aws_access_key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['openai_key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g],
  ['literal_bearer_credential', /Bearer [A-Za-z0-9_-]{28,}/g],
  ['embedded_url_credentials', /https?:\/\/[^\s/@:]+:[^\s/@]{8,}@/g],
];
const findings = []; const historicalPaths = new Set(); let blobs = 0, commits = 0;
function scan(bytes, location) {
  for (const { bytes: needle, category } of secrets) if (bytes.includes(needle)) findings.push({ ...location, rule: category });
  const text = bytes.toString('utf8');
  for (const [rule, pattern] of patterns) { pattern.lastIndex = 0; if (pattern.test(text)) findings.push({ ...location, rule }); }
  for (const line of text.split(/\r?\n/)) if (/^TWITCH_CLIENT_(?:ID|SECRET)=\S+/.test(line)) findings.push({ ...location, rule: 'nonempty_env_assignment' });
}
const objects = git('rev-list', '--objects', '--all', '--reflog').toString().trim().split('\n');
for (const line of objects) {
  const split = line.indexOf(' '), id = split < 0 ? line : line.slice(0, split), path = split < 0 ? '' : line.slice(split + 1);
  const type = git('cat-file', '-t', id).toString().trim();
  if (type === 'blob') { blobs++; if (path && forbidden(path)) historicalPaths.add(path); scan(git('cat-file', 'blob', id), { scope: 'history', object: id, path }); }
  if (type === 'commit' || type === 'tag') {
    commits++; scan(git('cat-file', '-p', id), { scope: 'history_metadata', object: id });
    if (type === 'commit') for (const p of git('ls-tree', '-r', '--name-only', id).toString().trim().split('\n')) if (forbidden(p)) historicalPaths.add(p);
  }
}
const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').toString().split('\0').filter(Boolean);
for (const path of files) { if (forbidden(path)) findings.push({ scope: 'worktree', path, rule: 'forbidden_file' }); scan(readFileSync(path), { scope: 'worktree', path }); }
const example = parseEnv(readFileSync('.env.example', 'utf8'));
const exampleBlank = !example.TWITCH_CLIENT_ID && !example.TWITCH_CLIENT_SECRET;
const result = { auditedAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD').toString().trim(), scope: 'All Git refs/reflogs, commit metadata and nonignored delivery files', blobs, commits, worktreeFiles: files.length, historicalForbiddenPaths: [...historicalPaths], findings, envExampleCredentialsBlank: exampleBlank,
  safe: findings.length === 0 && historicalPaths.size === 0 && exampleBlank,
  limitations: ['Local pattern and configured-secret scan; not a guarantee against every possible secret format.', 'Binary content scanned for literal known secrets; compressed image pixels are not OCR-scanned. Historical screenshots predate genuine OAuth; current LIVE legacy screenshots were visually inspected.', 'Ignored private runtime data is used in memory only to detect accidental publication; it is not exported.'] };
mkdirSync('.local-logs', { recursive: true }); writeFileSync('.local-logs/publication-audit.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2)); if (!result.safe) process.exitCode = 1;
