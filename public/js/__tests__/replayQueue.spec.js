import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPendingReplay, loadPendingReplay, savePendingReplay } from "../replayQueue.js";

const makeStorage = () => {
  let store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); }
  };
};

describe("replayQueue", () => {
  beforeEach(() => {
    globalThis.localStorage = makeStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.localStorage;
  });

  it("saves and loads a pending replay for the same user", () => {
    const payload = { score: 42, replay: { seed: "abc" } };
    const saved = savePendingReplay(" Alice ", payload);

    expect(saved.username).toBe("Alice");
    expect(saved.payload).toEqual(payload);
    expect(typeof saved.savedAt).toBe("number");

    const loaded = loadPendingReplay("Alice");
    expect(loaded).toEqual(saved);
  });

  it("does not return pending data for a different user", () => {
    savePendingReplay("Alice", { score: 10, replay: { seed: "zzz" } });
    expect(loadPendingReplay("Bob")).toBeNull();
    // but an unspecified user can still see the raw entry
    expect(loadPendingReplay()).not.toBeNull();
  });

  it("clears pending replay only when the user matches", () => {
    savePendingReplay("Alice", { score: 5, replay: { seed: "aaa" } });
    expect(clearPendingReplay("Bob")).toBe(false);
    expect(loadPendingReplay("Alice")).not.toBeNull();

    expect(clearPendingReplay("Alice")).toBe(true);
    expect(loadPendingReplay("Alice")).toBeNull();
  });

  it("skips saving when username or payload are missing", () => {
    expect(savePendingReplay("", { score: 1, replay: {} })).toBeNull();
    expect(loadPendingReplay()).toBeNull();
  });
});
