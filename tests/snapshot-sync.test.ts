import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../src/shared';
import { latestSnapshot } from '../src/snapshot-sync';
const snapshot = (revision: number, light: number): Snapshot => ({ revision, channels: [], transfers: [], artifacts: [{ id: 'fixture', name: 'Fixture only', mode: 'REHEARSAL', seed: 1, ownerId: 'owner', phase: 'FORGING', round: 1, energy: { light, fire: 0, storm: 0, crystal: 0 }, history: [], communities: ['owner'], createdAt: 0, version: revision }] });
describe('HTTP/WebSocket state ordering', () => {
  it('does not erase a contribution when an older HTTP response settles after WebSocket', async () => {
    let release!: (value: Snapshot) => void;
    const slowHttp = new Promise<Snapshot>(resolve => { release = resolve; });
    let current = snapshot(10, 0);
    const settled = slowHttp.then(incoming => { current = latestSnapshot(current, incoming); });
    current = latestSnapshot(current, snapshot(11, 1));
    release(snapshot(10, 0)); await settled;
    expect(current.revision).toBe(11); expect(current.artifacts[0].energy.light).toBe(1);
  });
  it('recovers a missing WebSocket update from a newer authoritative HTTP snapshot', () => {
    const result = latestSnapshot(snapshot(11, 1), snapshot(12, 2));
    expect(result.revision).toBe(12); expect(result.artifacts[0].energy.light).toBe(2);
  });
});
