// =====================
// FILE: public/js/settings.js
// =====================
// Shared helpers for player-configurable settings.

export const DEFAULT_SKILL_SETTINGS = Object.freeze({
  dashBehavior: "destroy",
  slowFieldBehavior: "explosion",
  teleportBehavior: "normal",
  invulnBehavior: "long",
  comicBookMode: "none"
});

export const SKILL_BEHAVIOR_OPTIONS = Object.freeze({
  dashBehavior: ["ricochet", "destroy"],
  slowFieldBehavior: ["slow", "explosion"],
  teleportBehavior: ["normal", "explode"],
  invulnBehavior: ["short", "long"],
  comicBookMode: ["none", "mild", "extreme"]
});

function normalizeValue(name, value) {
  const choices = SKILL_BEHAVIOR_OPTIONS[name] || [];
  return choices.includes(value) ? value : DEFAULT_SKILL_SETTINGS[name];
}

export function normalizeSkillSettings(settings = {}) {
  const out = {};
  for (const key of Object.keys(DEFAULT_SKILL_SETTINGS)) {
    out[key] = normalizeValue(key, settings[key]);
  }
  return out;
}

export function mergeSkillSettings(base, incoming) {
  const baseSafe = normalizeSkillSettings(base || DEFAULT_SKILL_SETTINGS);
  const src = incoming && typeof incoming === "object" ? incoming : {};
  const merged = { ...baseSafe };
  for (const key of Object.keys(DEFAULT_SKILL_SETTINGS)) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      merged[key] = normalizeValue(key, src[key]);
    }
  }
  return merged;
}

export function skillSettingsEqual(a, b) {
  const aa = normalizeSkillSettings(a);
  const bb = normalizeSkillSettings(b);
  return Object.keys(DEFAULT_SKILL_SETTINGS).every((key) => aa[key] === bb[key]);
}
