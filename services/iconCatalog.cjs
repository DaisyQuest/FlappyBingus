"use strict";

const { PLAYER_ICONS, normalizePlayerIcons } = require("./playerIcons.cjs");

const BASE_ICON_CATALOG = Object.freeze(normalizePlayerIcons(PLAYER_ICONS));

function getBaseIconCatalog() {
  return BASE_ICON_CATALOG.map((icon) => ({ ...icon }));
}

function mergeIconCatalogs({ baseIcons = getBaseIconCatalog(), storedIcons = [] } = {}) {
  const normalizedBase = normalizePlayerIcons(baseIcons);
  const normalizedStored = normalizePlayerIcons(storedIcons);
  if (!normalizedStored.length) return normalizedBase;

  const merged = normalizedBase.map((icon) => ({ ...icon }));
  const indexById = new Map(merged.map((icon, index) => [icon.id, index]));

  normalizedStored.forEach((icon) => {
    const idx = indexById.get(icon.id);
    if (idx === undefined) {
      indexById.set(icon.id, merged.length);
      merged.push(icon);
    } else {
      merged[idx] = icon;
    }
  });

  return merged;
}

function normalizeIconCatalog(payload) {
  const errors = [];
  const source = payload?.icons ?? payload?.iconStyles?.icons ?? payload;
  if (source === undefined || source === null) {
    return { ok: true, icons: [], errors };
  }
  if (!Array.isArray(source)) {
    return { ok: false, icons: [], errors: [{ path: "icons", message: "icons_invalid" }] };
  }

  const sanitized = [];
  const seen = new Set();
  source.forEach((icon, index) => {
    if (!icon || typeof icon !== "object") {
      errors.push({ path: `icons[${index}]`, message: "icon_invalid" });
      return;
    }
    const id = typeof icon.id === "string" ? icon.id.trim() : "";
    if (!id) {
      errors.push({ path: `icons[${index}].id`, message: "icon_id_invalid" });
      return;
    }
    if (seen.has(id)) {
      errors.push({ path: `icons[${index}].id`, message: "icon_id_duplicate" });
      return;
    }
    seen.add(id);
    sanitized.push(icon);
  });

  const icons = normalizePlayerIcons(sanitized);
  return { ok: errors.length === 0, icons, errors };
}

function resolveIconCatalog({ storedIcons, baseIcons } = {}) {
  const resolvedBase = Array.isArray(baseIcons) ? baseIcons : getBaseIconCatalog();
  if (!Array.isArray(storedIcons)) return mergeIconCatalogs({ baseIcons: resolvedBase, storedIcons: [] });
  const result = normalizeIconCatalog({ icons: storedIcons });
  return mergeIconCatalogs({ baseIcons: resolvedBase, storedIcons: result.icons });
}

module.exports = {
  getBaseIconCatalog,
  mergeIconCatalogs,
  normalizeIconCatalog,
  resolveIconCatalog
};
