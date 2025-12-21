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
      progress: { maxScoreNoOrbs: 150.9, maxScoreNoAbilities: -5 }
    });
    expect(normalized.unlocked).toEqual({ no_orbs_100: 2000 });
    expect(normalized.progress).toEqual({ maxScoreNoOrbs: 150, maxScoreNoAbilities: 0 });
  });

  it("renders achievement progress and unlocked state", () => {
    renderAchievementsList(container, {
      definitions: ACHIEVEMENTS,
      state: { unlocked: { no_orbs_100: 1234 }, progress: { maxScoreNoOrbs: 120, maxScoreNoAbilities: 80 } }
    });

    const rows = container.querySelectorAll(".achievement-row");
    expect(rows.length).toBe(ACHIEVEMENTS.length);
    const unlockedRow = Array.from(rows).find((r) => r.textContent.includes("Orb-Free Century"));
    expect(unlockedRow.querySelector(".achievement-status")?.classList.contains("unlocked")).toBe(true);
    expect(unlockedRow.querySelector(".achievement-meter-fill")?.classList.contains("filled")).toBe(true);
  });

  it("queues toast visibility transitions", () => {
    vi.useFakeTimers();
    const toastWrap = document.getElementById("toasts");
    const toast = appendAchievementToast(toastWrap, ACHIEVEMENTS[0]);
    expect(toastWrap.childElementCount).toBe(1);

    vi.runOnlyPendingTimers();
    expect(toast.classList.contains("fade") || toast.classList.contains("visible")).toBe(true);
  });
});
