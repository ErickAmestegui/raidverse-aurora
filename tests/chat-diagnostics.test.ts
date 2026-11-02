import { afterEach, describe, expect, it, vi } from 'vitest';
import { traceChat } from '../server/chat-diagnostics';
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('opt-in chat diagnostics privacy', () => {
  it('is disabled unless explicitly enabled', () => {
    vi.stubEnv('RAIDVERSE_CHAT_DEBUG', '0'); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    traceChat('received', { channelId: 'private-id' }); expect(log).not.toHaveBeenCalled();
  });
  it('emits decisions and hashed correlations without raw identifiers or unexpected fields', () => {
    vi.stubEnv('RAIDVERSE_CHAT_DEBUG', '1'); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    traceChat('rejected', { channelId: 'channel-raw', eventId: 'message-raw', sessionId: 'session-raw', actor: 'broadcaster', reason: 'cooldown', ...{ access_token: 'SECRET-NEVER-LOG', text: 'PRIVATE CHAT TEXT' } });
    const output = String(log.mock.calls[0][1]);
    for (const secret of ['channel-raw', 'message-raw', 'session-raw', 'SECRET-NEVER-LOG', 'PRIVATE CHAT TEXT']) expect(output).not.toContain(secret);
    expect(JSON.parse(output)).toMatchObject({ stage: 'rejected', actor: 'broadcaster', reason: 'cooldown' });
  });
});
