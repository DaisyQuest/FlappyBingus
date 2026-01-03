import { describe, expect, it } from "vitest";
import {
  DEFAULT_SKILL_SETTINGS,
  DEFAULT_TEXT_STYLE_CUSTOM,
  mergeSkillSettings,
  normalizeSkillSettings,
  skillSettingsEqual
} from "../settings.js";

describe("skill settings helpers", () => {
  it("normalizes invalid input to defaults", () => {
    const norm = normalizeSkillSettings({
      dashBehavior: "wild",
      slowFieldBehavior: null,
      teleportBehavior: "boom",
      invulnBehavior: "forever",
      textStylePreset: "nope",
      textStyleCustom: { fontWeight: "heavy" },
      comicBookMode: "nope",
      simpleBackground: "maybe",
      simpleTextures: "false",
      simpleParticles: 1,
      reducedEffects: "nope",
      extremeLowDetail: "nope"
    });
    expect(norm).toEqual(DEFAULT_SKILL_SETTINGS);
  });

  it("accepts valid combinations and compares equality", () => {
    const a = normalizeSkillSettings({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long",
      textStylePreset: "digital",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, fontWeight: 800 },
      simpleBackground: true,
      simpleTextures: true,
      simpleParticles: false,
      reducedEffects: true,
      extremeLowDetail: true
    });
    const b = normalizeSkillSettings({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long",
      textStylePreset: "digital",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, fontWeight: 800 },
      simpleBackground: true,
      simpleTextures: true,
      simpleParticles: false,
      reducedEffects: true,
      extremeLowDetail: true
    });
    expect(a.dashBehavior).toBe("destroy");
    expect(a.simpleBackground).toBe(true);
    expect(skillSettingsEqual(a, b)).toBe(true);
    expect(skillSettingsEqual(a, DEFAULT_SKILL_SETTINGS)).toBe(false);
  });

  it("merges incoming settings while preserving base defaults", () => {
    const base = {
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "short",
      textStylePreset: "comic_book_mild",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, shimmer: 0.2 },
      simpleBackground: false,
      simpleTextures: false,
      simpleParticles: false,
      reducedEffects: false,
      extremeLowDetail: false
    };
    const incoming = {
      teleportBehavior: "normal",
      invulnBehavior: "long",
      textStylePreset: "holographic",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, sparkle: true },
      simpleBackground: true,
      reducedEffects: true,
      extremeLowDetail: true
    };

    const merged = mergeSkillSettings(base, incoming);

    expect(merged).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "normal",
      invulnBehavior: "long",
      textStylePreset: "holographic",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, sparkle: true },
      simpleBackground: true,
      simpleTextures: false,
      simpleParticles: false,
      reducedEffects: true,
      extremeLowDetail: true
    });
  });

  it("maps legacy comic book settings to modern presets", () => {
    const normalized = normalizeSkillSettings({ comicBookMode: "mild" });
    expect(normalized.textStylePreset).toBe("comic_book_mild");
  });
});
