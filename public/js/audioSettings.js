// =====================
// FILE: public/js/audioSettings.js
// =====================
import { clamp, readJsonCookie, writeJsonCookie } from "./util.js";

const AUDIO_COOKIE = "bingus_audio";

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  music: 0.7,
  sfx: 0.8,
  muted: false
});

export function normalizeAudioSettings(settings, defaults = DEFAULT_AUDIO_SETTINGS) {
  const base = defaults || DEFAULT_AUDIO_SETTINGS;
  const musicRaw = Number(settings?.music);
  const sfxRaw = Number(settings?.sfx);
  const music = Number.isFinite(musicRaw) ? clamp(musicRaw, 0, 1) : base.music;
  const sfx = Number.isFinite(sfxRaw) ? clamp(sfxRaw, 0, 1) : base.sfx;
  const muted = Boolean(settings?.muted);
  return { music, sfx, muted };
}

export function readAudioSettings(defaults = DEFAULT_AUDIO_SETTINGS) {
  const raw = readJsonCookie(AUDIO_COOKIE);
  if (!raw) return null;
  return normalizeAudioSettings(raw, defaults);
}

export function writeAudioSettings(settings, defaults = DEFAULT_AUDIO_SETTINGS) {
  writeJsonCookie(AUDIO_COOKIE, normalizeAudioSettings(settings, defaults), 3650);
}
