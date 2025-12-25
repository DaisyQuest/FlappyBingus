// =====================
// FILE: public/js/pipeTextureMenu.js
// =====================
import { DEFAULT_CURRENCY_ID, formatCurrencyAmount } from "./currencySystem.js";
import { describeUnlock } from "./unlockables.js";

export const DEFAULT_PIPE_TEXTURE_HINT = "Mouse over a pipe texture to see how to unlock it.";
export const PIPE_TEXTURE_SWATCH_WIDTH = 120;
export const PIPE_TEXTURE_SWATCH_HEIGHT = 68;

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
  lockTextFor = null,
  swatchSize = null
} = {}) {
  if (!container) return { rendered: 0, swatches: [] };
  const doc = container.ownerDocument || globalThis.document;
  if (!doc) return { rendered: 0, swatches: [] };
  container.innerHTML = "";
  const unlockedSet = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const swatches = [];
  const width = Math.max(1, Number(swatchSize?.width) || PIPE_TEXTURE_SWATCH_WIDTH);
  const height = Math.max(1, Number(swatchSize?.height) || PIPE_TEXTURE_SWATCH_HEIGHT);

  if (!textures.length) {
    const empty = doc.createElement("div");
    empty.className = "hint bad";
    empty.textContent = "No pipe textures available.";
    container.append(empty);
    return { rendered: 0, swatches };
  }

  textures.forEach((texture) => {
    const unlocked = unlockedSet.has(texture.id);
    const unlock = texture.unlock || {};
    const isPurchase = unlock.type === "purchase";
    const statusText = lockTextFor?.(texture, { unlocked }) ?? describePipeTextureLock(texture, { unlocked });

    const btn = doc.createElement("button");
    btn.type = "button";
    btn.dataset.pipeTextureId = texture.id;
    btn.dataset.locked = unlocked ? "false" : "true";
    btn.dataset.statusText = statusText;
    btn.className = "pipe-texture-option" + (texture.id === selectedId ? " selected" : "") + (unlocked ? "" : " locked");
    if (isPurchase) {
      btn.dataset.unlockType = "purchase";
      btn.dataset.unlockCost = String(unlock.cost || 0);
      btn.dataset.unlockCurrency = unlock.currencyId || DEFAULT_CURRENCY_ID;
      btn.classList.add("purchasable");
    }
    btn.setAttribute("aria-pressed", texture.id === selectedId ? "true" : "false");
    btn.setAttribute("aria-label", unlocked ? `${texture.name} (pipe texture)` : `${texture.name} (${statusText})`);
    const interactive = unlocked || isPurchase;
    btn.setAttribute("aria-disabled", interactive ? "false" : "true");
    btn.tabIndex = interactive ? 0 : -1;

    const swatch = doc.createElement("span");
    swatch.className = "pipe-texture-swatch";
    const canvas = doc.createElement("canvas");
    canvas.className = "pipe-texture-swatch-canvas";
    canvas.width = width;
    canvas.height = height;
    swatch.append(canvas);

    const label = doc.createElement("div");
    label.className = "pipe-texture-option-name";
    label.textContent = texture.name || texture.id;

    btn.append(swatch, label);
    if (!unlocked) {
      const lock = doc.createElement("div");
      lock.className = "pipe-texture-lock";
      lock.textContent = "🔒";
      btn.append(lock);
    }

    if (!unlocked && isPurchase) {
      const cost = doc.createElement("div");
      cost.className = "unlock-cost";
      const currencyId = unlock.currencyId || DEFAULT_CURRENCY_ID;
      cost.textContent = `Cost: ${formatCurrencyAmount(unlock.cost || 0, currencyId)}`;
      btn.append(cost);
    }

    container.append(btn);
    swatches.push({ swatch, canvas, texture, unlocked });
    if (typeof onRenderSwatch === "function") onRenderSwatch({ swatch, canvas, texture, unlocked });
  });

  return { rendered: textures.length, swatches };
}

export function shouldClosePipeTextureMenu(event, { overlay, closeSelector = "#pipeTextureOverlayClose" } = {}) {
  if (!event || !overlay) return false;
  const target = event.target;
  if (target === overlay) return true;
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(closeSelector && target.closest(closeSelector));
}

export function togglePipeTextureMenu(overlay, open) {
  if (!overlay) return;
  overlay.classList.toggle("hidden", !open);
  overlay.setAttribute("aria-hidden", open ? "false" : "true");
}
