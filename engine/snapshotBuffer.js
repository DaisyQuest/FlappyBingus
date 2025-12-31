export function createSnapshotBuffer({ maxSize = 120 } = {}) {
  if (!Number.isFinite(maxSize) || maxSize <= 0) throw new Error("Max size must be positive.");
  let entries = [];

  const add = (time, snapshot) => {
    if (!Number.isFinite(time)) throw new Error("Snapshot time must be a number.");
    entries.push({ time, snapshot });
    entries.sort((a, b) => a.time - b.time);
    if (entries.length > maxSize) {
      entries = entries.slice(entries.length - maxSize);
    }
  };

  const size = () => entries.length;
  const clear = () => {
    entries = [];
  };

  const latest = () => (entries.length ? entries[entries.length - 1].snapshot : null);
  const earliest = () => (entries.length ? entries[0].snapshot : null);

  const sample = (time, { interpolate } = {}) => {
    if (!Number.isFinite(time)) throw new Error("Sample time must be a number.");
    if (!entries.length) return null;
    if (time <= entries[0].time) return entries[0].snapshot;
    const last = entries[entries.length - 1];
    if (time >= last.time) return last.snapshot;

    let before = entries[0];
    let after = last;

    for (let i = 1; i < entries.length; i += 1) {
      const current = entries[i];
      if (current.time === time) return current.snapshot;
      if (current.time > time) {
        before = entries[i - 1];
        after = current;
        break;
      }
    }

    if (typeof interpolate === "function" && after.time !== before.time) {
      const t = (time - before.time) / (after.time - before.time);
      return interpolate(before.snapshot, after.snapshot, t);
    }

    return before.snapshot;
  };

  return {
    add,
    size,
    clear,
    latest,
    earliest,
    sample
  };
}
