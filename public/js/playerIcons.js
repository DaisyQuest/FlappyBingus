// =====================
// FILE: public/js/playerIcons.js
// Player icon definitions + helpers for unlock logic and UI presentation.
// =====================
import { DEFAULT_CURRENCY_ID, formatCurrencyAmount, normalizeCurrencyId } from "./currencySystem.js";
import { buildBaseIcons } from "./iconRegistry.js";
import { resolveIconStyleV2 } from "./iconStyleV2.js";

export function normalizeIconUnlock(unlock) {
  if (!unlock || typeof unlock !== "object") return { type: "free", label: "Free" };
  const type = unlock.type;
  if (type === "score") {
    const minScore = Number.isFinite(unlock.minScore) ? Math.max(0, Math.floor(unlock.minScore)) : 0;
    return { type, minScore, label: unlock.label || `Score ${minScore}+` };
  }
  if (type === "achievement" && typeof unlock.id === "string") {
    return { type, id: unlock.id, label: unlock.label || "Achievement" };
  }
  if (type === "purchase") {
    const cost = Number.isFinite(unlock.cost) ? Math.max(0, Math.floor(unlock.cost)) : 0;
    const currencyId = normalizeCurrencyId(unlock.currencyId || DEFAULT_CURRENCY_ID);
    return { type, cost, currencyId, label: unlock.label || `Cost: ${formatCurrencyAmount(cost, currencyId)}` };
  }
  if (type === "record") {
    return { type: "record", label: unlock.label || "Record holder" };
  }
  return { type: "free", label: unlock.label || "Free" };
}

export function normalizePlayerIcons(list, { allowEmpty = false } = {}) {
  const hasList = Array.isArray(list);
  const baseIcons = buildBaseIcons();
  const src = hasList ? list : baseIcons;
  const seen = new Set();
  const out = [];

  for (const icon of src) {
    if (!icon || typeof icon !== "object") continue;
    const id = typeof icon.id === "string" && icon.id.trim() ? icon.id.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = typeof icon.name === "string" && icon.name.trim() ? icon.name.trim() : id;
    const unlock = normalizeIconUnlock(icon.unlock);
    const style = resolveIconStyleV2(icon);
    out.push({
      ...icon,
      id,
      name,
      unlock,
      style,
      schemaVersion: Number.isFinite(icon.schemaVersion) ? icon.schemaVersion : 2
    });
  }

  if (out.length) return out;
  if (hasList) return allowEmpty ? [] : [];
  return baseIcons.map((icon) => ({
    ...icon,
    unlock: normalizeIconUnlock(icon.unlock),
    style: resolveIconStyleV2(icon),
    schemaVersion: Number.isFinite(icon.schemaVersion) ? icon.schemaVersion : 2
  }));
}

export function getUnlockedPlayerIcons(icons, {
  bestScore = 0,
  ownedIconIds = [],
  achievements,
  recordHolder = false
} = {}) {
  const defs = normalizePlayerIcons(icons);
  const owned = new Set(
    Array.isArray(ownedIconIds)
      ? ownedIconIds.map((id) => (typeof id === "string" ? id : null)).filter(Boolean)
      : []
  );
  const unlockedAchievements =
    achievements && typeof achievements === "object" && achievements.unlocked
      ? achievements.unlocked
      : {};

  const unlocked = [];
  for (const icon of defs) {
    const unlock = icon.unlock || { type: "free" };
    let ok = false;
    switch (unlock.type) {
      case "free":
        ok = true;
        break;
      case "score":
        ok = bestScore >= (unlock.minScore || 0);
        break;
      case "achievement":
        ok = Boolean(unlockedAchievements && unlockedAchievements[unlock.id]);
        break;
      case "purchase":
        ok = owned.has(icon.id) || owned.has(unlock.id || icon.id);
        break;
      case "record":
        ok = !!recordHolder;
        break;
      default:
        ok = false;
    }
    if (ok) unlocked.push(icon.id);
  }
  return unlocked;
}

export function normalizeIconSelection({
  currentId,
  userSelectedId,
  unlockedIds,
  fallbackId
}) {
  const unlocked = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const current = currentId && unlocked.has(currentId) ? currentId : null;
  const userChoice = userSelectedId && unlocked.has(userSelectedId) ? userSelectedId : null;
  if (current) return current;
  if (userChoice) return userChoice;
  const [firstUnlocked] = unlocked;
  return firstUnlocked || fallbackId || "";
}

export function describeIconLock(icon, { unlocked }) {
  if (unlocked) return icon.unlock?.label || "Unlocked";
  const unlock = icon.unlock || { type: "free" };
  switch (unlock.type) {
    case "score":
      return `Locked: Reach score ${unlock.minScore}`;
    case "achievement":
      return `Locked: Earn the "${unlock.label || "Achievement"}" achievement`;
    case "purchase":
      return unlock.cost
        ? `Locked: Purchase for ${formatCurrencyAmount(unlock.cost, unlock.currencyId || DEFAULT_CURRENCY_ID)}`
        : "Locked: Purchase";
    case "record":
      return "Locked: Become the record holder";
    default:
      return "Locked";
  }
}

export function getFirstIconId(icons = []) {
  if (!Array.isArray(icons) || !icons.length) return "";
  return icons[0]?.id || "";
}

export const __testables = {
  normalizeIconUnlock
};
