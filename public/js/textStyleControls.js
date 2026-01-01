// ===============================
// FILE: public/js/textStyleControls.js
// ===============================
import { DEFAULT_TEXT_STYLE_CUSTOM, normalizeTextStyleCustom } from "./settings.js";

export function setTextCustomDisabledState(elements, custom = DEFAULT_TEXT_STYLE_CUSTOM) {
  const {
    textColor,
    textUseGradient,
    textGradientStart,
    textGradientEnd,
    textUseGameColors,
    textGlowColor,
    textUseGameGlow
  } = elements || {};

  const disableColors = !!custom.useGameColors;
  if (textColor) textColor.disabled = disableColors;
  if (textUseGradient) textUseGradient.disabled = disableColors;
  if (textGradientStart) textGradientStart.disabled = disableColors || !custom.useGradient;
  if (textGradientEnd) textGradientEnd.disabled = disableColors || !custom.useGradient;

  const disableGlow = !!custom.useGameGlow;
  if (textGlowColor) textGlowColor.disabled = disableGlow;
}

export function updateTextCustomValueDisplays(elements, custom = DEFAULT_TEXT_STYLE_CUSTOM) {
  const {
    textFontWeightValue,
    textSizeScaleValue,
    textStrokeWidthValue,
    textShadowBoostValue,
    textShadowOffsetYValue,
    textWobbleValue,
    textSpinValue,
    textShimmerValue
  } = elements || {};

  if (textFontWeightValue) textFontWeightValue.textContent = `${custom.fontWeight}`;
  if (textSizeScaleValue) textSizeScaleValue.textContent = `x${custom.sizeScale.toFixed(2)}`;
  if (textStrokeWidthValue) textStrokeWidthValue.textContent = custom.strokeWidth.toFixed(1);
  if (textShadowBoostValue) textShadowBoostValue.textContent = `${custom.shadowBoost}`;
  if (textShadowOffsetYValue) textShadowOffsetYValue.textContent = `${custom.shadowOffsetY}`;
  if (textWobbleValue) textWobbleValue.textContent = custom.wobble.toFixed(1);
  if (textSpinValue) textSpinValue.textContent = custom.spin.toFixed(2);
  if (textShimmerValue) textShimmerValue.textContent = custom.shimmer.toFixed(2);
}

export function applyTextStyleCustomToUI(elements, custom = DEFAULT_TEXT_STYLE_CUSTOM) {
  const {
    textFontFamily,
    textFontWeight,
    textSizeScale,
    textUseGameColors,
    textColor,
    textUseGameGlow,
    textGlowColor,
    textStrokeColor,
    textStrokeWidth,
    textShadowBoost,
    textShadowOffsetY,
    textWobble,
    textSpin,
    textShimmer,
    textSparkle,
    textUseGradient,
    textGradientStart,
    textGradientEnd
  } = elements || {};

  if (textFontFamily) textFontFamily.value = custom.fontFamily;
  if (textFontWeight) textFontWeight.value = String(custom.fontWeight);
  if (textSizeScale) textSizeScale.value = String(custom.sizeScale);
  if (textUseGameColors) textUseGameColors.checked = custom.useGameColors;
  if (textColor) textColor.value = custom.color;
  if (textUseGameGlow) textUseGameGlow.checked = custom.useGameGlow;
  if (textGlowColor) textGlowColor.value = custom.glowColor;
  if (textStrokeColor) textStrokeColor.value = custom.strokeColor;
  if (textStrokeWidth) textStrokeWidth.value = String(custom.strokeWidth);
  if (textShadowBoost) textShadowBoost.value = String(custom.shadowBoost);
  if (textShadowOffsetY) textShadowOffsetY.value = String(custom.shadowOffsetY);
  if (textWobble) textWobble.value = String(custom.wobble);
  if (textSpin) textSpin.value = String(custom.spin);
  if (textShimmer) textShimmer.value = String(custom.shimmer);
  if (textSparkle) textSparkle.checked = custom.sparkle;
  if (textUseGradient) textUseGradient.checked = custom.useGradient;
  if (textGradientStart) textGradientStart.value = custom.gradientStart;
  if (textGradientEnd) textGradientEnd.value = custom.gradientEnd;

  updateTextCustomValueDisplays(elements, custom);
  setTextCustomDisabledState(elements, custom);
}

export function readTextStyleCustomFromUI(elements, fallback = DEFAULT_TEXT_STYLE_CUSTOM) {
  const {
    textFontFamily,
    textFontWeight,
    textSizeScale,
    textUseGameColors,
    textColor,
    textUseGameGlow,
    textGlowColor,
    textStrokeColor,
    textStrokeWidth,
    textShadowBoost,
    textShadowOffsetY,
    textWobble,
    textSpin,
    textShimmer,
    textSparkle,
    textUseGradient,
    textGradientStart,
    textGradientEnd
  } = elements || {};

  return normalizeTextStyleCustom({
    fontFamily: textFontFamily?.value ?? fallback.fontFamily,
    fontWeight: textFontWeight?.value ?? fallback.fontWeight,
    sizeScale: textSizeScale?.value ?? fallback.sizeScale,
    useGameColors: textUseGameColors?.checked ?? fallback.useGameColors,
    useGameGlow: textUseGameGlow?.checked ?? fallback.useGameGlow,
    color: textColor?.value ?? fallback.color,
    glowColor: textGlowColor?.value ?? fallback.glowColor,
    strokeColor: textStrokeColor?.value ?? fallback.strokeColor,
    strokeWidth: textStrokeWidth?.value ?? fallback.strokeWidth,
    shadowBoost: textShadowBoost?.value ?? fallback.shadowBoost,
    shadowOffsetY: textShadowOffsetY?.value ?? fallback.shadowOffsetY,
    wobble: textWobble?.value ?? fallback.wobble,
    spin: textSpin?.value ?? fallback.spin,
    shimmer: textShimmer?.value ?? fallback.shimmer,
    sparkle: textSparkle?.checked ?? fallback.sparkle,
    useGradient: textUseGradient?.checked ?? fallback.useGradient,
    gradientStart: textGradientStart?.value ?? fallback.gradientStart,
    gradientEnd: textGradientEnd?.value ?? fallback.gradientEnd
  });
}
