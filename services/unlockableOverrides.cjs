"use strict";

const { normalizeUnlock } = require("./unlockables.cjs");

const DEFAULT_UNLOCKABLE_OVERRIDES = Object.freeze({
  trail: Object.freeze({}),
  player_texture: Object.freeze({}),
  pipe_texture: Object.freeze({})
});

const ALLOWED_OVERRIDE_TYPES = new Set(["achievement", "score", "purchase", "record", "free"]);

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeUnlockOverride(raw, errors, prefix) {
  if (!isPlainObject(raw)) {
    errors.push({ field: prefix, error: "invalid_unlock_override" });
    return null;
  }
  const type = raw.type;
  if (!ALLOWED_OVERRIDE_TYPES.has(type)) {
    errors.push({ field: `${prefix}.type`, error: "invalid_unlock_type" });
    return null;
  }
  if (type === "achievement") {
    if (typeof raw.id !== "string" || !raw.id.trim()) {
      errors.push({ field: `${prefix}.id`, error: "missing_achievement_id" });
      return null;
    }
  }
  if (type === "score") {
    if (!Number.isFinite(Number(raw.minScore))) {
      errors.push({ field: `${prefix}.minScore`, error: "missing_min_score" });
      return null;
    }
  }
  if (type === "purchase") {
    if (!Number.isFinite(Number(raw.cost))) {
      errors.push({ field: `${prefix}.cost`, error: "missing_cost" });
      return null;
    }
  }
  return normalizeUnlock(raw);
}

function normalizeUnlockableOverrides(raw, { allowedIdsByType = null } = {}) {
  const overrides = {
    trail: {},
    player_texture: {},
    pipe_texture: {}
  };
  if (!isPlainObject(raw)) {
    return { ok: true, overrides, errors: [] };
  }

  const errors = [];
  for (const [type, defaultValue] of Object.entries(DEFAULT_UNLOCKABLE_OVERRIDES)) {
    const group = raw[type];
    if (!isPlainObject(group)) continue;
    for (const [id, unlock] of Object.entries(group)) {
      const trimmed = String(id || "").trim();
      if (!trimmed) continue;
      if (allowedIdsByType?.[type] && !allowedIdsByType[type].has(trimmed)) {
        errors.push({ field: `${type}.${trimmed}`, error: "unknown_unlockable_id" });
        continue;
      }
      const normalized = normalizeUnlockOverride(unlock, errors, `${type}.${trimmed}`);
      if (normalized) overrides[type][trimmed] = normalized;
    }
    if (!overrides[type]) overrides[type] = { ...defaultValue };
  }

  if (errors.length) {
    return { ok: false, overrides, errors };
  }
  return { ok: true, overrides, errors: [] };
}

function applyUnlockableOverrides({ trails = [], icons = [], pipeTextures = [] } = {}, overrides = {}) {
  const trailOverrides = overrides?.trail || {};
  const iconOverrides = overrides?.player_texture || {};
  const textureOverrides = overrides?.pipe_texture || {};

  const nextTrails = (Array.isArray(trails) ? trails : []).map((trail) => {
    if (!trail || typeof trail !== "object") return trail;
    const clone = { ...trail };
    const override = trailOverrides[clone.id];
    if (override) {
      clone.unlock = override;
    }
    return clone;
  });

  const nextIcons = (Array.isArray(icons) ? icons : []).map((icon) => {
    if (!icon || typeof icon !== "object") return icon;
    const clone = { ...icon };
    const override = iconOverrides[clone.id];
    if (override) {
      clone.unlock = override;
    }
    return clone;
  });

  const nextTextures = (Array.isArray(pipeTextures) ? pipeTextures : []).map((texture) => {
    if (!texture || typeof texture !== "object") return texture;
    const clone = { ...texture };
    const override = textureOverrides[clone.id];
    if (override) {
      clone.unlock = override;
    }
    return clone;
  });

  return { trails: nextTrails, icons: nextIcons, pipeTextures: nextTextures };
}

module.exports = {
  DEFAULT_UNLOCKABLE_OVERRIDES,
  normalizeUnlockableOverrides,
  applyUnlockableOverrides
};
