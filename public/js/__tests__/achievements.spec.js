import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { ACHIEVEMENTS, normalizeAchievementState, renderAchievementsList, appendAchievementToast } from "../achievements.js";

describe("achievements helpers", () => {
  let document;
  let container;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body><div id='list'></div><div id='toasts'></div></body>");
    document = dom.window.document;
    container = document.getElementById("list");
    globalThis.document = document;
    globalThis.window = dom.window;
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.requestAnimationFrame;
  });

  it("normalizes and clamps incoming state", () => {
    const normalized = normalizeAchievementState({
      unlocked: { no_orbs_100: "2000", bogus: "bad" },
      progress: {
        maxScoreNoOrbs: 150.9,
        maxScoreNoAbilities: -5,
        maxPerfectsInRun: 12.2,
        totalPerfects: "55",
        maxOrbsInRun: 77.7,
        totalOrbsCollected: 1999.8,
        totalScore: 10_000.5
      }
    });
    expect(normalized.unlocked).toEqual({ no_orbs_100: 2000 });
    expect(normalized.progress).toEqual({
      maxScoreNoOrbs: 150,
      maxScoreNoAbilities: 0,
      maxPerfectsInRun: 12,
      totalPerfects: 55,
      maxOrbsInRun: 77,
      totalOrbsCollected: 1999,
      totalScore: 10_000
    });
  });

  it("renders achievement progress and unlocked state", () => {
    renderAchievementsList(container, {
      definitions: ACHIEVEMENTS,
      state: {
        unlocked: { no_orbs_100: 1234 },
        progress: {
          maxScoreNoOrbs: 120,
          maxScoreNoAbilities: 80,
          maxPerfectsInRun: 9,
          totalPerfects: 80,
          maxOrbsInRun: 10,
          totalOrbsCollected: 1500,
          totalScore: 8000
        }
      }
    });

    const rows = container.querySelectorAll(".achievement-row");
    expect(rows.length).toBe(ACHIEVEMENTS.length);
    const unlockedRow = Array.from(rows).find((r) => r.textContent.includes("Orb-Free Century"));
    expect(unlockedRow.querySelector(".achievement-status")?.classList.contains("unlocked")).toBe(true);
    expect(unlockedRow.querySelector(".achievement-meter-fill")?.classList.contains("filled")).toBe(true);
    const totalRow = Array.from(rows).find((r) => r.textContent.includes("Treasure Hunter"));
    expect(totalRow?.querySelector(".achievement-status")?.textContent).toContain("Progress: 1500/2000");
  });

  it("prefers in-game achievement popups over DOM fallbacks", () => {
    const fakeGame = { showAchievementPopup: vi.fn(() => "popup") };
    const popup = appendAchievementToast(fakeGame, ACHIEVEMENTS[0]);
    expect(fakeGame.showAchievementPopup).toHaveBeenCalled();
    expect(popup).toBe("popup");

    const toastWrap = document.getElementById("toasts");
    const toast = appendAchievementToast(toastWrap, ACHIEVEMENTS[1]);
    expect(toastWrap.childElementCount).toBe(1);
    expect(toast.textContent).toContain("Achievement unlocked");
  });
});
