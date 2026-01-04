import { describe, it, expect } from "vitest";
import {
  computeUnlockedIconSet,
  computeUnlockedPipeTextureSet,
  computeUnlockedTrailSet,
  getOwnedUnlockables
} from "../main/unlockableSets.js";
import { UNLOCKABLE_TYPES } from "../unlockables.js";

describe("unlockable set helpers", () => {
  it("prefers owned unlockable lists from the user payload", () => {
    expect(getOwnedUnlockables(null)).toEqual([]);
    expect(getOwnedUnlockables({ ownedUnlockables: ["a", "b"] })).toEqual(["a", "b"]);
    expect(getOwnedUnlockables({ ownedIcons: ["c"] })).toEqual(["c"]);
    expect(getOwnedUnlockables({})).toEqual([]);
  });

  it("computes unlocked icons using the catalog fallback", () => {
    const icons = [
      { id: "free", unlock: { type: "free" } },
      { id: "score", unlock: { type: "score", minScore: 10 } }
    ];
    const unlocked = computeUnlockedIconSet({
      icons,
      user: { bestScore: 5 }
    });

    expect(unlocked.has("free")).toBe(true);
    expect(unlocked.has("score")).toBe(false);
  });

  it("honors unlockable definitions and user context for icons", () => {
    const unlockables = [
      { id: "alpha", type: UNLOCKABLE_TYPES.playerTexture, unlock: { type: "free" } },
      { id: "beta", type: UNLOCKABLE_TYPES.playerTexture, unlock: { type: "score", minScore: 10 } }
    ];
    const unlocked = computeUnlockedIconSet({
      unlockables,
      user: { bestScore: 12 }
    });

    expect(unlocked).toEqual(new Set(["alpha", "beta"]));
  });

  it("derives unlocked trails from achievements, scores, and ownership", () => {
    const trails = [
      { id: "free", unlock: { type: "free" } },
      { id: "score", unlock: { type: "score", minScore: 50 } },
      { id: "ach", unlock: { type: "achievement", id: "ach_1" } },
      { id: "purchase", unlock: { type: "purchase", cost: 10 } },
      { id: "record", unlock: { type: "record" } }
    ];
    const unlocked = computeUnlockedTrailSet({
      trails,
      user: { bestScore: 60, ownedUnlockables: ["purchase"], isRecordHolder: false },
      achievementsState: { unlocked: { ach_1: 123 } }
    });

    expect(unlocked.has("free")).toBe(true);
    expect(unlocked.has("score")).toBe(true);
    expect(unlocked.has("ach")).toBe(true);
    expect(unlocked.has("purchase")).toBe(true);
    expect(unlocked.has("record")).toBe(false);
  });

  it("uses unlockable context to gate pipe textures", () => {
    const unlockables = [
      { id: "pipe-free", type: UNLOCKABLE_TYPES.pipeTexture, unlock: { type: "free" } },
      { id: "pipe-score", type: UNLOCKABLE_TYPES.pipeTexture, unlock: { type: "score", minScore: 20 } }
    ];
    const unlocked = computeUnlockedPipeTextureSet({
      unlockables,
      user: { bestScore: 0 }
    });

    expect(unlocked).toEqual(new Set(["pipe-free"]));
  });
});
