import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { formatReplayMeta, renderReplayDetails, __testables } from "../replayDetails.js";

describe("replayDetails", () => {
  it("formats replay metadata for display", () => {
    const meta = formatReplayMeta({
      bestScore: 99,
      durationMs: 61000,
      recordedAt: 0,
      ticksLength: 12,
      replayBytes: 1024
    });
    expect(meta.score).toBe(99);
    expect(meta.duration).toBe("1:01");
    expect(meta.recordedAt).toBe("—");
    expect(meta.ticks).toBe(12);
    expect(meta.bytes).toBe("1.0 KB");
  });

  it("renders details with stats when provided", () => {
    const dom = new JSDOM("<!doctype html><body><div id='panel'></div></body>");
    const container = dom.window.document.getElementById("panel");
    renderReplayDetails({
      container,
      entry: {
        username: "alice",
        bestScore: 42,
        durationMs: 1000,
        recordedAt: Date.now(),
        ticksLength: 2,
        replayBytes: 10
      },
      run: {
        runStats: {
          orbsCollected: 3,
          perfects: 1,
          pipesDodged: 4,
          abilitiesUsed: 2
        }
      }
    });

    expect(container.textContent).toContain("alice");
    expect(container.textContent).toContain("Best score");
    expect(container.textContent).toContain("Orbs");
    expect(container.textContent).toContain("Abilities");
  });

  it("renders a friendly empty state without an entry", () => {
    const dom = new JSDOM("<!doctype html><body><div id='panel'></div></body>");
    const container = dom.window.document.getElementById("panel");
    renderReplayDetails({ container, entry: null });
    expect(container.textContent).toContain("No replay selected");
  });

  it("formats bytes and dates gracefully", () => {
    expect(__testables.formatBytes(0)).toBe("0 B");
    expect(__testables.formatBytes(512)).toBe("512 B");
    expect(__testables.formatBytes(2048)).toBe("2.0 KB");
    expect(__testables.formatBytes(1024 * 1024 * 2)).toBe("2.00 MB");
    expect(__testables.formatDate(Number.NaN)).toBe("—");
    expect(__testables.formatDate(0)).toBe("—");
  });
});
