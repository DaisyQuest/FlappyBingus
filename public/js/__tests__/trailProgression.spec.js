import { describe, expect, it } from "vitest";
import { DEFAULT_TRAILS, getUnlockedTrails, mergeTrailCatalog, normalizeTrails, sortTrailsForDisplay } from "../trailProgression.js";

describe("trailProgression helpers", () => {
  it("normalizes missing lists to defaults", () => {
    const result = normalizeTrails(null);
    expect(result).toHaveLength(DEFAULT_TRAILS.length);
    expect(result[0].id).toBe("classic");
  });

  it("allows empty trail catalogs when explicitly requested", () => {
    const result = normalizeTrails([], { allowEmpty: true });
    expect(result).toEqual([]);
  });

  it("keeps the current catalog when incoming trails are missing", () => {
    const current = [{ id: "classic" }, { id: "custom" }];
    const result = mergeTrailCatalog(null, { current });
    expect(result).toBe(current);
  });

  it("returns an empty catalog when allowed and the incoming list is empty", () => {
    const current = [{ id: "classic" }];
    const result = mergeTrailCatalog([], { current, allowEmpty: true });
    expect(result).toEqual([]);
  });

  it("falls back to the cached catalog when the incoming list is empty", () => {
    const current = [{ id: "classic" }];
    const result = mergeTrailCatalog([], { current });
    expect(result).toBe(current);
  });

  it("preserves cached trails that are missing from incoming updates", () => {
    const current = [{ id: "classic", name: "Classic" }, { id: "custom", name: "Custom" }];
    const incoming = [{ id: "classic", name: "Updated Classic" }];
    const result = mergeTrailCatalog(incoming, { current });
    expect(result).toEqual([
      { id: "classic", name: "Updated Classic" },
      { id: "custom", name: "Custom" }
    ]);
  });

  it("returns incoming trails when no cached catalog exists", () => {
    const incoming = [{ id: "classic" }];
    const result = mergeTrailCatalog(incoming, { current: [] });
    expect(result).toEqual(incoming);
  });

  it("keeps cached fields when incoming trails omit them", () => {
    const current = [{ id: "classic", unlock: { type: "free" } }];
    const incoming = [{ id: "classic", name: "Classic" }];
    const result = mergeTrailCatalog(incoming, { current });
    expect(result).toEqual([{ id: "classic", unlock: { type: "free" }, name: "Classic" }]);
  });

  it("defaults to base trails when no current catalog exists", () => {
    const result = mergeTrailCatalog(null, { current: [] });
    expect(result).toEqual(DEFAULT_TRAILS);
    expect(result).not.toBe(DEFAULT_TRAILS);
  });

  it("unlocks record-holder trails only when eligible", () => {
    const trails = [
      { id: "classic", achievementId: "a", alwaysUnlocked: true },
      { id: "world_record", achievementId: "b", requiresRecordHolder: true }
    ];
    const achievements = { unlocked: { a: Date.now(), b: Date.now() } };
    const locked = getUnlockedTrails(trails, achievements, { isRecordHolder: false });
    const unlocked = getUnlockedTrails(trails, achievements, { isRecordHolder: true });

    expect(locked).not.toContain("world_record");
    expect(unlocked).toContain("world_record");
  });

  it("respects score thresholds on record-holder unlocks", () => {
    const trails = [
      { id: "classic", alwaysUnlocked: true },
      { id: "recorded", unlock: { type: "record", minScore: 100 } }
    ];
    const locked = getUnlockedTrails(trails, null, { isRecordHolder: true, bestScore: 50 });
    expect(locked).not.toContain("recorded");

    const unlocked = getUnlockedTrails(trails, null, { isRecordHolder: true, bestScore: 120 });
    expect(unlocked).toContain("recorded");
  });

  it("unlocks purchasable trails only after they are owned", () => {
    const trails = [
      { id: "classic", achievementId: "a", alwaysUnlocked: true },
      { id: "starlight_pop", unlock: { type: "purchase", cost: 100 } }
    ];

    const locked = getUnlockedTrails(trails, null, { ownedIds: [] });
    expect(locked).toContain("classic");
    expect(locked).not.toContain("starlight_pop");

    const unlocked = getUnlockedTrails(trails, null, { ownedIds: ["starlight_pop"] });
    expect(unlocked).toContain("starlight_pop");
  });

  it("unlocks score-based trails when best score is high enough", () => {
    const trails = [
      { id: "classic", alwaysUnlocked: true },
      { id: "score_trail", unlock: { type: "score", minScore: 100 } }
    ];
    const locked = getUnlockedTrails(trails, null, { bestScore: 50 });
    expect(locked).not.toContain("score_trail");

    const unlocked = getUnlockedTrails(trails, null, { bestScore: 150 });
    expect(unlocked).toContain("score_trail");
  });

  it("keeps classic available even without achievements", () => {
    const unlocked = getUnlockedTrails(DEFAULT_TRAILS, null, { isRecordHolder: false });
    expect(unlocked).toContain("classic");
  });

  it("labels the starlight trail as Hearts in the defaults", () => {
    const hearts = DEFAULT_TRAILS.find((trail) => trail.id === "starlight_pop");
    expect(hearts?.name).toBe("Hearts");
  });

  it("unlocks the full trail lineup when achievements are completed and record-holder status is true", () => {
    const achievements = {
      unlocked: DEFAULT_TRAILS.reduce((acc, trail) => {
        if (trail.achievementId) acc[trail.achievementId] = Date.now();
        return acc;
      }, {})
    };

    const ownedIds = DEFAULT_TRAILS.filter((trail) => trail.unlock?.type === "purchase").map((trail) => trail.id);
    const unlocked = getUnlockedTrails(DEFAULT_TRAILS, achievements, { isRecordHolder: true, ownedIds });
    expect(new Set(unlocked)).toEqual(new Set(DEFAULT_TRAILS.map((t) => t.id)));
  });

  it("places record-holder trails at the top when available", () => {
    const ordered = sortTrailsForDisplay(DEFAULT_TRAILS, { isRecordHolder: true });
    expect(ordered[0].id).toBe("world_record");

    const lockedOrder = sortTrailsForDisplay(DEFAULT_TRAILS, { isRecordHolder: false });
    expect(lockedOrder[0].id).toBe("classic");
    expect(lockedOrder[lockedOrder.length - 1].id).toBe("world_record");
  });
});
