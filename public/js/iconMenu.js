// =====================
// FILE: public/js/iconMenu.js
// Shared helpers for rendering the player icon picker UI and hover hints.
// =====================
import { describeIconLock } from "./playerIcons.js";

export const DEFAULT_ICON_HINT = "Mouse over an icon to see how to unlock it.";

export function applyIconSwatchStyles(el, icon) {
  if (!el) return;
  const style = icon?.style || {};
  const fill = style.fill || "#ff8c1a";
  const core = style.core || fill || "#ffc285";
  const rim = style.rim || "#0f172a";
  const glow = style.glow || "rgba(255,200,120,.5)";
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
  unlockedIds = new Set()
} = {}) {
  if (!container) return { rendered: 0 };
  const doc = container.ownerDocument || document;
  const unlockedSet = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);

  container.innerHTML = "";
  if (!icons.length) {
    return { rendered: 0 };
  }

  icons.forEach((icon) => {
    const unlocked = unlockedSet.has(icon.id);
    const statusText = describeIconLock(icon, { unlocked });
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.dataset.iconId = icon.id;
    btn.dataset.statusText = statusText;
    btn.className = "icon-option" + (icon.id === selectedId ? " selected" : "") + (unlocked ? "" : " locked");
    btn.setAttribute("aria-pressed", icon.id === selectedId ? "true" : "false");
    btn.setAttribute("aria-label", unlocked ? `${icon.name} (icon)` : `${icon.name} (${statusText})`);
    btn.setAttribute("aria-disabled", unlocked ? "false" : "true");
    btn.tabIndex = unlocked ? 0 : -1;

    const swatch = doc.createElement("span");
    swatch.className = "icon-swatch";
    applyIconSwatchStyles(swatch, icon);
    btn.append(swatch);

    const label = doc.createElement("span");
    label.className = "icon-option-name";
    label.textContent = icon.name;
    btn.append(label);

    if (!unlocked) {
      const lock = doc.createElement("span");
      lock.className = "icon-lock";
      lock.setAttribute("aria-hidden", "true");
      lock.textContent = "🔒";
      btn.append(lock);
    }

    container.append(btn);
  });

  return { rendered: icons.length };
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
