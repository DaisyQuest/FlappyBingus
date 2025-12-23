"use strict";

import { describe, expect, it } from "vitest";
import { MAX_MEDIA_BYTES, MAX_REPLAY_BYTES, normalizeBestRunRequest } from "../bestRuns.cjs";

const baseBody = {
  score: 120,
  seed: "seed-123",
  replay: {
    version: 1,
    ticks: [
      { move: { dx: 0, dy: 0 }, cursor: { x: 1, y: 2, has: true }, actions: [{ id: "dash" }] }
    ],
    rngTape: [0.1, 0.5],
    durationMs: 2000
  },
  runStats: { orbsCollected: 1 }
};

const okRunStats = () => ({ ok: true, stats: { orbsCollected: 1 } });

describe("normalizeBestRunRequest", () => {
  it("normalizes replay payloads and computes derived metadata", () => {
    const res = normalizeBestRunRequest(baseBody, { bestScore: 50, validateRunStats: okRunStats });

    expect(res.ok).toBe(true);
    expect(res.payload.score).toBe(120);
    expect(res.payload.seed).toBe("seed-123");
    expect(res.payload.ticksLength).toBe(1);
    expect(res.payload.rngTapeLength).toBe(2);
    expect(res.payload.durationMs).toBeGreaterThan(0);
    expect(res.payload.replayBytes).toBeGreaterThan(0);
    expect(res.payload.replayHash).toMatch(/^[0-9a-f]{64}$/);
    expect(res.payload.runStats).toEqual({ orbsCollected: 1 });
    expect(res.payload.media).toBeNull();
  });

  it("rejects submissions that are not personal bests", () => {
    const res = normalizeBestRunRequest(baseBody, { bestScore: 999 });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not_best");
  });

  it("rejects oversized replay payloads", () => {
    const res = normalizeBestRunRequest(
      { ...baseBody, replayJson: "x".repeat(MAX_REPLAY_BYTES + 1) },
      { bestScore: 0 }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe("replay_too_large");
  });

  it("rejects invalid runStats payloads", () => {
    const res = normalizeBestRunRequest(baseBody, {
      bestScore: 50,
      validateRunStats: () => ({ ok: false, error: "invalid_run_stats" })
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid_run_stats");
  });

  it("rejects media blobs that exceed the configured cap", () => {
    const res = normalizeBestRunRequest(
      { ...baseBody, media: { dataUrl: "x".repeat(MAX_MEDIA_BYTES + 2) } },
      { bestScore: 0, validateRunStats: okRunStats }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe("media_too_large");
  });
});
