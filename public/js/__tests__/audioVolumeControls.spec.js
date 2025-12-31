import { describe, expect, it, vi } from "vitest";
import {
  applyVolumeFromUI,
  applyVolumeSettings,
  primeVolumeUI,
  readVolumeSettingsFromUI,
  sliderValueTo01
} from "../audioVolumeControls.js";

describe("audio volume controls", () => {
  it("clamps slider values to 0-1 with fallback", () => {
    expect(sliderValueTo01({ value: "50" }, 0.3)).toBeCloseTo(0.5);
    expect(sliderValueTo01({ value: "200" }, 0.3)).toBe(1);
    expect(sliderValueTo01({ value: "-20" }, 0.3)).toBe(0);
    expect(sliderValueTo01({ value: "nope" }, 0.3)).toBeCloseTo(0.3);
    expect(sliderValueTo01(null, 0.42)).toBeCloseTo(0.42);
  });

  it("reads volume settings from UI elements and defaults", () => {
    const defaults = { music: 0.2, sfx: 0.7, muted: false };
    const settings = readVolumeSettingsFromUI({
      musicSlider: null,
      sfxSlider: null,
      muteToggle: { checked: true },
      defaults
    });

    expect(settings).toEqual({ music: 0.2, sfx: 0.7, muted: true });
  });

  it("applies volume settings and toggles game audio", () => {
    const setMusicVolume = vi.fn();
    const setSfxVolume = vi.fn();
    const setMuted = vi.fn();
    const writeAudioSettings = vi.fn();
    const game = { setAudioEnabled: vi.fn() };
    const settings = { music: 0.1, sfx: 0.5, muted: false };
    const defaults = { music: 0.4, sfx: 0.6, muted: false };

    applyVolumeSettings({
      settings,
      setMusicVolume,
      setSfxVolume,
      setMuted,
      writeAudioSettings,
      defaults,
      game
    });

    expect(setMusicVolume).toHaveBeenCalledWith(0.1);
    expect(setSfxVolume).toHaveBeenCalledWith(0.5);
    expect(setMuted).toHaveBeenCalledWith(false);
    expect(writeAudioSettings).toHaveBeenCalledWith(settings, defaults);
    expect(game.setAudioEnabled).toHaveBeenCalledWith(true);
  });

  it("disables game audio when muted or silent", () => {
    const game = { setAudioEnabled: vi.fn() };

    applyVolumeSettings({
      settings: { music: 0.2, sfx: 0, muted: false },
      game
    });
    expect(game.setAudioEnabled).toHaveBeenCalledWith(false);

    applyVolumeSettings({
      settings: { music: 0.2, sfx: 0.5, muted: true },
      game
    });
    expect(game.setAudioEnabled).toHaveBeenLastCalledWith(false);
  });

  it("applies UI-derived settings and returns the applied values", () => {
    const setMusicVolume = vi.fn();
    const setSfxVolume = vi.fn();
    const setMuted = vi.fn();
    const writeAudioSettings = vi.fn();
    const game = { setAudioEnabled: vi.fn() };
    const defaults = { music: 0.4, sfx: 0.6, muted: false };

    const settings = applyVolumeFromUI({
      musicSlider: { value: "75" },
      sfxSlider: { value: "25" },
      muteToggle: { checked: false },
      defaults,
      setMusicVolume,
      setSfxVolume,
      setMuted,
      writeAudioSettings,
      game
    });

    expect(settings).toEqual({ music: 0.75, sfx: 0.25, muted: false });
    expect(setMusicVolume).toHaveBeenCalledWith(0.75);
    expect(setSfxVolume).toHaveBeenCalledWith(0.25);
    expect(setMuted).toHaveBeenCalledWith(false);
    expect(game.setAudioEnabled).toHaveBeenCalledWith(true);
  });

  it("primes UI values from saved settings and defaults", () => {
    const musicSlider = { value: "0" };
    const sfxSlider = { value: "0" };
    const muteToggle = { checked: false };
    const readAudioSettings = vi.fn(() => ({ music: 0.235, sfx: 0.555, muted: true }));

    const saved = primeVolumeUI({
      musicSlider,
      sfxSlider,
      muteToggle,
      readAudioSettings,
      defaults: { music: 0.4, sfx: 0.6, muted: false }
    });

    expect(saved).toEqual({ music: 0.235, sfx: 0.555, muted: true });
    expect(musicSlider.value).toBe("24");
    expect(sfxSlider.value).toBe("56");
    expect(muteToggle.checked).toBe(true);
  });

  it("falls back to defaults when no saved settings exist", () => {
    const defaults = { music: 0.1, sfx: 0.2, muted: false };
    const musicSlider = { value: "0" };
    const sfxSlider = { value: "0" };
    const muteToggle = { checked: true };

    const saved = primeVolumeUI({
      musicSlider,
      sfxSlider,
      muteToggle,
      readAudioSettings: () => null,
      defaults
    });

    expect(saved).toEqual(defaults);
    expect(musicSlider.value).toBe("10");
    expect(sfxSlider.value).toBe("20");
    expect(muteToggle.checked).toBe(false);
  });
});
