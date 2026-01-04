"use strict";

import { describe, expect, it } from "vitest";
import {
  UNLOCKABLE_TYPES,
  buildUnlockablesCatalog,
  getUnlockedIdsByType,
  isUnlockSatisfied,
  normalizeUnlock
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

  it("falls back to free unlocks for unknown types", () => {
    expect(normalizeUnlock({ type: "mystery", label: "Secret" })).toEqual({ type: "free", label: "Secret" });
    expect(normalizeUnlock({ type: "achievement" })).toEqual({ type: "free", label: "Free" });
  });

  it("defaults invalid unlock inputs to free", () => {
    expect(normalizeUnlock(null)).toEqual({ type: "free", label: "Free" });
    expect(normalizeUnlock("nope")).toEqual({ type: "free", label: "Free" });
    expect(normalizeUnlock(42)).toEqual({ type: "free", label: "Free" });
  });

  it("falls back to free when achievement id is missing", () => {
    expect(normalizeUnlock({ type: "achievement", minScore: 5 })).toEqual({ type: "free", label: "Free" });
  });

  it("normalizes purchase unlocks with custom currencies", () => {
    const unlock = normalizeUnlock({ type: "purchase", cost: 12.9, currencyId: "tokens", label: "" });
    expect(unlock).toEqual({
      type: "purchase",
      cost: 12,
      currencyId: "tokens",
      label: "Cost: 12 TOKENS"
    });
  });

  it("normalizes purchase unlocks with invalid cost and missing currency", () => {
    const unlock = normalizeUnlock({ type: "purchase", cost: "invalid", currencyId: "", label: "" });
    expect(unlock).toEqual({
      type: "purchase",
      cost: 0,
      currencyId: "bustercoin",
      label: "Cost: 0 BC"
    });
  });

  it("normalizes record unlocks without scores", () => {
    const unlock = normalizeUnlock({ type: "record", minScore: NaN, label: "" });
    expect(unlock).toEqual({ type: "record", label: "Record holder" });
  });

  it("normalizes record unlocks with and without minScore", () => {
    expect(normalizeUnlock({ type: "record" })).toEqual({ type: "record", label: "Record holder" });
    expect(normalizeUnlock({ type: "record", minScore: 200 })).toEqual({
      type: "record",
      minScore: 200,
      label: "Record holder"
    });
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

  it("evaluates achievement unlocks with id and minScore fallbacks", () => {
    const idDef = { id: "ach_id", type: "trail", unlock: { type: "achievement", id: "ach_1", minScore: 10 } };
    const missingIdDef = { id: "ach_missing", type: "trail", unlock: { type: "achievement", minScore: 7 } };
    const noFallbackDef = { id: "ach_none", type: "trail", unlock: { type: "achievement" } };

    expect(isUnlockSatisfied(idDef, { achievements: { unlocked: { ach_1: true } }, bestScore: 0 })).toBe(true);
    expect(isUnlockSatisfied(idDef, { achievements: { unlocked: {} }, bestScore: 9 })).toBe(false);
    expect(isUnlockSatisfied(idDef, { achievements: { unlocked: {} }, bestScore: 10 })).toBe(true);

    expect(isUnlockSatisfied(missingIdDef, { achievements: { unlocked: {} }, bestScore: 6 })).toBe(false);
    expect(isUnlockSatisfied(missingIdDef, { achievements: { unlocked: {} }, bestScore: 7 })).toBe(true);
    expect(isUnlockSatisfied(noFallbackDef, { achievements: { unlocked: {} }, bestScore: 100 })).toBe(false);
  });

  it("defaults to free unlocks when none are supplied", () => {
    const def = { id: "starter", type: "trail" };
    expect(isUnlockSatisfied(def, {})).toBe(true);
  });

  it("handles purchase unlocks using owned ids", () => {
    const purchaseDef = { id: "icon", type: "player_texture", unlock: { type: "purchase", id: "shop_id" } };
    expect(isUnlockSatisfied(purchaseDef, { ownedIds: ["shop_id"] })).toBe(true);
    expect(isUnlockSatisfied(purchaseDef, { ownedIds: ["icon"] })).toBe(true);
    expect(isUnlockSatisfied(purchaseDef, { ownedIds: [] })).toBe(false);
  });

  it("respects purchase ownership via def.id and unlock.id", () => {
    const defIdOwned = { id: "trail_gold", type: "trail", unlock: { type: "purchase", id: "trail_pack" } };
    expect(isUnlockSatisfied(defIdOwned, { ownedIds: ["trail_gold"] })).toBe(true);
    expect(isUnlockSatisfied(defIdOwned, { ownedIds: ["trail_pack"] })).toBe(true);
    expect(isUnlockSatisfied(defIdOwned, { ownedIds: [] })).toBe(false);
  });

  it("requires both record holder status and minimum score when configured", () => {
    const def = { id: "record", type: "trail", unlock: { type: "record", minScore: 20 } };
    expect(isUnlockSatisfied(def, { recordHolder: true, bestScore: 10 })).toBe(false);
    expect(isUnlockSatisfied(def, { recordHolder: true, bestScore: 20 })).toBe(true);
  });

  it("requires record holder status for record unlocks", () => {
    const def = { id: "record_only", type: "trail", unlock: { type: "record" } };
    expect(isUnlockSatisfied(def, { recordHolder: false, bestScore: 999 })).toBe(false);
    expect(isUnlockSatisfied(def, { recordHolder: true, bestScore: 0 })).toBe(true);
  });

  it("returns false for achievement unlocks without achievements or score", () => {
    const def = { id: "ach", type: "trail", unlock: { type: "achievement", id: "ach_1", minScore: 50 } };
    expect(isUnlockSatisfied(def, { achievements: { unlocked: {} }, bestScore: 20 })).toBe(false);
  });

  it("treats unknown unlock types as satisfied", () => {
    const def = { id: "odd", type: "trail", unlock: { type: "oddity" } };
    expect(isUnlockSatisfied(def, {})).toBe(true);
  });

  it("builds unlockables and resolves unlockable ids from context", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: sampleTrails,
      icons: sampleIcons,
      pipeTextures: sampleTextures
    });
    expect(unlockables.some((u) => u.type === UNLOCKABLE_TYPES.trail)).toBe(true);
    expect(unlockables.some((u) => u.type === UNLOCKABLE_TYPES.playerTexture)).toBe(true);
    expect(unlockables.some((u) => u.type === UNLOCKABLE_TYPES.pipeTexture)).toBe(true);
    expect(unlockables.find((item) => item.id === "shop_trail")?.unlock?.type).toBe("purchase");

    const unlockedPipe = getUnlockedIdsByType({
      unlockables,
      type: UNLOCKABLE_TYPES.pipeTexture,
      context: { bestScore: 200 }
    });
    expect(unlockedPipe).toEqual(expect.arrayContaining(["basic", "digital"]));
  });

  it("skips invalid unlockable definitions during catalog building", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [null, "nope", { id: "", name: "Bad" }, { id: "  ", name: "Blank" }, { id: "ok", name: "OK" }],
      icons: [undefined, 123, { id: "", name: "Bad" }, { id: "icon_ok", name: "Icon OK" }],
      pipeTextures: [false, { id: "", name: "Bad" }, { id: "p1", name: "Pipe" }]
    });
    expect(unlockables.map((u) => u.id)).toEqual(["ok", "icon_ok", "p1"]);
  });

  it("defaults trail unlocks to achievement-based when not specified", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [{ id: "ember", name: "Ember", minScore: 10 }],
      icons: [],
      pipeTextures: []
    });
    expect(unlockables[0].unlock).toEqual({
      type: "achievement",
      id: "trail_ember",
      minScore: 10,
      label: "Score 10+"
    });
  });

  it("marks always unlocked trails as free", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [{ id: "starter", alwaysUnlocked: true }],
      icons: [],
      pipeTextures: []
    });
    expect(unlockables[0].unlock).toEqual({ type: "free", label: "Free" });
  });

  it("adds record holder unlocks when requested", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [{ id: "record", requiresRecordHolder: true }],
      icons: [],
      pipeTextures: []
    });
    expect(unlockables[0].unlock).toEqual({ type: "record", label: "Record holder" });
  });

  it("prefers record holder unlocks over always unlocked trails", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [{ id: "priority", requiresRecordHolder: true, alwaysUnlocked: true }],
      icons: [],
      pipeTextures: []
    });
    expect(unlockables[0].unlock).toEqual({ type: "record", label: "Record holder" });
  });

  it("honors explicit trail unlocks before record or always-unlocked flags", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [
        {
          id: "explicit",
          requiresRecordHolder: true,
          alwaysUnlocked: true,
          unlock: { type: "purchase", cost: 42 }
        }
      ],
      icons: [],
      pipeTextures: []
    });
    expect(unlockables[0].unlock).toEqual({ type: "purchase", cost: 42, currencyId: "bustercoin", label: "Cost: 42 BC" });
  });

  it("defaults non-numeric trail minScore values to zero", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [{ id: "odd_score", minScore: "nope" }],
      icons: [],
      pipeTextures: []
    });
    expect(unlockables[0].meta.minScore).toBe(0);
    expect(unlockables[0].unlock).toEqual({
      type: "achievement",
      id: "trail_odd_score",
      minScore: 0,
      label: "Achievement"
    });
  });

  it("registers icon and pipe texture metadata", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [],
      icons: [{ id: "icon", name: "Icon", unlock: { type: "free" } }],
      pipeTextures: [{ id: "pipe", name: "Pipe", unlock: { type: "free" } }]
    });
    expect(unlockables.find((u) => u.id === "icon")?.meta).toEqual({ icon: { id: "icon", name: "Icon", unlock: { type: "free" } } });
    expect(unlockables.find((u) => u.id === "pipe")?.meta).toEqual({ texture: { id: "pipe", name: "Pipe", unlock: { type: "free" } } });
  });

  it("does not rely on prior state when evaluating unlocks", () => {
    const { unlockables } = buildUnlockablesCatalog({
      trails: [],
      icons: [{ id: "badge", name: "Badge", unlock: { type: "achievement", id: "ach" } }],
      pipeTextures: []
    });
    const state = { unlocked: { "player_texture:badge": 111 } };
    const unlocked = getUnlockedIdsByType({
      unlockables,
      type: UNLOCKABLE_TYPES.playerTexture,
      state,
      context: { achievements: { unlocked: {} } }
    });
    expect(unlocked).toEqual([]);
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
