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

  it("collects achievement unlock overrides from cards", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "classic";
    card.dataset.unlockableType = "trail";
    const typeSelect = document.createElement("select");
    ["free", "achievement", "score", "purchase", "record"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      typeSelect.appendChild(option);
    });
    typeSelect.dataset.unlockType = "true";
    typeSelect.value = "achievement";
    const achievementInput = document.createElement("input");
    achievementInput.dataset.unlockAchievement = "true";
    achievementInput.value = "ach_1";
    card.append(typeSelect, achievementInput);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({
      unlockableOverrides: { trail: { classic: { type: "achievement", id: "old" } } },
      root
    });
    expect(overrides.trail.classic).toEqual({ type: "achievement", id: "ach_1" });
  });

  it("collects score unlock overrides with defaults", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "classic";
    card.dataset.unlockableType = "trail";
    const typeSelect = document.createElement("select");
    ["free", "achievement", "score", "purchase", "record"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      typeSelect.appendChild(option);
    });
    typeSelect.dataset.unlockType = "true";
    typeSelect.value = "score";
    const scoreInput = document.createElement("input");
    scoreInput.dataset.unlockScore = "true";
    scoreInput.value = "";
    card.append(typeSelect, scoreInput);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({
      unlockableOverrides: { trail: { classic: { type: "achievement", id: "old" } } },
      root
    });
    expect(overrides.trail.classic).toEqual({ type: "score", minScore: 0 });
  });

  it("collects purchase unlock overrides with currency", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "spark";
    card.dataset.unlockableType = "player_texture";
    const typeSelect = document.createElement("select");
    ["free", "achievement", "score", "purchase", "record"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      typeSelect.appendChild(option);
    });
    typeSelect.dataset.unlockType = "true";
    typeSelect.value = "purchase";
    const costInput = document.createElement("input");
    costInput.dataset.unlockCost = "true";
    costInput.value = "25";
    const currencyInput = document.createElement("input");
    currencyInput.dataset.unlockCurrency = "true";
    currencyInput.value = "orbs";
    card.append(typeSelect, costInput, currencyInput);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({ root });
    expect(overrides.player_texture.spark).toEqual({ type: "purchase", cost: 25, currencyId: "orbs" });
  });

  it("captures free unlock overrides with custom labels", () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "unlockable-card";
    card.dataset.unlockableId = "basic";
    card.dataset.unlockableType = "pipe_texture";
    const typeSelect = document.createElement("select");
    ["free", "achievement", "score", "purchase", "record"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      typeSelect.appendChild(option);
    });
    typeSelect.dataset.unlockType = "true";
    typeSelect.value = "free";
    const labelInput = document.createElement("input");
    labelInput.dataset.unlockLabel = "true";
    labelInput.value = "Freebie";
    card.append(typeSelect, labelInput);
    root.appendChild(card);

    const overrides = collectUnlockableOverrides({ root });
    expect(overrides.pipe_texture.basic).toEqual({ type: "free", label: "Freebie" });
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
