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
    expect(subtitle?.textContent).toBe("");
    expect(subtitle?.hidden).toBe(true);
  });

  it("surfaces primary actions before the score summary", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const panel = screen.querySelector(".panel");
    const children = Array.from(panel.children);
    const primaryActions = screen.querySelector(".over-primary-actions");
    const actionButtons = primaryActions?.querySelectorAll("button") || [];
    const restartButton = screen.querySelector("#restart");
    const menuButton = screen.querySelector("#toMenu");
    const retrySeedButton = screen.querySelector("#retrySeed");

    const primaryActionsIndex = children.findIndex((el) => el.classList.contains("over-primary-actions"));
    const summaryIndex = children.findIndex((el) => el.classList.contains("over-summary"));
    const replayIndex = children.findIndex((el) => el.classList.contains("over-replay-actions"));

    expect(primaryActionsIndex).toBeGreaterThan(0);
    expect(summaryIndex).toBeGreaterThan(primaryActionsIndex);
    expect(replayIndex).toBeGreaterThan(summaryIndex);
    expect(actionButtons).toHaveLength(3);
    expect(actionButtons[0]?.id).toBe("restart");
    expect(actionButtons[1]?.id).toBe("toMenu");
    expect(actionButtons[2]?.id).toBe("retrySeed");
    expect(restartButton?.textContent).toBe("Restart");
    expect(menuButton?.textContent).toBe("Main Menu");
    expect(retrySeedButton?.hidden).toBe(true);
  });

  it("exposes enlarged score and personal best visuals with badge placeholder", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const finalCard = screen.querySelector(".over-final-card");
    const finalScore = screen.querySelector("#final");
    const personalBest = screen.querySelector("#overPB");
    const badge = screen.querySelector("#overPbBadge");
    const status = screen.querySelector("#overPbStatus");

    expect(finalScore?.classList.contains("over-final-score")).toBe(true);
    expect(personalBest?.classList.contains("over-personal-best")).toBe(true);
    expect(badge?.classList.contains("hidden")).toBe(true);
    expect(status?.hidden).toBe(true);
    expect(finalCard?.contains(personalBest)).toBe(true);
  });

  it("renders stats and breakdown side by side", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const details = screen.querySelector(".over-details");
    const stats = screen.querySelector(".over-stats");
    const skillUsage = screen.querySelector(".skill-usage");
    const breakdown = screen.querySelector(".score-breakdown");

    expect(details).toBeTruthy();
    expect(stats).toBeTruthy();
    expect(skillUsage).toBeTruthy();
    expect(refs.skillUsageStats).toBeTruthy();
    expect(stats?.contains(skillUsage)).toBe(true);
    expect(details?.contains(breakdown)).toBe(true);
  });

  it("keeps replay controls grouped at the bottom", () => {
    const refs = {};
    const screen = createOverScreen(dom.window.document, refs);
    const replayActions = screen.querySelector(".over-replay-actions");
    const replayButtons = replayActions?.querySelectorAll("button") || [];
    const exportMp4Button = screen.querySelector("#exportMp4");

    expect(replayButtons).toHaveLength(3);
    expect(replayButtons[0]?.id).toBe("watchReplay");
    expect(replayButtons[2]?.id).toBe("exportMp4");
    expect(exportMp4Button?.hidden).toBe(true);
  });
});
