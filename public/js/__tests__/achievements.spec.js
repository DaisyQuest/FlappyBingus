import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  ACHIEVEMENTS,
  normalizeAchievementState,
  renderAchievementsList,
  appendAchievementToast,
  __testables
} from "../achievements.js";

const { classifyAchievement, normalizeFilters } = __testables;

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
        bestScore: 999,
        maxScoreNoOrbs: 150.9,
        maxScoreNoAbilities: -5,
        maxPerfectsInRun: 12.2,
        totalPerfects: "55",
        maxOrbsInRun: 77.7,
        totalOrbsCollected: 1999.8,
        maxOrbComboInRun: 33.4,
        maxPerfectComboInRun: 12.1,
        maxPipesDodgedInRun: 420.9,
        totalPipesDodged: 5000.8,
        totalScore: 10_000.5,
        maxRunTime: 64.2,
        maxBrokenPipesInExplosion: 12.9,
        maxBrokenPipesInRun: -4,
        totalBrokenPipes: 501.2
      }
    });
    expect(normalized.unlocked).toEqual({ no_orbs_100: 2000 });
    expect(normalized.progress).toEqual({
      bestScore: 999,
      maxScoreNoOrbs: 150,
      maxScoreNoAbilities: 0,
      maxPerfectsInRun: 12,
      totalPerfects: 55,
      maxOrbsInRun: 77,
      totalOrbsCollected: 1999,
      maxOrbComboInRun: 33,
      maxPerfectComboInRun: 12,
      maxPipesDodgedInRun: 420,
      totalPipesDodged: 5000,
      totalScore: 10_000,
      maxRunTime: 64,
      maxBrokenPipesInExplosion: 12,
      maxBrokenPipesInRun: 0,
      totalBrokenPipes: 501
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
          maxOrbComboInRun: 12,
          maxPerfectComboInRun: 5,
          maxPipesDodgedInRun: 200,
          totalPipesDodged: 3500,
          totalScore: 8000,
          maxRunTime: 30,
          maxBrokenPipesInExplosion: 0,
          maxBrokenPipesInRun: 0,
          totalBrokenPipes: 0
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
    expect(totalRow?.querySelector(".achievement-tag")?.textContent).toBe("Orb Collection");
    expect(totalRow?.querySelector(".achievement-requirement")?.textContent).toContain("Collect 2000 orbs total");
  });

  it("renders requirement copy for combo and pipe dodge achievements", () => {
    renderAchievementsList(container, { definitions: ACHIEVEMENTS, state: normalizeAchievementState() });
    const rows = Array.from(container.querySelectorAll(".achievement-row"));
    const orbCombo = rows.find((row) => row.textContent.includes("Orb Crescendo"));
    const perfectCombo = rows.find((row) => row.textContent.includes("Perfect Rhythm"));
    const pipeDodge = rows.find((row) => row.textContent.includes("Pipe Whisperer"));
    const oneMinute = rows.find((row) => row.textContent.includes("One-Minute Glide"));
    expect(orbCombo?.querySelector(".achievement-requirement")?.textContent).toContain("orb combo of 20");
    expect(perfectCombo?.querySelector(".achievement-requirement")?.textContent).toContain("perfect gap combo of 10");
    expect(pipeDodge?.querySelector(".achievement-requirement")?.textContent).toContain("Dodge 500 pipes");
    expect(oneMinute?.querySelector(".achievement-requirement")?.textContent).toContain("Survive for 60 seconds");
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

  it("filters completed achievements when requested and shows fallback", () => {
    renderAchievementsList(container, {
      definitions: ACHIEVEMENTS,
      state: {
        unlocked: { [ACHIEVEMENTS[0].id]: Date.now() },
        progress: normalizeAchievementState().progress
      },
      hideCompleted: true
    });

    const rows = container.querySelectorAll(".achievement-row");
    expect(rows.length).toBe(ACHIEVEMENTS.length - 1);
    expect(Array.from(rows).some((r) => r.textContent.includes(ACHIEVEMENTS[0].title))).toBe(false);

    container.innerHTML = "";
    renderAchievementsList(container, {
      definitions: ACHIEVEMENTS,
      state: {
        unlocked: ACHIEVEMENTS.reduce((acc, a) => ({ ...acc, [a.id]: 1 }), {}),
        progress: normalizeAchievementState().progress
      },
      hideCompleted: true
    });

    expect(container.querySelectorAll(".achievement-row").length).toBe(0);
    expect(container.querySelector(".achievement-empty")?.textContent)
      .toContain("Everything here is unlocked");
  });

  it("filters by selected categories and reports empty when none selected", () => {
    const state = normalizeAchievementState();
    renderAchievementsList(container, {
      definitions: ACHIEVEMENTS,
      state,
      filters: { categories: ["score"] }
    });

    expect(Array.from(container.querySelectorAll(".achievement-row"))
      .every((row) => row.dataset.category === "score")).toBe(true);

    container.innerHTML = "";
    renderAchievementsList(container, {
      definitions: ACHIEVEMENTS,
      state,
      filters: { categories: [] }
    });

    expect(container.querySelector(".achievement-empty")?.textContent)
      .toContain("Select at least one filter");
  });

  it("classifies and normalizes filters safely", () => {
    expect(classifyAchievement({ requirement: { minScore: 10 } })).toBe("score");
    expect(classifyAchievement({ requirement: { minPerfects: 2 } })).toBe("perfects");
    expect(classifyAchievement({ requirement: { minOrbs: 1 } })).toBe("orbs");
    expect(classifyAchievement({ requirement: { minPipesDodged: 1 } })).toBe("pipes");
    expect(classifyAchievement({ requirement: { minBrokenPipesInRun: 1 } })).toBe("pipes");
    expect(classifyAchievement({ requirement: { minRunTime: 60 } })).toBe("other");
    expect(classifyAchievement({ requirement: {} })).toBe("other");

    const filters = normalizeFilters({ hideCompleted: "yes", categories: { score: true, perfects: false, pipes: true, bogus: true } });
    expect(filters.hideCompleted).toBe(true);
    expect(filters.categories.has("score")).toBe(true);
    expect(filters.categories.has("perfects")).toBe(false);
    expect(filters.categories.has("pipes")).toBe(true);
    expect(filters.categories.has("bogus")).toBe(false);
    expect(filters.requestedEmpty).toBe(false);
  });
});
