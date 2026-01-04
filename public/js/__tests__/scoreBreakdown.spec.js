import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { renderScoreBreakdown } from "../scoreBreakdown.js";

function getRows(document) {
  return Array.from(document.querySelectorAll(".score-breakdown-row"));
}

describe("scoreBreakdown", () => {
  it("renders surf score buckets with airtime, big air, and chain", () => {
    const dom = new JSDOM("<!doctype html><div id='list'></div>");
    const list = dom.window.document.getElementById("list");

    renderScoreBreakdown(list, {
      mode: "surf",
      totalScore: 120,
      scoreBreakdown: {
        airtime: { points: 40, seconds: 5 },
        bigAir: { points: 60, count: 2 },
        chain: { points: 20, count: 3 }
      }
    }, 120);

    const rows = getRows(dom.window.document);
    const labels = rows.map((row) => row.querySelector(".score-breakdown-label")?.textContent);
    expect(labels).toContain("Airtime");
    expect(labels).toContain("Big air");
    expect(labels).toContain("Chain boosts");
    expect(labels).toContain("Total score");
  });

  it("renders flappy score buckets with orbs, perfects, pipes, and other", () => {
    const dom = new JSDOM("<!doctype html><div id='list'></div>");
    const list = dom.window.document.getElementById("list");

    renderScoreBreakdown(list, {
      totalScore: 250,
      scoreBreakdown: {
        orbs: { points: 50, count: 2 },
        perfects: { points: 80, count: 3 },
        pipes: { points: 60, count: 4 },
        other: { points: 30, count: 1 }
      }
    }, 250);

    const rows = getRows(dom.window.document);
    const labels = rows.map((row) => row.querySelector(".score-breakdown-label")?.textContent);
    expect(labels).toContain("Orbs collected");
    expect(labels).toContain("Perfect clears");
    expect(labels).toContain("Pipes dodged");
    expect(labels).toContain("Other bonuses");
  });
});
