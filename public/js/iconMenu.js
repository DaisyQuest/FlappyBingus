// =====================
// FILE: public/js/iconMenu.js
// Shared helpers for rendering the player icon picker UI and hover hints.
// =====================
import { DEFAULT_CURRENCY_ID, formatCurrencyAmount } from "./currencySystem.js";
import { describeIconLock } from "./playerIcons.js";
import { resolveIconStyleV2 } from "./iconStyleV2.js";

export const DEFAULT_ICON_HINT = "Mouse over an icon to see how to unlock it.";

export function applyIconSwatchStyles(el, icon) {
  if (!el) return;
  const style = resolveIconStyleV2(icon);
  const palette = style.palette || {};
  const fill = palette.fill || "#ff8c1a";
  const core = palette.core || "#ffc285";
  const rim = palette.rim || "#0f172a";
  const glow = palette.glow || "rgba(255,200,120,.5)";
  el.style.setProperty("--icon-fill", fill);
  el.style.setProperty("--icon-core", core);
  el.style.setProperty("--icon-rim", rim);
  el.style.setProperty("--icon-glow", glow);
}

export function iconHoverText(icon, { unlocked, lockText }) {
  if (!icon) return "";
  if (unlocked) {
    return `Click to equip ${icon.name || icon.id}.`;
  }
  return lockText || describeIconLock(icon, { unlocked });
}

export function resetIconHint(el, text = DEFAULT_ICON_HINT) {
  if (!el) return;
  el.className = "hint";
  el.textContent = text;
}

export function renderIconOptions({
  container,
  icons = [],
  selectedId,
  unlockedIds = new Set(),
  onRenderSwatch = null
} = {}) {
  if (!container) return { rendered: 0 };
  const doc = container.ownerDocument || document;
  const unlockedSet = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const renderedSwatches = [];

  container.innerHTML = "";
  if (!icons.length) {
    return { rendered: 0 };
  }

  icons.forEach((icon) => {
    const unlocked = unlockedSet.has(icon.id);
    const unlock = icon.unlock || {};
    const isPurchase = unlock.type === "purchase";
    const statusText = describeIconLock(icon, { unlocked });
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.dataset.iconId = icon.id;
    btn.dataset.statusText = statusText;
    btn.className = "icon-option" + (icon.id === selectedId ? " selected" : "") + (unlocked ? "" : " locked");
    if (isPurchase) {
      btn.dataset.unlockType = "purchase";
      btn.dataset.unlockCost = String(unlock.cost || 0);
      btn.dataset.unlockCurrency = unlock.currencyId || DEFAULT_CURRENCY_ID;
      btn.classList.add("purchasable");
    }
    btn.setAttribute("aria-pressed", icon.id === selectedId ? "true" : "false");
    btn.setAttribute("aria-label", unlocked ? `${icon.name} (icon)` : `${icon.name} (${statusText})`);
    const interactive = unlocked || isPurchase;
    btn.setAttribute("aria-disabled", interactive ? "false" : "true");
    btn.tabIndex = interactive ? 0 : -1;

    const swatch = doc.createElement("span");
    swatch.className = "icon-swatch";
    const canvas = doc.createElement("canvas");
    canvas.className = "icon-swatch-canvas";
    canvas.setAttribute("aria-hidden", "true");
    swatch.append(canvas);
    applyIconSwatchStyles(swatch, icon);
    btn.append(swatch);

    const label = doc.createElement("span");
    label.className = "icon-option-name";
    label.textContent = icon.name;
    btn.append(label);

    renderedSwatches.push({ swatch, canvas, icon, unlocked });
    onRenderSwatch?.({ swatch, canvas, icon, unlocked });

    if (!unlocked) {
      const lock = doc.createElement("span");
      lock.className = "icon-lock";
      lock.setAttribute("aria-hidden", "true");
      lock.textContent = "🔒";
      btn.append(lock);
    }

    if (!unlocked && isPurchase) {
      const cost = doc.createElement("span");
      cost.className = "unlock-cost";
      const currencyId = unlock.currencyId || DEFAULT_CURRENCY_ID;
      cost.textContent = `Cost: ${formatCurrencyAmount(unlock.cost || 0, currencyId)}`;
      btn.append(cost);
    }

    container.append(btn);
  });

  return { rendered: icons.length, swatches: renderedSwatches };
}

export function toggleIconMenu(overlay, open) {
  if (!overlay) return false;
  const shouldOpen = Boolean(open);
  if (shouldOpen) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  } else {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }
  return shouldOpen;
}

export const __testables = {
  applyIconSwatchStyles,
  iconHoverText,
  renderIconOptions,
  resetIconHint,
  toggleIconMenu
};
