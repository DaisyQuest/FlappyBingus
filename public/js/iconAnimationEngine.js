// =====================
// FILE: public/js/iconAnimationEngine.js
// Deterministic animation sampling for icon styles.
// =====================
import { ANIMATION_TYPES } from "./iconStyleV2.js";

const CONTINUOUS_TYPES = new Set([
  "pulseUniform",
  "slowSpin",
  "breathingGlow",
  "rimOrbitLight",
  "shimmerSweep",
  "colorShift",
  "patternScroll",
  "patternRotate",
  "grainDrift",
  "scanlineDrift",
  "heartbeat",
  "tickPulse",
  "legacy_lava",
  "legacy_cape_flow",
  "legacy_zigzag_scroll"
]);

const EVENT_TYPES = new Set([
  "radialRipple",
  "centerFlash",
  "sparkBloom",
  "shockRing",
  "hitFlash"
]);

const EASING = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  smoothStep: (t) => t * t * (3 - 2 * t)
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(seed) {
  const str = String(seed ?? "0");
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededNoise(seed, t = 0) {
  const h = hashSeed(seed);
  const x = Math.sin((h + 1) * 0.0001 + t * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function resolveTimingProgress(timeMs, timing = {}, mode = "loop") {
  const duration = Math.max(1, Number(timing.durationMs) || 1000);
  const delay = Math.max(0, Number(timing.delayMs) || 0);
  const phaseOffset = clamp(Number(timing.phaseOffset) || 0, 0, 1);
  const t = Math.max(0, timeMs - delay) / duration;
  if (mode === "once") return clamp(t, 0, 1);
  if (mode === "pingpong") {
    const cycle = t % 2;
    return cycle > 1 ? 2 - cycle : cycle;
  }
  return (t + phaseOffset) % 1;
}

function easingValue(mode, t) {
  const easing = EASING[mode] || EASING.linear;
  return easing(clamp(t, 0, 1));
}

function parseColor(color) {
  if (typeof color !== "string") return null;
  const trimmed = color.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const value = hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex.length === 4
        ? hex.slice(0, 3).split("").map((c) => c + c).join("")
        : hex.length >= 6
          ? hex.slice(0, 6)
          : "";
    if (value.length === 6) {
      const num = Number.parseInt(value, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        a: 1
      };
    }
  }
  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((p) => p.trim());
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts[3] !== undefined ? Number(parts[3]) : 1;
    if ([r, g, b].every((v) => Number.isFinite(v))) {
      return { r, g, b, a: Number.isFinite(a) ? a : 1 };
    }
  }
  return null;
}

function rgbToHsl({ r, g, b, a = 1 }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s, l, a };
}

function hslToRgb({ h, s, l, a = 1 }) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a
  };
}

function formatRgba({ r, g, b, a = 1 }) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 1000) / 1000})`;
}

function resolveEventProgress(events = [], type, timeMs, durationMs) {
  if (!Array.isArray(events) || !events.length) return null;
  const matches = events.filter((evt) => evt?.type === type && Number.isFinite(evt.timeMs) && evt.timeMs <= timeMs);
  if (!matches.length) return null;
  const latest = matches.reduce((a, b) => (a.timeMs > b.timeMs ? a : b));
  const elapsed = timeMs - latest.timeMs;
  if (elapsed < 0 || elapsed > durationMs) return null;
  return clamp(elapsed / durationMs, 0, 1);
}

function cloneStyle(style) {
  return structuredClone ? structuredClone(style) : JSON.parse(JSON.stringify(style));
}

function readPath(root, path) {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let ref = root;
  for (const part of parts) {
    if (!ref) return undefined;
    ref = ref[part];
  }
  return ref;
}

function setPath(root, path, value) {
  if (!path) return false;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let ref = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!ref[key] || typeof ref[key] !== "object") {
      const nextKey = parts[i + 1];
      ref[key] = Number.isFinite(Number(nextKey)) ? [] : {};
    }
    ref = ref[key];
  }
  const last = parts[parts.length - 1];
  ref[last] = value;
  return true;
}

function applyNumeric(base, t, { amplitude = 1, offset = 0, min, max } = {}) {
  const value = base + offset + amplitude * t;
  if (min !== undefined || max !== undefined) {
    return clamp(value, min ?? value, max ?? value);
  }
  return value;
}

function sampleAnimationValue(type, baseValue, t, params = {}, seed, events, timing, timeMs = 0) {
  switch (type) {
    case "pulseUniform": {
      const min = Number.isFinite(params.min) ? params.min : 0.92;
      const max = Number.isFinite(params.max) ? params.max : 1.05;
      return min + (max - min) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    }
    case "slowSpin": {
      const speed = Number.isFinite(params.speedDeg) ? params.speedDeg : 30;
      return (Number(baseValue) || 0) + speed * t * 360;
    }
    case "breathingGlow": {
      const amp = Number.isFinite(params.amplitude) ? params.amplitude : 0.35;
      return applyNumeric(Number(baseValue) || 0, Math.sin(t * Math.PI * 2), { amplitude: amp });
    }
    case "rimOrbitLight":
    case "shimmerSweep": {
      return t;
    }
    case "colorShift": {
      const color = parseColor(baseValue || params.baseColor);
      if (!color) return baseValue;
      const hsl = rgbToHsl(color);
      const shift = Number.isFinite(params.maxShiftDeg) ? params.maxShiftDeg : 18;
      const noise = (seededNoise(seed, t) - 0.5) * 2;
      const hue = hsl.h + shift * Math.sin(t * Math.PI * 2) + noise * 6;
      return formatRgba(hslToRgb({ h: hue, s: hsl.s, l: hsl.l, a: hsl.a }));
    }
    case "patternScroll": {
      const radius = Number.isFinite(params.radius) ? params.radius : 0.35;
      return {
        x: radius * Math.cos(t * Math.PI * 2),
        y: radius * Math.sin(t * Math.PI * 2)
      };
    }
    case "patternRotate": {
      const speed = Number.isFinite(params.speedDeg) ? params.speedDeg : 60;
      return (Number(baseValue) || 0) + speed * t * 360;
    }
    case "grainDrift":
    case "scanlineDrift": {
      const speed = Number.isFinite(params.speed) ? params.speed : 0.2;
      return { x: Math.sin(t * Math.PI * 2) * speed, y: Math.cos(t * Math.PI * 2) * speed };
    }
    case "heartbeat": {
      const pulse = Math.abs(Math.sin(t * Math.PI * 2)) ** 3;
      return applyNumeric(Number(baseValue) || 0, pulse, { amplitude: params.amplitude ?? 0.12 });
    }
    case "tickPulse": {
      const pulse = t < 0.1 ? 1 - t / 0.1 : 0;
      return applyNumeric(Number(baseValue) || 0, pulse, { amplitude: params.amplitude ?? 0.15 });
    }
    case "radialRipple":
    case "centerFlash":
    case "sparkBloom":
    case "shockRing":
    case "hitFlash": {
      const duration = Math.max(60, Number(timing?.durationMs) || 400);
      const progress = resolveEventProgress(events, params.eventType || type, timeMs, duration);
      if (progress === null) return baseValue;
      return progress;
    }
    default:
      return baseValue;
  }
}

function applyAnimationsToStyle(style, animations = [], {
  timeMs = 0,
  seed = 0,
  events = [],
  reducedMotion = false
} = {}) {
  const next = cloneStyle(style);
  const preview = { scale: 1 };

  animations.forEach((anim) => {
    if (!anim || anim.enabled === false) return;
    if (!ANIMATION_TYPES.includes(anim.type)) return;
    if (reducedMotion && CONTINUOUS_TYPES.has(anim.type) && !EVENT_TYPES.has(anim.type)) return;
    const timing = anim.timing || {};
    const mode = timing.mode || "loop";
    const rawT = resolveTimingProgress(timeMs, timing, mode);
    const eased = easingValue(timing.easing, rawT);
    const target = anim.target || "";
    const baseValue = target === "preview.scale" ? preview.scale : readPath(next, target);
    const value = sampleAnimationValue(anim.type, baseValue, eased, anim.params, anim.seed ?? seed, events, timing, timeMs);

    if (target === "preview.scale") {
      preview.scale = clamp(Number(value) || preview.scale, 0.9, 1.1);
    } else if (value !== undefined) {
      setPath(next, target, value);
    }
  });

  return { style: next, preview };
}

export {
  CONTINUOUS_TYPES,
  EVENT_TYPES,
  resolveTimingProgress,
  easingValue,
  seededNoise,
  applyAnimationsToStyle
};
