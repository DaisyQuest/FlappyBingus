// =====================
// FILE: public/js/swatchPainter.js
// Render static player icon sprites into swatch canvases without spawning RAF loops.
// =====================
import { createPlayerIconSprite } from "./playerIconSprites.js";

const spriteCache = new Map();

function spriteKey(icon, size) {
  if (!icon?.id) return null;
  const safeSize = Math.max(16, Math.floor(size) || 96);
  return `${icon.id}:${safeSize}`;
}

export function getCachedIconSprite(icon, { size = 96 } = {}) {
  const key = spriteKey(icon, size);
  if (key && spriteCache.has(key)) return spriteCache.get(key);
  const sprite = createPlayerIconSprite(icon, { size });
  if (key) spriteCache.set(key, sprite);
  return sprite;
}

export function clearIconSpriteCache() {
  spriteCache.clear();
}

export function paintIconCanvas(canvas, icon, { sprite = null, size = 96 } = {}) {
  if (!canvas) return null;
  const target = sprite || getCachedIconSprite(icon, { size });
  if (!target) return null;
  const ctx = canvas.getContext?.("2d");
  if (!ctx || typeof ctx.drawImage !== "function") return null;

  const width = Math.max(1, Math.floor(target.naturalWidth || target.width || size));
  const height = Math.max(1, Math.floor(target.naturalHeight || target.height || width));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  ctx.clearRect?.(0, 0, width, height);
  ctx.drawImage(target, 0, 0, width, height);
  return { width, height };
}

export const __testables = {
  spriteCache
};
