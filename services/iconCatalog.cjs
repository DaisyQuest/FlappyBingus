"use strict";

const { normalizePlayerIcons } = require("./playerIcons.cjs");

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

module.exports = {
  normalizeIconCatalog
};
