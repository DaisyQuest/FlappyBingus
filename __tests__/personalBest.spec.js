import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import { computePersonalBestStatus, updatePersonalBestElements, __testables } from "../public/js/personalBest.js";

const { sanitizeScore } = __testables;

describe("personal best helpers", () => {
  it("sanitizes scores to non-negative integers", () => {
    expect(sanitizeScore(-4.8)).toBe(0);
    expect(sanitizeScore("42.9")).toBe(42);
    expect(sanitizeScore(NaN)).toBe(0);
    expect(sanitizeScore(100)).toBe(100);
  });

  it("computes personal best state relative to user and local bests", () => {
    const status = computePersonalBestStatus(1200, 800, 900);
    expect(status.personalBest).toBe(900);
    expect(status.displayBest).toBe(1200);
    expect(status.isPersonalBest).toBe(true);
    expect(status.shouldPersistLocalBest).toBe(true);
  });

  it("handles runs below the stored best without flagging a PB", () => {
    const status = computePersonalBestStatus(750, 1000, 950);
    expect(status.personalBest).toBe(1000);
    expect(status.displayBest).toBe(1000);
    expect(status.isPersonalBest).toBe(false);
    expect(status.shouldPersistLocalBest).toBe(false);
  });

  it("updates DOM elements to reflect personal best state", () => {
    const dom = new JSDOM(`<!doctype html><body>
      <div id="pb" class="kbd">0</div>
      <div id="badge" class="hidden"></div>
      <div id="status"></div>
    </body>`);
    const { document } = dom.window;

    const status = computePersonalBestStatus(1500, 1200, 1100);
    updatePersonalBestElements(
      {
        personalBestEl: document.getElementById("pb"),
        badgeEl: document.getElementById("badge"),
        statusEl: document.getElementById("status")
      },
      status
    );

    expect(document.getElementById("pb").textContent).toBe("1500");
    expect(document.getElementById("badge").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("badge").textContent).toMatch(/New personal best/i);
    expect(document.getElementById("status").textContent).toMatch(/beat your personal best/i);
    expect(document.getElementById("status").classList.contains("highlight")).toBe(true);
  });
});
