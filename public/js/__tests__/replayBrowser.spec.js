import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { filterReplays, sortReplays, __testables } from "../replayBrowser.js";
import { formatReplayMeta, __testables as replayDetailsTestables } from "../replayDetails.js";

const sample = [
  { username: "alpha", bestScore: 100, recordedAt: 10, durationMs: 9000, ticksLength: 9, replayBytes: 1200 },
  { username: "bravo", bestScore: 200, recordedAt: 5, durationMs: 3000, ticksLength: 3, replayBytes: 800 },
  { username: "charlie", bestScore: 150, recordedAt: 20, durationMs: 12000, ticksLength: 12, replayBytes: 2048 }
];

describe("replayBrowser helpers", () => {
  it("filters replays by query and minimum thresholds", () => {
    const filtered = filterReplays(sample, { query: "br", minScore: 150, minDuration: 2 });
    expect(filtered).toEqual([{ username: "bravo", bestScore: 200, recordedAt: 5, durationMs: 3000, ticksLength: 3, replayBytes: 800 }]);
  });

  it("sorts replays by requested ordering", () => {
    expect(sortReplays(sample, "score")[0].username).toBe("bravo");
    expect(sortReplays(sample, "recent")[0].username).toBe("charlie");
    expect(sortReplays(sample, "duration")[0].username).toBe("charlie");
  });

  it("formats replay metadata for display", () => {
    const meta = formatReplayMeta({ bestScore: 99, durationMs: 61000, recordedAt: 0, ticksLength: 12, replayBytes: 1024 });
    expect(meta.score).toBe(99);
    expect(meta.duration).toBe("1:01");
    expect(meta.recordedAt).toBe("—");
    expect(meta.ticks).toBe(12);
    expect(meta.bytes).toBe("1.0 KB");
  });

  it("formats bytes and dates gracefully", () => {
    expect(replayDetailsTestables.formatBytes(0)).toBe("0 B");
    expect(replayDetailsTestables.formatBytes(512)).toBe("512 B");
    expect(replayDetailsTestables.formatBytes(2048)).toBe("2.0 KB");
    expect(replayDetailsTestables.formatDate(Number.NaN)).toBe("—");
  });

  it("toggles replay views with mobile buttons", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div><button id='list'></button><button id='player'></button></body>");
    const { document } = dom.window;
    const root = document.getElementById("root");
    const listBtn = document.getElementById("list");
    const playerBtn = document.getElementById("player");

    __testables.setReplayView(root, "list", { listBtn, playerBtn });
    expect(root.dataset.replayView).toBe("list");
    expect(listBtn.classList.contains("selected")).toBe(true);
    expect(listBtn.getAttribute("aria-pressed")).toBe("true");
    expect(playerBtn.classList.contains("selected")).toBe(false);

    __testables.setReplayView(root, "player", { listBtn, playerBtn });
    expect(root.dataset.replayView).toBe("player");
    expect(playerBtn.classList.contains("selected")).toBe(true);
    expect(playerBtn.getAttribute("aria-pressed")).toBe("true");
    expect(listBtn.classList.contains("selected")).toBe(false);
  });

  it("applies mobile layout state to reset tabs when leaving mobile", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div><button id='list'></button><button id='player'></button></body>");
    const { document } = dom.window;
    const root = document.getElementById("root");
    const listBtn = document.getElementById("list");
    const playerBtn = document.getElementById("player");

    __testables.applyMobileLayoutState({ root, listBtn, playerBtn }, true);
    expect(root.dataset.mobileLayout).toBe("true");
    expect(root.dataset.replayView).toBe("list");
    expect(listBtn.classList.contains("selected")).toBe(true);

    __testables.applyMobileLayoutState({ root, listBtn, playerBtn }, false);
    expect(root.dataset.mobileLayout).toBe("false");
    expect(root.dataset.replayView).toBeUndefined();
    expect(listBtn.classList.contains("selected")).toBe(false);
    expect(listBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the current view when mobile layout is already set", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root' data-replay-view='player'></div><button id='list'></button><button id='player'></button></body>");
    const { document } = dom.window;
    const root = document.getElementById("root");
    const listBtn = document.getElementById("list");
    const playerBtn = document.getElementById("player");

    __testables.applyMobileLayoutState({ root, listBtn, playerBtn }, true);
    expect(root.dataset.replayView).toBe("player");
    expect(playerBtn.classList.contains("selected")).toBe(true);
    expect(listBtn.classList.contains("selected")).toBe(false);
  });

  it("sets up mobile layout with addEventListener", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div><button id='list'></button><button id='player'></button></body>");
    const { document } = dom.window;
    const root = document.getElementById("root");
    const listBtn = document.getElementById("list");
    const playerBtn = document.getElementById("player");
    let changeHandler = null;

    const view = {
      matchMedia: () => ({
        matches: false,
        addEventListener: (event, handler) => {
          if (event === "change") changeHandler = handler;
        },
        removeEventListener: () => {}
      })
    };

    const cleanup = __testables.setupMobileLayout({ root, listBtn, playerBtn, view });
    expect(root.dataset.mobileLayout).toBe("false");
    changeHandler?.({ matches: true });
    expect(root.dataset.mobileLayout).toBe("true");
    expect(root.dataset.replayView).toBe("list");
    cleanup?.();
  });

  it("sets up mobile layout with addListener fallback", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const { document } = dom.window;
    const root = document.getElementById("root");
    let listener = null;

    const view = {
      matchMedia: () => ({
        matches: true,
        addListener: (handler) => {
          listener = handler;
        },
        removeListener: () => {}
      })
    };

    const cleanup = __testables.setupMobileLayout({ root, view });
    expect(root.dataset.mobileLayout).toBe("true");
    listener?.({ matches: false });
    expect(root.dataset.mobileLayout).toBe("false");
    cleanup?.();
  });

  it("no-ops when matchMedia is unavailable", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const { document } = dom.window;
    const root = document.getElementById("root");

    const cleanup = __testables.setupMobileLayout({ root, view: {} });
    expect(root.dataset.mobileLayout).toBe("false");
    expect(cleanup).toBeNull();
  });
});
