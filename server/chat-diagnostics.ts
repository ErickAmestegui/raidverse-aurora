import { createHash } from 'node:crypto';

type Stage = 'received' | 'recognized' | 'validation' | 'rejected' | 'persisted' | 'accepted' | 'websocket' | 'session' | 'subscription';
export interface ChatTrace {
  channelId?: string; eventId?: string; sessionId?: string;
  actor?: 'broadcaster' | 'viewer'; mode?: 'LIVE' | 'REHEARSAL';
  element?: 'light' | 'fire' | 'storm' | 'crystal';
  reason?: 'shared_chat' | 'stale_event' | 'invalid_timestamp' | 'not_a_command' | 'unknown_channel_or_mode' | 'unauthorized_control' | 'disabled' | 'no_artifact' | 'round_closed' | 'history_limit' | 'round_user_limit' | 'cooldown' | 'channel_rate_limit' | 'duplicate' | 'wrong_channel' | 'unknown_subscription' | 'invalid_schema' | 'invalid_envelope';
  ageMs?: number; round?: number; revision?: number; contributions?: number; clients?: number;
  chat?: boolean; raid?: boolean; broadcasterMatches?: boolean; readerMatches?: boolean;
}
const ref = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 12);
// Opt-in only. Never pass messages, OAuth fields, cookies, URLs or provider responses.
// Explicitly select every emitted field so extra runtime properties cannot leak.
export function traceChat(stage: Stage, facts: ChatTrace = {}) {
  if (process.env.RAIDVERSE_CHAT_DEBUG !== '1') return;
  const out: Record<string, unknown> = { at: new Date().toISOString(), stage };
  for (const key of ['channelId', 'eventId', 'sessionId'] as const) if (facts[key]) out[key.replace('Id', 'Ref')] = ref(facts[key]!);
  for (const key of ['actor', 'mode', 'element', 'reason', 'ageMs', 'round', 'revision', 'contributions', 'clients', 'chat', 'raid', 'broadcasterMatches', 'readerMatches'] as const) if (facts[key] !== undefined) out[key] = facts[key];
  console.info('[raidverse.chat]', JSON.stringify(out));
}
