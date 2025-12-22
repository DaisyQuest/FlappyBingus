import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_SETTINGS, mergeSkillSettings, normalizeSkillSettings, skillSettingsEqual } from "../settings.js";

describe("skill settings helpers", () => {
  it("normalizes invalid input to defaults", () => {
    const norm = normalizeSkillSettings({
      dashBehavior: "wild",
      slowFieldBehavior: null,
      teleportBehavior: "boom",
      invulnBehavior: "forever"
    });
    expect(norm).toEqual(DEFAULT_SKILL_SETTINGS);
  });

  it("accepts valid combinations and compares equality", () => {
    const a = normalizeSkillSettings({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long"
    });
    const b = normalizeSkillSettings({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long"
    });
    expect(a.dashBehavior).toBe("destroy");
    expect(skillSettingsEqual(a, b)).toBe(true);
    expect(skillSettingsEqual(a, DEFAULT_SKILL_SETTINGS)).toBe(false);
  });

  it("merges incoming settings while preserving base defaults", () => {
    const base = { dashBehavior: "destroy", slowFieldBehavior: "explosion", teleportBehavior: "explode", invulnBehavior: "short" };
    const incoming = { teleportBehavior: "normal", invulnBehavior: "long" };

    const merged = mergeSkillSettings(base, incoming);

    expect(merged).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "normal",
      invulnBehavior: "long"
    });
  });
});
