import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

import { __testables } from "../public/js/uiLayout.js";

const { createOverScreen } = __testables;

let dom;

beforeEach(() => {
  dom = new JSDOM(`<!doctype html><body></body>`);
});

afterEach(() => {
  dom = null;
});

const byId = (doc, id) => doc.getElementById(id);

describe("game over layout", () => {
  it("centers the headline and uses the updated subtitle copy", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const title = screen.querySelector(".title");
    const subtitle = screen.querySelector(".over-subtitle");

    expect(title?.textContent).toBe("GAME OVER");
    expect(subtitle?.textContent).toBe("Take a breath, then jump back in.");
  });

  it("surfaces primary actions before the score summary", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const panel = screen.querySelector(".panel");
    const children = Array.from(panel.children);

    const primaryActionsIndex = children.findIndex((el) => el.classList.contains("over-primary-actions"));
    const summaryIndex = children.findIndex((el) => el.classList.contains("over-summary"));
    const replayIndex = children.findIndex((el) => el.classList.contains("over-replay-actions"));

    expect(primaryActionsIndex).toBeGreaterThan(0);
    expect(summaryIndex).toBeGreaterThan(primaryActionsIndex);
    expect(replayIndex).toBeGreaterThan(summaryIndex);
  });

  it("exposes enlarged score and personal best visuals with badge placeholder", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const finalScore = screen.querySelector("#final");
    const personalBest = screen.querySelector("#overPB");
    const badge = screen.querySelector("#overPbBadge");
    const status = screen.querySelector("#overPbStatus");

    expect(finalScore?.classList.contains("over-final-score")).toBe(true);
    expect(personalBest?.classList.contains("over-personal-best")).toBe(true);
    expect(badge?.classList.contains("hidden")).toBe(true);
    expect(status?.textContent).toMatch(/personal best/i);
  });

  it("keeps replay controls grouped at the bottom", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const replayActions = screen.querySelector(".over-replay-actions");
    const replayButtons = replayActions?.querySelectorAll("button") || [];

    expect(replayButtons).toHaveLength(3);
    expect(replayButtons[0]?.id).toBe("watchReplay");
    expect(replayButtons[2]?.id).toBe("exportMp4");
  });
});
