// =====================
// FILE: public/js/preferences.js
// =====================
import { getCookie, setCookie } from "./util.js";
import { normalizeSkillSettings } from "./settings.js";
import { normalizePipeTextureMode } from "./pipeTextures.js";

const LOCAL_BEST_COOKIE = "chocolate_chip";
const SURF_LOCAL_BEST_COOKIE = "chocolate_chip_surf";
const SEED_COOKIE = "sesame_seed";
const SETTINGS_COOKIE = "bingus_settings";
const ICON_COOKIE = "bingus_icon";
const PIPE_TEXTURE_COOKIE = "bingus_pipe_texture";
const PIPE_TEXTURE_MODE_COOKIE = "bingus_pipe_texture_mode";

function resolveBestCookie(mode) {
  if (mode === "surf") return SURF_LOCAL_BEST_COOKIE;
  return LOCAL_BEST_COOKIE;
}

export function readLocalBest(mode = "flappy") {
  const raw = getCookie(resolveBestCookie(mode));
  const n = Number.parseInt(raw, 10);
  return (Number.isFinite(n) && n >= 0) ? Math.min(n, 1e9) : 0;
}

export function writeLocalBest(v, mode = "flappy") {
  setCookie(resolveBestCookie(mode), String(Math.max(0, Math.min(1e9, v | 0))), 3650);
}

export function readSeed() {
  const raw = getCookie(SEED_COOKIE);
  try { return raw ? decodeURIComponent(raw) : ""; } catch { return raw || ""; }
}

export function writeSeed(s) {
  setCookie(SEED_COOKIE, String(s ?? ""), 3650);
}

export function genRandomSeed(cryptoSource = globalThis.crypto) {
  const u = new Uint32Array(2);
  cryptoSource.getRandomValues(u);
  return `${u[0].toString(16)}-${u[1].toString(16)}`;
}

export function readSettingsCookie() {
  const raw = getCookie(SETTINGS_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return normalizeSkillSettings(parsed);
  } catch {
    return null;
  }
}

export function writeSettingsCookie(settings) {
  try {
    setCookie(SETTINGS_COOKIE, JSON.stringify(normalizeSkillSettings(settings || {})), 3650);
  } catch {
    // ignore cookie errors
  }
}

export function readIconCookie() {
  const raw = getCookie(ICON_COOKIE);
  if (!raw || typeof raw !== "string") return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function writeIconCookie(id) {
  if (!id) return;
  setCookie(ICON_COOKIE, String(id), 3650);
}

export function readPipeTextureCookie() {
  const raw = getCookie(PIPE_TEXTURE_COOKIE);
  if (!raw || typeof raw !== "string") return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function writePipeTextureCookie(id) {
  if (!id) return;
  setCookie(PIPE_TEXTURE_COOKIE, String(id), 3650);
}

export function readPipeTextureModeCookie() {
  const raw = getCookie(PIPE_TEXTURE_MODE_COOKIE);
  if (!raw || typeof raw !== "string") return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function writePipeTextureModeCookie(mode) {
  const normalized = normalizePipeTextureMode(mode);
  setCookie(PIPE_TEXTURE_MODE_COOKIE, normalized, 3650);
}
