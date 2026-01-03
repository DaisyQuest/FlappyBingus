import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

import { __testables } from "../public/js/uiLayout.js";

const { createMenuScreen } = __testables;

let dom;

beforeEach(() => {
  dom = new JSDOM(`<!doctype html><body></body>`);
});

afterEach(() => {
  dom = null;
});

describe("minigames menu card", () => {
  it("renders the launcher and overlay shell", () => {
    const refs = {};
    const screen = createMenuScreen(dom.window.document, refs);
    const launcher = screen.querySelector("#minigamesLauncher");
    const overlay = screen.querySelector("#minigamesOverlay");

    expect(launcher).toBeTruthy();
    expect(overlay).toBeTruthy();
    expect(overlay?.classList.contains("hidden")).toBe(true);
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");
  });

  it("includes detail slots and controls in the overlay", () => {
    const refs = {};
    const screen = createMenuScreen(dom.window.document, refs);

    expect(screen.querySelector("#minigamesList")).toBeTruthy();
    expect(screen.querySelector("#minigamesDetailTitle")).toBeTruthy();
    expect(screen.querySelector("#minigamesDetailSummary")).toBeTruthy();
    expect(screen.querySelector("#minigamesDetailInstructions")).toBeTruthy();
    expect(screen.querySelector("#minigamesStage")).toBeTruthy();
    expect(screen.querySelector("#minigamesStart")).toBeTruthy();
    expect(screen.querySelector("#minigamesReset")).toBeTruthy();
    expect(screen.querySelector("#minigamesClose")).toBeTruthy();
  });
});
