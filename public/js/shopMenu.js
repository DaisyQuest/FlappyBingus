// =====================
// FILE: public/js/shopMenu.js
// =====================
import { DEFAULT_CURRENCY_ID, formatCurrencyAmount } from "./currencySystem.js";
import { UNLOCKABLE_TYPES, isUnlockSatisfied } from "./unlockables.js";

export const SHOP_TABS = Object.freeze([
  { id: "shopTabIcons", label: "Icons", type: UNLOCKABLE_TYPES.playerTexture },
  { id: "shopTabTrails", label: "Trails", type: UNLOCKABLE_TYPES.trail },
  { id: "shopTabPipeTextures", label: "Pipe Textures", type: UNLOCKABLE_TYPES.pipeTexture }
]);

export function getPurchasableUnlockablesByType(unlockables = [], type) {
  return (Array.isArray(unlockables) ? unlockables : [])
    .filter((def) => def?.type === type && def?.unlock?.type === "purchase")
    .slice()
    .sort((a, b) => {
      const costA = a?.unlock?.cost ?? 0;
      const costB = b?.unlock?.cost ?? 0;
      if (costA !== costB) return costA - costB;
      return String(a?.name || a?.id).localeCompare(String(b?.name || b?.id));
    });
}

export function renderShopItems({
  container,
  items = [],
  context = {},
  onPurchase = null
} = {}) {
  if (!container) return { rendered: 0 };
  const doc = container.ownerDocument || document;
  container.innerHTML = "";

  if (!items.length) {
    const empty = doc.createElement("div");
    empty.className = "hint";
    empty.textContent = "No purchasable items in this category yet.";
    container.append(empty);
    return { rendered: 0 };
  }

  items.forEach((def) => {
    const unlocked = isUnlockSatisfied(def, context);
    const unlock = def.unlock || {};
    const currencyId = unlock.currencyId || DEFAULT_CURRENCY_ID;
    const costLabel = unlock.cost
      ? formatCurrencyAmount(unlock.cost, currencyId)
      : formatCurrencyAmount(0, currencyId);

    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "shop-item" + (unlocked ? " owned" : "");
    btn.dataset.unlockableId = def.id;
    btn.dataset.unlockableType = def.type;
    btn.dataset.unlockName = def.name || def.id;
    btn.dataset.unlockCost = String(unlock.cost || 0);
    btn.dataset.unlockCurrency = currencyId;
    btn.dataset.owned = unlocked ? "true" : "false";
    btn.setAttribute("aria-disabled", unlocked ? "true" : "false");
    btn.tabIndex = unlocked ? -1 : 0;

    const name = doc.createElement("div");
    name.className = "shop-item-name";
    name.textContent = def.name || def.id;

    const meta = doc.createElement("div");
    meta.className = "shop-item-meta";
    const cost = doc.createElement("span");
    cost.className = "shop-item-cost";
    cost.textContent = unlocked ? "Already Owned" : `Cost: ${costLabel}`;
    meta.append(cost);

    if (unlocked) {
      const ownedBadge = doc.createElement("div");
      ownedBadge.className = "shop-item-owned";
      ownedBadge.textContent = "Already Owned";
      btn.append(name, meta, ownedBadge);
    } else {
      btn.append(name, meta);
    }
    if (typeof onPurchase === "function") {
      btn.addEventListener("click", () => {
        if (btn.dataset.owned === "true") return;
        onPurchase(def);
      });
    }
    container.append(btn);
  });

  return { rendered: items.length };
}

export const __testables = {
  getPurchasableUnlockablesByType
};
