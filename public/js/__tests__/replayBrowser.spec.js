import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  formatReplayDuration,
  formatReplayDate,
  normalizeReplayFilters,
  filterReplayEntries,
  sortReplayEntries,
  renderReplayBrowserList
} from "../replayBrowser.js";

describe("replayBrowser", () => {
  it("formats durations and dates for display", () => {
    expect(formatReplayDuration(0)).toBe("0:00");
    expect(formatReplayDuration(65000)).toBe("1:05");
    expect(formatReplayDate(0)).toBe("—");
    expect(formatReplayDate(Date.parse("2024-01-01T00:00:00.000Z"))).toBe("2024-01-01");
  });

  it("normalizes filters and swaps inverted ranges", () => {
    const normalized = normalizeReplayFilters({
      search: " bingus ",
      minScore: 100,
      maxScore: 10,
      minDuration: 3000,
      maxDuration: 2000,
      sort: "duration"
    });

    expect(normalized.search).toBe("bingus");
    expect(normalized.minScore).toBe(10);
    expect(normalized.maxScore).toBe(100);
    expect(normalized.minDuration).toBe(2000);
    expect(normalized.maxDuration).toBe(3000);
    expect(normalized.sort).toBe("duration");
  });

  it("filters entries by search, score, and duration", () => {
    const entries = [
      { username: "Alice", bestScore: 50, durationMs: 1000 },
      { username: "Bingus", bestScore: 200, durationMs: 9000 },
      { username: "Cora", bestScore: 90, durationMs: 3000 }
    ];

    const filtered = filterReplayEntries(entries, {
      search: "bing",
      minScore: 100,
      maxDuration: 10000
    });

    expect(filtered).toEqual([{ username: "Bingus", bestScore: 200, durationMs: 9000 }]);
  });

  it("sorts entries based on the selected mode", () => {
    const entries = [
      { username: "A", bestScore: 50, durationMs: 5000, updatedAt: 10 },
      { username: "B", bestScore: 100, durationMs: 1000, updatedAt: 5 },
      { username: "C", bestScore: 75, durationMs: 9000, updatedAt: 20 }
    ];

    const byScore = sortReplayEntries(entries, { sort: "score" });
    expect(byScore.map((e) => e.username)).toEqual(["B", "C", "A"]);

    const byRecent = sortReplayEntries(entries, { sort: "recent" });
    expect(byRecent.map((e) => e.username)).toEqual(["C", "A", "B"]);

    const byDuration = sortReplayEntries(entries, { sort: "duration" });
    expect(byDuration.map((e) => e.username)).toEqual(["C", "A", "B"]);
  });

  it("renders entries and wires play handlers", () => {
    const dom = new JSDOM("<!doctype html><body><div id='list'></div></body>");
    const document = dom.window.document;
    const container = document.getElementById("list");
    const onPlay = vi.fn();

    const entries = [{ username: "Bingus", bestScore: 42, durationMs: 1000, recordedAt: 1700000000000 }];
    const { rendered } = renderReplayBrowserList({ container, entries, onPlay });

    expect(rendered).toBe(1);
    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Play");
    button?.click();
    expect(onPlay).toHaveBeenCalledWith(entries[0]);
  });

  it("renders an empty state when no entries are available", () => {
    const dom = new JSDOM("<!doctype html><body><div id='list'></div></body>");
    const document = dom.window.document;
    const container = document.getElementById("list");

    const { rendered } = renderReplayBrowserList({ container, entries: [] });

    expect(rendered).toBe(0);
    expect(container.textContent).toContain("No replays");
  });
});
