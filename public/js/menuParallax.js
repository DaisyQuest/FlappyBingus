// =====================
// FILE: public/js/menuParallax.js
// =====================
import { clamp } from "./util.js";

const cleanNumber = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) < 1e-6 ? 0 : value;
};

export function computeParallaxDeltas(point = {}, rect = {}) {
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (!(width > 0) || !(height > 0)) {
    return { dx: 0, dy: 0 };
  }

  const centerX = (Number(rect.left) || 0) + width / 2;
  const centerY = (Number(rect.top) || 0) + height / 2;
  const dx = clamp(((Number(point.x) || 0) - centerX) / (width / 2), -1, 1);
  const dy = clamp(((Number(point.y) || 0) - centerY) / (height / 2), -1, 1);
  return { dx, dy };
}

export function applyParallaxTransforms(layers = [], { dx = 0, dy = 0 } = {}) {
  for (const layer of layers) {
    if (!layer?.style) continue;
    const depth = cleanNumber(Number(layer.dataset?.parallaxDepth ?? 0));
    const tilt = cleanNumber(Number(layer.dataset?.parallaxTilt ?? 0));
    const offsetX = cleanNumber(-dx * depth);
    const offsetY = cleanNumber(-dy * depth);
    const rotate = cleanNumber(dx * tilt);
    layer.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) rotate(${rotate}deg)`;
  }
}

export function resetParallaxLayers(layers = []) {
  applyParallaxTransforms(layers, { dx: 0, dy: 0 });
}

export function createMenuParallaxController({ panel, layers = [], getRect } = {}) {
  const usableLayers = Array.isArray(layers) ? layers.filter(Boolean) : [];
  if (!panel || !usableLayers.length) {
    return { setEnabled: () => {}, applyFromPoint: () => {}, dispose: () => {} };
  }

  let enabled = true;
  const rectFn = typeof getRect === "function" ? getRect : () => panel.getBoundingClientRect();

  const applyFromPoint = ({ clientX, clientY } = {}) => {
    if (!enabled || panel.classList.contains("hidden")) {
      resetParallaxLayers(usableLayers);
      return;
    }
    const rect = rectFn() || {};
    const { dx, dy } = computeParallaxDeltas(
      {
        x: clientX ?? rect.left + (rect.width || 0) / 2,
        y: clientY ?? rect.top + (rect.height || 0) / 2
      },
      rect
    );
    applyParallaxTransforms(usableLayers, { dx, dy });
  };

  const handleMove = (evt) => applyFromPoint(evt);
  const handleLeave = () => resetParallaxLayers(usableLayers);

  panel.addEventListener("pointermove", handleMove);
  panel.addEventListener("pointerleave", handleLeave);
  resetParallaxLayers(usableLayers);

  return {
    setEnabled(active) {
      enabled = !!active;
      if (!enabled) resetParallaxLayers(usableLayers);
    },
    applyFromPoint,
    dispose() {
      panel.removeEventListener("pointermove", handleMove);
      panel.removeEventListener("pointerleave", handleLeave);
      resetParallaxLayers(usableLayers);
    }
  };
}

export const __testables = {
  applyParallaxTransforms,
  computeParallaxDeltas
};
