import { describe, expect, it } from "vitest";

import {
  buildUnlockablesCatalog,
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
});
