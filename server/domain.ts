import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Artifact, Channel, Element, History, Mode, Phase } from '../src/shared.js';
import { activeTransfer, current, secret, Store, type State } from './store.js';

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), name: z.string().trim().min(1).max(48) }),
  z.object({ type: z.enum(['start', 'stop', 'clear', 'reveal', 'archive', 'rotate-overlay']) }),
  z.object({ type: z.literal('settings'), enabled: z.boolean(), incoming: z.boolean(), allowMods: z.boolean() }),
  z.object({ type: z.literal('prepare'), target: z.string().min(1).max(80) }),
  z.object({ type: z.enum(['accept', 'reject', 'cancel']), transferId: z.string().uuid() }),
]);
export type Action = z.infer<typeof actionSchema>;
const elements = ['light', 'fire', 'storm', 'crystal'] as const;
export function parseForge(text: string): Element | null {
  const match = /^!forge (light|fire|storm|crystal)$/i.exec(text.trim());
  return match ? match[1].toLowerCase() as Element : null;
}
export function appearance(energy: Record<Element, number>) {
  const total = Object.values(energy).reduce((a, b) => a + b, 0);
  const dominant = [...elements].sort((a, b) => energy[b] - energy[a])[0];
  return { total, dominant, radius: 1 + Math.log2(1 + total) * .045, facets: 1 + Math.floor(Math.log2(1 + energy.crystal)),
    luminosity: .7 + Math.min(energy.light, 40) / 40, turbulence: Math.min(energy.storm, 40) / 40, heat: Math.min(energy.fire, 40) / 40 };
}
function record(a: Artifact, now: number, kind: string, channelId: string, label: string, evidence: History['evidence'] = 'CONTROL', extra: Partial<History> = {}) {
  a.history.push({ id: randomUUID(), at: now, kind, channelId, label, evidence, ...extra }); a.version++;
}
function phase(a: Artifact, p: Phase, now: number, channel: string, evidence: History['evidence']) {
  a.phase = p; record(a, now, p, channel, p.replaceAll('_', ' '), evidence);
}
export class Domain {
  constructor(public store: Store, public changed: () => void = () => {}, public clock = () => Date.now()) {}
  register(id: string, login: string, name: string, mode: Mode) {
    this.store.transaction(s => {
      const c = s.channels.find(c => c.id === id);
      if (c) { if (c.mode !== mode) throw new Error('Mode mismatch'); c.login = login; c.name = name; return; }
      s.channels.push({ id, login, name, mode, enabled: false, incoming: false, allowMods: false, hidden: false, artifactId: null, overlayKey: secret() });
    }); this.changed();
  }
  rehearsal() {
    for (const [id, name] of [['rehearsal-a', 'ORBITAL'], ['rehearsal-b', 'NOVA']]) {
      if (!this.store.read().channels.some(c => c.id === id)) this.register(id, id, name, 'REHEARSAL');
    }
  }
  expire() {
    const now = this.clock();
    if (!this.store.read().transfers.some(t => activeTransfer(t) && t.expiresAt <= now)) return;
    this.store.transaction(s => {
      for (const t of s.transfers.filter(t => activeTransfer(t) && t.expiresAt <= now)) {
        t.status = 'EXPIRED'; const a = s.artifacts.find(a => a.id === t.artifactId)!;
        phase(a, 'READY', now, t.from, 'CONTROL'); record(a, now, 'EXPIRED', t.from, 'Transfer invitation expired');
      }
    }); this.changed();
  }
  action(channelId: string, input: Action) {
    this.expire(); const now = this.clock();
    this.store.transaction(s => {
      const c = s.channels.find(c => c.id === channelId);
      if (!c) throw new Error('Unknown channel');
      const pending = () => s.transfers.some(t => t.from === c.id && activeTransfer(t));
      if (input.type === 'settings') {
        Object.assign(c, { enabled: input.enabled, incoming: input.incoming, allowMods: input.allowMods });
        // Turning off freezes forging and cancels invitations involving this channel.
        if (!c.enabled || !c.incoming) for (const t of s.transfers.filter(t => activeTransfer(t) && ((!c.enabled && t.from === c.id) || t.to === c.id))) {
          t.status = 'CANCELLED'; const a = s.artifacts.find(a => a.id === t.artifactId)!;
          phase(a, 'READY', now, t.from, 'CONTROL'); record(a, now, 'CANCELLED', c.id, 'Transfer cancelled by channel safety settings');
        }
        return;
      }
      if (input.type === 'rotate-overlay') { c.overlayKey = secret(); return; }
      if (input.type === 'clear') { c.hidden = true; return; }
      if (input.type === 'reveal') { c.hidden = false; return; }
      if (input.type === 'accept' || input.type === 'reject' || input.type === 'cancel') {
        const t = s.transfers.find(t => t.id === input.transferId);
        if (!t || !activeTransfer(t) || t.mode !== c.mode) throw new Error('No active invitation');
        if (input.type === 'cancel' ? t.from !== c.id : t.to !== c.id) throw new Error('This invitation belongs to another channel');
        const a = s.artifacts.find(a => a.id === t.artifactId)!;
        if (input.type === 'accept') {
          const from = s.channels.find(ch => ch.id === t.from)!;
          if (t.status !== 'PENDING_APPROVAL' || !t.raidEventId || !c.enabled || !c.incoming || !from.enabled) throw new Error('Verified raid and enabled receiving channel required');
          if (c.artifactId) throw new Error('Archive the current artifact before accepting another');
          if (from.artifactId !== a.id || a.ownerId !== from.id) throw new Error('Artifact ownership changed');
          const evidence = c.mode === 'LIVE' ? 'TWITCH' : 'SYNTHETIC';
          phase(a, 'ACCEPTED', now, c.id, 'CONTROL');
          from.artifactId = null; c.artifactId = a.id; c.hidden = false; a.ownerId = c.id;
          if (!a.communities.includes(c.id)) a.communities.push(c.id);
          t.status = 'TRANSFERRED'; phase(a, 'TRANSFERRED', now, c.id, evidence);
          record(a, now, 'ARRIVAL', c.id, `Arrived from ${from.name}`, evidence, { eventId: t.raidEventId });
        } else {
          t.status = input.type === 'cancel' ? 'CANCELLED' : 'REJECTED'; phase(a, 'READY', now, t.from, 'CONTROL');
          record(a, now, t.status, c.id, `Invitation ${t.status.toLowerCase()}`);
        }
        return;
      }
      if (input.type === 'create') {
        if (!c.enabled) throw new Error('Enable RAIDVERSE first');
        if (c.artifactId) throw new Error('Archive the current artifact first');
        if (s.artifacts.filter(a => a.ownerId === c.id).length >= 100) throw new Error('Local artifact limit reached');
        const a: Artifact = { id: randomUUID(), name: input.name, seed: randomInt(1, 1_000_000), mode: c.mode, ownerId: c.id, phase: 'CREATED', round: 0,
          energy: { light: 0, fire: 0, storm: 0, crystal: 0 }, history: [], communities: [c.id], createdAt: now, version: 1 };
        record(a, now, 'CREATED', c.id, `Forged into existence at ${c.name}`, c.mode === 'REHEARSAL' ? 'SYNTHETIC' : 'CONTROL');
        s.artifacts.push(a); c.artifactId = a.id; c.hidden = false; return;
      }
      const a = current(s, c);
      if (input.type === 'archive') {
        if (pending()) throw new Error('Cancel the outgoing invitation first');
        c.artifactId = null; record(a, now, 'ARCHIVED', c.id, 'Preserved in the legacy archive'); a.phase = 'READY'; return;
      }
      if (!c.enabled) throw new Error('RAIDVERSE is disabled');
      if (input.type === 'start') {
        if (pending() || ['FORGING', 'EVOLVING'].includes(a.phase)) throw new Error('End the current round or transfer first');
        a.round++; phase(a, a.communities.length > 1 ? 'EVOLVING' : 'FORGING', now, c.id, 'CONTROL');
      } else if (input.type === 'stop') {
        if (!['FORGING', 'EVOLVING'].includes(a.phase)) throw new Error('No open round');
        phase(a, 'READY', now, c.id, 'CONTROL');
      } else if (input.type === 'prepare') {
        const to = s.channels.find(ch => ch.id === input.target && ch.mode === c.mode);
        if (!to || to.id === c.id || !to.enabled || !to.incoming) throw new Error('Receiver must be registered, enabled and accepting transfers in the same mode');
        if (a.phase !== 'READY' || pending()) throw new Error('Close the round before preparing a new transfer');
        const id = randomUUID(); s.transfers.push({ id, from: c.id, to: to.id, artifactId: a.id, mode: c.mode, status: 'PREPARED', createdAt: now, expiresAt: now + 10 * 60_000 });
        record(a, now, 'PREPARED', c.id, `Transfer prepared for ${to.name}`);
      }
    }); this.changed();
  }
  chat(input: { channelId: string; userId: string; userName: string; text: string; messageId: string; at: number; mode: Mode; moderator: boolean; shared: boolean }) {
    if (input.shared || Math.abs(this.clock() - input.at) > 120_000) return false;
    const element = parseForge(input.text);
    const control = /^!rv (pause|resume|clear)$/i.exec(input.text.trim());
    if (!element && !control) return false;
    const result = this.store.transaction(s => {
      const c = s.channels.find(c => c.id === input.channelId && c.mode === input.mode);
      if (!c) return false;
      if (control) {
        if (input.userId !== c.id && !(c.allowMods && input.moderator)) return false;
        const cmd = control[1].toLowerCase();
        if (cmd === 'clear') c.hidden = true;
        else if (cmd === 'pause') c.enabled = false;
        else c.enabled = true;
        return true;
      }
      if (!c.enabled || !c.artifactId) return false;
      const a = current(s, c);
      if (!['FORGING', 'EVOLVING'].includes(a.phase) || a.history.length >= 20_000) return false;
      const all = a.history.filter(h => h.kind === 'CONTRIBUTION');
      const user = all.filter(h => h.userId === input.userId && h.channelId === c.id);
      if (user.filter(h => h.round === a.round).length >= 3 || user.some(h => input.at - h.at < 10_000)) return false;
      if (all.filter(h => h.at > input.at - 1000).length >= 20) return false;
      a.energy[element!]++;
      record(a, input.at, 'CONTRIBUTION', c.id, `${input.userName} forged ${element}`, c.mode === 'LIVE' ? 'TWITCH' : 'SYNTHETIC',
        { userId: input.userId, userName: input.userName.slice(0, 64), element: element!, eventId: input.messageId, round: a.round });
      return true;
    }, `${input.mode}:chat:${input.messageId}`);
    if (result) this.changed(); return Boolean(result);
  }
  raid(input: { from: string; to: string; eventId: string; viewers: number; at: number; mode: Mode }) {
    this.expire();
    if (Math.abs(this.clock() - input.at) > 120_000) return false;
    const result = this.store.transaction(s => {
      const from = s.channels.find(c => c.id === input.from && c.mode === input.mode);
      const to = s.channels.find(c => c.id === input.to && c.mode === input.mode);
      if (!from?.enabled || !to?.enabled || !to.incoming) return false;
      const t = s.transfers.find(t => t.from === input.from && t.to === input.to && t.mode === input.mode && t.status === 'PREPARED' && input.at >= t.createdAt && input.at < t.expiresAt);
      if (!t) return false;
      const a = current(s, from);
      if (a.id !== t.artifactId) return false;
      const evidence = input.mode === 'LIVE' ? 'TWITCH' : 'SYNTHETIC';
      t.raidEventId = input.eventId; t.viewers = input.viewers; t.status = 'PENDING_APPROVAL';
      phase(a, 'RAID_DETECTED', input.at, from.id, evidence); phase(a, 'PENDING_APPROVAL', input.at, to.id, evidence);
      record(a, input.at, 'RAID', from.id, `Raid detected: ${from.name} → ${to.name}`, evidence, { eventId: input.eventId });
      return true;
    }, `${input.mode}:raid:${input.eventId}`);
    if (result) this.changed(); return Boolean(result);
  }
}
