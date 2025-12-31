import { createSnapshotBuffer } from "./snapshotBuffer.js";

export function createRemoteStateSync({ maxSize = 120, interpolate } = {}) {
  const buffer = createSnapshotBuffer({ maxSize });

  const addSnapshot = (time, snapshot) => {
    buffer.add(time, snapshot);
  };

  const sample = (time) => buffer.sample(time, { interpolate });

  const latest = () => buffer.latest();

  const clear = () => buffer.clear();

  return {
    addSnapshot,
    sample,
    latest,
    clear,
    size: buffer.size
  };
}
