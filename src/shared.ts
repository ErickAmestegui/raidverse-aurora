export type Mode = 'LIVE' | 'REHEARSAL';
export type Element = 'light' | 'fire' | 'storm' | 'crystal';
export type Phase = 'CREATED' | 'FORGING' | 'READY' | 'RAID_DETECTED' | 'PENDING_APPROVAL' | 'ACCEPTED' | 'TRANSFERRED' | 'EVOLVING';
export interface History {
  id: string; at: number; kind: string; channelId: string; label: string;
  evidence: 'TWITCH' | 'SYNTHETIC' | 'CONTROL'; userId?: string; userName?: string; element?: Element; eventId?: string; round?: number;
}
export interface Artifact {
  id: string; name: string; mode: Mode; seed: number; ownerId: string; phase: Phase; round: number;
  energy: Record<Element, number>; history: History[]; communities: string[]; createdAt: number; version: number;
}
export interface Channel {
  id: string; login: string; name: string; mode: Mode; enabled: boolean; incoming: boolean; allowMods: boolean;
  hidden: boolean; artifactId: string | null; overlayKey?: string;
}
export interface Transfer {
  id: string; artifactId: string; from: string; to: string; mode: Mode;
  status: 'PREPARED' | 'PENDING_APPROVAL' | 'TRANSFERRED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number; expiresAt: number; raidEventId?: string; viewers?: number;
}
export interface Snapshot { revision: number; channels: Channel[]; artifacts: Artifact[]; transfers: Transfer[] }
export interface Me {
  channelIds: string[]; mode: Mode | null; csrf: string; twitchConfigured: boolean;
  connections: Record<string, { status: string; chat: boolean; raid: boolean; lastEvent?: number }>;
}
