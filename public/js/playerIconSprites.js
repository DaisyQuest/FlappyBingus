// =====================
// FILE: public/js/playerIconSprites.js
// Utility to generate high-contrast player icon sprites from metadata.
// =====================

const DEFAULT_FILL = "#ff8c1a";
const DEFAULT_RIM = "#0f172a";
const DEFAULT_CORE = "#ffc285";
const DEFAULT_GLOW = "rgba(255, 200, 120, 0.75)";
const DEFAULT_LAVA_PALETTE = Object.freeze({
  base: "#1a0a0a",
  ember: "#7b1e1e",
  molten: "#f06b1a",
  flare: "#ffd166"
});

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
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

function makeCanvas(size) {
  const safeSize = Math.max(16, Math.floor(size) || 96);
  const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "");
  if (typeof document !== "undefined" && document.createElement && !isJsdom) {
    const canvas = document.createElement("canvas");
    canvas.width = safeSize;
    canvas.height = safeSize;
    canvas.naturalWidth = safeSize;
    canvas.naturalHeight = safeSize;
    canvas.complete = true;
    return canvas;
  }
  return {
    width: safeSize,
    height: safeSize,
    naturalWidth: safeSize,
    naturalHeight: safeSize,
    complete: true,
    getContext: () => null
  };
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
    ...DEFAULT_LAVA_PALETTE,
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

function renderIconFrame(ctx, canvas, icon = {}, { animationPhase = 0 } = {}) {
  if (!ctx || !canvas) return;
  const style = icon.style || {};
  const fill = style.fill || DEFAULT_FILL;
  const core = style.core || style.fill || DEFAULT_CORE;
  const rim = style.rim || DEFAULT_RIM;
  const glow = style.glow || DEFAULT_GLOW;
  const pattern = style.pattern;
  const animation = style.animation;

  ctx.clearRect?.(0, 0, canvas.width, canvas.height);
  ctx.save?.();
  ctx.translate?.(canvas.width * 0.5, canvas.height * 0.5);

  const outer = canvas.width * 0.46;
  const inner = outer * 0.68;

  const isLava = animation?.type === "lava";
  const isCapeFlow = animation?.type === "cape_flow";
  const fillStyle = isLava
    ? createLavaGradient(ctx, outer, animation, animationPhase)
    : (isCapeFlow ? createCapeFlowGradient(ctx, outer, animation, animationPhase) : fill);
  const coreFillStyle = isLava
    ? createLavaGradient(ctx, inner, animation, (animationPhase + 0.22) % 1)
    : (isCapeFlow ? createCapeFlowGradient(ctx, inner, animation, (animationPhase + 0.17) % 1) : core);

  fillCircle(ctx, outer, fillStyle, { color: glow, blur: Math.max(6, canvas.width * 0.12) });
  if (isCapeFlow && ctx.beginPath && ctx.arc && ctx.clip) {
    ctx.save?.();
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.96, 0, Math.PI * 2);
    ctx.clip();
    drawCapeEmbers(ctx, outer * 0.95, animation, animationPhase);
    ctx.restore?.();
  }
  if (ctx.lineWidth !== undefined) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, canvas.width * 0.06);
    ctx.strokeStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.96, 0, Math.PI * 2);
    ctx.stroke();
  }
  fillCircle(ctx, inner, coreFillStyle, { color: glow, blur: Math.max(4, canvas.width * 0.08) });

  if (pattern?.type === "zigzag") {
    drawZigZag(ctx, outer * 0.75, {
      stroke: pattern.stroke || rim,
      width: Math.max(2, canvas.width * 0.05),
      amplitude: Number.isFinite(pattern.amplitude) ? pattern.amplitude : 0.22,
      waves: Number.isFinite(pattern.waves) ? pattern.waves : 6,
      spacing: Number.isFinite(pattern.spacing)
        ? (pattern.spacing <= 1 ? pattern.spacing * outer * 0.75 : pattern.spacing)
        : null,
      glow: pattern.background || glow,
      phase: animation?.type === "zigzag_scroll" ? animationPhase : 0
    });
    canvas.__pattern = { type: "zigzag" };
  } else if (pattern?.type === "centerline") {
    drawCenterlineGuides(ctx, outer * 0.82, {
      stroke: pattern.stroke || "#f8fafc",
      accent: pattern.accent || rim,
      width: Math.max(2, canvas.width * 0.065),
      accentWidth: Math.max(2, canvas.width * 0.04),
      glow: pattern.glow || glow
    });
    canvas.__pattern = { type: "centerline" };
  } else if (pattern?.type === "stripes") {
    drawStripeBands(ctx, outer * 0.9, {
      colors: pattern.colors,
      stripeWidth: pattern.stripeWidth,
      angle: Number.isFinite(pattern.angle) ? pattern.angle : Math.PI / 4,
      glow: pattern.glow || glow
    });
    canvas.__pattern = { type: "stripes" };
  } else if (pattern?.type === "honeycomb") {
    drawHoneycomb(ctx, outer * 0.9, {
      stroke: pattern.stroke || rim,
      lineWidth: pattern.lineWidth,
      cellSize: pattern.cellSize,
      glow: pattern.glow || glow
    });
    canvas.__pattern = { type: "honeycomb" };
  } else if (pattern?.type === "citrus_slice") {
    drawCitrusSlice(ctx, outer * 0.74, {
      stroke: pattern.stroke || rim,
      lineWidth: pattern.lineWidth,
      segments: pattern.segments,
      centerRadius: pattern.centerRadius,
      glow: pattern.glow || glow,
      rindStroke: pattern.rindStroke,
      segmentStroke: pattern.segmentStroke,
      segmentWidth: pattern.segmentWidth
    });
    canvas.__pattern = { type: "citrus_slice" };
  } else if (pattern?.type === "cobblestone") {
    drawCobblestone(ctx, outer * 0.88, {
      base: pattern.base || fill,
      highlight: pattern.highlight || core,
      stroke: pattern.stroke || rim,
      glow: pattern.glow || glow,
      lineWidth: pattern.lineWidth,
      stoneSize: pattern.stoneSize,
      gap: pattern.gap
    });
    canvas.__pattern = { type: "cobblestone" };
  }

  ctx.restore?.();
}

function drawImageIconFrame(ctx, canvas, icon, image) {
  if (!ctx || !canvas) return;
  const style = icon?.style || {};
  const fill = style.fill || DEFAULT_FILL;
  const rim = style.rim || DEFAULT_RIM;
  const glow = style.glow || DEFAULT_GLOW;

  ctx.clearRect?.(0, 0, canvas.width, canvas.height);
  ctx.save?.();
  ctx.translate?.(canvas.width * 0.5, canvas.height * 0.5);

  const outer = canvas.width * 0.46;
  fillCircle(ctx, outer, fill, { color: glow, blur: Math.max(6, canvas.width * 0.12) });

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
    ctx.lineWidth = Math.max(2, canvas.width * 0.06);
    ctx.strokeStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, outer * 0.96, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore?.();
}

function maybeStartSpriteAnimation(canvas, icon, renderFrame) {
  const animation = icon?.style?.animation;
  if (!animation || (animation.type !== "lava" && animation.type !== "cape_flow" && animation.type !== "zigzag_scroll")) {
    return null;
  }
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : null;
  const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : null;
  if (!raf) return null;
  const speed = Math.max(0.001, Number(animation.speed) || 0.04);
  let lastTs = null;
  let phase = 0;
  const state = { running: true, rafId: null };

  const step = (ts) => {
    if (!state.running) return;
    if (lastTs === null) lastTs = ts;
    const dt = Math.max(0, (ts - lastTs) / 1000);
    lastTs = ts;
    phase = (phase + dt * speed) % 1;
    renderFrame({ animationPhase: phase });
    state.rafId = raf(step);
  };

  state.stop = () => {
    state.running = false;
    if (state.rafId && caf) caf(state.rafId);
  };

  state.rafId = raf(step);
  return state;
}

export function createPlayerIconSprite(icon = {}, { size = 96 } = {}) {
  const canvas = makeCanvas(size);
  let ctx = null;
  try {
    ctx = canvas.getContext?.("2d") || null;
  } catch {
    ctx = null;
  }

  if (ctx) {
    const imageSrc = icon?.imageSrc || icon?.image?.src || null;
    if (imageSrc && typeof Image === "function") {
      const image = new Image();
      canvas.__image = image;
      const renderImage = () => drawImageIconFrame(ctx, canvas, icon, image);
      image.addEventListener?.("load", () => {
        renderImage();
        canvas.__imageLoaded = true;
        canvas.__notifyImageLoad?.();
      }, { once: true });
      image.src = imageSrc;
      renderImage();
    } else {
      const renderFrame = (opts = {}) => renderIconFrame(ctx, canvas, icon, opts);
      renderFrame();
      const animation = maybeStartSpriteAnimation(canvas, icon, renderFrame);
      if (animation) canvas.__animation = animation;
    }
  }

  return canvas;
}

export const __testables = {
  clamp01,
  fillCircle,
  drawZigZag,
  drawCenterlineGuides,
  drawHoneycomb,
  createLavaGradient,
  createCapeFlowGradient,
  drawCapeEmbers,
  drawCobblestone,
  drawImageIconFrame,
  renderIconFrame,
  maybeStartSpriteAnimation
};
