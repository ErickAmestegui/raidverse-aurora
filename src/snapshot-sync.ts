import type { Snapshot } from './shared';
// HTTP and WebSocket responses can settle in either order.
export function latestSnapshot(current: Snapshot, incoming: Snapshot): Snapshot {
  return incoming.revision >= current.revision ? incoming : current;
}
