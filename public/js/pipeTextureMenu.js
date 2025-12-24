// =====================
// FILE: public/js/pipeTextureMenu.js
// =====================
import { describeUnlock } from "./unlockables.js";

export const DEFAULT_PIPE_TEXTURE_HINT = "Mouse over a pipe texture to see how to unlock it.";

export function describePipeTextureLock(texture, { unlocked }) {
  if (unlocked) return texture?.unlock?.label || "Unlocked";
  return describeUnlock(texture?.unlock || {}, { unlocked: false });
}

export function pipeTextureHoverText(texture, { unlocked }) {
  if (!texture) return "";
  if (unlocked) return `Click to equip ${texture.name || texture.id}.`;
  return describePipeTextureLock(texture, { unlocked: false });
}

export function renderPipeTextureOptions({
  container,
  textures = [],
  selectedId = "",
  unlockedIds = new Set(),
  onRenderSwatch = null,
  lockTextFor = null
} = {}) {
  if (!container) return { rendered: 0, swatches: [] };
  container.innerHTML = "";
  const unlockedSet = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const swatches = [];

  if (!textures.length) {
    const empty = document.createElement("div");
    empty.className = "hint bad";
    empty.textContent = "No pipe textures available.";
    container.append(empty);
    return { rendered: 0, swatches };
  }

  textures.forEach((texture) => {
    const unlocked = unlockedSet.has(texture.id);
    const statusText = lockTextFor?.(texture, { unlocked }) ?? describePipeTextureLock(texture, { unlocked });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.pipeTextureId = texture.id;
    btn.dataset.locked = unlocked ? "false" : "true";
    btn.dataset.statusText = statusText;
    btn.className = "pipe-texture-option" + (texture.id === selectedId ? " selected" : "") + (unlocked ? "" : " locked");
    btn.setAttribute("aria-pressed", texture.id === selectedId ? "true" : "false");
    btn.setAttribute("aria-label", unlocked ? `${texture.name} (pipe texture)` : `${texture.name} (${statusText})`);
    btn.setAttribute("aria-disabled", unlocked ? "false" : "true");
    btn.tabIndex = unlocked ? 0 : -1;

    const swatch = document.createElement("span");
    swatch.className = "pipe-texture-swatch";
    const canvas = document.createElement("canvas");
    canvas.className = "pipe-texture-swatch-canvas";
    canvas.width = 140;
    canvas.height = 80;
    swatch.append(canvas);

    const label = document.createElement("div");
    label.className = "pipe-texture-option-name";
    label.textContent = texture.name || texture.id;

    btn.append(swatch, label);
    if (!unlocked) {
      const lock = document.createElement("div");
      lock.className = "pipe-texture-lock";
      lock.textContent = "🔒";
      btn.append(lock);
    }

    container.append(btn);
    swatches.push({ swatch, canvas, texture, unlocked });
    if (typeof onRenderSwatch === "function") onRenderSwatch({ swatch, canvas, texture, unlocked });
  });

  return { rendered: textures.length, swatches };
}

export function togglePipeTextureMenu(overlay, open) {
  if (!overlay) return;
  overlay.classList.toggle("hidden", !open);
  overlay.setAttribute("aria-hidden", open ? "false" : "true");
}
