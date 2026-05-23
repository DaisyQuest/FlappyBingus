export function createUIOrchestrator({
  buildGameUI,
  createMenuParallaxController,
  defaultConfig,
  document = window.document
} = {}) {
  const ui = buildGameUI({ document });
  const elements = { ...ui };

  const textStyleElements = {
    textFontFamily: elements.textFontFamily,
    textFontWeight: elements.textFontWeight,
    textFontWeightValue: elements.textFontWeightValue,
    textSizeScale: elements.textSizeScale,
    textSizeScaleValue: elements.textSizeScaleValue,
    textUseGameColors: elements.textUseGameColors,
    textColor: elements.textColor,
    textUseGameGlow: elements.textUseGameGlow,
    textGlowColor: elements.textGlowColor,
    textStrokeColor: elements.textStrokeColor,
    textStrokeWidth: elements.textStrokeWidth,
    textStrokeWidthValue: elements.textStrokeWidthValue,
    textShadowBoost: elements.textShadowBoost,
    textShadowBoostValue: elements.textShadowBoostValue,
    textShadowOffsetY: elements.textShadowOffsetY,
    textShadowOffsetYValue: elements.textShadowOffsetYValue,
    textWobble: elements.textWobble,
    textWobbleValue: elements.textWobbleValue,
    textSpin: elements.textSpin,
    textSpinValue: elements.textSpinValue,
    textShimmer: elements.textShimmer,
    textShimmerValue: elements.textShimmerValue,
    textSparkle: elements.textSparkle,
    textUseGradient: elements.textUseGradient,
    textGradientStart: elements.textGradientStart,
    textGradientEnd: elements.textGradientEnd
  };

  let menuParallaxControl = null;

  const setUIMode = (isUI) => {
    if (elements.canvas) {
      elements.canvas.style.pointerEvents = isUI ? "none" : "auto";
    }
    if (menuParallaxControl && elements.menu) {
      const active = isUI && !elements.menu.classList.contains("hidden");
      menuParallaxControl.setEnabled(active);
      if (active) menuParallaxControl.applyFromPoint();
    }
  };

  const updateSkillCooldownUI = (cfg) => {
    if (typeof elements.updateSkillCooldowns === "function") {
      elements.updateSkillCooldowns(cfg || defaultConfig);
    }
  };

  const initMenuParallax = () => {
    menuParallaxControl = createMenuParallaxController({
      panel: elements.menuPanel || elements.menu,
      layers: ui.menuParallaxLayers || []
    });
    return menuParallaxControl;
  };

  return {
    ui,
    elements,
    textStyleElements,
    setUIMode,
    updateSkillCooldownUI,
    initMenuParallax
  };
}
