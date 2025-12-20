import { describe, expect, it } from "vitest";
import { buildScorePopupStyle, popupAnchor, __testables } from "../uiStyles.js";

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

  it("positions popup anchors above and to the right of the player", () => {
    const anchor = popupAnchor({ x: 100, y: 200, r: 20 });
    expect(anchor.x).toBeGreaterThan(100);
    expect(anchor.y).toBeLessThan(200);
  });

  it("scales popup anchors by radius and optional multiplier", () => {
    const base = popupAnchor({ x: 0, y: 0, r: 10 });
    const scaled = popupAnchor({ x: 0, y: 0, r: 10 }, __testables.DEFAULT_POPUP_OFFSET * 2);
    expect(scaled.x).toBeGreaterThan(base.x);
    expect(scaled.y).toBeLessThan(base.y);
  });
});
