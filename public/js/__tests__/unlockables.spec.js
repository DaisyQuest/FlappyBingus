import { describe, expect, it } from "vitest";
import {
  UNLOCKABLE_TYPES,
  buildUnlockablesCatalog,
  describeUnlock,
  getUnlockedIdsByType,
  isUnlockSatisfied,
  normalizeUnlock
} from "../unlockables.js";

describe("unlockables client helpers", () => {
  it("normalizes unlock shapes and describes locks", () => {
    expect(normalizeUnlock({ type: "score", minScore: -5 }).minScore).toBe(0);
    expect(describeUnlock({ type: "score", minScore: 10 }, { unlocked: false })).toContain("Score 10");
    expect(describeUnlock({ type: "record" }, { unlocked: false })).toContain("Record");
    expect(normalizeUnlock({ type: "purchase", cost: 3, currencyId: "stellar" })).toMatchObject({
      type: "purchase",
      cost: 3,
      currencyId: "stellar"
    });
  });

  it("evaluates unlock satisfaction for achievements and scores", () => {
    const def = { id: "trail", type: "trail", unlock: { type: "achievement", id: "a1", minScore: 5 } };
    expect(isUnlockSatisfied(def, { achievements: { unlocked: { a1: 1 } }, bestScore: 0 })).toBe(true);
    expect(isUnlockSatisfied(def, { achievements: { unlocked: {} }, bestScore: 6 })).toBe(true);
  });

  it("builds catalogs and returns unlocked ids by type", () => {
    const catalog = buildUnlockablesCatalog({
      trails: [
        { id: "classic", name: "Classic", minScore: 0, alwaysUnlocked: true },
        { id: "shop_trail", name: "Shop Trail", unlock: { type: "purchase", cost: 50 } }
      ],
      icons: [{ id: "icon", name: "Icon", unlock: { type: "free" } }],
      pipeTextures: [{ id: "basic", name: "Basic", unlock: { type: "score", minScore: 10 } }]
    });
    const shopTrail = catalog.unlockables.find((item) => item.id === "shop_trail");
    expect(shopTrail?.unlock?.type).toBe("purchase");
    const unlocked = getUnlockedIdsByType({
      unlockables: catalog.unlockables,
      type: UNLOCKABLE_TYPES.pipeTexture,
      context: { bestScore: 12 }
    });
    expect(unlocked).toContain("basic");
  });
});
