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
      comicBookMode: "nope"
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
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, fontWeight: 800 }
    });
    const b = normalizeSkillSettings({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long",
      textStylePreset: "digital",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, fontWeight: 800 }
    });
    expect(a.dashBehavior).toBe("destroy");
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
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, shimmer: 0.2 }
    };
    const incoming = {
      teleportBehavior: "normal",
      invulnBehavior: "long",
      textStylePreset: "holographic",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, sparkle: true }
    };

    const merged = mergeSkillSettings(base, incoming);

    expect(merged).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "normal",
      invulnBehavior: "long",
      textStylePreset: "holographic",
      textStyleCustom: { ...DEFAULT_TEXT_STYLE_CUSTOM, sparkle: true }
    });
  });

  it("maps legacy comic book settings to modern presets", () => {
    const normalized = normalizeSkillSettings({ comicBookMode: "mild" });
    expect(normalized.textStylePreset).toBe("comic_book_mild");
  });
});
