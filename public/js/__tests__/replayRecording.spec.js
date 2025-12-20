import { describe, it, expect } from "vitest";
import { buildReplayPayload, describeReplayMeta, formatDurationMs, __replayLimits, hydrateReplayFromServer } from "../replayUtils.js";

describe("replay recording helpers", () => {
  it("skips payload generation when the run is incomplete", () => {
    const run = { ended: false, seed: "s1", rngTape: [0.1], ticks: [{}] };
    expect(buildReplayPayload(run, 10)).toBeNull();
    expect(buildReplayPayload({ ended: true, seed: "s1", rngTape: [], ticks: [] }, 10)).toBeNull();
  });

  it("produces a bounded payload for finished runs", () => {
    const run = {
      ended: true,
      seed: "seed-123",
      rngTape: [0.1, 0.2],
      ticks: [
        {
          move: { dx: 1, dy: -1 },
          cursor: { x: 10, y: 20, has: true },
          actions: [{ id: "dash", cursor: { x: 5, y: 6, has: true } }]
        }
      ]
    };
    const payload = buildReplayPayload(run, 42);
    expect(payload).toBeTruthy();
    expect(payload.seed).toBe("seed-123");
    expect(payload.tickCount).toBe(1);
    expect(payload.actionCount).toBe(1);
    expect(payload.rngTape.length).toBe(2);
    expect(payload.score).toBe(42);
    const roundTrip = hydrateReplayFromServer(payload, __replayLimits);
    expect(roundTrip.tickCount).toBe(1);
  });

  it("describes replay metadata for leaderboard rows", () => {
    const meta = { tickCount: 120, actionCount: 30, durationMs: 10000 };
    expect(describeReplayMeta(meta, true)).toContain("ticks");
    expect(formatDurationMs(1000)).toBe("1s");
    expect(formatDurationMs(65000)).toBe("1m 05s");
  });
});
