// =====================
// FILE: public/js/iconRendererV2.js
// Icon style v2 renderer with circle masking, patterns, effects, and animations.
// =====================
import { resolveIconStyleV2 } from "./iconStyleV2.js";
import { applyAnimationsToStyle } from "./iconAnimationEngine.js";
import { buildTriggeredAnimationLayer, mergeTriggeredAnimationLayer } from "./abilityAnimationRegistry.js";

const DEFAULT_FILL = "#ff8c1a";
const DEFAULT_CORE = "#ffc285";
const DEFAULT_RIM = "#0f172a";
const DEFAULT_GLOW = "rgba(255, 200, 120, 0.75)";

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function resolveReducedMotion(option) {
  if (typeof option === "boolean") return option;
  if (typeof document !== "undefined") {
    const prefers = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const toggle = typeof window !== "undefined" && window.__reduceMotion === true;
    return prefers || toggle;
  }
  return false;
}

function fillCircle(ctx, radius, fill, shadow) {
  if (!ctx) return;
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function createLavaGradient(ctx, radius, animation = {}, phase = 0) {
  if (!ctx || typeof ctx.createLinearGradient !== "function") return animation.fallback || DEFAULT_FILL;
  const palette = {
    base: "#1a0a0a",
    ember: "#7b1e1e",
    molten: "#f06b1a",
    flare: "#ffd166",
    ...(animation.palette || {})
  };
  const layers = Math.max(1, Math.floor(animation.layers) || 2);
  const smoothness = clamp01(Number(animation.smoothness) || 0);
  const layerStep = 0.18 - smoothness * 0.06;
  const wobbleAmp = 0.06 - smoothness * 0.035;
  const travel = radius * 2.6;
  const start = -radius * 1.3 + travel * phase;
  const end = start + travel;
  const grad = ctx.createLinearGradient(0, start, 0, end);

  for (let i = 0; i < layers; i += 1) {
    const offset = clamp01((phase + i * layerStep) % 1);
    const wobble = Math.sin((phase + i) * Math.PI * 2) * wobbleAmp;
    const stops = [
      { pos: 0, color: palette.base },
      { pos: clamp01(0.18 + wobble + offset * 0.08), color: palette.ember },
      { pos: clamp01(0.42 + wobble * 0.5 + offset * 0.12), color: palette.molten },
      { pos: clamp01(0.6 + wobble * 0.3 + offset * 0.1), color: palette.flare },
      { pos: clamp01(0.82 + wobble * 0.35 + offset * 0.1), color: palette.molten },
      { pos: 1, color: palette.base }
    ];
    stops.forEach((stop) => grad.addColorStop(stop.pos, stop.color));
  }

  return grad;
}

function createCapeFlowGradient(ctx, radius, animation = {}, phase = 0) {
  if (!ctx || typeof ctx.createLinearGradient !== "function") return animation.fallback || DEFAULT_FILL;
  const palette = {
    base: "#2b0b0b",
    ember: "#c94b1b",
    molten: "#f57c21",
    flare: "#ffd16a",
    ash: "#4b140f",
    ...(animation.palette || {})
  };
  const travel = radius * 2.8;
  const start = -radius * 1.4 + travel * phase;
  const end = start + travel;
  const grad = ctx.createLinearGradient(0, start, 0, end);
  const bands = Math.max(4, Math.floor(animation.bands) || 6);
  const colors = [palette.base, palette.ash, palette.ember, palette.molten, palette.flare, palette.molten, palette.ember];
  for (let i = 0; i <= bands; i += 1) {
    const t = i / bands;
    const wobble = Math.sin((phase * 1.6 + i * 0.45) * Math.PI * 2) * 0.035;
    const pos = clamp01(t + wobble);
    const color = colors[i % colors.length];
    grad.addColorStop(pos, color);
  }
  return grad;
}

function drawCapeEmbers(ctx, radius, animation = {}, phase = 0) {
  if (!ctx) return;
  const palette = {
    base: "#2b0b0b",
    ember: "#c94b1b",
    molten: "#f57c21",
    flare: "#ffd16a",
    ...(animation.palette || {})
  };
  const density = clamp01(Number(animation.embers) || 0.7);
  const count = Math.max(6, Math.floor(radius * 0.8 * density));
  for (let i = 0; i < count; i += 1) {
    const seed = i * 0.77;
    const x = Math.sin(seed * 12.3) * radius * 0.6;
    const flow = (phase + i * 0.13) % 1;
    const y = flow * radius * 2 - radius;
    const pulse = 0.5 + 0.5 * Math.sin(seed * 3.1 + phase * Math.PI * 2);
    const size = radius * (0.06 + 0.05 * pulse);
    const color = pulse > 0.6 ? palette.flare : (pulse > 0.35 ? palette.molten : palette.ember);
    const alpha = 0.18 + 0.32 * pulse;
    ctx.beginPath?.();
    ctx.arc?.(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill?.();
  }
  ctx.globalAlpha = 1;
}

function drawZigZag(ctx, radius, {
  stroke = "#fff",
  width = 3,
  amplitude = 0.18,
  waves = 6,
  glow = null,
  spacing = null,
  phase = 0
} = {}) {
  if (!ctx) return;
  const amp = Math.max(0.05, Math.min(0.9, amplitude)) * radius;
  const segments = Math.max(2, Math.floor(waves));
  const step = (radius * 2) / segments;
  const lineGap = Math.max(width * 1.4, spacing || amp * 2.2);
  const scroll = ((phase % 1) + 1) % 1;
  const offsetY = scroll * lineGap;
  const span = radius * 2 + lineGap * 2;
  ctx.save?.();
  if (ctx.beginPath && ctx.arc && ctx.clip) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = "miter";
  ctx.lineCap = "round";
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(6, width * 3);
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.translate?.(-radius, -radius - lineGap + offsetY);
  for (let y = 0; y <= span; y += lineGap) {
    ctx.beginPath();
    for (let i = 0; i <= segments; i += 1) {
      const x = i * step;
      const zig = i % 2 === 0 ? -amp : amp;
      ctx.lineTo(x, y + zig);
    }
    ctx.stroke();
  }
  ctx.restore?.();
}

function drawCenterlineGuides(ctx, radius, {
  stroke = "#fff",
  accent = "#000",
  width = 4,
  accentWidth = 2,
  glow = null
} = {}) {
  if (!ctx) return;
  const line = Math.max(1, width);
  const accentLine = Math.max(1, accentWidth);
  ctx.save?.();
  ctx.lineCap = "round";
  ctx.lineWidth = line;
  ctx.strokeStyle = stroke;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(6, line * 2);
  }
  ctx.beginPath();
  ctx.moveTo?.(0, -radius * 0.85);
  ctx.lineTo?.(0, radius * 0.85);
  ctx.stroke?.();

  ctx.shadowBlur = 0;
  ctx.lineWidth = accentLine;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.moveTo?.(-radius * 0.5, 0);
  ctx.lineTo?.(radius * 0.5, 0);
  ctx.stroke?.();
  fillCircle(ctx, Math.max(2, radius * 0.08), accent, { color: glow || accent, blur: Math.max(2, accentLine * 3) });
  ctx.restore?.();
}

function drawStripeBands(ctx, radius, {
  colors = ["#111", "#facc15"],
  stripeWidth = null,
  angle = 0,
  glow = null
} = {}) {
  if (!ctx) return;
  const palette = Array.isArray(colors) && colors.length ? colors : ["#111", "#facc15"];
  const bandWidth = Math.max(2, stripeWidth || radius * 0.32);
  const span = radius * 2.2;
  ctx.save?.();
  if (ctx.beginPath && ctx.arc && ctx.clip) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.rotate?.(angle);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(4, bandWidth * 0.35);
  } else {
    ctx.shadowBlur = 0;
  }
  for (let x = -span, i = 0; x <= span; x += bandWidth, i += 1) {
    ctx.fillStyle = palette[i % palette.length];
    ctx.fillRect?.(x, -span, bandWidth, span * 2);
  }
  ctx.restore?.();
}

function drawHoneycomb(ctx, radius, {
  stroke = "#f59e0b",
  lineWidth = null,
  cellSize = null,
  glow = null
} = {}) {
  if (!ctx) return;
  const hexRadius = Math.max(2, cellSize || radius * 0.22);
  const width = Math.sqrt(3) * hexRadius;
  const height = 2 * hexRadius;
  const yStep = 1.5 * hexRadius;
  const xStep = width;
  const maxSpan = radius * 1.15;

  ctx.save?.();
  if (ctx.beginPath && ctx.arc && ctx.clip) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.lineWidth = Math.max(1, lineWidth || radius * 0.08);
  ctx.strokeStyle = stroke;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(4, ctx.lineWidth * 2.5);
  } else {
    ctx.shadowBlur = 0;
  }

  const drawHex = (cx, cy) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const ang = Math.PI / 6 + (Math.PI / 3) * i;
      const x = cx + Math.cos(ang) * hexRadius;
      const y = cy + Math.sin(ang) * hexRadius;
      if (i === 0) ctx.moveTo?.(x, y);
      else ctx.lineTo?.(x, y);
    }
    ctx.closePath?.();
    ctx.stroke?.();
  };

  let row = 0;
  for (let y = -maxSpan; y <= maxSpan; y += yStep, row += 1) {
    const offset = (row % 2) * (xStep / 2);
    for (let x = -maxSpan; x <= maxSpan; x += xStep) {
      drawHex(x + offset, y);
    }
  }

  ctx.restore?.();
}

function drawCitrusSlice(ctx, radius, {
  stroke = "#fff7a8",
  lineWidth = null,
  segments = 6,
  centerRadius = null,
  glow = null,
  rindStroke = null,
  segmentStroke = null,
  segmentWidth = null
} = {}) {
  if (!ctx) return;
  const safeSegments = Math.max(3, Math.floor(segments) || 6);
  const width = Math.max(1, lineWidth || radius * 0.08);
  const spokeWidth = Math.max(1, segmentWidth || width * 0.75);
  const inner = Math.max(2, centerRadius || radius * 0.18);
  const span = radius * 0.86;
  const ringStroke = rindStroke || stroke;
  const spokeStroke = segmentStroke || stroke;

  ctx.save?.();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(4, width * 2.2);
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.lineWidth = width;
  ctx.strokeStyle = ringStroke;
  ctx.beginPath();
  ctx.arc?.(0, 0, span, 0, Math.PI * 2);
  ctx.stroke?.();

  ctx.lineWidth = spokeWidth;
  ctx.strokeStyle = spokeStroke;
  for (let i = 0; i < safeSegments; i += 1) {
    const angle = (Math.PI * 2 * i) / safeSegments;
    const x = Math.cos(angle) * span;
    const y = Math.sin(angle) * span;
    ctx.beginPath();
    ctx.moveTo?.(0, 0);
    ctx.lineTo?.(x, y);
    ctx.stroke?.();
  }

  ctx.lineWidth = width;
  ctx.strokeStyle = ringStroke;
  ctx.beginPath();
  ctx.arc?.(0, 0, inner, 0, Math.PI * 2);
  ctx.stroke?.();
  ctx.restore?.();
}

function drawCobblestone(ctx, radius, options = {}) {
  if (!ctx) return;
  const base = options.base || "#2b0b0b";
  const highlight = options.highlight || "#f57c21";
  const stroke = options.stroke || "#150505";
  const glow = options.glow || null;
  const lineWidth = Number.isFinite(options.lineWidth) ? options.lineWidth : Math.max(1, radius * 0.06);
  const rawStoneSize = Number.isFinite(options.stoneSize) ? options.stoneSize : 0.2;
  const stoneSize = rawStoneSize <= 1 ? rawStoneSize * radius : rawStoneSize;
  const rawGap = Number.isFinite(options.gap) ? options.gap : stoneSize * 0.18;
  const gap = rawGap <= 1 ? rawGap * radius : rawGap;
  const rowStep = stoneSize + gap;
  const maxRadius = radius * 0.94;

  ctx.save?.();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(2, radius * 0.08);
  } else {
    ctx.shadowBlur = 0;
  }

  let rowIndex = 0;
  for (let y = -radius + rowStep * 0.6; y <= radius - rowStep * 0.6; y += rowStep * 0.86) {
    const offset = (rowIndex % 2) * rowStep * 0.45;
    let colIndex = 0;
    for (let x = -radius + rowStep * 0.6 + offset; x <= radius - rowStep * 0.6; x += rowStep) {
      const seed = rowIndex * 12.37 + colIndex * 5.79;
      const jitterX = Math.sin(seed * 0.9) * stoneSize * 0.08;
      const jitterY = Math.cos(seed * 1.1) * stoneSize * 0.08;
      const w = stoneSize * (0.75 + 0.2 * Math.sin(seed));
      const h = stoneSize * (0.7 + 0.2 * Math.cos(seed * 0.7));
      const cx = x + jitterX;
      const cy = y + jitterY;
      if (Math.hypot(cx, cy) > maxRadius) {
        colIndex += 1;
        continue;
      }

      ctx.beginPath?.();
      ctx.moveTo?.(cx - w * 0.5, cy - h * 0.5);
      ctx.lineTo?.(cx + w * 0.5, cy - h * 0.5);
      ctx.lineTo?.(cx + w * 0.55, cy + h * 0.1);
      ctx.lineTo?.(cx + w * 0.2, cy + h * 0.55);
      ctx.lineTo?.(cx - w * 0.45, cy + h * 0.45);
      ctx.closePath?.();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = base;
      ctx.fill?.();
      ctx.globalAlpha = 0.6;
      ctx.stroke?.();

      ctx.beginPath?.();
      ctx.moveTo?.(cx - w * 0.4, cy - h * 0.42);
      ctx.lineTo?.(cx + w * 0.15, cy - h * 0.45);
      ctx.lineTo?.(cx + w * 0.3, cy - h * 0.1);
      ctx.lineTo?.(cx - w * 0.1, cy + h * 0.05);
      ctx.closePath?.();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = highlight;
      ctx.fill?.();

      colIndex += 1;
    }
    rowIndex += 1;
  }

  ctx.globalAlpha = 1;
  ctx.restore?.();
}

function applyCircleClip(ctx, radius) {
  if (!ctx?.beginPath || !ctx?.arc || !ctx?.clip) return;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();
}

function applySoftMask(ctx, radius, featherPx) {
  if (!ctx || featherPx <= 0 || typeof ctx.createRadialGradient !== "function") return;
  ctx.save?.();
  ctx.globalCompositeOperation = "destination-in";
  const gradient = ctx.createRadialGradient(0, 0, Math.max(0, radius - featherPx), 0, 0, radius + featherPx);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius + featherPx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore?.();
}

function drawCheckerPattern(ctx, radius, { primary, secondary, scale = 1 } = {}) {
  if (!ctx) return;
  const cell = Math.max(6, radius * 0.25 * scale);
  const span = radius * 2.2;
  for (let y = -span, row = 0; y <= span; y += cell, row += 1) {
    for (let x = -span, col = 0; x <= span; x += cell, col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? primary : secondary;
      ctx.fillRect?.(x, y, cell, cell);
    }
  }
}

function drawPolkaDots(ctx, radius, { primary, secondary, scale = 1 } = {}) {
  if (!ctx) return;
  const spacing = Math.max(6, radius * 0.28 * scale);
  const dot = spacing * 0.35;
  const span = radius * 2.2;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-span, -span, span * 2, span * 2);
  ctx.fillStyle = primary;
  for (let y = -span; y <= span; y += spacing) {
    for (let x = -span; x <= span; x += spacing) {
      ctx.beginPath?.();
      ctx.arc?.(x + spacing * 0.5, y + spacing * 0.5, dot, 0, Math.PI * 2);
      ctx.fill?.();
    }
  }
}

function drawDiagonalHatch(ctx, radius, { primary, secondary, scale = 1 } = {}) {
  if (!ctx) return;
  const spacing = Math.max(6, radius * 0.2 * scale);
  const span = radius * 2.4;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-span, -span, span * 2, span * 2);
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, spacing * 0.18);
  for (let x = -span; x <= span; x += spacing) {
    ctx.beginPath?.();
    ctx.moveTo?.(x, -span);
    ctx.lineTo?.(x + span * 2, span);
    ctx.stroke?.();
  }
}

function drawChevronPattern(ctx, radius, { primary, secondary, scale = 1 } = {}) {
  if (!ctx) return;
  const spacing = Math.max(8, radius * 0.3 * scale);
  const span = radius * 2.2;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-span, -span, span * 2, span * 2);
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(2, spacing * 0.2);
  for (let y = -span; y <= span; y += spacing) {
    ctx.beginPath?.();
    ctx.moveTo?.(-span, y);
    ctx.lineTo?.(0, y + spacing * 0.5);
    ctx.lineTo?.(span, y);
    ctx.stroke?.();
  }
}

function drawRadialBurst(ctx, radius, { primary, secondary, rays = 18 } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.beginPath?.();
  ctx.arc?.(0, 0, radius * 1.1, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.05);
  for (let i = 0; i < rays; i += 1) {
    const angle = (Math.PI * 2 * i) / rays;
    ctx.beginPath?.();
    ctx.moveTo?.(0, 0);
    ctx.lineTo?.(Math.cos(angle) * radius * 1.2, Math.sin(angle) * radius * 1.2);
    ctx.stroke?.();
  }
}

function drawTopographic(ctx, radius, { primary, secondary, rings = 6 } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.beginPath?.();
  ctx.arc?.(0, 0, radius * 1.1, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.05);
  for (let i = 1; i <= rings; i += 1) {
    const r = (radius * i) / rings;
    ctx.beginPath?.();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 12) {
      const wobble = Math.sin(a * 3 + i) * radius * 0.03;
      const x = Math.cos(a) * (r + wobble);
      const y = Math.sin(a) * (r + wobble);
      if (a === 0) ctx.moveTo?.(x, y);
      else ctx.lineTo?.(x, y);
    }
    ctx.stroke?.();
  }
}

function drawStars(ctx, radius, { primary, secondary, count = 12 } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.beginPath?.();
  ctx.arc?.(0, 0, radius * 1.1, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.fillStyle = primary;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const r = radius * 0.6;
    const cx = Math.cos(angle) * r;
    const cy = Math.sin(angle) * r;
    const spikes = 5;
    const outer = radius * 0.12;
    const inner = outer * 0.5;
    ctx.beginPath?.();
    for (let j = 0; j < spikes * 2; j += 1) {
      const a = angle + (Math.PI * j) / spikes;
      const rr = j % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (j === 0) ctx.moveTo?.(x, y);
      else ctx.lineTo?.(x, y);
    }
    ctx.closePath?.();
    ctx.fill?.();
  }
}

function drawWaves(ctx, radius, { primary, secondary, lines = 6 } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-radius, -radius, radius * 2, radius * 2);
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.04);
  for (let i = 0; i < lines; i += 1) {
    const offset = -radius + (i / lines) * radius * 2;
    ctx.beginPath?.();
    for (let x = -radius; x <= radius; x += radius * 0.1) {
      const y = offset + Math.sin((x / radius) * Math.PI * 2 + i) * radius * 0.08;
      if (x === -radius) ctx.moveTo?.(x, y);
      else ctx.lineTo?.(x, y);
    }
    ctx.stroke?.();
  }
}

function drawConcentricRings(ctx, radius, { primary, secondary, rings = 6 } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.beginPath?.();
  ctx.arc?.(0, 0, radius * 1.1, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.04);
  for (let i = 1; i <= rings; i += 1) {
    ctx.beginPath?.();
    ctx.arc?.(0, 0, (radius * i) / rings, 0, Math.PI * 2);
    ctx.stroke?.();
  }
}

function drawSpiral(ctx, radius, { primary } = {}) {
  if (!ctx) return;
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.05);
  ctx.beginPath?.();
  const turns = 3;
  const maxAngle = Math.PI * 2 * turns;
  for (let a = 0; a <= maxAngle; a += Math.PI / 30) {
    const r = (a / maxAngle) * radius;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (a === 0) ctx.moveTo?.(x, y);
    else ctx.lineTo?.(x, y);
  }
  ctx.stroke?.();
}

function drawSunburst(ctx, radius, { primary, secondary, rays = 12 } = {}) {
  if (!ctx) return;
  for (let i = 0; i < rays; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? primary : secondary;
    const start = (Math.PI * 2 * i) / rays;
    const end = start + (Math.PI * 2) / rays;
    ctx.beginPath?.();
    ctx.moveTo?.(0, 0);
    ctx.arc?.(0, 0, radius * 1.1, start, end);
    ctx.closePath?.();
    ctx.fill?.();
  }
}

function drawRadialStripes(ctx, radius, { primary, secondary, stripes = 16 } = {}) {
  if (!ctx) return;
  for (let i = 0; i < stripes; i += 1) {
    ctx.strokeStyle = i % 2 === 0 ? primary : secondary;
    ctx.lineWidth = Math.max(2, radius * 0.07);
    const angle = (Math.PI * 2 * i) / stripes;
    ctx.beginPath?.();
    ctx.moveTo?.(0, 0);
    ctx.lineTo?.(Math.cos(angle) * radius * 1.2, Math.sin(angle) * radius * 1.2);
    ctx.stroke?.();
  }
}

function drawRadialChevrons(ctx, radius, { primary, secondary, count = 10 } = {}) {
  if (!ctx) return;
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(2, radius * 0.06);
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const inner = radius * 0.4;
    const outer = radius * 0.9;
    const midAngle = angle + Math.PI / count;
    ctx.beginPath?.();
    ctx.moveTo?.(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo?.(Math.cos(midAngle) * outer, Math.sin(midAngle) * outer);
    ctx.lineTo?.(Math.cos(angle + (Math.PI * 2) / count) * inner, Math.sin(angle + (Math.PI * 2) / count) * inner);
    ctx.stroke?.();
  }
  ctx.strokeStyle = secondary;
}

function drawCellular(ctx, radius, { primary, secondary, cells = 10 } = {}) {
  if (!ctx) return;
  const cellRadius = (radius / cells) * 1.4;
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.04);
  for (let y = -radius; y <= radius; y += cellRadius) {
    for (let x = -radius; x <= radius; x += cellRadius) {
      const dist = Math.hypot(x, y);
      if (dist > radius * 1.05) continue;
      ctx.beginPath?.();
      ctx.arc?.(x, y, cellRadius * 0.5, 0, Math.PI * 2);
      ctx.stroke?.();
    }
  }
  ctx.fillStyle = secondary;
}

function drawCircuit(ctx, radius, { primary, secondary } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-radius, -radius, radius * 2, radius * 2);
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.035);
  const step = radius * 0.4;
  for (let x = -radius; x <= radius; x += step) {
    ctx.beginPath?.();
    ctx.moveTo?.(x, -radius);
    ctx.lineTo?.(x, radius);
    ctx.stroke?.();
  }
  for (let y = -radius; y <= radius; y += step) {
    ctx.beginPath?.();
    ctx.moveTo?.(-radius, y);
    ctx.lineTo?.(radius, y);
    ctx.stroke?.();
  }
  ctx.fillStyle = primary;
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const x = Math.cos(angle) * radius * 0.6;
    const y = Math.sin(angle) * radius * 0.6;
    ctx.beginPath?.();
    ctx.arc?.(x, y, radius * 0.05, 0, Math.PI * 2);
    ctx.fill?.();
  }
}

function drawFracture(ctx, radius, { primary, secondary } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-radius, -radius, radius * 2, radius * 2);
  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(1, radius * 0.05);
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    ctx.beginPath?.();
    ctx.moveTo?.(0, 0);
    const segments = 4;
    for (let j = 1; j <= segments; j += 1) {
      const offset = Math.sin((i + j) * 1.7) * radius * 0.08;
      const r = (radius * j) / segments + offset;
      ctx.lineTo?.(Math.cos(angle + offset * 0.02) * r, Math.sin(angle + offset * 0.02) * r);
    }
    ctx.stroke?.();
  }
}

function drawFlames(ctx, radius, { primary, secondary } = {}) {
  if (!ctx) return;
  ctx.fillStyle = secondary;
  ctx.fillRect?.(-radius, -radius, radius * 2, radius * 2);
  ctx.fillStyle = primary;
  const flameCount = 6;
  for (let i = 0; i < flameCount; i += 1) {
    const angle = (Math.PI * 2 * i) / flameCount;
    const base = radius * 0.4;
    ctx.save?.();
    ctx.rotate?.(angle);
    ctx.beginPath?.();
    ctx.moveTo?.(0, -base);
    ctx.bezierCurveTo?.(radius * 0.2, -base * 0.2, radius * 0.1, base * 0.6, 0, base);
    ctx.bezierCurveTo?.(-radius * 0.1, base * 0.6, -radius * 0.2, -base * 0.2, 0, -base);
    ctx.fill?.();
    ctx.restore?.();
  }
}

function drawPatternV2(ctx, radius, style = {}, { animationPhase = 0 } = {}) {
  const pattern = style.pattern || {};
  const canvas = ctx?.canvas;
  if (canvas && pattern.type) {
    canvas.__pattern = { type: pattern.type };
  }
  if (!pattern.type) return;
  const palette = style.palette || {};
  const primary = pattern.primaryColor || palette.rim || DEFAULT_RIM;
  const secondary = pattern.secondaryColor || palette.core || DEFAULT_CORE;
  const scale = clamp(Number(pattern.scale) || 1, 0.2, 6);
  const biasScale = 1 + clamp(Number(pattern.radialBias) || 0, -1, 1) * 0.15;
  const rotation = degToRad(Number(pattern.rotationDeg) || 0);
  const alpha = clamp01(pattern.alpha ?? 1);
  const offsetX = clamp(Number(pattern.centerOffset?.x) || 0, -0.5, 0.5) * radius;
  const offsetY = clamp(Number(pattern.centerOffset?.y) || 0, -0.5, 0.5) * radius;

  ctx.save?.();
  applyCircleClip(ctx, radius);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = pattern.blendMode && pattern.blendMode !== "normal" ? pattern.blendMode : "source-over";
  ctx.translate?.(offsetX, offsetY);
  ctx.rotate?.(rotation);
  ctx.scale?.(scale * biasScale, scale * biasScale);

  switch (pattern.type) {
    case "zigzag":
      drawZigZag(ctx, radius * 0.75, {
        stroke: pattern.stroke || primary,
        width: Math.max(2, radius * 0.12),
        amplitude: Number.isFinite(pattern.amplitude) ? pattern.amplitude : 0.22,
        waves: Number.isFinite(pattern.waves) ? pattern.waves : 6,
        spacing: Number.isFinite(pattern.spacing)
          ? (pattern.spacing <= 1 ? pattern.spacing * radius * 0.75 : pattern.spacing)
          : null,
        glow: pattern.background || palette.glow,
        phase: style.legacyAnimation?.type === "zigzag_scroll" ? animationPhase : 0
      });
      break;
    case "centerline":
      drawCenterlineGuides(ctx, radius * 0.82, {
        stroke: pattern.stroke || "#f8fafc",
        accent: pattern.accent || primary,
        width: Math.max(2, radius * 0.16),
        accentWidth: Math.max(2, radius * 0.1),
        glow: pattern.glow || palette.glow
      });
      break;
    case "stripes":
      drawStripeBands(ctx, radius * 0.9, {
        colors: pattern.colors,
        stripeWidth: pattern.stripeWidth,
        angle: Number.isFinite(pattern.angle) ? pattern.angle : Math.PI / 4,
        glow: pattern.glow || palette.glow
      });
      break;
    case "honeycomb":
      drawHoneycomb(ctx, radius * 0.9, {
        stroke: pattern.stroke || primary,
        lineWidth: pattern.lineWidth,
        cellSize: pattern.cellSize,
        glow: pattern.glow || palette.glow
      });
      break;
    case "citrus_slice":
      drawCitrusSlice(ctx, radius * 0.74, {
        stroke: pattern.stroke || primary,
        lineWidth: pattern.lineWidth,
        segments: pattern.segments,
        centerRadius: pattern.centerRadius,
        glow: pattern.glow || palette.glow,
        rindStroke: pattern.rindStroke,
        segmentStroke: pattern.segmentStroke,
        segmentWidth: pattern.segmentWidth
      });
      break;
    case "cobblestone":
      drawCobblestone(ctx, radius * 0.88, {
        base: pattern.base || palette.fill,
        highlight: pattern.highlight || palette.core,
        stroke: pattern.stroke || primary,
        glow: pattern.glow || palette.glow,
        lineWidth: pattern.lineWidth,
        stoneSize: pattern.stoneSize,
        gap: pattern.gap
      });
      break;
    case "checker":
      drawCheckerPattern(ctx, radius, { primary, secondary, scale });
      break;
    case "polkaDots":
      drawPolkaDots(ctx, radius, { primary, secondary, scale });
      break;
    case "chevrons":
      drawChevronPattern(ctx, radius, { primary, secondary, scale });
      break;
    case "diagonalHatch":
      drawDiagonalHatch(ctx, radius, { primary, secondary, scale });
      break;
    case "radialBurst":
      drawRadialBurst(ctx, radius, { primary, secondary, rays: pattern.rays || 18 });
      break;
    case "topographic":
      drawTopographic(ctx, radius, { primary, secondary, rings: pattern.rings || 6 });
      break;
    case "stars":
      drawStars(ctx, radius, { primary, secondary, count: pattern.count || 12 });
      break;
    case "flames":
      drawFlames(ctx, radius, { primary, secondary });
      break;
    case "circuit":
      drawCircuit(ctx, radius, { primary, secondary });
      break;
    case "waves":
      drawWaves(ctx, radius, { primary, secondary, lines: pattern.lines || 6 });
      break;
    case "concentricRings":
      drawConcentricRings(ctx, radius, { primary, secondary, rings: pattern.rings || 6 });
      break;
    case "spiral":
      drawSpiral(ctx, radius, { primary });
      break;
    case "sunburst":
      drawSunburst(ctx, radius, { primary, secondary, rays: pattern.rays || 12 });
      break;
    case "radialStripes":
      drawRadialStripes(ctx, radius, { primary, secondary, stripes: pattern.stripes || 16 });
      break;
    case "radialChevrons":
      drawRadialChevrons(ctx, radius, { primary, secondary, count: pattern.count || 10 });
      break;
    case "cellular":
      drawCellular(ctx, radius, { primary, secondary, cells: pattern.cells || 10 });
      break;
    case "fracture":
      drawFracture(ctx, radius, { primary, secondary });
      break;
    default:
      break;
  }

  ctx.restore?.();
}

function noiseValue(x, y, seed = 0) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.1) * 43758.5453;
  return s - Math.floor(s);
}

function drawTextureOverlay(ctx, radius, texture = {}, seed = 0) {
  if (!ctx) return;
  const type = texture.type || "none";
  if (type === "none") return;
  const intensity = clamp01(Number(texture.intensity) || 0.3);
  if (intensity <= 0) return;
  const scale = clamp(Number(texture.scale) || 1, 0.2, 6);
  const offsetX = Number(texture.offset?.x || 0) * radius;
  const offsetY = Number(texture.offset?.y || 0) * radius;
  const step = Math.max(1, radius * 0.15 / scale);

  ctx.save?.();
  applyCircleClip(ctx, radius);
  ctx.globalAlpha = intensity;
  ctx.fillStyle = type === "scanlines" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.4)";

  if (type === "scanlines") {
    for (let y = -radius; y <= radius; y += step * 0.6) {
      ctx.fillRect?.(-radius, y, radius * 2, Math.max(1, step * 0.2));
    }
    ctx.restore?.();
    return;
  }

  for (let y = -radius; y <= radius; y += step) {
    for (let x = -radius; x <= radius; x += step) {
      const n = noiseValue(x + offsetX, y + offsetY, seed);
      const alpha = type === "metal" ? 0.2 + n * 0.5 : 0.1 + n * 0.4;
      ctx.globalAlpha = intensity * alpha;
      ctx.fillRect?.(x, y, step * 0.6, step * 0.6);
    }
  }
  ctx.restore?.();
}

function applyEffectsPipeline(ctx, radius, style = {}) {
  const effects = Array.isArray(style.effects) ? style.effects : [];
  const palette = style.palette || {};
  effects.forEach((effect) => {
    if (!effect || effect.enabled === false) return;
    const params = effect.params || {};
    ctx.save?.();
    applyCircleClip(ctx, radius);
    switch (effect.type) {
      case "outline": {
        const width = Number.isFinite(params.width) ? params.width : radius * 0.08;
        const color = params.color || palette.rim || DEFAULT_RIM;
        const alpha = params.alpha ?? 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.96, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "innerGlow": {
        const color = params.color || palette.glow || DEFAULT_GLOW;
        const alpha = params.alpha ?? 0.7;
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, color);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "dropShadow": {
        const color = params.color || "rgba(0,0,0,0.4)";
        const alpha = params.alpha ?? 0.5;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.max(2, params.blur || radius * 0.12);
        ctx.shadowOffsetX = params.offsetX || 0;
        ctx.shadowOffsetY = params.offsetY || 0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "vignette": {
        const strength = clamp01(params.strength ?? 0.5);
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "noiseOverlay": {
        drawTextureOverlay(ctx, radius, { type: "noise", intensity: params.intensity ?? 0.4, scale: params.scale ?? 1 }, params.seed || 0);
        break;
      }
      case "gradientFill": {
        const type = params.type || "radial";
        const colors = Array.isArray(params.colors) ? params.colors : [palette.fill || DEFAULT_FILL, palette.core || DEFAULT_CORE];
        let gradient;
        if (type === "linear") {
          const angle = degToRad(params.angleDeg || 0);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          gradient = ctx.createLinearGradient(-x, -y, x, y);
        } else {
          gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        }
        colors.forEach((color, idx) => {
          gradient.addColorStop(idx / Math.max(1, colors.length - 1), color);
        });
        ctx.globalAlpha = params.alpha ?? 0.6;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "rimOrbitLight": {
        const progress = Number(params.progress ?? 0);
        const angle = progress * Math.PI * 2;
        ctx.fillStyle = params.color || palette.accent || palette.glow || "#fff";
        const x = Math.cos(angle) * radius * 0.85;
        const y = Math.sin(angle) * radius * 0.85;
        ctx.globalAlpha = params.alpha ?? 0.8;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "shimmerSweep": {
        const progress = Number(params.progress ?? 0);
        const angle = progress * Math.PI * 2;
        ctx.strokeStyle = params.color || palette.glow || "#fff";
        ctx.lineWidth = Math.max(2, radius * 0.12);
        ctx.globalAlpha = params.alpha ?? 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.9, angle - Math.PI * 0.2, angle + Math.PI * 0.2);
        ctx.stroke();
        break;
      }
      case "radialRipple": {
        const progress = Number(params.progress ?? 0);
        if (progress > 0) {
          ctx.strokeStyle = params.color || palette.accent || palette.glow || "#fff";
          ctx.lineWidth = Math.max(1, radius * 0.08 * (1 - progress));
          ctx.globalAlpha = (params.alpha ?? 0.8) * (1 - progress);
          ctx.beginPath();
          ctx.arc(0, 0, radius * progress, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "centerFlash": {
        const progress = Number(params.progress ?? 0);
        if (progress > 0) {
          ctx.fillStyle = params.color || palette.glow || "#fff";
          ctx.globalAlpha = (params.alpha ?? 0.7) * (1 - progress);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.4 * (1 + progress), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "sparkBloom": {
        const progress = Number(params.progress ?? 0);
        if (progress > 0) {
          ctx.fillStyle = params.color || palette.accent || "#fff";
          ctx.globalAlpha = (params.alpha ?? 0.6) * (1 - progress);
          for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8;
            const dist = radius * progress * 0.8;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, radius * 0.06, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case "shockRing": {
        const progress = Number(params.progress ?? 0);
        if (progress > 0) {
          ctx.strokeStyle = params.color || palette.glow || "#fff";
          ctx.lineWidth = Math.max(1, radius * 0.1 * (1 - progress));
          ctx.globalAlpha = (params.alpha ?? 0.7) * (1 - progress);
          ctx.beginPath();
          ctx.arc(0, 0, radius * (0.2 + progress), 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "hitFlash": {
        const progress = Number(params.progress ?? 0);
        if (progress > 0) {
          ctx.fillStyle = params.color || palette.accent || "#fff";
          ctx.globalAlpha = (params.alpha ?? 0.6) * (1 - progress);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      default:
        break;
    }
    ctx.restore?.();
  });
}

function buildIconRenderState(icon, {
  timeMs = 0,
  events = [],
  reducedMotion = false,
  triggeredAnimationRegistry = null
} = {}) {
  const baseStyle = resolveIconStyleV2(icon);
  const triggeredLayer = triggeredAnimationRegistry
    ? buildTriggeredAnimationLayer(triggeredAnimationRegistry)
    : null;
  const composedStyle = triggeredLayer ? mergeTriggeredAnimationLayer(baseStyle, triggeredLayer) : baseStyle;
  const seed = typeof icon?.id === "string" ? icon.id : 0;
  const { style, preview } = applyAnimationsToStyle(composedStyle, composedStyle.animations || [], {
    timeMs,
    seed,
    events,
    reducedMotion
  });
  return { style, preview };
}

function renderIconFrameV2(ctx, canvas, icon = {}, {
  timeMs = 0,
  events = [],
  reducedMotion = false,
  showMask = false,
  triggeredAnimationRegistry = null
} = {}) {
  if (!ctx || !canvas) return;
  const motionReduced = resolveReducedMotion(reducedMotion);
  const { style, preview } = buildIconRenderState(icon, {
    timeMs,
    events,
    reducedMotion: motionReduced,
    triggeredAnimationRegistry
  });
  const palette = style.palette || {};
  const glow = palette.glow || DEFAULT_GLOW;
  const fill = palette.fill || DEFAULT_FILL;
  const core = palette.core || DEFAULT_CORE;
  const rim = palette.rim || DEFAULT_RIM;
  const circle = style.circle || { radiusRatio: 0.5, maskMode: "hard", edgeFeatherPx: 0 };
  const size = canvas.width;
  const radius = size * (circle.radiusRatio || 0.5);
  const outer = radius * 0.92;
  const inner = outer * 0.68;

  ctx.clearRect?.(0, 0, canvas.width, canvas.height);
  ctx.save?.();
  ctx.translate?.(canvas.width * 0.5, canvas.height * 0.5);
  if (preview?.scale && preview.scale !== 1) {
    ctx.scale?.(preview.scale, preview.scale);
  }

  applyCircleClip(ctx, radius);

  const legacyAnimation = style.legacyAnimation || null;
  if (canvas) {
    canvas.__pattern = style.pattern?.type ? { type: style.pattern.type } : null;
  }
  if (canvas) {
    canvas.__pattern = style.pattern?.type ? { type: style.pattern.type } : null;
  }
  const isLava = legacyAnimation?.type === "lava";
  const isCapeFlow = legacyAnimation?.type === "cape_flow";
  const animationPhase = !motionReduced && (isLava || isCapeFlow || legacyAnimation?.type === "zigzag_scroll")
    ? ((timeMs / 1000) * (legacyAnimation?.speed || 0.04)) % 1
    : 0;
  const fillStyle = isLava
    ? createLavaGradient(ctx, outer, legacyAnimation, animationPhase)
    : (isCapeFlow ? createCapeFlowGradient(ctx, outer, legacyAnimation, animationPhase) : fill);
  const coreStyle = isLava
    ? createLavaGradient(ctx, inner, legacyAnimation, (animationPhase + 0.22) % 1)
    : (isCapeFlow ? createCapeFlowGradient(ctx, inner, legacyAnimation, (animationPhase + 0.17) % 1) : core);

  if (style.shadow?.enabled) {
    ctx.shadowColor = style.shadow.color || glow;
    ctx.shadowBlur = style.shadow.blur || Math.max(6, size * 0.12);
    ctx.shadowOffsetX = style.shadow.offsetX || 0;
    ctx.shadowOffsetY = style.shadow.offsetY || 0;
  } else {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(6, size * 0.12);
  }
  fillCircle(ctx, outer, fillStyle, null);

  if (isCapeFlow && ctx.beginPath && ctx.arc && ctx.clip) {
    ctx.save?.();
    applyCircleClip(ctx, outer * 0.96);
    drawCapeEmbers(ctx, outer * 0.95, legacyAnimation, animationPhase);
    ctx.restore?.();
  }

  if (ctx.lineWidth !== undefined) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = Number.isFinite(style.stroke?.width) ? style.stroke.width : Math.max(2, size * 0.06);
    ctx.strokeStyle = style.stroke?.color || rim;
    ctx.globalAlpha = Number.isFinite(style.stroke?.alpha) ? style.stroke.alpha : 1;
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = Math.max(4, size * 0.08);
  ctx.shadowColor = glow;
  fillCircle(ctx, inner, coreStyle, null);

  drawPatternV2(ctx, outer, style, { animationPhase });
  drawTextureOverlay(ctx, outer, style.texture || {}, icon?.id || 0);
  applyEffectsPipeline(ctx, outer, style);

  if (circle.maskMode === "soft") {
    applySoftMask(ctx, radius, clamp(Number(circle.edgeFeatherPx) || 0, 0, 4));
  }

  if (showMask) {
    ctx.save?.();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore?.();
  }

  ctx.restore?.();
}

function drawImageIconFrameV2(ctx, canvas, icon, image, options = {}) {
  if (!ctx || !canvas) return;
  const {
    timeMs = 0,
    events = [],
    reducedMotion = false,
    showMask = false,
    triggeredAnimationRegistry = null
  } = options;
  const motionReduced = resolveReducedMotion(reducedMotion);
  const { style, preview } = buildIconRenderState(icon, {
    timeMs,
    events,
    reducedMotion: motionReduced,
    triggeredAnimationRegistry
  });
  const palette = style.palette || {};
  const glow = palette.glow || DEFAULT_GLOW;
  const fill = palette.fill || DEFAULT_FILL;
  const rim = palette.rim || DEFAULT_RIM;
  const circle = style.circle || { radiusRatio: 0.5, maskMode: "hard", edgeFeatherPx: 0 };
  const size = canvas.width;
  const radius = size * (circle.radiusRatio || 0.5);
  const outer = radius * 0.92;

  ctx.clearRect?.(0, 0, canvas.width, canvas.height);
  ctx.save?.();
  ctx.translate?.(canvas.width * 0.5, canvas.height * 0.5);
  if (preview?.scale && preview.scale !== 1) {
    ctx.scale?.(preview.scale, preview.scale);
  }

  applyCircleClip(ctx, radius);

  const legacyAnimation = style.legacyAnimation || null;
  const isLava = legacyAnimation?.type === "lava";
  const isCapeFlow = legacyAnimation?.type === "cape_flow";
  const animationPhase = !motionReduced && (isLava || isCapeFlow)
    ? ((timeMs / 1000) * (legacyAnimation?.speed || 0.04)) % 1
    : 0;
  const fillStyle = isLava
    ? createLavaGradient(ctx, outer, legacyAnimation, animationPhase)
    : (isCapeFlow ? createCapeFlowGradient(ctx, outer, legacyAnimation, animationPhase) : fill);

  if (style.shadow?.enabled) {
    ctx.shadowColor = style.shadow.color || glow;
    ctx.shadowBlur = style.shadow.blur || Math.max(6, size * 0.12);
  } else {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(6, size * 0.12);
  }
  fillCircle(ctx, outer, fillStyle, null);

  const imgWidth = image?.naturalWidth || image?.width || 0;
  const imgHeight = image?.naturalHeight || image?.height || 0;
  if (imgWidth > 0 && imgHeight > 0 && ctx.beginPath && ctx.arc && ctx.clip) {
    ctx.save?.();
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.92, 0, Math.PI * 2);
    ctx.clip();
    const scale = Math.max((outer * 2) / imgWidth, (outer * 2) / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    ctx.drawImage?.(image, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);
    ctx.restore?.();
  }

  if (ctx.lineWidth !== undefined) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = Number.isFinite(style.stroke?.width) ? style.stroke.width : Math.max(2, size * 0.06);
    ctx.strokeStyle = style.stroke?.color || rim;
    ctx.globalAlpha = Number.isFinite(style.stroke?.alpha) ? style.stroke.alpha : 1;
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawPatternV2(ctx, outer, style, { animationPhase });
  drawTextureOverlay(ctx, outer, style.texture || {}, icon?.id || 0);
  applyEffectsPipeline(ctx, outer, style);

  if (circle.maskMode === "soft") {
    applySoftMask(ctx, radius, clamp(Number(circle.edgeFeatherPx) || 0, 0, 4));
  }

  if (showMask) {
    ctx.save?.();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore?.();
  }

  ctx.restore?.();
}

function shouldAnimateIcon(icon) {
  const style = resolveIconStyleV2(icon);
  if (style.legacyAnimation?.type) return true;
  return Array.isArray(style.animations) && style.animations.some((anim) => anim?.enabled !== false);
}

export {
  buildIconRenderState,
  renderIconFrameV2,
  drawImageIconFrameV2,
  shouldAnimateIcon
};
