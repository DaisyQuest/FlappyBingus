// =====================
// FILE: public/js/themes.js
// =====================
import { clamp } from "./util.js";

const THEME_STORAGE_KEY = "bingus_theme_state";
const THEME_STORAGE_VERSION = 1;
const THEME_EXPORT_VERSION = 1;

const COLOR_RE = /^#([0-9a-fA-F]{6})$/;

export const THEME_FIELDS = [
  {
    id: "bg0",
    label: "Deep space",
    type: "color",
    group: "Backdrop"
  },
  {
    id: "bg1",
    label: "Horizon fade",
    type: "color",
    group: "Backdrop"
  },
  {
    id: "bgGlow1",
    label: "Aurora bloom",
    type: "color",
    group: "Backdrop"
  },
  {
    id: "bgGlow1Alpha",
    label: "Aurora bloom intensity",
    type: "range",
    min: 0,
    max: 0.4,
    step: 0.01,
    group: "Backdrop"
  },
  {
    id: "bgGlow2",
    label: "Starlight haze",
    type: "color",
    group: "Backdrop"
  },
  {
    id: "bgGlow2Alpha",
    label: "Starlight haze intensity",
    type: "range",
    min: 0,
    max: 0.4,
    step: 0.01,
    group: "Backdrop"
  },
  {
    id: "bgGlow3",
    label: "Nebula flare",
    type: "color",
    group: "Backdrop"
  },
  {
    id: "bgGlow3Alpha",
    label: "Nebula flare intensity",
    type: "range",
    min: 0,
    max: 0.4,
    step: 0.01,
    group: "Backdrop"
  },
  {
    id: "canvas",
    label: "Game canvas tint",
    type: "color",
    group: "Backdrop"
  },
  {
    id: "canvasAlpha",
    label: "Game canvas opacity",
    type: "range",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "Backdrop"
  },
  {
    id: "parallaxOpacity",
    label: "Parallax ambience",
    type: "range",
    min: 0,
    max: 1,
    step: 0.05,
    group: "Backdrop"
  },
  {
    id: "ambientGlow",
    label: "Ambient glow",
    type: "toggle",
    group: "Backdrop"
  },
  {
    id: "panel",
    label: "Panel base",
    type: "color",
    group: "Panels & Cards"
  },
  {
    id: "panelAlpha",
    label: "Panel opacity",
    type: "range",
    min: 0.5,
    max: 0.98,
    step: 0.01,
    group: "Panels & Cards"
  },
  {
    id: "panelAlt",
    label: "Panel deep",
    type: "color",
    group: "Panels & Cards"
  },
  {
    id: "panelAltAlpha",
    label: "Panel deep opacity",
    type: "range",
    min: 0.5,
    max: 0.98,
    step: 0.01,
    group: "Panels & Cards"
  },
  {
    id: "surfaceBase",
    label: "Surface base",
    type: "color",
    group: "Panels & Cards"
  },
  {
    id: "surfaceStrongAlpha",
    label: "Surface strong",
    type: "range",
    min: 0.06,
    max: 0.28,
    step: 0.01,
    group: "Panels & Cards"
  },
  {
    id: "surfaceSoftAlpha",
    label: "Surface soft",
    type: "range",
    min: 0.03,
    max: 0.18,
    step: 0.01,
    group: "Panels & Cards"
  },
  {
    id: "surfaceFaintAlpha",
    label: "Surface faint",
    type: "range",
    min: 0.01,
    max: 0.12,
    step: 0.01,
    group: "Panels & Cards"
  },
  {
    id: "surfaceBorderAlpha",
    label: "Surface border",
    type: "range",
    min: 0.05,
    max: 0.35,
    step: 0.01,
    group: "Panels & Cards"
  },
  {
    id: "panelBlur",
    label: "Glass blur (px)",
    type: "range",
    min: 0,
    max: 26,
    step: 1,
    group: "Panels & Cards"
  },
  {
    id: "glassEnabled",
    label: "Glass blur enabled",
    type: "toggle",
    group: "Panels & Cards"
  },
  {
    id: "text",
    label: "Primary text",
    type: "color",
    group: "Typography"
  },
  {
    id: "textAlpha",
    label: "Primary text opacity",
    type: "range",
    min: 0.6,
    max: 1,
    step: 0.01,
    group: "Typography"
  },
  {
    id: "muted",
    label: "Muted text",
    type: "color",
    group: "Typography"
  },
  {
    id: "mutedAlpha",
    label: "Muted text opacity",
    type: "range",
    min: 0.5,
    max: 0.95,
    step: 0.01,
    group: "Typography"
  },
  {
    id: "titleText",
    label: "Title text",
    type: "color",
    group: "Typography"
  },
  {
    id: "titleGlow",
    label: "Title glow",
    type: "color",
    group: "Typography"
  },
  {
    id: "titleGlowAlpha",
    label: "Title glow intensity",
    type: "range",
    min: 0,
    max: 0.8,
    step: 0.01,
    group: "Typography"
  },
  {
    id: "accent",
    label: "Accent",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "accentAlpha",
    label: "Accent opacity",
    type: "range",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "accentStrong",
    label: "Accent bright",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "accentStrongAlpha",
    label: "Accent bright opacity",
    type: "range",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "accentAlt",
    label: "Accent alt",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "accentAltAlpha",
    label: "Accent alt opacity",
    type: "range",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "bubble",
    label: "Bubble highlight",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "bubbleAlpha",
    label: "Bubble highlight opacity",
    type: "range",
    min: 0.4,
    max: 1,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "deepGlow",
    label: "Deep glow",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "deepGlowAlpha",
    label: "Deep glow intensity",
    type: "range",
    min: 0,
    max: 0.6,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "danger",
    label: "Danger",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "dangerAlpha",
    label: "Danger opacity",
    type: "range",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "ok",
    label: "Success",
    type: "color",
    group: "Accents & Status"
  },
  {
    id: "okAlpha",
    label: "Success opacity",
    type: "range",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "Accents & Status"
  },
  {
    id: "buttonStart",
    label: "Button top",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "buttonStartAlpha",
    label: "Button top opacity",
    type: "range",
    min: 0.05,
    max: 0.5,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "buttonEnd",
    label: "Button bottom",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "buttonEndAlpha",
    label: "Button bottom opacity",
    type: "range",
    min: 0.02,
    max: 0.3,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "buttonHoverStart",
    label: "Button hover top",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "buttonHoverStartAlpha",
    label: "Button hover top opacity",
    type: "range",
    min: 0.05,
    max: 0.5,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "buttonHoverEnd",
    label: "Button hover bottom",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "buttonHoverEndAlpha",
    label: "Button hover bottom opacity",
    type: "range",
    min: 0.03,
    max: 0.35,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "primaryStart",
    label: "Primary button top",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "primaryStartAlpha",
    label: "Primary button top opacity",
    type: "range",
    min: 0.2,
    max: 0.9,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "primaryEnd",
    label: "Primary button bottom",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "primaryEndAlpha",
    label: "Primary button bottom opacity",
    type: "range",
    min: 0.1,
    max: 0.7,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "primaryHoverStart",
    label: "Primary hover top",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "primaryHoverStartAlpha",
    label: "Primary hover top opacity",
    type: "range",
    min: 0.2,
    max: 1,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "primaryHoverEnd",
    label: "Primary hover bottom",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "primaryHoverEndAlpha",
    label: "Primary hover bottom opacity",
    type: "range",
    min: 0.1,
    max: 0.7,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "focus",
    label: "Focus ring",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "focusAlpha",
    label: "Focus ring opacity",
    type: "range",
    min: 0.3,
    max: 1,
    step: 0.01,
    group: "Buttons & Focus"
  },
  {
    id: "sparkle",
    label: "Sparkle glow",
    type: "color",
    group: "Buttons & Focus"
  },
  {
    id: "sparkleEnabled",
    label: "Sparkles enabled",
    type: "toggle",
    group: "Buttons & Focus"
  },
  {
    id: "pipeGreen",
    label: "Pipe green",
    type: "color",
    group: "Pipes"
  },
  {
    id: "pipeBlue",
    label: "Pipe blue",
    type: "color",
    group: "Pipes"
  },
  {
    id: "pipeWisteria",
    label: "Pipe wisteria",
    type: "color",
    group: "Pipes"
  },
  {
    id: "pipeRed",
    label: "Pipe red",
    type: "color",
    group: "Pipes"
  },
  {
    id: "scrollbarTrack",
    label: "Scrollbar track",
    type: "color",
    group: "Scrollbars"
  },
  {
    id: "scrollbarTrackAlpha",
    label: "Scrollbar track opacity",
    type: "range",
    min: 0.02,
    max: 0.2,
    step: 0.01,
    group: "Scrollbars"
  },
  {
    id: "scrollbarThumbStart",
    label: "Scrollbar thumb top",
    type: "color",
    group: "Scrollbars"
  },
  {
    id: "scrollbarThumbStartAlpha",
    label: "Scrollbar thumb top opacity",
    type: "range",
    min: 0.4,
    max: 1,
    step: 0.01,
    group: "Scrollbars"
  },
  {
    id: "scrollbarThumbEnd",
    label: "Scrollbar thumb bottom",
    type: "color",
    group: "Scrollbars"
  },
  {
    id: "scrollbarThumbEndAlpha",
    label: "Scrollbar thumb bottom opacity",
    type: "range",
    min: 0.3,
    max: 1,
    step: 0.01,
    group: "Scrollbars"
  }
];

export const THEME_DEFAULT_VALUES = {
  bg0: "#0b0c2d",
  bg1: "#151447",
  bgGlow1: "#ffbdff",
  bgGlow1Alpha: 0.16,
  bgGlow2: "#b4d2ff",
  bgGlow2Alpha: 0.14,
  bgGlow3: "#84b4ff",
  bgGlow3Alpha: 0.12,
  canvas: "#050912",
  canvasAlpha: 0.9,
  parallaxOpacity: 0.9,
  ambientGlow: true,
  panel: "#181844",
  panelAlpha: 0.86,
  panelAlt: "#221c52",
  panelAltAlpha: 0.76,
  surfaceBase: "#ffffff",
  surfaceStrongAlpha: 0.16,
  surfaceSoftAlpha: 0.09,
  surfaceFaintAlpha: 0.04,
  surfaceBorderAlpha: 0.12,
  panelBlur: 16,
  glassEnabled: true,
  text: "#fbf9ff",
  textAlpha: 0.96,
  muted: "#ebe8ff",
  mutedAlpha: 0.82,
  titleText: "#f9fbff",
  titleGlow: "#c8e6ff",
  titleGlowAlpha: 0.55,
  accent: "#9edeff",
  accentAlpha: 0.97,
  accentStrong: "#d4f5ff",
  accentStrongAlpha: 0.98,
  accentAlt: "#caa8ff",
  accentAltAlpha: 0.96,
  bubble: "#ffb9f5",
  bubbleAlpha: 0.85,
  deepGlow: "#84c1ff",
  deepGlowAlpha: 0.32,
  danger: "#ff6e6e",
  dangerAlpha: 0.95,
  ok: "#78ffb4",
  okAlpha: 0.95,
  buttonStart: "#ffffff",
  buttonStartAlpha: 0.16,
  buttonEnd: "#ffffff",
  buttonEndAlpha: 0.06,
  buttonHoverStart: "#ffffff",
  buttonHoverStartAlpha: 0.22,
  buttonHoverEnd: "#ffffff",
  buttonHoverEndAlpha: 0.1,
  primaryStart: "#b4e6ff",
  primaryStartAlpha: 0.46,
  primaryEnd: "#8cd2ff",
  primaryEndAlpha: 0.22,
  primaryHoverStart: "#cdf0ff",
  primaryHoverStartAlpha: 0.7,
  primaryHoverEnd: "#96d2ff",
  primaryHoverEndAlpha: 0.28,
  focus: "#b4e6ff",
  focusAlpha: 0.9,
  sparkle: "#ffffff",
  sparkleEnabled: true,
  pipeGreen: "#b7efb2",
  pipeBlue: "#b3ebf2",
  pipeWisteria: "#c9a0dc",
  pipeRed: "#ff746c",
  scrollbarTrack: "#ffffff",
  scrollbarTrackAlpha: 0.06,
  scrollbarThumbStart: "#aadcff",
  scrollbarThumbStartAlpha: 0.75,
  scrollbarThumbEnd: "#96b4ff",
  scrollbarThumbEndAlpha: 0.62
};

const THEME_PRESETS = {
  aurora: {
    name: "Aurora Dream",
    values: {}
  },
  ember: {
    name: "Ember Pulse",
    values: {
      bg0: "#1a0f1f",
      bg1: "#360c1f",
      bgGlow1: "#ffae7a",
      bgGlow2: "#ff6b6b",
      bgGlow3: "#ff3d8c",
      panel: "#2b1528",
      panelAlt: "#3f1628",
      accent: "#ffc28a",
      accentStrong: "#ffe1bf",
      accentAlt: "#ff8dd8",
      bubble: "#ffc6a6",
      deepGlow: "#ff9e6b",
      danger: "#ff6b6b",
      ok: "#ffd089",
      primaryStart: "#ffb06b",
      primaryEnd: "#ff6b6b"
    }
  },
  tide: {
    name: "Midnight Tide",
    values: {
      bg0: "#04111f",
      bg1: "#04253a",
      bgGlow1: "#7be9ff",
      bgGlow2: "#4bb0ff",
      bgGlow3: "#55ffd9",
      panel: "#0b2235",
      panelAlt: "#0f2f45",
      accent: "#6ef2ff",
      accentStrong: "#b6fbff",
      accentAlt: "#7cd1ff",
      bubble: "#7ff2d8",
      deepGlow: "#62d6ff",
      ok: "#65ffc3",
      primaryStart: "#6ef2ff",
      primaryEnd: "#4bb0ff"
    }
  },
  noir: {
    name: "Noir Luxe",
    values: {
      bg0: "#07070b",
      bg1: "#14141d",
      bgGlow1: "#8b7cff",
      bgGlow1Alpha: 0.1,
      bgGlow2: "#4d7cff",
      bgGlow2Alpha: 0.1,
      bgGlow3: "#9b7cff",
      bgGlow3Alpha: 0.1,
      panel: "#12121a",
      panelAlt: "#1b1b28",
      surfaceStrongAlpha: 0.12,
      surfaceSoftAlpha: 0.07,
      surfaceBorderAlpha: 0.1,
      text: "#f4f6ff",
      muted: "#ccd0ff",
      accent: "#b8b4ff",
      accentStrong: "#f1ecff",
      accentAlt: "#8e9bff",
      bubble: "#d3c6ff",
      deepGlow: "#8e9bff",
      primaryStart: "#b8b4ff",
      primaryEnd: "#8e9bff"
    }
  },
  solstice: {
    name: "Solar Solstice",
    values: {
      bg0: "#1a0c07",
      bg1: "#3a1b0b",
      bgGlow1: "#ffb35b",
      bgGlow2: "#ff6b3d",
      bgGlow3: "#ffd27f",
      panel: "#2b140a",
      panelAlt: "#3c1a0c",
      accent: "#ffcc7a",
      accentStrong: "#ffe6b6",
      accentAlt: "#ff9f6b",
      bubble: "#ffd99c",
      deepGlow: "#ff8b5a",
      ok: "#ffd089",
      danger: "#ff7a6a",
      primaryStart: "#ffb35b",
      primaryEnd: "#ff6b3d",
      pipeGreen: "#f7d26c",
      pipeBlue: "#ff9f6b",
      pipeWisteria: "#ffbfa1",
      pipeRed: "#ff6b3d"
    }
  },
  verdant: {
    name: "Verdant Glow",
    values: {
      bg0: "#06130d",
      bg1: "#0c2b1b",
      bgGlow1: "#74ffb0",
      bgGlow2: "#4df0c9",
      bgGlow3: "#2ad1a2",
      panel: "#0a2016",
      panelAlt: "#0d2f20",
      accent: "#6dffc5",
      accentStrong: "#c7ffe7",
      accentAlt: "#76f0c0",
      bubble: "#8affd9",
      deepGlow: "#56e7c8",
      ok: "#78ffb4",
      danger: "#ff7a8a",
      primaryStart: "#6dffc5",
      primaryEnd: "#2ad1a2",
      pipeGreen: "#72f2b1",
      pipeBlue: "#6ad6ff",
      pipeWisteria: "#9be8d0",
      pipeRed: "#ff7a8a"
    }
  }
};

export const PALETTE_PRESETS = [
  {
    id: "lilac",
    name: "Lilac Bloom",
    colors: {
      accent: "#bba8ff",
      accentStrong: "#efe6ff",
      accentAlt: "#f8a8ff",
      bubble: "#ffc4f2",
      deepGlow: "#a7c1ff",
      ok: "#9fffd4",
      danger: "#ff8fa3"
    }
  },
  {
    id: "citrus",
    name: "Citrus Surge",
    colors: {
      accent: "#ffd36e",
      accentStrong: "#fff0b6",
      accentAlt: "#ffc08a",
      bubble: "#ffe4a1",
      deepGlow: "#ffbd6e",
      ok: "#c9ff9f",
      danger: "#ff9b5f"
    }
  },
  {
    id: "glacier",
    name: "Glacier",
    colors: {
      accent: "#7bdcff",
      accentStrong: "#c0f5ff",
      accentAlt: "#9ac6ff",
      bubble: "#8bf3e0",
      deepGlow: "#5cc8ff",
      ok: "#8dffcf",
      danger: "#ff9bd2"
    }
  }
];

function normalizeColor(value, fallback) {
  if (typeof value === "string" && COLOR_RE.test(value.trim())) return value.trim().toLowerCase();
  return fallback;
}

function normalizeNumber(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return clamp(num, min, max);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function normalizeThemeValues(values = {}) {
  const out = { ...THEME_DEFAULT_VALUES };
  for (const field of THEME_FIELDS) {
    const current = values[field.id];
    if (field.type === "color") {
      out[field.id] = normalizeColor(current, out[field.id]);
    } else if (field.type === "range") {
      out[field.id] = normalizeNumber(current, out[field.id], field.min, field.max);
    } else if (field.type === "toggle") {
      out[field.id] = normalizeBoolean(current, out[field.id]);
    }
  }
  return out;
}

export function mergeThemeValues(base, overrides) {
  return normalizeThemeValues({ ...base, ...(overrides || {}) });
}

function base64Encode(value) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value, "utf8").toString("base64");
}

function base64Decode(value) {
  if (typeof atob === "function") return atob(value);
  return Buffer.from(value, "base64").toString("utf8");
}

function pickThemeValues(values) {
  const out = {};
  THEME_FIELDS.forEach((field) => {
    if (field.id in values) out[field.id] = values[field.id];
  });
  return out;
}

export function exportThemeString(values, { themeId = "custom" } = {}) {
  const payload = {
    version: THEME_EXPORT_VERSION,
    themeId,
    values: pickThemeValues(values)
  };
  return base64Encode(JSON.stringify(payload));
}

export function importThemeString(encoded) {
  if (typeof encoded !== "string" || !encoded.trim()) {
    return { error: "empty_payload" };
  }
  try {
    const decoded = base64Decode(encoded.trim());
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return { error: "invalid_payload" };
    if (parsed.version !== THEME_EXPORT_VERSION) return { error: "unsupported_version" };
    const values = parsed.values && typeof parsed.values === "object" ? parsed.values : {};
    const themeId = typeof parsed.themeId === "string" ? parsed.themeId : "custom";
    return { values: normalizeThemeValues(values), themeId };
  } catch {
    return { error: "invalid_payload" };
  }
}

function hexToRgb(hex) {
  const match = COLOR_RE.exec(hex || "");
  if (!match) return [255, 255, 255];
  const raw = match[1];
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return [r, g, b];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

export function buildThemeLibrary() {
  const presets = {};
  for (const [id, preset] of Object.entries(THEME_PRESETS)) {
    presets[id] = {
      id,
      name: preset.name,
      values: mergeThemeValues(THEME_DEFAULT_VALUES, preset.values)
    };
  }
  return presets;
}

export function loadThemeState() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== THEME_STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveThemeState(state) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      version: THEME_STORAGE_VERSION,
      activeThemeId: state.activeThemeId,
      lastPresetId: state.lastPresetId,
      customValues: state.customValues
    }));
  } catch {
    // ignore storage errors
  }
}

export function applyThemeValues(values, root = document.documentElement) {
  if (!root) return;
  const ambientGlow = values.ambientGlow ? 1 : 0;
  const glow1 = rgba(values.bgGlow1, values.bgGlow1Alpha * ambientGlow);
  const glow2 = rgba(values.bgGlow2, values.bgGlow2Alpha * ambientGlow);
  const glow3 = rgba(values.bgGlow3, values.bgGlow3Alpha * ambientGlow);

  root.style.setProperty("--bg0", values.bg0);
  root.style.setProperty("--bg1", values.bg1);
  root.style.setProperty("--bg-glow-1", glow1);
  root.style.setProperty("--bg-glow-2", glow2);
  root.style.setProperty("--bg-glow-3", glow3);
  root.style.setProperty("--canvas-bg", values.canvas);
  root.style.setProperty("--canvas-opacity", String(values.canvasAlpha));
  root.style.setProperty("--parallax-opacity", String(values.parallaxOpacity));

  root.style.setProperty("--panel", rgba(values.panel, values.panelAlpha));
  root.style.setProperty("--panel2", rgba(values.panelAlt, values.panelAltAlpha));
  root.style.setProperty("--panel-soft", rgba(values.surfaceBase, values.surfaceSoftAlpha));
  root.style.setProperty("--panel-strong", rgba(values.surfaceBase, values.surfaceStrongAlpha));
  root.style.setProperty("--surface-faint", rgba(values.surfaceBase, values.surfaceFaintAlpha));
  root.style.setProperty("--surface-border", rgba(values.surfaceBase, values.surfaceBorderAlpha));

  root.style.setProperty("--text", rgba(values.text, values.textAlpha));
  root.style.setProperty("--muted", rgba(values.muted, values.mutedAlpha));
  root.style.setProperty("--accent", rgba(values.accent, values.accentAlpha));
  root.style.setProperty("--accent-strong", rgba(values.accentStrong, values.accentStrongAlpha));
  root.style.setProperty("--accent2", rgba(values.accentAlt, values.accentAltAlpha));
  root.style.setProperty("--bubble", rgba(values.bubble, values.bubbleAlpha));
  root.style.setProperty("--deep-glow", rgba(values.deepGlow, values.deepGlowAlpha));
  root.style.setProperty("--danger", rgba(values.danger, values.dangerAlpha));
  root.style.setProperty("--ok", rgba(values.ok, values.okAlpha));

  root.style.setProperty("--title-color", values.titleText);
  root.style.setProperty("--title-glow", rgba(values.titleGlow, values.titleGlowAlpha));

  root.style.setProperty("--button-bg-start", rgba(values.buttonStart, values.buttonStartAlpha));
  root.style.setProperty("--button-bg-end", rgba(values.buttonEnd, values.buttonEndAlpha));
  root.style.setProperty("--button-hover-start", rgba(values.buttonHoverStart, values.buttonHoverStartAlpha));
  root.style.setProperty("--button-hover-end", rgba(values.buttonHoverEnd, values.buttonHoverEndAlpha));
  root.style.setProperty("--button-primary-start", rgba(values.primaryStart, values.primaryStartAlpha));
  root.style.setProperty("--button-primary-end", rgba(values.primaryEnd, values.primaryEndAlpha));
  root.style.setProperty("--button-primary-hover-start", rgba(values.primaryHoverStart, values.primaryHoverStartAlpha));
  root.style.setProperty("--button-primary-hover-end", rgba(values.primaryHoverEnd, values.primaryHoverEndAlpha));

  root.style.setProperty("--focus-ring", rgba(values.focus, values.focusAlpha));
  root.style.setProperty("--sparkle-glow", rgba(values.sparkle, values.sparkleEnabled ? 0.9 : 0));
  root.style.setProperty("--sparkle-opacity", values.sparkleEnabled ? "1" : "0");

  root.style.setProperty("--scrollbar-track", rgba(values.scrollbarTrack, values.scrollbarTrackAlpha));
  root.style.setProperty("--scrollbar-thumb-start", rgba(values.scrollbarThumbStart, values.scrollbarThumbStartAlpha));
  root.style.setProperty("--scrollbar-thumb-end", rgba(values.scrollbarThumbEnd, values.scrollbarThumbEndAlpha));

  const blurValue = values.glassEnabled ? `${values.panelBlur}px` : "0px";
  root.style.setProperty("--panel-blur", blurValue);
}

function groupFields(fields) {
  const grouped = new Map();
  fields.forEach((field) => {
    if (!grouped.has(field.group)) grouped.set(field.group, []);
    grouped.get(field.group).push(field);
  });
  return grouped;
}

function randomHex() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return `#${Array.from(bytes).map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function createControlRow(doc, field, value) {
  const row = doc.createElement("div");
  row.className = "theme-control";
  const label = doc.createElement("label");
  label.className = "theme-control-label";
  label.textContent = field.label;

  let input;
  let output;

  if (field.type === "color") {
    input = doc.createElement("input");
    input.type = "color";
    input.value = value;
  } else if (field.type === "range") {
    input = doc.createElement("input");
    input.type = "range";
    input.min = String(field.min ?? 0);
    input.max = String(field.max ?? 1);
    input.step = String(field.step ?? 0.01);
    input.value = String(value);
    output = doc.createElement("span");
    output.className = "theme-control-output";
    output.textContent = field.max <= 1 ? formatPct(value) : String(value);
  } else {
    input = doc.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
  }

  input.dataset.themeField = field.id;
  row.append(label, input);
  if (output) row.append(output);

  return { row, input, output };
}

export function initThemeEditor({ refs, config, onApply }) {
  if (!refs?.themeEditor) return null;
  const doc = refs.themeEditor.ownerDocument || document;
  const library = buildThemeLibrary();
  const defaultThemeId = config?.ui?.themes?.defaultThemeId || "aurora";

  const stored = loadThemeState();
  const activeThemeId = stored?.activeThemeId && library[stored.activeThemeId]
    ? stored.activeThemeId
    : library[defaultThemeId]
      ? defaultThemeId
      : "aurora";

  const customValues = stored?.customValues
    ? normalizeThemeValues(stored.customValues)
    : mergeThemeValues(THEME_DEFAULT_VALUES, library[activeThemeId]?.values);

  const state = {
    activeThemeId,
    lastPresetId: stored?.lastPresetId || activeThemeId,
    customValues
  };

  const applyFromState = (values) => {
    applyThemeValues(values, doc.documentElement);
    onApply?.(values);
  };

  const select = refs.themePresetSelect;
  if (select) {
    select.innerHTML = "";
    Object.values(library).forEach((preset) => {
      const opt = doc.createElement("option");
      opt.value = preset.id;
      opt.textContent = preset.name;
      select.append(opt);
    });
    const customOpt = doc.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "Custom";
    select.append(customOpt);
    select.value = state.activeThemeId === "custom" ? "custom" : state.activeThemeId;
  }

  refs.themeEditor.innerHTML = "";
  const controls = new Map();
  const grouped = groupFields(THEME_FIELDS);
  const preferredOrder = ["Pipes", "Backdrop"];
  const orderedGroupNames = [
    ...preferredOrder.filter((name) => grouped.has(name)),
    ...Array.from(grouped.keys()).filter((name) => !preferredOrder.includes(name))
  ];
  orderedGroupNames.forEach((groupName) => {
    const fields = grouped.get(groupName) || [];
    const group = doc.createElement("div");
    group.className = "theme-group";
    const heading = doc.createElement("div");
    heading.className = "theme-group-title";
    heading.textContent = groupName;
    const grid = doc.createElement("div");
    grid.className = "theme-group-grid";
    fields.forEach((field) => {
      const value = state.customValues[field.id];
      const { row, input, output } = createControlRow(doc, field, value);
      controls.set(field.id, { input, output });
      grid.append(row);
    });
    group.append(heading, grid);
    refs.themeEditor.append(group);
  });

  const updateOutputs = (fieldId, value) => {
    const control = controls.get(fieldId);
    if (!control?.output) return;
    const field = THEME_FIELDS.find(f => f.id === fieldId);
    if (!field) return;
    control.output.textContent = field.max <= 1 ? formatPct(value) : String(value);
  };

  const refreshInputs = (values) => {
    THEME_FIELDS.forEach((field) => {
      const control = controls.get(field.id);
      if (!control) return;
      if (field.type === "color") {
        control.input.value = values[field.id];
      } else if (field.type === "range") {
        control.input.value = String(values[field.id]);
        updateOutputs(field.id, values[field.id]);
      } else if (field.type === "toggle") {
        control.input.checked = Boolean(values[field.id]);
      }
    });
  };

  const applyTheme = (values, nextActive = "custom") => {
    state.activeThemeId = nextActive;
    state.customValues = normalizeThemeValues(values);
    if (select) select.value = state.activeThemeId;
    if (nextActive !== "custom") state.lastPresetId = nextActive;
    applyFromState(state.customValues);
    refreshInputs(state.customValues);
    saveThemeState(state);
    if (refs.themeStatus) {
      refs.themeStatus.textContent = nextActive === "custom"
        ? "Custom theme applied." : `Theme set to ${library[nextActive]?.name || nextActive}.`;
    }
  };

  applyTheme(state.customValues, state.activeThemeId);

  if (select) {
    select.addEventListener("change", () => {
      const selected = select.value;
      if (selected === "custom") {
        applyTheme(state.customValues, "custom");
        return;
      }
      const preset = library[selected];
      if (!preset) return;
      const merged = mergeThemeValues(THEME_DEFAULT_VALUES, preset.values);
      applyTheme(merged, preset.id);
    });
  }

  refs.themeEditor.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const fieldId = target.dataset.themeField;
    if (!fieldId) return;
    const field = THEME_FIELDS.find(f => f.id === fieldId);
    if (!field) return;

    let nextValue;
    if (field.type === "color") nextValue = target.value;
    else if (field.type === "range") nextValue = Number(target.value);
    else nextValue = target.checked;

    const nextValues = { ...state.customValues, [fieldId]: nextValue };
    applyTheme(nextValues, "custom");
  });

  if (refs.themeResetBtn) {
    refs.themeResetBtn.addEventListener("click", () => {
      const presetId = state.activeThemeId === "custom" ? state.lastPresetId : state.activeThemeId;
      const preset = library[presetId] || library[defaultThemeId];
      const merged = mergeThemeValues(THEME_DEFAULT_VALUES, preset?.values);
      applyTheme(merged, preset?.id || defaultThemeId);
    });
  }

  if (refs.themeRandomizeBtn) {
    refs.themeRandomizeBtn.addEventListener("click", () => {
      const nextValues = { ...state.customValues };
      THEME_FIELDS.forEach((field) => {
        if (field.type !== "color") return;
        nextValues[field.id] = randomHex();
      });
      applyTheme(nextValues, "custom");
    });
  }

  if (refs.themePaletteRow) {
    refs.themePaletteRow.innerHTML = "";
    PALETTE_PRESETS.forEach((palette) => {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "theme-palette";
      btn.textContent = palette.name;
      btn.addEventListener("click", () => {
        const nextValues = { ...state.customValues };
        Object.entries(palette.colors).forEach(([key, value]) => {
          if (THEME_DEFAULT_VALUES[key]) nextValues[key] = value;
        });
        applyTheme(nextValues, "custom");
      });
      refs.themePaletteRow.append(btn);
    });
  }

  if (refs.themeRandomAccentBtn) {
    refs.themeRandomAccentBtn.addEventListener("click", () => {
      const nextValues = { ...state.customValues };
      ["accent", "accentStrong", "accentAlt", "bubble", "deepGlow", "ok", "danger"].forEach((key) => {
        nextValues[key] = randomHex();
      });
      applyTheme(nextValues, "custom");
    });
  }

  if (refs.themeExportBtn) {
    refs.themeExportBtn.addEventListener("click", () => {
      const encoded = exportThemeString(state.customValues, { themeId: state.activeThemeId });
      if (refs.themeExportField) refs.themeExportField.value = encoded;
      if (refs.themeStatus) {
        refs.themeStatus.className = "hint good";
        refs.themeStatus.textContent = "Theme exported. Copy the base64 string to share.";
      }
    });
  }

  if (refs.themeImportBtn) {
    refs.themeImportBtn.addEventListener("click", () => {
      const payload = importThemeString(refs.themeExportField?.value || "");
      if (payload?.error) {
        if (refs.themeStatus) {
          refs.themeStatus.className = "hint bad";
          refs.themeStatus.textContent = "Import failed. Check that the base64 string is valid.";
        }
        return;
      }
      applyTheme(payload.values, "custom");
      if (refs.themeStatus) {
        refs.themeStatus.className = "hint good";
        refs.themeStatus.textContent = "Theme imported successfully.";
      }
    });
  }

  return { state, library, applyTheme, refreshInputs };
}
