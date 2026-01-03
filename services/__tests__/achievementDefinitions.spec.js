import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENT_SCHEMA,
  normalizeAchievementDefinitions,
  resolveAchievementDefinitions
} from "../achievementDefinitions.cjs";

describe("achievement definition normalization", () => {
  it("accepts null definitions as a default sentinel", () => {
    const result = normalizeAchievementDefinitions(null, { fallback: [] });
    expect(result.ok).toBe(true);
    expect(result.definitions).toBeNull();
  });

  it("rejects non-array definitions payloads", () => {
    const result = normalizeAchievementDefinitions({ id: "bad" }, { fallback: [] });
    expect(result.ok).toBe(false);
    expect(result.errors[0].error).toBe("definitions_not_array");
  });

  it("normalizes valid definitions and minSkillUses requirements", () => {
    const result = normalizeAchievementDefinitions([
      {
        id: "dash_master",
        title: "Dash Master",
        description: "Use dash often.",
        reward: "Cosmetic",
        progressKey: "skillTotals",
        requirement: { minSkillUses: { dash: 3 } }
      }
    ]);
    expect(result.ok).toBe(true);
    expect(result.definitions[0].requirement.minSkillUses.dash).toBe(3);
  });

  it("rejects unknown requirement keys", () => {
    const result = normalizeAchievementDefinitions([
      {
        id: "bad_req",
        title: "Bad",
        description: "Nope",
        requirement: { minScore: 5, mystery: 2 }
      }
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.error === "unknown_requirement_key")).toBe(true);
  });

  it("rejects invalid skill requirement values", () => {
    const result = normalizeAchievementDefinitions([
      {
        id: "skill_bad",
        title: "Bad",
        description: "Bad",
        requirement: { minSkillUses: { dash: "nope" } }
      }
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.error === "invalid_skill_requirement")).toBe(true);
  });

  it("detects duplicate IDs", () => {
    const result = normalizeAchievementDefinitions([
      {
        id: "dup",
        title: "Dup",
        description: "One",
        requirement: { minScore: 1 }
      },
      {
        id: "dup",
        title: "Dup",
        description: "Two",
        requirement: { minScore: 2 }
      }
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.error === "duplicate_id")).toBe(true);
  });

  it("falls back to defaults when resolving null definitions", () => {
    const fallback = [{ id: "base", title: "Base", description: "Base", reward: "", progressKey: null, requirement: {} }];
    const resolved = resolveAchievementDefinitions(null, fallback);
    expect(resolved).toEqual(fallback);
  });

  it("exposes schema fields for the editor", () => {
    expect(ACHIEVEMENT_SCHEMA.fields.title.label).toBeTruthy();
    expect(ACHIEVEMENT_SCHEMA.requirementFields.length).toBeGreaterThan(0);
  });
});
