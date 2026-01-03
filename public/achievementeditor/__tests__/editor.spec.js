import { describe, expect, it, beforeEach } from "vitest";
import { JSDOM } from "jsdom";

import {
  collectDefinitions,
  collectUnlockableOverrides,
  createAchievementCard
} from "../modules/editor.js";

const schema = {
  fields: { id: { label: "ID" }, title: { label: "Title" }, description: { label: "Description" } },
  requirementFields: [
    { key: "minScore", label: "Minimum score", type: "number" },
    { key: "minSkillUses", label: "Skill uses", type: "skills" }
  ],
  skillIds: ["dash", "phase"]
};

describe("achievement editor helpers", () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    document = dom.window.document;
    global.document = document;
  });

  it("collects achievement definitions from cards", () => {
    const grid = document.createElement("div");
    const card = createAchievementCard(
      {
        id: "combo",
        title: "Combo",
        description: "Test",
        reward: "Reward",
        progressKey: "bestScore",
        requirement: { minScore: 100, minSkillUses: { dash: 2 } }
      },
      schema
    );
    grid.appendChild(card);

    const defs = collectDefinitions(grid);
    expect(defs).toHaveLength(1);
    expect(defs[0].id).toBe("combo");
    expect(defs[0].requirement.minScore).toBe(100);
    expect(defs[0].requirement.minSkillUses.dash).toBe(2);
  });

  it("collects unlockable overrides from selection fields", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "classic";
    card.dataset.unlockableType = "trail";
    const select = document.createElement("select");
    select.dataset.unlockableSelect = "true";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    const achievementOpt = document.createElement("option");
    achievementOpt.value = "ach_1";
    select.append(defaultOpt, achievementOpt);
    select.value = "ach_1";
    card.appendChild(select);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({
      unlockableOverrides: { trail: { classic: { type: "achievement", id: "old" } } },
      root
    });
    expect(overrides.trail.classic.id).toBe("ach_1");
  });

  it("removes unlockable overrides when the selection is cleared", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "classic";
    card.dataset.unlockableType = "trail";
    const select = document.createElement("select");
    select.dataset.unlockableSelect = "true";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    select.append(defaultOpt);
    select.value = "";
    card.appendChild(select);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({
      unlockableOverrides: { trail: { classic: { type: "achievement", id: "old" } } },
      root
    });
    expect(overrides.trail?.classic).toBeUndefined();
  });

  it("does not overwrite non-achievement overrides", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "classic";
    card.dataset.unlockableType = "trail";
    const select = document.createElement("select");
    select.dataset.unlockableSelect = "true";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    const achievementOpt = document.createElement("option");
    achievementOpt.value = "ach_2";
    select.append(defaultOpt, achievementOpt);
    select.value = "ach_2";
    card.appendChild(select);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({
      unlockableOverrides: { trail: { classic: { type: "purchase", cost: 10 } } },
      root
    });
    expect(overrides.trail.classic).toEqual({ type: "purchase", cost: 10 });
  });

  it("hydrates skill requirement inputs when present", () => {
    const card = createAchievementCard(
      {
        id: "skills",
        title: "Skills",
        requirement: { minSkillUses: { dash: 3, phase: 1 } }
      },
      schema
    );
    const dashInput = card.querySelector("[data-req-skill=\"dash\"]");
    const phaseInput = card.querySelector("[data-req-skill=\"phase\"]");
    expect(dashInput?.value).toBe("3");
    expect(phaseInput?.value).toBe("1");
  });
});
