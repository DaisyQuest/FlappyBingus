import { describe, expect, it, vi } from "vitest";
import { createRemoteStateSync } from "../remoteStateSync.js";

describe("remote state sync", () => {
  it("adds and samples snapshots via the buffer", () => {
    const sync = createRemoteStateSync({ maxSize: 2 });
    sync.addSnapshot(1, { id: "a" });
    sync.addSnapshot(2, { id: "b" });

    expect(sync.size()).toBe(2);
    expect(sync.sample(1)).toEqual({ id: "a" });
    expect(sync.sample(3)).toEqual({ id: "b" });
  });

  it("uses interpolation when provided", () => {
    const interpolate = vi.fn((before, after, t) => ({
      value: before.value + (after.value - before.value) * t
    }));
    const sync = createRemoteStateSync({ interpolate });
    sync.addSnapshot(0, { value: 0 });
    sync.addSnapshot(10, { value: 10 });

    const result = sync.sample(5);

    expect(result).toEqual({ value: 5 });
    expect(interpolate).toHaveBeenCalled();
  });

  it("exposes latest snapshot and clear", () => {
    const sync = createRemoteStateSync();
    expect(sync.latest()).toBeNull();
    sync.addSnapshot(1, { id: "a" });
    sync.addSnapshot(2, { id: "b" });
    expect(sync.latest()).toEqual({ id: "b" });

    sync.clear();
    expect(sync.size()).toBe(0);
    expect(sync.latest()).toBeNull();
  });
});
