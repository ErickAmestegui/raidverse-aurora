import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Domain, actionSchema, appearance, parseForge } from '../server/domain';
import { Store } from '../server/store';
import type { Mode } from '../src/shared';

let store: Store, domain: Domain, dir: string, now: number, event: number;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'raidverse-test-')); store = new Store(dir); now = 1_800_000_000_000; event = 0;
  domain = new Domain(store, () => {}, () => now);
  for (const id of ['a', 'b', 'c']) { domain.register(id, id, id.toUpperCase(), 'LIVE'); domain.action(id, { type: 'settings', enabled: true, incoming: true, allowMods: false }); }
});
afterEach(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
const artifact = () => store.read().artifacts[0];
function create() { domain.action('a', { type: 'create', name: 'Aether' }); domain.action('a', { type: 'start' }); }
function chat(extra: Partial<Parameters<Domain['chat']>[0]> = {}) {
  return domain.chat({ channelId: 'a', userId: 'viewer', userName: 'Viewer', text: '!forge light', messageId: `m-${event++}`, at: now, mode: 'LIVE', moderator: false, shared: false, ...extra });
}
function prepare() { create(); domain.action('a', { type: 'stop' }); domain.action('a', { type: 'prepare', target: 'b' }); return store.read().transfers[0]; }
function raid(mode: Mode = 'LIVE', extra: Partial<Parameters<Domain['raid']>[0]> = {}) { return domain.raid({ from: 'a', to: 'b', at: now, viewers: 12, eventId: 'raid-1', mode, ...extra }); }
describe('strict and deterministic forging', () => {
  it('accepts only the four complete commands', () => {
    for (const element of ['light', 'fire', 'storm', 'crystal']) expect(parseForge(`!forge ${element}`)).toBe(element);
    for (const text of ['!forge http://x', '!forge fire; shutdown', '!forge fire extra', '!forge\nfire', '<script>', '!forge']) expect(parseForge(text)).toBeNull();
  });
  it('uses immutable counts for reproducible appearance independent of order', () => {
    const e = { light: 4, fire: 3, storm: 2, crystal: 5 }; expect(appearance(e)).toEqual(appearance({ crystal: 5, storm: 2, fire: 3, light: 4 }));
    create(); expect(chat()).toBe(true); expect(artifact().energy.light).toBe(1); expect(artifact().history.at(-1)).toMatchObject({ evidence: 'TWITCH', userId: 'viewer', eventId: 'm-0', round: 1 });
  });
  it('accepts the broadcaster and unregistered viewers through the same LIVE rules', () => {
    create();
    expect(chat({ userId: 'a', userName: 'Broadcaster', messageId: 'broadcaster-message' })).toBe(true);
    expect(chat({ userId: 'unregistered-viewer', messageId: 'viewer-message', text: '!forge fire' })).toBe(true);
    expect(store.read().channels.some(c => c.id === 'unregistered-viewer')).toBe(false);
    expect(artifact().energy).toEqual({ light: 1, fire: 1, storm: 0, crystal: 0 });
    expect(artifact().history.filter(h => h.kind === 'CONTRIBUTION').map(h => h.eventId)).toEqual(['broadcaster-message', 'viewer-message']);
  });
  it('credits only the command sent after artifact creation and round opening', () => {
    expect(chat({ userId: 'a', messageId: 'before-artifact' })).toBe(false);
    domain.action('a', { type: 'create', name: 'Aether' });
    expect(chat({ userId: 'a', messageId: 'before-round' })).toBe(false);
    domain.action('a', { type: 'start' });
    expect(chat({ userId: 'a', messageId: 'during-round' })).toBe(true);
    expect(artifact().energy.light).toBe(1);
    expect(artifact().history.filter(h => h.kind === 'CONTRIBUTION').map(h => h.eventId)).toEqual(['during-round']);
  });
  it('does not replay broadcaster or viewer commands rejected during a closed round', () => {
    create(); domain.action('a', { type: 'stop' });
    for (const userId of ['a', 'new-viewer']) expect(chat({ userId, messageId: `closed-${userId}` })).toBe(false);
    domain.action('a', { type: 'start' }); now += 11_000;
    for (const userId of ['a', 'new-viewer']) expect(chat({ userId, messageId: `closed-${userId}` })).toBe(false);
    expect(chat({ userId: 'a', messageId: 'fresh-owner' })).toBe(true);
    expect(chat({ userId: 'new-viewer', messageId: 'fresh-viewer' })).toBe(true);
    expect(artifact().energy.light).toBe(2);
  });
  it('preserves cooldown, deduplication and round limits for the broadcaster', () => {
    create(); expect(chat({ userId: 'a', messageId: 'owner-first' })).toBe(true);
    expect(chat({ userId: 'a', messageId: 'owner-second' })).toBe(false);
    expect(chat({ userId: 'a', messageId: 'owner-third' })).toBe(false);
    expect(artifact().energy.light).toBe(1);
    now += 10_000; expect(chat({ userId: 'a', messageId: 'owner-first' })).toBe(false);
    expect(chat({ userId: 'a' })).toBe(true); now += 10_000; expect(chat({ userId: 'a' })).toBe(true);
    now += 10_000; expect(chat({ userId: 'a' })).toBe(false);
    expect(artifact().energy.light).toBe(3);
  });
  it('enforces cooldown and per-round contribution limits', () => {
    create(); expect(chat()).toBe(true); expect(chat()).toBe(false);
    now += 10_000; expect(chat()).toBe(true); now += 10_000; expect(chat()).toBe(true); now += 10_000; expect(chat()).toBe(false);
    domain.action('a', { type: 'stop' }); domain.action('a', { type: 'start' }); expect(chat()).toBe(true); expect(artifact().energy.light).toBe(4);
  });
  it('deduplicates messages durably across a restart', () => {
    create(); expect(chat({ messageId: 'same' })).toBe(true); store.close(); store = new Store(dir); domain = new Domain(store, () => {}, () => now);
    now += 11_000; expect(chat({ messageId: 'same', at: now })).toBe(false); expect(artifact().energy.light).toBe(1);
  });
  it('rejects closed, disabled, stale, shared and wrong-mode input', () => {
    create(); expect(chat({ at: now - 121000 })).toBe(false); expect(chat({ shared: true })).toBe(false); expect(chat({ mode: 'REHEARSAL' })).toBe(false);
    domain.action('a', { type: 'stop' }); expect(chat()).toBe(false); domain.action('a', { type: 'start' });
    domain.action('a', { type: 'settings', enabled: false, incoming: true, allowMods: false }); expect(chat()).toBe(false);
  });
  it('limits burst participation to 20 accepted contributions per second', () => {
    create(); let accepted = 0; for (let i = 0; i < 30; i++) if (chat({ userId: `v-${i}` })) accepted++;
    expect(accepted).toBe(20); expect(artifact().energy.light).toBe(20);
  });
  it('accepts moderator safety controls only with server-verified authorization', () => {
    create(); expect(chat({ text: '!rv clear', moderator: true })).toBe(false);
    domain.action('a', { type: 'settings', enabled: true, incoming: true, allowMods: true });
    expect(chat({ text: '!rv clear', moderator: true })).toBe(true); expect(store.read().channels[0].hidden).toBe(true);
    expect(chat({ text: '!rv pause', moderator: true })).toBe(true); expect(chat()).toBe(false);
    expect(chat({ text: '!rv resume', moderator: false })).toBe(false);
  });
});
describe('raid-gated transfer', () => {
  it('preserves identity, energy, contributions and communities on acceptance', () => {
    create(); chat(); const before = artifact(); domain.action('a', { type: 'stop' }); domain.action('a', { type: 'prepare', target: 'b' });
    expect(raid()).toBe(true); const t = store.read().transfers[0]; expect(artifact().ownerId).toBe('a');
    domain.action('b', { type: 'accept', transferId: t.id }); const after = artifact();
    expect(after.id).toBe(before.id); expect(after.seed).toBe(before.seed); expect(after.energy).toEqual(before.energy);
    expect(after.ownerId).toBe('b'); expect(after.communities).toEqual(['a', 'b']); expect(store.read().channels[0].artifactId).toBeNull();
    expect(after.history.map(h => h.kind)).toEqual(expect.arrayContaining(['RAID_DETECTED', 'PENDING_APPROVAL', 'ACCEPTED', 'TRANSFERRED', 'ARRIVAL']));
    domain.action('b', { type: 'start' }); expect(artifact().phase).toBe('EVOLVING'); expect(chat({ channelId: 'b', text: '!forge fire' })).toBe(true); expect(artifact().energy.fire).toBe(1);
  });
  it('cannot accept before a raid or from a different receiver', () => {
    const t = prepare(); expect(() => domain.action('b', { type: 'accept', transferId: t.id })).toThrow();
    raid(); expect(() => domain.action('c', { type: 'accept', transferId: t.id })).toThrow(); expect(artifact().ownerId).toBe('a');
  });
  it('does not accept wrong destination, old or synthetic raids for a live transfer', () => {
    prepare(); expect(raid('REHEARSAL')).toBe(false); expect(raid('LIVE', { to: 'c', eventId: 'wrong' })).toBe(false);
    expect(raid('LIVE', { at: now - 1, eventId: 'old' })).toBe(false); expect(store.read().transfers[0].status).toBe('PREPARED');
  });
  it('deduplicates raids and prevents repeated acceptance', () => {
    const t = prepare(); expect(raid()).toBe(true); expect(raid()).toBe(false); domain.action('b', { type: 'accept', transferId: t.id });
    expect(() => domain.action('b', { type: 'accept', transferId: t.id })).toThrow(); expect(artifact().history.filter(h => h.kind === 'ARRIVAL')).toHaveLength(1);
  });
  it('rejects without losing the origin artifact', () => {
    const t = prepare(); raid(); domain.action('b', { type: 'reject', transferId: t.id }); expect(artifact()).toMatchObject({ ownerId: 'a', phase: 'READY' }); expect(store.read().transfers[0].status).toBe('REJECTED');
  });
  it('expires a transfer after a restart and forbids late acceptance', () => {
    const t = prepare(); raid(); store.close(); store = new Store(dir); now += 601_000; domain = new Domain(store, () => {}, () => now);
    expect(() => domain.action('b', { type: 'accept', transferId: t.id })).toThrow(); expect(store.read().transfers[0].status).toBe('EXPIRED'); expect(artifact().ownerId).toBe('a');
  });
  it('cancels on blocked receiving settings', () => {
    const t = prepare(); raid(); domain.action('b', { type: 'settings', enabled: true, incoming: false, allowMods: false });
    expect(store.read().transfers[0].status).toBe('CANCELLED'); expect(() => domain.action('b', { type: 'accept', transferId: t.id })).toThrow();
  });
  it('does not overwrite a receiver artifact', () => {
    const t = prepare(); domain.action('b', { type: 'create', name: 'Existing creation' }); raid();
    expect(() => domain.action('b', { type: 'accept', transferId: t.id })).toThrow('Archive'); expect(store.read().artifacts).toHaveLength(2);
  });
  it('forbids cross-mode destinations and simultaneous transfers', () => {
    prepare(); expect(() => domain.action('a', { type: 'prepare', target: 'c' })).toThrow();
    domain.rehearsal(); expect(() => domain.action('a', { type: 'prepare', target: 'rehearsal-a' })).toThrow();
  });
});
describe('storage and control protection', () => {
  it('renames the current artifact without changing a live round, energy or earlier history, and persists it', () => {
    create(); chat(); const before = artifact();
    domain.action('a', { type: 'rename', name: '  Aurora prism  ' });
    const renamed = artifact();
    expect(renamed).toMatchObject({ id: before.id, seed: before.seed, name: 'Aurora prism', phase: before.phase, round: before.round, ownerId: before.ownerId, energy: before.energy, communities: before.communities });
    expect(renamed.history.slice(0, -1)).toEqual(before.history);
    expect(renamed.history.at(-1)).toMatchObject({ kind: 'RENAMED', evidence: 'CONTROL', channelId: 'a', label: 'Renamed from Aether to Aurora prism' });
    expect(renamed.version).toBe(before.version + 1);
    store.close(); store = new Store(dir); domain = new Domain(store, () => {}, () => now);
    expect(artifact()).toEqual(renamed);
  });
  it('validates artifact names and does not duplicate a no-op rename', () => {
    create(); const before = artifact();
    domain.action('a', { type: 'rename', name: 'Aether' });
    expect(artifact()).toEqual(before);
    for (const name of ['', '  ', 'x'.repeat(49), 'Aurora\nprism', 'Aurora\u0000prism']) {
      expect(actionSchema.safeParse({ type: 'rename', name }).success).toBe(false);
      expect(() => domain.action('a', { type: 'rename', name })).toThrow();
      expect(artifact()).toEqual(before);
    }
    expect(actionSchema.parse({ type: 'rename', name: '  Aether ✨  ' })).toEqual({ type: 'rename', name: 'Aether ✨' });
  });
  it('freezes the name during a transfer and moves rename control to the accepted receiver', () => {
    const t = prepare(); const before = artifact();
    expect(() => domain.action('a', { type: 'rename', name: 'Changed invitation' })).toThrow('transfer');
    expect(artifact()).toEqual(before); raid();
    expect(() => domain.action('a', { type: 'rename', name: 'Changed pending invitation' })).toThrow('transfer');
    expect(() => domain.action('b', { type: 'rename', name: 'Not accepted yet' })).toThrow('No active artifact');
    domain.action('b', { type: 'accept', transferId: t.id });
    expect(() => domain.action('a', { type: 'rename', name: 'Previous owner' })).toThrow('No active artifact');
    domain.action('b', { type: 'rename', name: 'NOVA Aurora' });
    expect(artifact()).toMatchObject({ id: before.id, seed: before.seed, name: 'NOVA Aurora', ownerId: 'b' });
    expect(artifact().history.at(-1)).toMatchObject({ kind: 'RENAMED', channelId: 'b' });
  });
  it('encrypts credentials and revokes sessions', () => {
    const creds = { access: 'private-access-secret', refresh: 'private-refresh-secret', expiresAt: now }; store.putCredentials('a', creds);
    expect(store.credentials('a')).toEqual(creds); const encrypted = store.db.prepare('SELECT encrypted FROM credentials').get() as { encrypted: string };
    expect(encrypted.encrypted).not.toContain(creds.access); const s = store.createSession('a'); expect(store.session(s.token)?.user).toBe('a'); store.revoke('a'); expect(store.session(s.token)).toBeNull(); expect(store.credentials('a')).toBeNull();
  });
  it('hides overlay viewing keys from public state', () => { expect(store.public().channels[0]).not.toHaveProperty('overlayKey'); expect(store.read().channels[0].overlayKey.length).toBeGreaterThan(30); });
  it('uses OAuth nonces once', () => { const nonce = store.oauthCreate(); expect(store.oauthConsume(nonce)).toBe(true); expect(store.oauthConsume(nonce)).toBe(false); expect(store.oauthConsume('forged')).toBe(false); });
  it('archives without deleting identity or history and rotates viewing key', () => { create(); const before = store.read().channels[0].overlayKey; domain.action('a', { type: 'rotate-overlay' }); expect(store.read().channels[0].overlayKey).not.toBe(before); domain.action('a', { type: 'archive' }); expect(artifact().name).toBe('Aether'); expect(store.read().channels[0].artifactId).toBeNull(); });
});
