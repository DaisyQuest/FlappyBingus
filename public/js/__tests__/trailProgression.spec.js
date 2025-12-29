import { describe, expect, it } from "vitest";
import { DEFAULT_TRAILS, getUnlockedTrails, normalizeTrails, sortTrailsForDisplay } from "../trailProgression.js";

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
