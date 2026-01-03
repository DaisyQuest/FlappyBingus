// =====================
// FILE: public/js/settings.js
// =====================
// Shared helpers for player-configurable settings.

export const TEXT_STYLE_PRESET_OPTIONS = Object.freeze([
  { value: "basic", label: "BASIC" },
  { value: "comic_book_mild", label: "COMIC_BOOK_MILD" },
  { value: "comic_book_extreme", label: "COMIC_BOOK_EXTREME" },
  { value: "digital", label: "DIGITAL" },
  { value: "clean", label: "CLEAN" },
  { value: "neon_pulse", label: "NEON_PULSE" },
  { value: "holographic", label: "HOLOGRAPHIC" },
  { value: "sticker_blast", label: "STICKER_BLAST" },
  { value: "random", label: "RANDOM" },
  { value: "disabled", label: "DISABLED" },
  { value: "custom", label: "CUSTOM" }
]);

export const TEXT_FONT_FAMILY_OPTIONS = Object.freeze([
  { value: "system", label: "System" },
  { value: "comic", label: "Comic" },
  { value: "digital", label: "Digital" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" }
]);

export const DEFAULT_TEXT_STYLE_CUSTOM = Object.freeze({
  fontFamily: "system",
  fontWeight: 900,
  sizeScale: 1,
  useGameColors: true,
  useGameGlow: true,
  color: "#ffffff",
  glowColor: "#ffffff",
  strokeColor: "#000000",
  strokeWidth: 1.8,
  shadowBoost: 0,
  shadowOffsetY: 3,
  wobble: 0,
  spin: 0,
  shimmer: 0,
  sparkle: false,
  useGradient: false,
  gradientStart: "#fff3a6",
  gradientEnd: "#7ce9ff"
});

export const DEFAULT_SKILL_SETTINGS = Object.freeze({
  dashBehavior: "destroy",
  slowFieldBehavior: "explosion",
  teleportBehavior: "normal",
  invulnBehavior: "long",
  textStylePreset: "basic",
  textStyleCustom: DEFAULT_TEXT_STYLE_CUSTOM,
  simpleBackground: true,
  simpleTextures: false,
  simpleParticles: true,
  reducedEffects: true,
  extremeLowDetail: false
});

export const SKILL_BEHAVIOR_OPTIONS = Object.freeze({
  dashBehavior: ["ricochet", "destroy"],
  slowFieldBehavior: ["slow", "explosion"],
  teleportBehavior: ["normal", "explode"],
  invulnBehavior: ["short", "long"],
  textStylePreset: TEXT_STYLE_PRESET_OPTIONS.map((option) => option.value)
});

function normalizeValue(name, value) {
  const choices = SKILL_BEHAVIOR_OPTIONS[name] || [];
  return choices.includes(value) ? value : DEFAULT_SKILL_SETTINGS[name];
}

const SIMPLE_SETTING_KEYS = new Set([
  "simpleBackground",
  "simpleTextures",
  "simpleParticles",
  "reducedEffects",
  "extremeLowDetail"
]);

const LEGACY_TEXT_STYLE_MAP = Object.freeze({
  none: "basic",
  mild: "comic_book_mild",
  extreme: "comic_book_extreme"
});

function normalizeNumber(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function normalizeColor(value, fallback) {
  return (typeof value === "string" && value.trim()) ? value.trim() : fallback;
}

function normalizeBoolean(value, fallback) {
  return (typeof value === "boolean") ? value : fallback;
}

export function normalizeTextStylePreset(value) {
  return SKILL_BEHAVIOR_OPTIONS.textStylePreset.includes(value) ? value : DEFAULT_SKILL_SETTINGS.textStylePreset;
}

export function normalizeTextStyleCustom(custom = {}) {
  const src = custom && typeof custom === "object" ? custom : {};
  const allowedFonts = new Set(TEXT_FONT_FAMILY_OPTIONS.map((option) => option.value));
  return {
    fontFamily: allowedFonts.has(src.fontFamily) ? src.fontFamily : DEFAULT_TEXT_STYLE_CUSTOM.fontFamily,
    fontWeight: normalizeNumber(src.fontWeight, DEFAULT_TEXT_STYLE_CUSTOM.fontWeight, { min: 400, max: 950 }),
    sizeScale: normalizeNumber(src.sizeScale, DEFAULT_TEXT_STYLE_CUSTOM.sizeScale, { min: 0.7, max: 1.6 }),
    useGameColors: normalizeBoolean(src.useGameColors, DEFAULT_TEXT_STYLE_CUSTOM.useGameColors),
    useGameGlow: normalizeBoolean(src.useGameGlow, DEFAULT_TEXT_STYLE_CUSTOM.useGameGlow),
    color: normalizeColor(src.color, DEFAULT_TEXT_STYLE_CUSTOM.color),
    glowColor: normalizeColor(src.glowColor, DEFAULT_TEXT_STYLE_CUSTOM.glowColor),
    strokeColor: normalizeColor(src.strokeColor, DEFAULT_TEXT_STYLE_CUSTOM.strokeColor),
    strokeWidth: normalizeNumber(src.strokeWidth, DEFAULT_TEXT_STYLE_CUSTOM.strokeWidth, { min: 0, max: 6 }),
    shadowBoost: normalizeNumber(src.shadowBoost, DEFAULT_TEXT_STYLE_CUSTOM.shadowBoost, { min: -10, max: 30 }),
    shadowOffsetY: normalizeNumber(src.shadowOffsetY, DEFAULT_TEXT_STYLE_CUSTOM.shadowOffsetY, { min: -6, max: 12 }),
    wobble: normalizeNumber(src.wobble, DEFAULT_TEXT_STYLE_CUSTOM.wobble, { min: 0, max: 6 }),
    spin: normalizeNumber(src.spin, DEFAULT_TEXT_STYLE_CUSTOM.spin, { min: -1, max: 1 }),
    shimmer: normalizeNumber(src.shimmer, DEFAULT_TEXT_STYLE_CUSTOM.shimmer, { min: 0, max: 1 }),
    sparkle: normalizeBoolean(src.sparkle, DEFAULT_TEXT_STYLE_CUSTOM.sparkle),
    useGradient: normalizeBoolean(src.useGradient, DEFAULT_TEXT_STYLE_CUSTOM.useGradient),
    gradientStart: normalizeColor(src.gradientStart, DEFAULT_TEXT_STYLE_CUSTOM.gradientStart),
    gradientEnd: normalizeColor(src.gradientEnd, DEFAULT_TEXT_STYLE_CUSTOM.gradientEnd)
  };
}

export function normalizeSkillSettings(settings = {}) {
  const src = settings && typeof settings === "object" ? settings : {};
  const legacyPreset = src.textStylePreset ?? LEGACY_TEXT_STYLE_MAP[src.comicBookMode];
  const out = {};
  for (const key of Object.keys(DEFAULT_SKILL_SETTINGS)) {
    if (key === "textStylePreset") {
      out.textStylePreset = normalizeTextStylePreset(legacyPreset ?? src.textStylePreset);
      continue;
    }
    if (key === "textStyleCustom") {
      out.textStyleCustom = normalizeTextStyleCustom(src.textStyleCustom);
      continue;
    }
    if (SIMPLE_SETTING_KEYS.has(key)) {
      out[key] = normalizeBoolean(src[key], DEFAULT_SKILL_SETTINGS[key]);
      continue;
    }
    out[key] = normalizeValue(key, src[key]);
  }
  return out;
}

export function mergeSkillSettings(base, incoming) {
  const baseSafe = normalizeSkillSettings(base || DEFAULT_SKILL_SETTINGS);
  const src = incoming && typeof incoming === "object" ? incoming : {};
  const merged = { ...baseSafe };
  for (const key of Object.keys(DEFAULT_SKILL_SETTINGS)) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      if (key === "textStylePreset") {
        merged.textStylePreset = normalizeTextStylePreset(src.textStylePreset);
      } else if (key === "textStyleCustom") {
        merged.textStyleCustom = normalizeTextStyleCustom(src.textStyleCustom);
      } else if (SIMPLE_SETTING_KEYS.has(key)) {
        merged[key] = normalizeBoolean(src[key], DEFAULT_SKILL_SETTINGS[key]);
      } else {
        merged[key] = normalizeValue(key, src[key]);
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(src, "comicBookMode")
    && !Object.prototype.hasOwnProperty.call(src, "textStylePreset")) {
    merged.textStylePreset = normalizeTextStylePreset(LEGACY_TEXT_STYLE_MAP[src.comicBookMode]);
  }
  return merged;
}

export function skillSettingsEqual(a, b) {
  const aa = normalizeSkillSettings(a);
  const bb = normalizeSkillSettings(b);
  return Object.keys(DEFAULT_SKILL_SETTINGS).every((key) => {
    if (key === "textStyleCustom") {
      return Object.keys(DEFAULT_TEXT_STYLE_CUSTOM).every((customKey) => aa.textStyleCustom[customKey] === bb.textStyleCustom[customKey]);
    }
    return aa[key] === bb[key];
  });
}
