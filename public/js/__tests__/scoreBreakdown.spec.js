import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { renderScoreBreakdown } from "../scoreBreakdown.js";

describe("renderScoreBreakdown", () => {
  let document;
  let container;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body><div id='bd'></div></body>");
    document = dom.window.document;
    globalThis.document = document;
    globalThis.window = dom.window;
    container = document.getElementById("bd");
  });

  afterEach(() => {
    delete globalThis.document;
    delete globalThis.window;
  });

  it("renders rows for each score source and the total", () => {
    renderScoreBreakdown(
      container,
      {
        orbsCollected: 2,
        perfects: 1,
        pipesDodged: 3,
        totalScore: 50,
        scoreBreakdown: {
          orbs: { points: 20, count: 2 },
          perfects: { points: 10, count: 1 },
          pipes: { points: 15, count: 3 },
          other: { points: 5, count: 0 }
        }
      },
      50
    );

    const rows = container.querySelectorAll(".score-breakdown-row");
    expect(rows.length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Orbs collected");
    expect(container.textContent).toContain("+20");
    const totalRow = container.querySelector(".score-breakdown-total");
    expect(totalRow?.textContent).toContain("50");
  });

  it("fills missing buckets and accounts for remainder as other bonuses", () => {
    renderScoreBreakdown(
      container,
      {
        scoreBreakdown: { orbs: { points: 0, count: 0 } },
        totalScore: 7
      },
      7
    );

    expect(container.textContent).toContain("Other bonuses");
    const totalRow = container.querySelector(".score-breakdown-total");
    expect(totalRow?.textContent).toContain("7");
  });
});
