import { describe, expect, it, vi } from "vitest";
import { buildReplayEnvelope, hydrateBestRunPayload, maybeUploadBestRun, serializeReplayEnvelope, __testables } from "../bestRunRecorder.js";
import { SIM_TICK_MS } from "../simPrecision.js";

const baseRun = () => ({
  ended: true,
  seed: "abc",
  ticks: [
    { move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4, has: true }, actions: [{ id: "dash", cursor: { x: 5, y: 6, has: true } }] },
    { move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false }, actions: [] }
  ],
  rngTape: [0.1, 0.2]
});

describe("buildReplayEnvelope", () => {
  it("normalizes ticks, cursor state, and metadata", () => {
    const run = baseRun();
    const envelope = buildReplayEnvelope(run, { finalScore: 99, runStats: { orbsCollected: 2 }, recordedAt: 1234 });

    expect(envelope.seed).toBe("abc");
    expect(envelope.score).toBe(99);
    expect(envelope.recordedAt).toBe(1234);
    expect(envelope.ticks).toHaveLength(2);
    expect(envelope.ticks[0].cursor).toEqual({ x: 3, y: 4, has: true });
    expect(envelope.ticks[0].actions[0].cursor).toEqual({ x: 5, y: 6, has: true });
    expect(envelope.rngTape).toEqual([0.1, 0.2]);
    expect(envelope.durationMs).toBeGreaterThan(0);
    expect(envelope.runStats).toEqual({ orbsCollected: 2 });
  });

  it("includes cosmetics data when present on the run", () => {
    const run = baseRun();
    run.cosmetics = {
      trailId: "ember",
      iconId: "lemon",
      pipeTextureId: "metal",
      pipeTextureMode: "HIGH"
    };

    const envelope = buildReplayEnvelope(run, { finalScore: 12 });

    expect(envelope.cosmetics).toEqual({
      trailId: "ember",
      iconId: "lemon",
      pipeTextureId: "metal",
      pipeTextureMode: "HIGH"
    });
  });

  it("derives duration from the shared simulation tick precision by default", () => {
    const run = baseRun();
    const envelope = buildReplayEnvelope(run, { finalScore: 5 });
    expect(envelope.durationMs).toBe(Math.round(run.ticks.length * SIM_TICK_MS));
  });

  it("returns null when the run is incomplete or empty", () => {
    expect(buildReplayEnvelope(null)).toBeNull();
    expect(buildReplayEnvelope({ ended: true, ticks: [] })).toBeNull();
    expect(buildReplayEnvelope({ ended: false, ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }] })).toBeNull();
  });
});

describe("maybeUploadBestRun", () => {
  it("skips uploads when the score is not a personal best", async () => {
    const upload = vi.fn();
    const logger = vi.fn();
    const result = await maybeUploadBestRun({
      activeRun: baseRun(),
      finalScore: 10,
      bestScore: 50,
      upload,
      logger
    });

    expect(result).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("below personal best"));
  });

  it("uploads replay JSON and optional media when eligible", async () => {
    const upload = vi.fn(async () => ({ ok: true }));
    const media = { dataUrl: "data:video/webm;base64,AAA", mimeType: "video/webm" };
    const run = baseRun();
    run.cosmetics = { trailId: "classic", iconId: "default", pipeTextureId: "basic", pipeTextureMode: "NORMAL" };
    const result = await maybeUploadBestRun({
      activeRun: run,
      finalScore: 150,
      bestScore: 100,
      runStats: { orbsCollected: 1 },
      recordVideo: () => media,
      upload
    });

    expect(result).toBe(true);
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 150,
        ticksLength: 2,
        rngTapeLength: 2,
        replayJson: expect.stringContaining('"cosmetics"'),
        media
      })
    );
  });

  it("reports failure when the upload endpoint returns an error", async () => {
    const upload = vi.fn(async () => ({ ok: false }));
    const result = await maybeUploadBestRun({
      activeRun: baseRun(),
      finalScore: 200,
      bestScore: 100,
      upload
    });

    expect(result).toBe(false);
    expect(upload).toHaveBeenCalled();
  });

  it("stops when the replay payload would exceed the configured cap", async () => {
    const hugeRun = baseRun();
    hugeRun.rngTape = new Array(10_000).fill(1);
    const upload = vi.fn();
    const logger = vi.fn();

    const result = await maybeUploadBestRun({
      activeRun: hugeRun,
      finalScore: 200,
      bestScore: 0,
      upload,
      logger,
      maxReplayBytes: 50 // force the overflow branch
    });

    expect(result).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("exceeds cap"));
  });
});

describe("serializeReplayEnvelope", () => {
  it("reports the encoded byte size of a replay", () => {
    const envelope = buildReplayEnvelope(baseRun(), { finalScore: 10 });
    const serialized = serializeReplayEnvelope(envelope);
    expect(serialized.json).toContain('"ticks"');
    expect(serialized.bytes).toBeGreaterThanOrEqual(serialized.json.length);
  });
});

describe("hydrateBestRunPayload", () => {
  it("parses stored replay JSON into an active run shape", () => {
    const envelope = buildReplayEnvelope(baseRun(), { finalScore: 10 });
    const hydrated = hydrateBestRunPayload({ ...envelope, replayJson: JSON.stringify(envelope) });
    expect(hydrated?.ticksLength).toBe(envelope.ticks.length);
    expect(hydrated?.rngTapeLength).toBe(envelope.rngTape.length);
    expect(hydrated?.ended).toBe(true);
  });

  it("hydrates cosmetics data when available", () => {
    const envelope = buildReplayEnvelope(
      baseRun(),
      { finalScore: 10, cosmetics: { trailId: "aurora", pipeTextureMode: "ultra" } }
    );
    const hydrated = hydrateBestRunPayload({ ...envelope, replayJson: JSON.stringify(envelope) });
    expect(hydrated?.cosmetics).toEqual({ trailId: "aurora", pipeTextureMode: "ultra" });
  });

  it("returns null when the payload is invalid", () => {
    expect(hydrateBestRunPayload(null)).toBeNull();
    expect(hydrateBestRunPayload({ replayJson: "{}" })).toBeNull();
    expect(hydrateBestRunPayload({ replayJson: "{" })).toBeNull();
  });
});

describe("normalizeCosmetics", () => {
  it("drops empty cosmetics payloads", () => {
    expect(__testables.normalizeCosmetics(null)).toBeNull();
    expect(__testables.normalizeCosmetics({ trailId: " " })).toBeNull();
  });
});
