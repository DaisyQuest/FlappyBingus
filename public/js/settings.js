// =====================
// FILE: public/js/settings.js
// =====================
// Shared helpers for player-configurable skill behaviors.

export const DEFAULT_SKILL_SETTINGS = Object.freeze({
  dashBehavior: "destroy",
  slowFieldBehavior: "explosion",
  teleportBehavior: "normal",
  invulnBehavior: "long"
});

export const REFERENCE_VIEW_SCALE = 2;
export const MIN_VIEW_SCALE = 0.5;
export const MAX_VIEW_SCALE = 3;
export const VIEW_SCALE_STEP = 0.05;

export const DEFAULT_VIEW_SETTINGS = Object.freeze({
  viewNormalization: "off",
  viewScale: REFERENCE_VIEW_SCALE
});

export const SKILL_BEHAVIOR_OPTIONS = Object.freeze({
  dashBehavior: ["ricochet", "destroy"],
  slowFieldBehavior: ["slow", "explosion"],
  teleportBehavior: ["normal", "explode"],
  invulnBehavior: ["short", "long"]
});

export const VIEW_NORMALIZATION_OPTIONS = Object.freeze(["off", "reference", "custom"]);

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

function clampScale(value) {
  return Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, value));
}

function normalizeViewMode(value) {
  return VIEW_NORMALIZATION_OPTIONS.includes(value) ? value : DEFAULT_VIEW_SETTINGS.viewNormalization;
}

function normalizeViewScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_VIEW_SETTINGS.viewScale;
  return clampScale(n);
}

export function normalizeViewSettings(settings = {}) {
  const src = settings && typeof settings === "object" ? settings : {};
  return {
    viewNormalization: normalizeViewMode(src.viewNormalization),
    viewScale: normalizeViewScale(src.viewScale)
  };
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

export function viewSettingsEqual(a, b) {
  const aa = normalizeViewSettings(a);
  const bb = normalizeViewSettings(b);
  return aa.viewNormalization === bb.viewNormalization && aa.viewScale === bb.viewScale;
}

export function normalizeGameSettings(settings = {}) {
  return {
    ...normalizeSkillSettings(settings),
    ...normalizeViewSettings(settings)
  };
}
