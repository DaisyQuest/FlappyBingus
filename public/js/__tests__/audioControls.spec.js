// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createVolumeController } from "../main/audioControls.js";

describe("createVolumeController", () => {
  it("routes volume changes through the audio helpers", () => {
    const musicSlider = document.createElement("input");
    const sfxSlider = document.createElement("input");
    const muteToggle = document.createElement("input");
    const applyVolumeFromUI = vi.fn();
    const primeVolumeUI = vi.fn();
    const controller = createVolumeController({
      elements: { musicSlider, sfxSlider, muteToggle },
      defaults: { music: 1, sfx: 1, muted: false },
      readAudioSettings: vi.fn(),
      writeAudioSettings: vi.fn(),
      applyVolumeFromUI,
      primeVolumeUI,
      setMusicVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      setMuted: vi.fn(),
      game: { setAudioEnabled: vi.fn() }
    });

    controller.handleVolumeChange();

    expect(applyVolumeFromUI).toHaveBeenCalledWith(expect.objectContaining({
      musicSlider,
      sfxSlider,
      muteToggle
    }));
  });

  it("primes UI and binds DOM events", () => {
    const musicSlider = document.createElement("input");
    const sfxSlider = document.createElement("input");
    const muteToggle = document.createElement("input");
    const applyVolumeFromUI = vi.fn();
    const primeVolumeUI = vi.fn();
    const controller = createVolumeController({
      elements: { musicSlider, sfxSlider, muteToggle },
      defaults: { music: 0.5, sfx: 0.25, muted: true },
      readAudioSettings: vi.fn(),
      writeAudioSettings: vi.fn(),
      applyVolumeFromUI,
      primeVolumeUI,
      setMusicVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      setMuted: vi.fn(),
      game: { setAudioEnabled: vi.fn() }
    });

    const musicListener = vi.spyOn(musicSlider, "addEventListener");
    const sfxListener = vi.spyOn(sfxSlider, "addEventListener");
    const muteListener = vi.spyOn(muteToggle, "addEventListener");

    controller.bindVolumeControls();
    controller.primeVolumeControls();

    expect(musicListener).toHaveBeenCalledWith("input", expect.any(Function));
    expect(sfxListener).toHaveBeenCalledWith("input", expect.any(Function));
    expect(muteListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(primeVolumeUI).toHaveBeenCalledWith(expect.objectContaining({
      musicSlider,
      sfxSlider,
      muteToggle
    }));
    expect(applyVolumeFromUI).toHaveBeenCalled();
  });
});
