/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createGameOverStatsController } from "../main/gameOverStatsController.js";

describe("game over stats controller", () => {
  it("updates DOM elements and tracks view/run stats", () => {
    const elements = {
      overOrbCombo: document.createElement("div"),
      overPerfectCombo: document.createElement("div"),
      skillUsageStats: document.createElement("div"),
      overOrbComboLabel: document.createElement("div"),
      overPerfectComboLabel: document.createElement("div"),
      skillUsageTitle: document.createElement("div"),
      overStatsMode: document.createElement("div"),
      overStatsToggle: document.createElement("div")
    };

    const buildGameOverStats = vi.fn(() => ({
      view: "lifetime",
      combo: { orb: 5, perfect: 2 },
      skillUsage: [{ id: "dash" }],
      labels: {
        orb: "Orbs",
        perfect: "Perfects",
        skillUsage: "Skills",
        mode: "Lifetime",
        toggle: "Show Run"
      }
    }));
    const renderSkillUsageStats = vi.fn((container, data) => {
      container.textContent = `skills:${data.length}`;
    });

    const controller = createGameOverStatsController({
      elements,
      buildGameOverStats,
      renderSkillUsageStats,
      statViews: { run: "run", lifetime: "lifetime" }
    });

    const runStats = { runTime: 123 };
    controller.update({ view: "run", runStats, achievementsState: {}, skillTotals: {} });

    expect(elements.overOrbCombo.textContent).toBe("5");
    expect(elements.overPerfectCombo.textContent).toBe("2");
    expect(elements.skillUsageStats.textContent).toBe("skills:1");
    expect(elements.overOrbComboLabel.textContent).toBe("Orbs");
    expect(elements.overPerfectComboLabel.textContent).toBe("Perfects");
    expect(elements.skillUsageTitle.textContent).toBe("Skills");
    expect(elements.overStatsMode.textContent).toBe("Lifetime");
    expect(elements.overStatsToggle.textContent).toBe("Show Run");
    expect(controller.getCurrentView()).toBe("lifetime");
    expect(controller.getLastRunStats()).toEqual(runStats);
  });

  it("returns early when required elements are missing", () => {
    const elements = {
      overOrbCombo: null,
      overPerfectCombo: document.createElement("div"),
      skillUsageStats: document.createElement("div"),
      overOrbComboLabel: document.createElement("div"),
      overPerfectComboLabel: document.createElement("div"),
      skillUsageTitle: document.createElement("div"),
      overStatsMode: document.createElement("div"),
      overStatsToggle: document.createElement("div")
    };
    const buildGameOverStats = vi.fn();
    const controller = createGameOverStatsController({
      elements,
      buildGameOverStats,
      renderSkillUsageStats: vi.fn(),
      statViews: { run: "run", lifetime: "lifetime" }
    });

    controller.update({ view: "run", runStats: { runTime: 1 } });

    expect(buildGameOverStats).not.toHaveBeenCalled();
  });
});
