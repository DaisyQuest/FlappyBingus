"use strict";

const { DEFAULT_CURRENCY_ID, normalizeCurrencyId, getCurrencyDefinition } = require("./currency.cjs");
const { buildBaseIcons } = require("./iconRegistry.cjs");

const PLAYER_ICONS = Object.freeze(buildBaseIcons());

function normalizePlayerIcons(list) {
  const hasList = Array.isArray(list);
  const src = hasList ? list : PLAYER_ICONS;
  const seen = new Set();
  const out = [];

  for (const icon of src) {
    if (!icon || typeof icon !== "object") continue;
    const id = typeof icon.id === "string" && icon.id.trim() ? icon.id.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = typeof icon.name === "string" && icon.name.trim() ? icon.name.trim() : id;
    const unlock = normalizeUnlock(icon.unlock);
    out.push({
      ...icon,
      id,
      name,
      unlock
    });
  }

  if (out.length) return out;
  if (hasList) return [];
  return PLAYER_ICONS.map((i) => ({ ...i, unlock: normalizeUnlock(i.unlock) }));
}

function normalizeUnlock(unlock) {
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
    const meta = getCurrencyDefinition(currencyId);
    const label = unlock.label || `Cost: ${cost} ${meta.shortLabel || meta.name}`.trim();
    return { type, cost, currencyId, label };
  }
  if (type === "record") {
    return { type: "record", label: unlock.label || "Record holder" };
  }
  return { type: "free", label: unlock.label || "Free" };
}

function unlockedIcons(user, { icons = PLAYER_ICONS, recordHolder = false } = {}) {
  const defs = normalizePlayerIcons(icons);
  const bestScore = Number(user?.bestScore) || 0;
  const owned = new Set();
  const ownedIcons = Array.isArray(user?.ownedIcons) ? user.ownedIcons : [];
  const ownedUnlockables = Array.isArray(user?.ownedUnlockables) ? user.ownedUnlockables : [];
  [...ownedIcons, ...ownedUnlockables].forEach((id) => {
    if (typeof id === "string" && id.trim()) owned.add(id);
  });
  const unlockedAchievements =
    user?.achievements && typeof user.achievements === "object" && user.achievements.unlocked
      ? user.achievements.unlocked
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
        ok = recordHolder;
        break;
      default:
        ok = false;
    }
    if (ok) unlocked.push(icon.id);
  }
  return unlocked;
}

module.exports = {
  PLAYER_ICONS,
  normalizePlayerIcons,
  normalizeUnlock,
  unlockedIcons
};
