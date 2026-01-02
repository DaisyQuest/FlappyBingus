import { describe, it, expect } from "vitest";
import { filterReplays, sortReplays, formatReplayMeta, __testables } from "../replayBrowser.js";

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
    expect(__testables.formatBytes(0)).toBe("0 B");
    expect(__testables.formatBytes(512)).toBe("512 B");
    expect(__testables.formatBytes(2048)).toBe("2.0 KB");
    expect(__testables.formatDate(Number.NaN)).toBe("—");
  });
});
