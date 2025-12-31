import { clamp } from "./util.js";

const DEFAULT_BACKGROUND_COLOR = "#07101a";

export function createBackgroundLayer() {
  return {
    canvas: null,
    ctx: null,
    dirty: true,
    dots: []
  };
}

export function initBackgroundLayer(layer, { width, height, rand = Math.random } = {}) {
  if (!layer) throw new Error("Background layer is required.");
  const w = Math.max(1, width || 0);
  const h = Math.max(1, height || 0);
  const count = Math.floor(clamp((w * h) / 11000, 80, 220));

  layer.dots.length = 0;
  for (let i = 0; i < count; i += 1) {
    layer.dots.push({
      x: rand() * w,
      y: rand() * h,
      r: 0.8 + rand() * (2.2 - 0.8),
      s: 4 + rand() * (22 - 4)
    });
  }

  layer.dirty = true;
}

export function refreshBackgroundLayer(layer, { width, height, backgroundColor = DEFAULT_BACKGROUND_COLOR } = {}) {
  if (!layer) throw new Error("Background layer is required.");
  const canvasFactory = () => {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
    if (typeof document !== "undefined") return document.createElement("canvas");
    return null;
  };

  if (!layer.canvas) layer.canvas = canvasFactory();
  if (!layer.canvas) return;

  const w = Math.max(1, Math.round(width || 0));
  const h = Math.max(1, Math.round(height || 0));

  if (layer.canvas.width !== w || layer.canvas.height !== h) {
    layer.canvas.width = w;
    layer.canvas.height = h;
    layer.ctx = null;
  }

  if (!layer.ctx) layer.ctx = layer.canvas.getContext("2d", { alpha: false });
  const ctx = layer.ctx;
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, w, h);

  const vg = ctx.createRadialGradient(
    w * 0.5, h * 0.45, Math.min(w, h) * 0.12,
    w * 0.5, h * 0.5, Math.max(w, h) * 0.75
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.44)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(255,255,255,.20)";
  for (const dot of layer.dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  layer.dirty = false;
}

export function updateBackgroundDots(layer, { width, height, dt, rand = Math.random } = {}) {
  if (!layer) throw new Error("Background layer is required.");
  const w = Math.max(1, width || 0);
  const h = Math.max(1, height || 0);
  const delta = Number(dt) || 0;

  for (const dot of layer.dots) {
    dot.y += dot.s * delta;
    if (dot.y > h + 10) {
      dot.y = -10;
      dot.x = rand() * w;
    }
  }
}

export function drawBackgroundLayer(layer, ctx, { width, height } = {}) {
  if (!layer) throw new Error("Background layer is required.");
  if (layer.dirty) refreshBackgroundLayer(layer, { width, height });
  if (layer.canvas && ctx) {
    ctx.drawImage(layer.canvas, 0, 0, width, height);
    return true;
  }
  return false;
}
