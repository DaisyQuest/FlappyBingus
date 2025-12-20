import { describe, expect, it } from "vitest";
import { DEFAULT_TRAILS, getUnlockedTrails, normalizeTrails, sortTrailsForDisplay } from "../trailProgression.js";

describe("trailProgression helpers", () => {
  it("normalizes missing lists to defaults", () => {
    const result = normalizeTrails(null);
    expect(result).toHaveLength(DEFAULT_TRAILS.length);
    expect(result[0].id).toBe("classic");
  });

  it("unlocks record-holder trails only when eligible", () => {
    const trails = [
      { id: "classic", minScore: 0 },
      { id: "world_record", minScore: 0, requiresRecordHolder: true }
    ];
    const locked = getUnlockedTrails(trails, 9999, { isRecordHolder: false });
    const unlocked = getUnlockedTrails(trails, 9999, { isRecordHolder: true });

    expect(locked).not.toContain("world_record");
    expect(unlocked).toContain("world_record");
  });

  it("places record-holder trails at the top when available", () => {
    const ordered = sortTrailsForDisplay(DEFAULT_TRAILS, { isRecordHolder: true });
    expect(ordered[0].id).toBe("world_record");

    const lockedOrder = sortTrailsForDisplay(DEFAULT_TRAILS, { isRecordHolder: false });
    expect(lockedOrder[0].id).toBe("classic");
    expect(lockedOrder[lockedOrder.length - 1].id).toBe("world_record");
  });
});
