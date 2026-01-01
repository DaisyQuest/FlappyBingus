"use strict";

const { DEFAULT_CURRENCY_ID, normalizeCurrencyId, getCurrencyDefinition } = require("./currency.cjs");

const UNLOCKABLE_TYPES = Object.freeze({
  trail: "trail",
  playerTexture: "player_texture",
  pipeTexture: "pipe_texture"
});

function normalizeUnlock(unlock) {
  if (!unlock || typeof unlock !== "object") return { type: "free", label: "Free" };
  const type = unlock.type;
  if (type === "score") {
    const minScore = Number.isFinite(unlock.minScore) ? Math.max(0, Math.floor(unlock.minScore)) : 0;
    return { type, minScore, label: unlock.label || `Score ${minScore}+` };
  }
  if (type === "achievement" && typeof unlock.id === "string") {
    const minScore = Number.isFinite(unlock.minScore) ? Math.max(0, Math.floor(unlock.minScore)) : null;
    return { type, id: unlock.id, minScore, label: unlock.label || "Achievement" };
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

function unlockKey(def) {
  return `${def.type}:${def.id}`;
}

function normalizeUnlockableState(raw = null) {
  const unlocked = {};
  if (raw?.unlocked && typeof raw.unlocked === "object") {
    for (const [id, ts] of Object.entries(raw.unlocked)) {
      const n = Number(ts);
      if (Number.isFinite(n) && n > 0) unlocked[id] = Math.floor(n);
    }
  }
  return { unlocked };
}

function isUnlockSatisfied(def, context = {}) {
  const unlock = def.unlock || { type: "free" };
  const bestScore = Number.isFinite(context.bestScore) ? context.bestScore : 0;
  const achievements = context.achievements?.unlocked && typeof context.achievements.unlocked === "object"
    ? context.achievements.unlocked
    : {};
  const ownedIds = new Set(
    Array.isArray(context.ownedIds)
      ? context.ownedIds.map((id) => (typeof id === "string" ? id : null)).filter(Boolean)
      : []
  );
  const recordHolder = Boolean(context.recordHolder);

  switch (unlock.type) {
    case "free":
      return true;
    case "score":
      return bestScore >= (unlock.minScore || 0);
    case "achievement":
      if (unlock.id && achievements[unlock.id]) return true;
      if (Number.isFinite(unlock.minScore)) return bestScore >= unlock.minScore;
      return false;
    case "purchase":
      return ownedIds.has(def.id) || ownedIds.has(unlock.id || def.id);
    case "record":
      return recordHolder;
    default:
      return true;
  }
}

function buildUnlockablesCatalog({ trails = [], icons = [], pipeTextures = [] } = {}) {
  const unlockables = [];

  (Array.isArray(trails) ? trails : []).forEach((trail) => {
    if (!trail || typeof trail !== "object") return;
    const id = String(trail.id || "").trim();
    if (!id) return;
    const minScore = Number.isFinite(trail.minScore) ? trail.minScore : 0;
    const unlock = trail.unlock
      ? normalizeUnlock(trail.unlock)
      : trail.requiresRecordHolder
        ? normalizeUnlock({ type: "record", label: "Record holder" })
        : trail.alwaysUnlocked
          ? normalizeUnlock({ type: "free", label: "Free" })
          : normalizeUnlock({
            type: "achievement",
            id: trail.achievementId || `trail_${id}`,
            minScore,
            label: minScore ? `Score ${minScore}+` : "Achievement"
          });
    unlockables.push({
      id,
      name: trail.name || id,
      type: UNLOCKABLE_TYPES.trail,
      unlock,
      meta: { minScore, requiresRecordHolder: Boolean(trail.requiresRecordHolder) }
    });
  });

  (Array.isArray(icons) ? icons : []).forEach((icon) => {
    if (!icon || typeof icon !== "object") return;
    const id = String(icon.id || "").trim();
    if (!id) return;
    unlockables.push({
      id,
      name: icon.name || id,
      type: UNLOCKABLE_TYPES.playerTexture,
      unlock: normalizeUnlock(icon.unlock),
      meta: { icon }
    });
  });

  (Array.isArray(pipeTextures) ? pipeTextures : []).forEach((texture) => {
    if (!texture || typeof texture !== "object") return;
    const id = String(texture.id || "").trim();
    if (!id) return;
    unlockables.push({
      id,
      name: texture.name || id,
      type: UNLOCKABLE_TYPES.pipeTexture,
      unlock: normalizeUnlock(texture.unlock),
      meta: { texture }
    });
  });

  return { unlockables };
}

function syncUnlockablesState(state, unlockables = [], context = {}, { now = Date.now() } = {}) {
  const normalized = normalizeUnlockableState(state);
  const newlyUnlocked = [];

  for (const def of Array.isArray(unlockables) ? unlockables : []) {
    const key = unlockKey(def);
    if (normalized.unlocked[key]) continue;
    if (!isUnlockSatisfied(def, context)) continue;
    normalized.unlocked[key] = now;
    newlyUnlocked.push(key);
  }

  return { state: normalized, unlocked: newlyUnlocked };
}

function getUnlockedIdsByType({ unlockables = [], type, state = null, context = {} } = {}) {
  const result = [];
  const normalized = normalizeUnlockableState(state);
  for (const def of Array.isArray(unlockables) ? unlockables : []) {
    if (def.type !== type) continue;
    const key = unlockKey(def);
    if (normalized.unlocked[key] || isUnlockSatisfied(def, context)) {
      result.push(def.id);
    }
  }
  return result;
}

module.exports = {
  UNLOCKABLE_TYPES,
  normalizeUnlock,
  normalizeUnlockableState,
  buildUnlockablesCatalog,
  syncUnlockablesState,
  getUnlockedIdsByType,
  unlockKey,
  isUnlockSatisfied
};
