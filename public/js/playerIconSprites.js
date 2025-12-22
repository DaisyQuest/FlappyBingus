// =====================
// FILE: public/js/playerIconSprites.js
// Utility to generate high-contrast player icon sprites from metadata.
// =====================

const DEFAULT_FILL = "#ff8c1a";
const DEFAULT_RIM = "#0f172a";
const DEFAULT_CORE = "#ffc285";
const DEFAULT_GLOW = "rgba(255, 200, 120, 0.75)";

function drawZigZag(ctx, radius, {
  stroke = "#fff",
  width = 3,
  amplitude = 0.18,
  waves = 6,
  glow = null
} = {}) {
  if (!ctx) return;
  const amp = Math.max(0.05, Math.min(0.9, amplitude)) * radius;
  const segments = Math.max(2, Math.floor(waves));
  const step = (radius * 2) / segments;
  ctx.save?.();
  ctx.translate?.(-radius, 0);
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(6, width * 3);
  }
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const x = i * step;
    const y = (i % 2 === 0 ? -amp : amp);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
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

export function createPlayerIconSprite(icon = {}, { size = 96 } = {}) {
  const canvas = makeCanvas(size);
  let ctx = null;
  try {
    ctx = canvas.getContext?.("2d") || null;
  } catch {
    ctx = null;
  }

  if (ctx) {
    const fill = icon.style?.fill || DEFAULT_FILL;
    const core = icon.style?.core || icon.style?.fill || DEFAULT_CORE;
    const rim = icon.style?.rim || DEFAULT_RIM;
    const glow = icon.style?.glow || DEFAULT_GLOW;
    const pattern = icon.style?.pattern;
    ctx.clearRect?.(0, 0, canvas.width, canvas.height);
    ctx.save?.();
    ctx.translate?.(canvas.width * 0.5, canvas.height * 0.5);

    const outer = canvas.width * 0.46;
    const inner = outer * 0.68;

    fillCircle(ctx, outer, fill, { color: glow, blur: Math.max(6, canvas.width * 0.12) });
    if (ctx.lineWidth !== undefined) {
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(2, canvas.width * 0.06);
      ctx.strokeStyle = rim;
      ctx.beginPath();
      ctx.arc(0, 0, outer * 0.96, 0, Math.PI * 2);
      ctx.stroke();
    }
    fillCircle(ctx, inner, core, { color: glow, blur: Math.max(4, canvas.width * 0.08) });

    if (pattern?.type === "zigzag") {
      drawZigZag(ctx, outer * 0.75, {
        stroke: pattern.stroke || rim,
        width: Math.max(2, canvas.width * 0.05),
        amplitude: 0.22,
        waves: 6,
        glow: pattern.background || glow
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
    }

    ctx.restore?.();
  }

  return canvas;
}

export const __testables = {
  fillCircle,
  drawZigZag,
  drawCenterlineGuides
};
