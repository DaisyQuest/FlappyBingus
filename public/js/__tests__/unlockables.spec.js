import { describe, expect, it } from "vitest";

import {
  buildUnlockablesCatalog,
  isUnlockSatisfied,
  normalizeUnlock,
  resolveUnlockablesForType,
  UNLOCKABLE_TYPES
} from "../unlockables.js";

describe("unlockables helpers", () => {
  it("returns the current unlockables list when no type or list is provided", () => {
    const base = [{ id: "a", type: "trail" }];
    expect(resolveUnlockablesForType({ unlockables: base })).toBe(base);
    expect(resolveUnlockablesForType({ unlockables: base, type: UNLOCKABLE_TYPES.trail, list: [] })).toBe(base);
  });

  it("keeps the existing catalog when all items are present", () => {
    const icons = [{ id: "custom", name: "Custom", unlock: { type: "free" } }];
    const unlockables = buildUnlockablesCatalog({ icons }).unlockables;
    const resolved = resolveUnlockablesForType({
      unlockables,
      type: UNLOCKABLE_TYPES.playerTexture,
      list: icons,
      trails: [],
      icons,
      pipeTextures: []
    });

    expect(resolved).toBe(unlockables);
    expect(resolved.find((entry) => entry.id === "custom")?.type).toBe(UNLOCKABLE_TYPES.playerTexture);
  });

  it("rebuilds the catalog when required items are missing", () => {
    const icons = [{ id: "fresh", name: "Fresh", unlock: { type: "free" } }];
    const staleCatalog = buildUnlockablesCatalog({ icons: [] }).unlockables;

    const resolved = resolveUnlockablesForType({
      unlockables: staleCatalog,
      type: UNLOCKABLE_TYPES.playerTexture,
      list: icons,
      trails: [],
      icons,
      pipeTextures: []
    });

    expect(resolved).not.toBe(staleCatalog);
    expect(resolved.find((entry) => entry.id === "fresh" && entry.type === UNLOCKABLE_TYPES.playerTexture)).toBeTruthy();
  });

  it("normalizes record unlocks with optional score requirements", () => {
    expect(normalizeUnlock({ type: "record" })).toEqual({ type: "record", label: "Record holder" });
    expect(normalizeUnlock({ type: "record", minScore: 200 })).toEqual({
      type: "record",
      minScore: 200,
      label: "Record holder"
    });
  });

  it("requires record holder status and score when checking record unlocks", () => {
    const def = { id: "trail", unlock: { type: "record", minScore: 300 } };
    expect(isUnlockSatisfied(def, { recordHolder: false, bestScore: 400 })).toBe(false);
    expect(isUnlockSatisfied(def, { recordHolder: true, bestScore: 200 })).toBe(false);
    expect(isUnlockSatisfied(def, { recordHolder: true, bestScore: 350 })).toBe(true);
  });

  it("accepts achievement unlocks when either the achievement or score requirement is met", () => {
    const def = { id: "trail", unlock: { type: "achievement", id: "trail_unlock", minScore: 500 } };
    expect(isUnlockSatisfied(def, { achievements: { unlocked: {} }, bestScore: 100 })).toBe(false);
    expect(isUnlockSatisfied(def, { achievements: { unlocked: { trail_unlock: Date.now() } }, bestScore: 100 })).toBe(true);
    expect(isUnlockSatisfied(def, { achievements: { unlocked: {} }, bestScore: 600 })).toBe(true);
  });
});
