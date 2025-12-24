// =====================
// FILE: public/js/displayScale.js
// =====================
import { clamp } from "./util.js";

export const DEFAULT_REFERENCE_RESOLUTION = { width: 2560, height: 1440 };
export const DEFAULT_SCALE_CLAMP = { min: 0.5, max: 1.5 };

const toPositive = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function resolveGameplayScale(display = {}, cssW, cssH) {
  const reference = display.reference || DEFAULT_REFERENCE_RESOLUTION;
  const scaleClamp = display.scaleClamp || DEFAULT_SCALE_CLAMP;
  const refW = toPositive(reference.width, DEFAULT_REFERENCE_RESOLUTION.width);
  const refH = toPositive(reference.height, DEFAULT_REFERENCE_RESOLUTION.height);
  const minScale = toPositive(scaleClamp.min, DEFAULT_SCALE_CLAMP.min);
  const maxScale = toPositive(scaleClamp.max, DEFAULT_SCALE_CLAMP.max);
  const safeMin = Math.min(minScale, maxScale);
  const safeMax = Math.max(minScale, maxScale);

  const width = Math.max(1, Number(cssW) || 1);
  const height = Math.max(1, Number(cssH) || 1);
  const rawScale = Math.min(width / refW, height / refH);
  const safeRaw = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  return clamp(safeRaw, safeMin, safeMax);
}
