"use strict";

import { describe, expect, it } from "vitest";
import {
  UNLOCKABLE_TYPES,
  buildUnlockablesCatalog,
  getUnlockedIdsByType,
  isUnlockSatisfied,
  normalizeUnlock,
  syncUnlockablesState
} from "../unlockables.cjs";

const sampleTrails = [
  { id: "classic", name: "Classic", minScore: 0, achievementId: "trail_classic_1", alwaysUnlocked: true },
  { id: "ember", name: "Ember", minScore: 100, achievementId: "trail_ember_100" },
  { id: "shop_trail", name: "Shop Trail", unlock: { type: "purchase", cost: 10 } }
];

const sampleIcons = [
  { id: "hi_vis_orange", name: "Orange", unlock: { type: "free" } },
  { id: "badge", name: "Badge", unlock: { type: "achievement", id: "achv" } }
];

const sampleTextures = [
  { id: "basic", name: "Basic", unlock: { type: "free" } },
  { id: "digital", name: "Digital", unlock: { type: "score", minScore: 150 } }
];

describe("unlockables", () => {
  it("normalizes unlock metadata across known types", () => {
    expect(normalizeUnlock({ type: "score", minScore: -5 }).minScore).toBe(0);
    expect(normalizeUnlock({ type: "achievement", id: "ach" })).toEqual({
      type: "achievement",
      id: "ach",
      minScore: null,
      label: "Achievement"
    });
    expect(normalizeUnlock({ type: "purchase", cost: 2.4 })).toEqual({
      type: "purchase",
      cost: 2,
      currencyId: "bustercoin",
      label: "Cost: 2 BC"
    });
    expect(normalizeUnlock({ type: "record" }).label).toBe("Record holder");
    expect(normalizeUnlock({ type: "record", minScore: 150 }).minScore).toBe(150);
    expect(normalizeUnlock(null)).toEqual({ type: "free", label: "Free" });
  });

  it("evaluates unlock satisfaction across contexts", () => {
    const recordDef = { id: "record", type: "trail", unlock: { type: "record" } };
    const recordScoreDef = { id: "record_score", type: "trail", unlock: { type: "record", minScore: 50 } };
    const scoreDef = { id: "score", type: "pipe_texture", unlock: { type: "score", minScore: 10 } };
    const achievementDef = { id: "ach", type: "player_texture", unlock: { type: "achievement", id: "a1", minScore: 5 } };
    expect(isUnlockSatisfied(recordDef, { recordHolder: false })).toBe(false);
    expect(isUnlockSatisfied(recordDef, { recordHolder: true })).toBe(true);
    expect(isUnlockSatisfied(recordScoreDef, { recordHolder: true, bestScore: 20 })).toBe(false);
    expect(isUnlockSatisfied(recordScoreDef, { recordHolder: true, bestScore: 50 })).toBe(true);
    expect(isUnlockSatisfied(scoreDef, { bestScore: 9 })).toBe(false);
    expect(isUnlockSatisfied(scoreDef, { bestScore: 10 })).toBe(true);
    expect(isUnlockSatisfied(achievementDef, { achievements: { unlocked: { a1: 123 } }, bestScore: 0 })).toBe(true);
    expect(isUnlockSatisfied(achievementDef, { achievements: { unlocked: {} }, bestScore: 6 })).toBe(true);
  });

  it("builds unlockables and syncs unlocked state", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: sampleTrails,
      icons: sampleIcons,
      pipeTextures: sampleTextures
    });
    expect(unlockables.some((u) => u.type === UNLOCKABLE_TYPES.trail)).toBe(true);
    expect(unlockables.some((u) => u.type === UNLOCKABLE_TYPES.playerTexture)).toBe(true);
    expect(unlockables.some((u) => u.type === UNLOCKABLE_TYPES.pipeTexture)).toBe(true);
    expect(unlockables.find((item) => item.id === "shop_trail")?.unlock?.type).toBe("purchase");

    const result = syncUnlockablesState(
      { unlocked: {} },
      unlockables,
      { achievements: { unlocked: { trail_classic_1: Date.now() } }, bestScore: 200 }
    );
    expect(Object.keys(result.state.unlocked).length).toBeGreaterThan(0);

    const unlockedPipe = getUnlockedIdsByType({
      unlockables,
      type: UNLOCKABLE_TYPES.pipeTexture,
      context: { bestScore: 200 }
    });
    expect(unlockedPipe).toEqual(expect.arrayContaining(["basic", "digital"]));
  });

  it("revokes unlockables when conditions change", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: sampleTrails,
      icons: sampleIcons,
      pipeTextures: sampleTextures
    });
    const initial = syncUnlockablesState(
      { unlocked: {} },
      unlockables,
      { achievements: { unlocked: { achv: Date.now() } } },
      { now: 111 }
    );
    expect(initial.state.unlocked["player_texture:badge"]).toBe(111);

    const changedIcons = [{ id: "badge", name: "Badge", unlock: { type: "achievement", id: "new_ach" } }];
    const { unlockables: updatedUnlockables } = buildUnlockablesCatalog({
      trails: sampleTrails,
      icons: changedIcons,
      pipeTextures: sampleTextures
    });
    const updated = syncUnlockablesState(
      initial.state,
      updatedUnlockables,
      { achievements: { unlocked: {} } },
      { now: 222 }
    );
    expect(updated.state.unlocked["player_texture:badge"]).toBeUndefined();
    const unlockedIcons = getUnlockedIdsByType({
      unlockables: updatedUnlockables,
      type: UNLOCKABLE_TYPES.playerTexture,
      state: updated.state,
      context: { achievements: { unlocked: {} } }
    });
    expect(unlockedIcons).not.toContain("badge");
  });

  it("unlocks player textures based on record holder and ownership context", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [],
      icons: [
        { id: "record_icon", name: "Record Icon", unlock: { type: "record" } },
        { id: "shop_icon", name: "Shop Icon", unlock: { type: "purchase", cost: 25 } }
      ],
      pipeTextures: []
    });

    const locked = getUnlockedIdsByType({
      unlockables,
      type: UNLOCKABLE_TYPES.playerTexture,
      context: { recordHolder: false, ownedIds: [] }
    });
    expect(locked).not.toContain("record_icon");
    expect(locked).not.toContain("shop_icon");

    const unlocked = getUnlockedIdsByType({
      unlockables,
      type: UNLOCKABLE_TYPES.playerTexture,
      context: { recordHolder: true, ownedIds: ["shop_icon"] }
    });
    expect(unlocked).toEqual(expect.arrayContaining(["record_icon", "shop_icon"]));
  });
});
