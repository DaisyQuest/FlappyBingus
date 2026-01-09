import { clamp, lerp } from "../util.js";

const DEFAULT_MIN_SEGMENT = 10;

function clampSegment(start, end, max) {
  const a = clamp(start, 0, max);
  const b = clamp(end, 0, max);
  if (b <= a) return null;
  return { start: a, end: b };
}

export function computeWallWarningSegments({ side, gapCenter, gapSize, width, height, minSegment = DEFAULT_MIN_SEGMENT }) {
  const segments = [];
  const gapHalf = gapSize * 0.5;

  if (side === 0 || side === 1) {
    const top = gapCenter - gapHalf;
    const bot = gapCenter + gapHalf;
    const topLen = clamp(top, minSegment, height);
    const botLen = clamp(height - bot, minSegment, height);

    if (topLen > minSegment) {
      const seg = clampSegment(0, topLen, height);
      if (seg) segments.push(seg);
    }
    if (botLen > minSegment) {
      const seg = clampSegment(bot, bot + botLen, height);
      if (seg) segments.push(seg);
    }
    return segments;
  }

  const left = gapCenter - gapHalf;
  const right = gapCenter + gapHalf;
  const leftLen = clamp(left, minSegment, width);
  const rightLen = clamp(width - right, minSegment, width);

  if (leftLen > minSegment) {
    const seg = clampSegment(0, leftLen, width);
    if (seg) segments.push(seg);
  }
  if (rightLen > minSegment) {
    const seg = clampSegment(right, right + rightLen, width);
    if (seg) segments.push(seg);
  }
  return segments;
}

export function computeSinglePipeWarningSegments({ side, x, y, w, h, width, height }) {
  if (side === 0 || side === 1) {
    const seg = clampSegment(y, y + h, height);
    return seg ? [seg] : [];
  }
  const seg = clampSegment(x, x + w, width);
  return seg ? [seg] : [];
}

export function computeWarningAlpha({ time, flashHz, minAlpha, maxAlpha }) {
  const safeHz = Math.max(0, Number(flashHz) || 0);
  const safeMin = clamp(Number(minAlpha) || 0, 0, 1);
  const safeMax = clamp(Number(maxAlpha) || 0, 0, 1);
  if (safeHz <= 0 || safeMax <= safeMin) return safeMin;
  const pulse = Math.abs(Math.sin(time * Math.PI * 2 * safeHz));
  return lerp(safeMin, safeMax, pulse);
}
