// =====================
// FILE: public/js/pipeTextures.js
// =====================
import { hexToRgb, hsla, lerpC, rgb, shade } from "./util.js";
import { normalizeUnlock } from "./unlockables.js";

export const PIPE_TEXTURE_MODES = Object.freeze([
  "MONOCHROME",
  "MINIMAL",
  "NORMAL",
  "HIGH",
  "ULTRA"
]);

export const DEFAULT_PIPE_TEXTURE_ID = "basic";
export const DEFAULT_PIPE_TEXTURE_MODE = "NORMAL";

const PIPE_TEXTURE_MODE_SETTINGS = Object.freeze({
  MONOCHROME: { detail: 0, stripeAlpha: 0.08, noiseAlpha: 0.0, glow: 0.1 },
  MINIMAL: { detail: 1, stripeAlpha: 0.12, noiseAlpha: 0.06, glow: 0.16 },
  NORMAL: { detail: 2, stripeAlpha: 0.18, noiseAlpha: 0.12, glow: 0.22 },
  HIGH: { detail: 3, stripeAlpha: 0.24, noiseAlpha: 0.18, glow: 0.3 },
  ULTRA: { detail: 4, stripeAlpha: 0.3, noiseAlpha: 0.26, glow: 0.38 }
});

export const PIPE_TEXTURES = Object.freeze([
  {
    id: "basic",
    name: "Basic",
    description: "Classic gradient pipe.",
    unlock: { type: "free", label: "Free" }
  },
  {
    id: "digital",
    name: "Digital",
    description: "Terminal-style hex flow.",
    unlock: { type: "score", minScore: 150, label: "Score 150+" }
  },
  {
    id: "tiger",
    name: "Tiger",
    description: "Tiger stripes on a bright pipe.",
    unlock: { type: "score", minScore: 300, label: "Score 300+" }
  },
  {
    id: "dark_tiger",
    name: "DarkTiger",
    description: "Tiger stripes with darker contrast.",
    unlock: { type: "score", minScore: 450, label: "Score 450+" }
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Animated rainbow gradient.",
    unlock: { type: "score", minScore: 600, label: "Score 600+" }
  },
  {
    id: "negarainbow",
    name: "Negarainbow",
    description: "Negative rainbow spectrum.",
    unlock: { type: "score", minScore: 800, label: "Score 800+" }
  },
  {
    id: "tv_static",
    name: "TV Static",
    description: "Noisy static flicker.",
    unlock: { type: "score", minScore: 1000, label: "Score 1000+" }
  },
  {
    id: "metal",
    name: "Metal",
    description: "Polished metallic sheen.",
    unlock: { type: "score", minScore: 1200, label: "Score 1200+" }
  },
  {
    id: "glass",
    name: "Glass",
    description: "Translucent glass tubing.",
    unlock: { type: "score", minScore: 1400, label: "Score 1400+" }
  },
  {
    id: "metal_glass",
    name: "MetalGlass",
    description: "Hybrid metal + glass reflections.",
    unlock: { type: "score", minScore: 1600, label: "Score 1600+" }
  },
  {
    id: "checkboard",
    name: "Checkboard",
    description: "Checkerboard with white tiles.",
    unlock: { type: "score", minScore: 1800, label: "Score 1800+" }
  },
  {
    id: "checkerboard2",
    name: "Checkerboard2",
    description: "Checkerboard with black tiles.",
    unlock: { type: "score", minScore: 2000, label: "Score 2000+" }
  }
]);

export function normalizePipeTextureMode(mode) {
  if (!mode || typeof mode !== "string") return DEFAULT_PIPE_TEXTURE_MODE;
  const upper = mode.toUpperCase();
  return PIPE_TEXTURE_MODES.includes(upper) ? upper : DEFAULT_PIPE_TEXTURE_MODE;
}

export function normalizePipeTextures(list) {
  const src = Array.isArray(list) ? list : [];
  const seen = new Set();
  const out = [];

  for (const texture of src) {
    if (!texture || typeof texture !== "object") continue;
    const id = typeof texture.id === "string" && texture.id.trim() ? texture.id.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof texture.name === "string" && texture.name.trim() ? texture.name.trim() : id;
    out.push({
      ...texture,
      id,
      name,
      unlock: normalizeUnlock(texture.unlock)
    });
  }

  return out.length
    ? out
    : PIPE_TEXTURES.map((t) => ({ ...t, unlock: normalizeUnlock(t.unlock) }));
}

export function getPipeTextureDisplayName(id, textures = PIPE_TEXTURES) {
  if (!id) return DEFAULT_PIPE_TEXTURE_ID;
  return (textures || []).find((t) => t.id === id)?.name || id || DEFAULT_PIPE_TEXTURE_ID;
}

function baseGradient(ctx, p, base) {
  const edge = shade(base, 0.72);
  const hi = shade(base, 1.12);
  const g = (p.w >= p.h)
    ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
    : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  g.addColorStop(0, rgb(edge, 0.95));
  g.addColorStop(0.45, rgb(base, 0.92));
  g.addColorStop(1, rgb(hi, 0.95));
  return g;
}

function drawStripeOverlay(ctx, p, alpha, step = 10) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,.9)";
  if (p.w >= p.h) {
    for (let sx = p.x + 6; sx < p.x + p.w; sx += step) ctx.fillRect(sx, p.y + 2, 2, p.h - 4);
  } else {
    for (let sy = p.y + 6; sy < p.y + p.h; sy += step) ctx.fillRect(p.x + 2, sy, p.w - 4, 2);
  }
}

function drawTiger(ctx, p, base, { stripeColor = "#fff", detail = 2 } = {}) {
  ctx.fillStyle = rgb(base, 0.96);
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const stripeWidth = Math.max(6, Math.min(p.w, p.h) * (0.18 + detail * 0.02));
  ctx.save();
  ctx.translate(p.x + p.w * 0.5, p.y + p.h * 0.5);
  ctx.rotate(-0.6);
  ctx.translate(-p.w * 0.5, -p.h * 0.5);
  ctx.fillStyle = stripeColor;
  for (let x = -p.w; x < p.w * 2; x += stripeWidth * 1.6) {
    ctx.fillRect(x, -p.h, stripeWidth, p.h * 3);
  }
  ctx.restore();
}

function drawRainbow(ctx, p, { time = 0, invert = false, monoBase = null } = {}) {
  const g = (p.w >= p.h)
    ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
    : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);

  if (monoBase) {
    g.addColorStop(0, rgb(shade(monoBase, 0.6), 0.95));
    g.addColorStop(0.5, rgb(shade(monoBase, 1.1), 0.95));
    g.addColorStop(1, rgb(shade(monoBase, 0.75), 0.95));
  } else {
    const baseHue = (time * 60 + (invert ? 180 : 0)) % 360;
    const stops = 6;
    for (let i = 0; i <= stops; i++) {
      const hue = (baseHue + i * (360 / stops)) % 360;
      const light = invert ? 34 : 52;
      g.addColorStop(i / stops, hsla(hue, 80, light, 0.95));
    }
  }

  ctx.fillStyle = g;
  ctx.fillRect(p.x, p.y, p.w, p.h);
}

function drawStatic(ctx, p, { time = 0, alpha = 0.18, detail = 2 } = {}) {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const cells = Math.max(6, Math.floor((Math.min(p.w, p.h) / 6) * (detail + 1)));
  const stepX = p.w / cells;
  const stepY = p.h / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const n = Math.sin((x * 12.9898 + y * 78.233 + time * 4.1)) * 43758.5453;
      const shadeVal = 0.35 + 0.65 * (n - Math.floor(n));
      ctx.fillStyle = `rgba(${Math.floor(shadeVal * 255)},${Math.floor(shadeVal * 255)},${Math.floor(shadeVal * 255)},${alpha})`;
      ctx.fillRect(p.x + x * stepX, p.y + y * stepY, stepX + 0.5, stepY + 0.5);
    }
  }
}

function drawCheckerboard(ctx, p, { light = "#fff", dark = "#000", detail = 2 } = {}) {
  const tiles = Math.max(3, Math.floor((Math.min(p.w, p.h) / 10) * (detail + 1)));
  const w = p.w / tiles;
  const h = p.h / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
      ctx.fillRect(p.x + x * w, p.y + y * h, w + 0.5, h + 0.5);
    }
  }
}

function drawDigital(ctx, p, base, { time = 0, detail = 2 } = {}) {
  ctx.fillStyle = "rgba(2,6,12,0.9)";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const hex = `#${((base.r << 16) | (base.g << 8) | base.b).toString(16).padStart(6, "0")}`.toUpperCase();
  const lines = Math.max(3, Math.floor((Math.min(p.w, p.h) / 14) * (detail + 1)));
  const step = p.h / lines;
  ctx.save();
  ctx.font = `${Math.max(9, step * 0.45)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
  ctx.fillStyle = rgb(base, 0.85);
  ctx.shadowColor = rgb(base, 0.6);
  ctx.shadowBlur = 8;
  const flow = (time * 40) % (step * 2);
  for (let i = 0; i < lines; i++) {
    const y = p.y + i * step + flow;
    ctx.fillText(hex, p.x + 6, y);
    if (detail > 1) ctx.fillText(hex, p.x + p.w * 0.5, y - step * 0.4);
  }
  ctx.restore();
}

function drawMetal(ctx, p, base, { detail = 2 } = {}) {
  const dark = shade(base, 0.55);
  const hi = shade(base, 1.25);
  const g = (p.w >= p.h)
    ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
    : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  g.addColorStop(0, rgb(dark, 0.95));
  g.addColorStop(0.2, rgb(hi, 0.9));
  g.addColorStop(0.45, rgb(base, 0.95));
  g.addColorStop(0.7, rgb(hi, 0.88));
  g.addColorStop(1, rgb(dark, 0.95));
  ctx.fillStyle = g;
  ctx.fillRect(p.x, p.y, p.w, p.h);

  if (detail >= 2) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(255,255,255,.7)";
    const step = Math.max(8, Math.min(p.w, p.h) * 0.25);
    for (let i = p.x; i < p.x + p.w; i += step) {
      ctx.fillRect(i, p.y, step * 0.2, p.h);
    }
  }
}

function drawGlass(ctx, p, base, { detail = 2 } = {}) {
  const glass = lerpC(base, hexToRgb("#ffffff"), 0.45);
  ctx.fillStyle = rgb(glass, 0.35);
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = rgb(glass, 0.65);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(p.x + 0.7, p.y + 0.7, p.w - 1.4, p.h - 1.4);

  if (detail >= 2) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillRect(p.x + p.w * 0.1, p.y + p.h * 0.08, p.w * 0.22, p.h * 0.84);
  }
}

function drawMetalGlass(ctx, p, base, opts = {}) {
  drawMetal(ctx, p, base, opts);
  drawGlass(ctx, p, base, { detail: Math.max(1, (opts.detail || 2) - 1) });
}

export function drawPipeTexture(ctx, p, base, {
  textureId = DEFAULT_PIPE_TEXTURE_ID,
  mode = DEFAULT_PIPE_TEXTURE_MODE,
  time = 0
} = {}) {
  if (!ctx || !p) return;
  const resolvedMode = normalizePipeTextureMode(mode);
  const settings = PIPE_TEXTURE_MODE_SETTINGS[resolvedMode] || PIPE_TEXTURE_MODE_SETTINGS.NORMAL;
  const detail = settings.detail;
  const toneBase = resolvedMode === "MONOCHROME"
    ? (() => {
      const avg = Math.round((base.r + base.g + base.b) / 3);
      return { r: avg, g: avg, b: avg };
    })()
    : base;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  switch (textureId) {
    case "basic":
      ctx.fillStyle = baseGradient(ctx, p, toneBase);
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x + 0.75, p.y + 0.75, p.w - 1.5, p.h - 1.5);
      drawStripeOverlay(ctx, p, settings.stripeAlpha, 10 - detail);
      break;
    case "digital":
      drawDigital(ctx, p, toneBase, { time, detail });
      break;
    case "tiger":
      drawTiger(ctx, p, toneBase, { stripeColor: "#ffffff", detail });
      break;
    case "dark_tiger":
      drawTiger(ctx, p, toneBase, { stripeColor: "#111827", detail });
      break;
    case "rainbow":
      drawRainbow(ctx, p, { time, invert: false, monoBase: resolvedMode === "MONOCHROME" ? toneBase : null });
      break;
    case "negarainbow":
      drawRainbow(ctx, p, { time, invert: true, monoBase: resolvedMode === "MONOCHROME" ? toneBase : null });
      break;
    case "tv_static":
      drawStatic(ctx, p, { time, alpha: settings.noiseAlpha, detail });
      break;
    case "metal":
      drawMetal(ctx, p, toneBase, { detail });
      break;
    case "glass":
      drawGlass(ctx, p, toneBase, { detail });
      break;
    case "metal_glass":
      drawMetalGlass(ctx, p, toneBase, { detail });
      break;
    case "checkboard":
      drawCheckerboard(ctx, p, { light: "#ffffff", dark: rgb(toneBase, 0.85), detail });
      break;
    case "checkerboard2":
      drawCheckerboard(ctx, p, { light: rgb(toneBase, 0.85), dark: "#0b0f18", detail });
      break;
    default:
      ctx.fillStyle = baseGradient(ctx, p, toneBase);
      ctx.fillRect(p.x, p.y, p.w, p.h);
      break;
  }

  if (detail >= 1 && textureId !== "glass") {
    ctx.globalAlpha = settings.glow;
    ctx.fillStyle = rgb(shade(toneBase, 1.1), 0.7);
    ctx.fillRect(p.x + p.w * 0.05, p.y + p.h * 0.08, p.w * 0.2, p.h * 0.84);
  }

  ctx.restore();
}

export function paintPipeTextureSwatch(canvas, textureId, {
  mode = DEFAULT_PIPE_TEXTURE_MODE,
  base = { r: 120, g: 220, b: 255 },
  time = 0
} = {}) {
  if (!canvas) return;
  let ctx = null;
  try {
    ctx = canvas.getContext?.("2d") || null;
  } catch {
    ctx = null;
  }
  if (!ctx) return;

  const w = canvas.width || 160;
  const h = canvas.height || 90;
  ctx.clearRect(0, 0, w, h);
  drawPipeTexture(ctx, { x: 0, y: 0, w, h }, base, { textureId, mode, time });
}
