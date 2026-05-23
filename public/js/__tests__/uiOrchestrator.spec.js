import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { createUIOrchestrator } from "../uiOrchestrator.js";

describe("uiOrchestrator", () => {
  it("initializes UI helpers and menu parallax", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const document = dom.window.document;
    const canvas = document.createElement("canvas");
    const menu = document.createElement("div");
    menu.classList.add("hidden");
    const updateSkillCooldowns = vi.fn();

    const buildGameUI = vi.fn(() => ({
      canvas,
      menu,
      updateSkillCooldowns,
      menuParallaxLayers: []
    }));
    const setEnabled = vi.fn();
    const applyFromPoint = vi.fn();
    const createMenuParallaxController = vi.fn(() => ({ setEnabled, applyFromPoint }));

    const orchestrator = createUIOrchestrator({
      buildGameUI,
      createMenuParallaxController,
      defaultConfig: { test: true },
      document
    });

    orchestrator.initMenuParallax();
    orchestrator.setUIMode(true);

    expect(canvas.style.pointerEvents).toBe("none");
    expect(createMenuParallaxController).toHaveBeenCalled();
    expect(setEnabled).toHaveBeenCalledWith(false);

    orchestrator.updateSkillCooldownUI();
    expect(updateSkillCooldowns).toHaveBeenCalledWith({ test: true });
  });
});
