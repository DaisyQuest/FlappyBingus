// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  applyTextStyleCustomToUI,
  readTextStyleCustomFromUI,
  setTextCustomDisabledState,
  updateTextCustomValueDisplays
} from "../textStyleControls.js";
import { DEFAULT_TEXT_STYLE_CUSTOM } from "../settings.js";

const createElements = () => {
  const textFontFamily = document.createElement("select");
  ["system", "mono"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    textFontFamily.append(option);
  });
  return {
    textFontFamily,
  textFontWeight: document.createElement("input"),
  textFontWeightValue: document.createElement("span"),
  textSizeScale: document.createElement("input"),
  textSizeScaleValue: document.createElement("span"),
  textUseGameColors: document.createElement("input"),
  textColor: document.createElement("input"),
  textUseGameGlow: document.createElement("input"),
  textGlowColor: document.createElement("input"),
  textStrokeColor: document.createElement("input"),
  textStrokeWidth: document.createElement("input"),
  textStrokeWidthValue: document.createElement("span"),
  textShadowBoost: document.createElement("input"),
  textShadowBoostValue: document.createElement("span"),
  textShadowOffsetY: document.createElement("input"),
  textShadowOffsetYValue: document.createElement("span"),
  textWobble: document.createElement("input"),
  textWobbleValue: document.createElement("span"),
  textSpin: document.createElement("input"),
  textSpinValue: document.createElement("span"),
  textShimmer: document.createElement("input"),
  textShimmerValue: document.createElement("span"),
  textSparkle: document.createElement("input"),
  textUseGradient: document.createElement("input"),
  textGradientStart: document.createElement("input"),
  textGradientEnd: document.createElement("input")
  };
};

const setupCheckboxes = (elements) => {
  ["textUseGameColors", "textUseGameGlow", "textSparkle", "textUseGradient"].forEach((key) => {
    elements[key].type = "checkbox";
  });
};

describe("textStyleControls", () => {
  it("disables color and glow inputs based on custom flags", () => {
    const elements = createElements();
    setupCheckboxes(elements);

    setTextCustomDisabledState(elements, {
      ...DEFAULT_TEXT_STYLE_CUSTOM,
      useGameColors: true,
      useGradient: false,
      useGameGlow: true
    });

    expect(elements.textColor.disabled).toBe(true);
    expect(elements.textUseGradient.disabled).toBe(true);
    expect(elements.textGradientStart.disabled).toBe(true);
    expect(elements.textGradientEnd.disabled).toBe(true);
    expect(elements.textGlowColor.disabled).toBe(true);

    const elements2 = createElements();
    setupCheckboxes(elements2);
    setTextCustomDisabledState(elements2, {
      ...DEFAULT_TEXT_STYLE_CUSTOM,
      useGameColors: false,
      useGradient: true,
      useGameGlow: false
    });

    expect(elements2.textColor.disabled).toBe(false);
    expect(elements2.textUseGradient.disabled).toBe(false);
    expect(elements2.textGradientStart.disabled).toBe(false);
    expect(elements2.textGradientEnd.disabled).toBe(false);
    expect(elements2.textGlowColor.disabled).toBe(false);
  });

  it("updates numeric value displays with formatted text", () => {
    const elements = createElements();
    updateTextCustomValueDisplays(elements, {
      ...DEFAULT_TEXT_STYLE_CUSTOM,
      fontWeight: 777,
      sizeScale: 1.2345,
      strokeWidth: 2.34,
      shadowBoost: 5,
      shadowOffsetY: -2,
      wobble: 1.27,
      spin: 0.3333,
      shimmer: 0.5
    });

    expect(elements.textFontWeightValue.textContent).toBe("777");
    expect(elements.textSizeScaleValue.textContent).toBe("x1.23");
    expect(elements.textStrokeWidthValue.textContent).toBe("2.3");
    expect(elements.textShadowBoostValue.textContent).toBe("5");
    expect(elements.textShadowOffsetYValue.textContent).toBe("-2");
    expect(elements.textWobbleValue.textContent).toBe("1.3");
    expect(elements.textSpinValue.textContent).toBe("0.33");
    expect(elements.textShimmerValue.textContent).toBe("0.50");
  });

  it("applies custom settings into inputs and disables derived fields", () => {
    const elements = createElements();
    setupCheckboxes(elements);

    const custom = {
      ...DEFAULT_TEXT_STYLE_CUSTOM,
      fontFamily: "mono",
      fontWeight: 700,
      sizeScale: 1.1,
      useGameColors: true,
      useGameGlow: false,
      color: "#123456",
      glowColor: "#abcdef",
      strokeColor: "#000111",
      strokeWidth: 2.2,
      shadowBoost: 4,
      shadowOffsetY: 6,
      wobble: 2,
      spin: -0.5,
      shimmer: 0.9,
      sparkle: true,
      useGradient: true,
      gradientStart: "#101010",
      gradientEnd: "#fefefe"
    };

    applyTextStyleCustomToUI(elements, custom);

    expect(elements.textFontFamily.value).toBe("mono");
    expect(elements.textFontWeight.value).toBe("700");
    expect(elements.textSizeScale.value).toBe("1.1");
    expect(elements.textUseGameColors.checked).toBe(true);
    expect(elements.textUseGameGlow.checked).toBe(false);
    expect(elements.textColor.value).toBe("#123456");
    expect(elements.textGlowColor.value).toBe("#abcdef");
    expect(elements.textStrokeColor.value).toBe("#000111");
    expect(elements.textStrokeWidth.value).toBe("2.2");
    expect(elements.textShadowBoost.value).toBe("4");
    expect(elements.textShadowOffsetY.value).toBe("6");
    expect(elements.textWobble.value).toBe("2");
    expect(elements.textSpin.value).toBe("-0.5");
    expect(elements.textShimmer.value).toBe("0.9");
    expect(elements.textSparkle.checked).toBe(true);
    expect(elements.textUseGradient.checked).toBe(true);
    expect(elements.textGradientStart.value).toBe("#101010");
    expect(elements.textGradientEnd.value).toBe("#fefefe");
    expect(elements.textColor.disabled).toBe(true);
    expect(elements.textGradientStart.disabled).toBe(true);
    expect(elements.textGlowColor.disabled).toBe(false);
  });

  it("normalizes UI values when reading custom styles", () => {
    const elements = createElements();
    setupCheckboxes(elements);

    elements.textFontFamily.value = "unknown";
    elements.textFontWeight.value = "2000";
    elements.textSizeScale.value = "0.2";
    elements.textUseGameColors.checked = false;
    elements.textUseGameGlow.checked = true;
    elements.textColor.value = "";
    elements.textGlowColor.value = "#222222";
    elements.textStrokeColor.value = "  ";
    elements.textStrokeWidth.value = "-1";
    elements.textShadowBoost.value = "50";
    elements.textShadowOffsetY.value = "-20";
    elements.textWobble.value = "9";
    elements.textSpin.value = "-2";
    elements.textShimmer.value = "2";
    elements.textSparkle.checked = true;
    elements.textUseGradient.checked = true;
    elements.textGradientStart.value = "#111111";
    elements.textGradientEnd.value = "";

    const normalized = readTextStyleCustomFromUI(elements);

    expect(normalized.fontFamily).toBe(DEFAULT_TEXT_STYLE_CUSTOM.fontFamily);
    expect(normalized.fontWeight).toBe(950);
    expect(normalized.sizeScale).toBe(0.7);
    expect(normalized.useGameColors).toBe(false);
    expect(normalized.useGameGlow).toBe(true);
    expect(normalized.color).toBe(DEFAULT_TEXT_STYLE_CUSTOM.color);
    expect(normalized.glowColor).toBe("#222222");
    expect(normalized.strokeColor).toBe(DEFAULT_TEXT_STYLE_CUSTOM.strokeColor);
    expect(normalized.strokeWidth).toBe(0);
    expect(normalized.shadowBoost).toBe(30);
    expect(normalized.shadowOffsetY).toBe(-6);
    expect(normalized.wobble).toBe(6);
    expect(normalized.spin).toBe(-1);
    expect(normalized.shimmer).toBe(1);
    expect(normalized.sparkle).toBe(true);
    expect(normalized.useGradient).toBe(true);
    expect(normalized.gradientStart).toBe("#111111");
    expect(normalized.gradientEnd).toBe(DEFAULT_TEXT_STYLE_CUSTOM.gradientEnd);
  });

  it("falls back to defaults when elements are missing", () => {
    const normalized = readTextStyleCustomFromUI(null);
    expect(normalized).toEqual(DEFAULT_TEXT_STYLE_CUSTOM);
  });
});
