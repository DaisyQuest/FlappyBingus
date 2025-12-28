import { describe, expect, it } from "vitest";
import { buildScorePopupStyle, buildComboAuraStyle, COMBO_AURA_THRESHOLDS, __testables } from "../uiStyles.js";

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

describe("buildComboAuraStyle", () => {
  it("returns inactive styling for zero combos", () => {
    const aura = buildComboAuraStyle({ combo: 0, comboMax: 40, timerRatio: 1 });
    expect(aura.active).toBe(false);
    expect(aura.fill).toBe(0);
    expect(aura.fade).toBe(0);
    expect(aura.flame).toBe(0);
  });

  it("steps hue through green, yellow, and red thresholds", () => {
    const greenish = buildComboAuraStyle({ combo: 1, comboMax: 40, timerRatio: 1 });
    const yellow = buildComboAuraStyle({ combo: COMBO_AURA_THRESHOLDS.yellowAt, comboMax: 40, timerRatio: 1 });
    const red = buildComboAuraStyle({ combo: COMBO_AURA_THRESHOLDS.redAt, comboMax: 40, timerRatio: 1 });

    expect(greenish.hue).toBeGreaterThan(yellow.hue);
    expect(yellow.hue).toBeGreaterThan(red.hue);
  });

  it("dims glow as the combo timer runs down", () => {
    const full = buildComboAuraStyle({ combo: 12, comboMax: 40, timerRatio: 1 });
    const fading = buildComboAuraStyle({ combo: 12, comboMax: 40, timerRatio: 0.1 });

    expect(fading.fade).toBeLessThan(full.fade);
    expect(fading.glowAlpha).toBeLessThan(full.glowAlpha);
  });

  it("enables flames for high combos", () => {
    const flames = buildComboAuraStyle({ combo: COMBO_AURA_THRESHOLDS.flameAt, comboMax: 40, timerRatio: 1 });
    expect(flames.flame).toBeGreaterThan(0);
  });
});
