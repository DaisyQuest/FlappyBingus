import { describe, expect, it } from "vitest";
import { buildScorePopupStyle, __testables } from "../uiStyles.js";

describe("buildScorePopupStyle", () => {
  it("ramps pastel strength with combo for orb popups", () => {
    const base = buildScorePopupStyle({ combo: 0, variant: "orb" });
    const spicy = buildScorePopupStyle({ combo: __testables.ORB_COMBO_CAP, variant: "orb" });

    expect(base.size).toBeLessThan(spicy.size);
    expect(base.strokeWidth).toBeLessThan(spicy.strokeWidth);
    expect(base.palette.length).toBeGreaterThanOrEqual(3);
    expect(spicy.palette.length).toBe(base.palette.length);
  });

  it("makes perfect popups more ornate and sparkly", () => {
    const calm = buildScorePopupStyle({ combo: 0, variant: "perfect" });
    const streaking = buildScorePopupStyle({ combo: __testables.PERFECT_COMBO_CAP, variant: "perfect" });

    expect(calm.palette.length).toBeGreaterThanOrEqual(4);
    expect(streaking.palette[0]).not.toBe(calm.palette[0]);
    expect(streaking.sparkle).toBe(true);
    expect(streaking.size).toBeGreaterThan(calm.size);
  });
});
