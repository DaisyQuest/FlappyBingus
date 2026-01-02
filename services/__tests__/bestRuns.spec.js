"use strict";

import { describe, expect, it } from "vitest";
import { MAX_MEDIA_BYTES, MAX_REPLAY_BYTES, normalizeBestRunRequest, hydrateReplayFromJson } from "../bestRuns.cjs";

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

const okRunStats = () => ({
  ok: true,
  stats: {
    orbsCollected: 1,
    abilitiesUsed: null,
    perfects: null,
    pipesDodged: null,
    maxOrbCombo: null,
    maxPerfectCombo: null,
    brokenPipes: null,
    maxBrokenPipesInExplosion: null,
    skillUsage: null
  }
});

describe("normalizeBestRunRequest", () => {
  it("rejects non-object payloads and invalid scores", () => {
    expect(normalizeBestRunRequest(null).ok).toBe(false);
    expect(normalizeBestRunRequest("bad").error).toBe("invalid_payload");

    const invalid = normalizeBestRunRequest({ score: 0, replayJson: "{}", ticksLength: 1 });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBe("invalid_score");
  });

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
    expect(res.payload.runStats).toEqual({
      orbsCollected: 1,
      abilitiesUsed: null,
      perfects: null,
      pipesDodged: null,
      maxOrbCombo: null,
      maxPerfectCombo: null,
      brokenPipes: null,
      maxBrokenPipesInExplosion: null,
      skillUsage: null
    });
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

  it("accepts replayJson strings and uses provided counts", () => {
    const replayJson = JSON.stringify({
      version: 1,
      ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }],
      rngTape: [0.25],
      durationMs: 500
    });
    const res = normalizeBestRunRequest(
      {
        score: 50,
        seed: "seed",
        replayJson,
        ticksLength: 99,
        rngTapeLength: 88,
        durationMs: 1234,
        media: { dataUrl: "data:video/webm;base64,AAA", mimeType: "video/webm" }
      },
      { bestScore: 0, validateRunStats: okRunStats }
    );

    expect(res.ok).toBe(true);
    expect(res.payload.ticksLength).toBe(99);
    expect(res.payload.rngTapeLength).toBe(88);
    expect(res.payload.durationMs).toBe(1234);
    expect(res.payload.media.mimeType).toBe("video/webm");
  });

  it("uses media.type when mimeType is absent and sanitizes non-string mime values", () => {
    const replayJson = JSON.stringify({
      ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }]
    });

    const fromType = normalizeBestRunRequest(
      {
        score: 5,
        replayJson,
        media: { dataUrl: "data:video/webm;base64,AAA", type: "video/webm" }
      },
      { bestScore: 0 }
    );
    expect(fromType.ok).toBe(true);
    expect(fromType.payload.media.mimeType).toBe("video/webm");

    const invalidMime = normalizeBestRunRequest(
      {
        score: 5,
        replayJson,
        media: { dataUrl: "data:video/webm;base64,AAA", mimeType: 123 }
      },
      { bestScore: 0 }
    );
    expect(invalidMime.ok).toBe(true);
    expect(invalidMime.payload.media.mimeType).toBe("application/octet-stream");
  });

  it("rejects missing or malformed replay payloads", () => {
    const missing = normalizeBestRunRequest({ score: 10 }, { bestScore: 0 });
    expect(missing.ok).toBe(false);
    expect(missing.error).toBe("missing_replay");

    const badJson = normalizeBestRunRequest(
      { score: 10, replayJson: "{", ticksLength: 1 },
      { bestScore: 0 }
    );
    expect(badJson.ok).toBe(false);
    expect(badJson.error).toBe("invalid_replay");

    const emptyTicks = normalizeBestRunRequest(
      { score: 10, replayJson: JSON.stringify({ ticks: [] }) },
      { bestScore: 0 }
    );
    expect(emptyTicks.ok).toBe(false);
    expect(emptyTicks.error).toBe("empty_replay");
  });

  it("rejects replay payloads that cannot be stringified", () => {
    const replay = { ticks: [] };
    replay.self = replay;
    const res = normalizeBestRunRequest(
      { score: 10, replay },
      { bestScore: 0 }
    );

    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid_replay");
  });

  it("treats explicit zero ticksLength overrides as empty replays", () => {
    const replayJson = JSON.stringify({
      ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }]
    });
    const res = normalizeBestRunRequest(
      { score: 10, replayJson, ticksLength: 0 },
      { bestScore: 0 }
    );

    expect(res.ok).toBe(false);
    expect(res.error).toBe("empty_replay");
  });

  it("trims long seeds and defaults duration from ticks", () => {
    const replayJson = JSON.stringify({ ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }] });
    const seed = "x".repeat(999);
    const res = normalizeBestRunRequest(
      { score: 10, seed, replayJson, recordedAt: "nope" },
      { bestScore: 0 }
    );

    expect(res.ok).toBe(true);
    expect(res.payload.seed.length).toBe(160);
    expect(res.payload.durationMs).toBeGreaterThan(0);
    expect(res.payload.recordedAt).toBeGreaterThan(0);
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

  it("accepts empty media values as null", () => {
    const res = normalizeBestRunRequest(
      { ...baseBody, media: { dataUrl: "" } },
      { bestScore: 0, validateRunStats: okRunStats }
    );
    expect(res.ok).toBe(true);
    expect(res.payload.media).toBeNull();
  });

  it("hydrates stored replay JSON into a playback-ready shape", () => {
    const payload = normalizeBestRunRequest(baseBody, { bestScore: 0, validateRunStats: okRunStats }).payload;
    const hydrated = hydrateReplayFromJson(payload);
    expect(hydrated.seed).toBe("seed-123");
    expect(hydrated.ticksLength).toBe(1);
    expect(hydrated.rngTapeLength).toBe(2);
    expect(hydrated.durationMs).toBeGreaterThan(0);
  });

  it("hydrates cosmetics embedded in replay JSON", () => {
    const body = {
      ...baseBody,
      replay: {
        ...baseBody.replay,
        cosmetics: { trailId: "ember", iconId: "lemon", pipeTextureId: "basic", pipeTextureMode: "NORMAL" }
      }
    };
    const payload = normalizeBestRunRequest(body, { bestScore: 0, validateRunStats: okRunStats }).payload;
    const hydrated = hydrateReplayFromJson(payload);
    expect(hydrated.cosmetics).toEqual({
      trailId: "ember",
      iconId: "lemon",
      pipeTextureId: "basic",
      pipeTextureMode: "NORMAL"
    });
  });

  it("returns null for malformed replay blobs", () => {
    expect(hydrateReplayFromJson(null)).toBeNull();
    expect(hydrateReplayFromJson({ replayJson: "{" })).toBeNull();
    expect(hydrateReplayFromJson({ replayJson: JSON.stringify({ ticks: [] }) })).toBeNull();
  });

  it("hydrates replay payloads with seed and duration fallbacks", () => {
    const run = {
      seed: "fallback-seed",
      recordedAt: 123,
      durationMs: 456,
      replayJson: JSON.stringify({
        ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }],
        rngTape: "not-array"
      })
    };
    const hydrated = hydrateReplayFromJson(run);
    expect(hydrated.seed).toBe("fallback-seed");
    expect(hydrated.durationMs).toBe(456);
    expect(hydrated.rngTapeLength).toBe(0);
  });
});
