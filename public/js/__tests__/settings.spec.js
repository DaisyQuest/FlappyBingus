import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_SETTINGS, normalizeSkillSettings, skillSettingsEqual } from "../settings.js";

describe("skill settings helpers", () => {
  it("normalizes invalid input to defaults", () => {
    const norm = normalizeSkillSettings({ dashBehavior: "wild", slowFieldBehavior: null });
    expect(norm).toEqual(DEFAULT_SKILL_SETTINGS);
  });

  it("accepts valid combinations and compares equality", () => {
    const a = normalizeSkillSettings({ dashBehavior: "destroy", slowFieldBehavior: "explosion" });
    const b = normalizeSkillSettings({ dashBehavior: "destroy", slowFieldBehavior: "explosion" });
    expect(a.dashBehavior).toBe("destroy");
    expect(skillSettingsEqual(a, b)).toBe(true);
    expect(skillSettingsEqual(a, DEFAULT_SKILL_SETTINGS)).toBe(false);
  });
});
