import { describe, expect, it } from "vitest";
import { DEFAULT_TRAILS, getUnlockedTrails, normalizeTrails, sortTrailsForDisplay } from "../trailProgression.js";

describe("trailProgression helpers", () => {
  it("normalizes missing lists to defaults", () => {
    const result = normalizeTrails(null);
    expect(result).toHaveLength(DEFAULT_TRAILS.length);
    expect(result[0].id).toBe("classic");
  });

  it("preserves server ordering and appends missing defaults", () => {
    const result = normalizeTrails([
      { id: "classic", name: "Classic Remix", minScore: 10 },
      { id: "ember", name: "Ember Core" }
    ]);

    expect(result).toHaveLength(DEFAULT_TRAILS.length);
    expect(result[0]).toMatchObject({ id: "classic", name: "Classic Remix", minScore: 10 });
    expect(result[1]).toMatchObject({ id: "ember", name: "Ember Core" });
    expect(result.find((trail) => trail.id === "rainbow")?.name).toBe("Prismatic Ribbon");
  });

  it("appends missing defaults after custom server trails", () => {
    const result = normalizeTrails([
      { id: "custom_glow", name: "Custom Glow", minScore: 42 }
    ]);

    expect(result).toHaveLength(DEFAULT_TRAILS.length + 1);
    expect(result[0]).toMatchObject({ id: "custom_glow", name: "Custom Glow", minScore: 42 });
    expect(result[result.length - 1].id).toBe("world_record");
  });

  it("filters invalid entries and falls back when none remain", () => {
    const result = normalizeTrails([{ id: "" }, null, { name: "No id" }]);
    expect(result).toHaveLength(DEFAULT_TRAILS.length);
    expect(result[0].id).toBe("classic");
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

  it("keeps classic available even without achievements", () => {
    const unlocked = getUnlockedTrails(DEFAULT_TRAILS, null, { isRecordHolder: false });
    expect(unlocked).toContain("classic");
  });

  it("unlocks the full trail lineup when achievements are completed and record-holder status is true", () => {
    const achievements = {
      unlocked: DEFAULT_TRAILS.reduce((acc, trail) => {
        if (trail.achievementId) acc[trail.achievementId] = Date.now();
        return acc;
      }, {})
    };

    const unlocked = getUnlockedTrails(DEFAULT_TRAILS, achievements, { isRecordHolder: true });
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
