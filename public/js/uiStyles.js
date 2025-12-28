// =====================
// FILE: public/js/uiStyles.js
// =====================
import { clamp, hsla } from "./util.js";

const ORB_COMBO_CAP = 14;
const PERFECT_COMBO_CAP = 10;
const COMBO_AURA_THRESHOLDS = Object.freeze({
  yellowAt: 20,
  redAt: 30,
  flameAt: 35
});

function pastelStop(hue, flair, light = 86, sat = 62, alpha = 0.95) {
  return hsla(hue, sat - flair * 12, light + flair * 6, alpha);
}

export function comboFlair(combo = 0, cap = ORB_COMBO_CAP) {
  return clamp((combo | 0) / Math.max(1, cap), 0, 1);
}

export function buildScorePopupStyle({ combo = 0, variant = "orb" } = {}) {
  const cap = variant === "perfect" ? PERFECT_COMBO_CAP : ORB_COMBO_CAP;
  const flair = comboFlair(combo, cap);
  const hueBase = (variant === "perfect" ? 250 : 205) + combo * 11;
  const pastel = [
    pastelStop(hueBase, flair, 88, 64, 0.96),
    pastelStop(hueBase + 34, flair, 92, 60, 0.94),
    pastelStop(hueBase + 74, flair, 90, 58, 0.90)
  ];

  if (variant === "perfect") {
    pastel.unshift(pastelStop(hueBase - 26, flair, 94, 58, 0.90));
  }

  const sizeBase = variant === "perfect" ? 24 : 20;
  const wobbleBase = 3.2;
  const spinBase = 0.14;
  const shimmerBase = 0.28;

  return {
    color: pastel[0],
    palette: pastel,
    glowColor: hsla(hueBase + 16, 86, 88 + flair * 5, 0.95),
    strokeColor: "rgba(255,255,255,.92)",
    strokeWidth: 2.8 + flair * 1.6,
    size: sizeBase + flair * (variant === "perfect" ? 18 : 12),
    wobble: wobbleBase + flair * 8,
    spin: spinBase + flair * 0.36,
    shimmer: shimmerBase + flair * 0.45,
    sparkle: combo >= (variant === "perfect" ? 1 : 4),
    combo,
    comboMax: cap
  };
}

function comboAuraHue(combo) {
  const safeCombo = Math.max(0, Math.floor(Number(combo) || 0));
  if (safeCombo <= COMBO_AURA_THRESHOLDS.yellowAt) {
    const t = safeCombo / COMBO_AURA_THRESHOLDS.yellowAt;
    return 120 + (50 - 120) * t;
  }
  if (safeCombo <= COMBO_AURA_THRESHOLDS.redAt) {
    const t = (safeCombo - COMBO_AURA_THRESHOLDS.yellowAt)
      / Math.max(1, COMBO_AURA_THRESHOLDS.redAt - COMBO_AURA_THRESHOLDS.yellowAt);
    return 50 + (8 - 50) * t;
  }
  const t = (safeCombo - COMBO_AURA_THRESHOLDS.redAt)
    / Math.max(1, COMBO_AURA_THRESHOLDS.flameAt - COMBO_AURA_THRESHOLDS.redAt);
  return 8 + (4 - 8) * clamp(t, 0, 1);
}

export function buildComboAuraStyle({ combo = 0, comboMax = COMBO_AURA_THRESHOLDS.flameAt, timerRatio = 1 } = {}) {
  const safeCombo = Math.max(0, Math.floor(Number(combo) || 0));
  const safeMax = Math.max(1, Math.floor(Number(comboMax) || 1));
  const safeTimer = clamp(Number(timerRatio) || 0, 0, 1);
  if (safeCombo <= 0) {
    return {
      active: false,
      combo: safeCombo,
      comboMax: safeMax,
      timerRatio: safeTimer,
      hue: comboAuraHue(0),
      energy: 0,
      fade: 0,
      fill: 0,
      ringAlpha: 0,
      glowAlpha: 0,
      coreColor: hsla(120, 70, 60, 0),
      ringColor: hsla(120, 70, 50, 0),
      glowColor: hsla(120, 70, 60, 0),
      flame: 0
    };
  }

  const hue = comboAuraHue(safeCombo);
  const energy = clamp(safeCombo / COMBO_AURA_THRESHOLDS.flameAt, 0, 1);
  const fade = 0.25 + 0.75 * safeTimer;
  const fill = clamp(safeCombo / safeMax, 0, 1);
  const ringAlpha = 0.55 + 0.35 * energy;
  const glowAlpha = 0.4 + 0.45 * energy;
  const coreLight = 64 + energy * 12;
  const glowLight = 58 + energy * 18;
  const ringLight = 52 + energy * 16;
  const flame = safeCombo >= COMBO_AURA_THRESHOLDS.flameAt
    ? clamp((safeCombo - COMBO_AURA_THRESHOLDS.flameAt + 1) / 6, 0, 1) * fade
    : 0;

  return {
    active: true,
    combo: safeCombo,
    comboMax: safeMax,
    timerRatio: safeTimer,
    hue,
    energy,
    fade,
    fill,
    ringAlpha: ringAlpha * fade,
    glowAlpha: glowAlpha * fade,
    coreColor: hsla(hue, 88, coreLight, 0.65 * fade),
    ringColor: hsla(hue, 92, ringLight, 0.95 * fade),
    glowColor: hsla(hue, 92, glowLight, 0.75 * fade),
    flame
  };
}

export { COMBO_AURA_THRESHOLDS };

export const __testables = { ORB_COMBO_CAP, PERFECT_COMBO_CAP, COMBO_AURA_THRESHOLDS };
