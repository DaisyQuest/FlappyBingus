import { clamp } from "./util.js";

export function sliderValueTo01(el, fallback01) {
  const raw = el ? Number.parseFloat(el.value) : Number.NaN;
  const pct = Number.isFinite(raw) ? raw : (fallback01 ?? 0) * 100;
  return clamp(pct / 100, 0, 1);
}

export function readVolumeSettingsFromUI({ musicSlider, sfxSlider, muteToggle, defaults }) {
  const fallback = defaults ?? { music: 0, sfx: 0, muted: false };
  const music = sliderValueTo01(musicSlider, fallback.music);
  const sfx = sliderValueTo01(sfxSlider, fallback.sfx);
  const muted = !!(muteToggle && muteToggle.checked);

  return { music, sfx, muted };
}

export function applyVolumeSettings({
  settings,
  setMusicVolume,
  setSfxVolume,
  setMuted,
  writeAudioSettings,
  defaults,
  game
}) {
  if (!settings) return;
  setMusicVolume?.(settings.music);
  setSfxVolume?.(settings.sfx);
  setMuted?.(!!settings.muted);
  writeAudioSettings?.({ music: settings.music, sfx: settings.sfx, muted: !!settings.muted }, defaults);

  if (game && typeof game.setAudioEnabled === "function") {
    const sfxAudible = !settings.muted && settings.sfx > 0;
    game.setAudioEnabled(sfxAudible);
  }
}

export function applyVolumeFromUI({
  musicSlider,
  sfxSlider,
  muteToggle,
  defaults,
  setMusicVolume,
  setSfxVolume,
  setMuted,
  writeAudioSettings,
  game
}) {
  const settings = readVolumeSettingsFromUI({ musicSlider, sfxSlider, muteToggle, defaults });
  applyVolumeSettings({ settings, setMusicVolume, setSfxVolume, setMuted, writeAudioSettings, defaults, game });
  return settings;
}

export function primeVolumeUI({ musicSlider, sfxSlider, muteToggle, readAudioSettings, defaults }) {
  const fallback = defaults ?? { music: 0, sfx: 0, muted: false };
  const saved = readAudioSettings?.(fallback) || fallback;

  if (musicSlider) musicSlider.value = String(Math.round((saved.music ?? 0) * 100));
  if (sfxSlider) sfxSlider.value = String(Math.round((saved.sfx ?? 0) * 100));
  if (muteToggle) muteToggle.checked = !!saved.muted;

  return saved;
}
