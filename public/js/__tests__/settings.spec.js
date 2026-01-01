import { describe, expect, it } from "vitest";
import {
  DEFAULT_SKILL_SETTINGS,
  DEFAULT_VIEW_SETTINGS,
  MAX_VIEW_SCALE,
  mergeSkillSettings,
  normalizeGameSettings,
  normalizeSkillSettings,
  normalizeViewSettings,
  skillSettingsEqual,
  viewSettingsEqual
} from "../settings.js";

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

describe("view settings helpers", () => {
  it("normalizes invalid view settings to defaults", () => {
    const normalized = normalizeViewSettings({ viewNormalization: "noop", viewScale: "bad" });
    expect(normalized).toEqual(DEFAULT_VIEW_SETTINGS);
  });

  it("clamps custom scales and compares equality", () => {
    const normalized = normalizeViewSettings({ viewNormalization: "custom", viewScale: MAX_VIEW_SCALE + 2 });
    expect(normalized.viewScale).toBe(MAX_VIEW_SCALE);
    const a = normalizeViewSettings({ viewNormalization: "reference", viewScale: 1.5 });
    const b = normalizeViewSettings({ viewNormalization: "reference", viewScale: 1.5 });
    expect(viewSettingsEqual(a, b)).toBe(true);
  });

  it("normalizes combined settings across skill and view fields", () => {
    const normalized = normalizeGameSettings({ dashBehavior: "destroy", viewNormalization: "custom", viewScale: 2.2 });
    expect(normalized.dashBehavior).toBe("destroy");
    expect(normalized.viewNormalization).toBe("custom");
    expect(normalized.viewScale).toBe(2.2);
  });
});
