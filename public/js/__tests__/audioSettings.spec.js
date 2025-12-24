// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings, readAudioSettings, writeAudioSettings } from "../audioSettings.js";

const defaults = { ...DEFAULT_AUDIO_SETTINGS };

describe("audio settings persistence", () => {
  const clearAudioCookie = () => {
    document.cookie = "bingus_audio=; Max-Age=0; path=/";
  };

  beforeEach(() => {
    clearAudioCookie();
  });

  afterEach(() => {
    clearAudioCookie();
  });

  it("normalizes saved settings and clamps volumes", () => {
    const normalized = normalizeAudioSettings({ music: 2, sfx: -1, muted: "yes" }, defaults);
    expect(normalized).toEqual({ music: 1, sfx: 0, muted: true });
  });

  it("writes and reads audio settings from cookies", () => {
    writeAudioSettings({ music: 0.22, sfx: 0.35, muted: true }, defaults);
    expect(document.cookie).toContain("bingus_audio");

    const loaded = readAudioSettings(defaults);
    expect(loaded).toEqual({ music: 0.22, sfx: 0.35, muted: true });
  });

  it("returns null when no saved audio settings exist", () => {
    expect(readAudioSettings(defaults)).toBeNull();
  });
});
