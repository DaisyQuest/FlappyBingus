// =====================
// FILE: public/js/uiStyles.js
// =====================
import { clamp, hsla } from "./util.js";

const ORB_COMBO_CAP = 14;
const PERFECT_COMBO_CAP = 10;
const DEFAULT_POPUP_OFFSET = 1.35;

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

export function popupAnchor(player, scale = DEFAULT_POPUP_OFFSET) {
  const r = Math.max(1, player?.r ?? 18);
  const dx = r * 0.95 * scale;
  const dy = r * 1.15 * scale;
  return {
    x: (player?.x ?? 0) + dx,
    y: (player?.y ?? 0) - dy
  };
}

export const __testables = { ORB_COMBO_CAP, PERFECT_COMBO_CAP, DEFAULT_POPUP_OFFSET };
