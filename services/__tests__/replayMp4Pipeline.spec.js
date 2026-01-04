"use strict";

import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import {
  DEFAULT_RENDER_PROFILE,
  normalizeRenderProfile,
  validateReplayForRender,
  createReplayMp4Pipeline,
  createInMemoryRenderQueue
} from "../replayMp4Pipeline.cjs";

function makeReplayJson(ticksLength = 2, { durationMs } = {}) {
  const ticks = Array.from({ length: ticksLength }, () => ({ move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4, has: false } }));
  return JSON.stringify({ ticks, durationMs });
}

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "replay-mp4-"));
}

describe("replayMp4Pipeline", () => {
  it("normalizes render profiles with defaults and invalid overrides", () => {
    const fallback = normalizeRenderProfile();
    expect(fallback.ok).toBe(true);
    expect(fallback.profile).toEqual(DEFAULT_RENDER_PROFILE);

    const invalid = normalizeRenderProfile({ profileId: "nope" });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBe("invalid_profile");

    const bySize = normalizeRenderProfile({ width: 1280, height: 720, fps: 60 });
    expect(bySize.ok).toBe(true);
    expect(bySize.profile.id).toBe("720p60");

    const invalidSize = normalizeRenderProfile({ width: 123, height: 456, fps: 12 });
    expect(invalidSize.ok).toBe(false);
    expect(invalidSize.error).toBe("invalid_profile");
  });

  it("validates replay payloads for size, structure, and limits", () => {
    const missing = validateReplayForRender(null, 0, { maxReplayBytes: 10, maxTicks: 2, maxDurationMs: 1000 });
    expect(missing.ok).toBe(false);
    expect(missing.error).toBe("missing_replay");

    const invalid = validateReplayForRender("{", 2, { maxReplayBytes: 10, maxTicks: 2, maxDurationMs: 1000 });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBe("invalid_replay");

    const tooLarge = validateReplayForRender("{}", 999, { maxReplayBytes: 10, maxTicks: 2, maxDurationMs: 1000 });
    expect(tooLarge.ok).toBe(false);
    expect(tooLarge.error).toBe("replay_too_large");

    const tooManyTicks = validateReplayForRender(makeReplayJson(3), 10, { maxReplayBytes: 1000, maxTicks: 2, maxDurationMs: 1000 });
    expect(tooManyTicks.ok).toBe(false);
    expect(tooManyTicks.error).toBe("replay_too_long");

    const tooLongDuration = validateReplayForRender(makeReplayJson(1, { durationMs: 5000 }), 10, { maxReplayBytes: 1000, maxTicks: 10, maxDurationMs: 1000 });
    expect(tooLongDuration.ok).toBe(false);
    expect(tooLongDuration.error).toBe("replay_too_long");

    const ok = validateReplayForRender(makeReplayJson(2), 10, { maxReplayBytes: 1000, maxTicks: 10, maxDurationMs: 1000 });
    expect(ok.ok).toBe(true);
    expect(ok.replayHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ok.replay.ticksLength).toBe(2);
  });

  it("processes queued render jobs and stores completed MP4s", async () => {
    const dir = await createTempDir();
    const queue = createInMemoryRenderQueue();

    const renderer = {
      renderFrames: async function* () {
        yield Buffer.from([0, 1, 2]);
        yield Buffer.from([3, 4, 5]);
      }
    };

    const encoder = {
      encodeMp4: async ({ outputPath }) => {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        const payload = Buffer.from("mp4");
        await fs.writeFile(outputPath, payload);
        return { bytes: payload.length };
      }
    };

    const pipeline = createReplayMp4Pipeline({
      storageDir: dir,
      renderer,
      encoder,
      queue
    });

    const replayJson = makeReplayJson(2);
    const result = pipeline.requestRender({ replayId: "PlayerOne", replayJson });
    expect(result.ok).toBe(true);
    expect(result.entry.status).toBe("queued");

    await pipeline.__testables.queue.drain();

    const status = pipeline.getStatus("PlayerOne");
    expect(status.ok).toBe(true);
    expect(status.entry.status).toBe("complete");
    expect(status.entry.mp4Bytes).toBe(3);
    const contents = await fs.readFile(status.entry.mp4Path);
    expect(contents.toString()).toBe("mp4");
  });

  it("returns existing entries when the replay hash matches", async () => {
    const dir = await createTempDir();
    const queue = createInMemoryRenderQueue();
    const renderer = {
      renderFrames: async function* () {
        yield Buffer.from([0, 1, 2]);
      }
    };
    const encoder = {
      encodeMp4: async ({ outputPath }) => {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, "mp4");
        return { bytes: 3 };
      }
    };

    const pipeline = createReplayMp4Pipeline({ storageDir: dir, queue, encoder, renderer });
    const replayJson = makeReplayJson(1);
    const first = pipeline.requestRender({ replayId: "PlayerOne", replayJson });
    const second = pipeline.requestRender({ replayId: "PlayerOne", replayJson });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.entry.jobId).toBe(first.entry.jobId);

    await pipeline.__testables.queue.drain();
    expect(pipeline.__testables.queue.size()).toBe(0);
  });

  it("marks render jobs as failed when encoding errors occur", async () => {
    const dir = await createTempDir();
    const queue = createInMemoryRenderQueue();
    const renderer = {
      renderFrames: async function* () {
        yield Buffer.from([0, 1, 2]);
      }
    };
    const encoder = {
      encodeMp4: async () => {
        throw new Error("encode_failed");
      }
    };

    const pipeline = createReplayMp4Pipeline({ storageDir: dir, queue, encoder, renderer });
    const replayJson = makeReplayJson(1);
    const result = pipeline.requestRender({ replayId: "PlayerOne", replayJson });
    expect(result.ok).toBe(true);

    await pipeline.__testables.queue.drain();
    const status = pipeline.getStatus("PlayerOne");
    expect(status.ok).toBe(true);
    expect(status.entry.status).toBe("failed");
    expect(status.entry.error).toBe("encode_failed");
  });

  it("returns errors for getStatus with invalid profiles or missing replays", () => {
    const queue = createInMemoryRenderQueue();
    const pipeline = createReplayMp4Pipeline({ queue });

    const invalidProfile = pipeline.getStatus("PlayerOne", { profileId: "nope" });
    expect(invalidProfile.ok).toBe(false);
    expect(invalidProfile.error).toBe("invalid_profile");

    const missing = pipeline.getStatus("UnknownReplay");
    expect(missing.ok).toBe(false);
    expect(missing.error).toBe("not_found");
  });

  it("returns not_found for getMp4 when entries are not completed", () => {
    const queue = createInMemoryRenderQueue();
    const pipeline = createReplayMp4Pipeline({ queue });
    const replayJson = makeReplayJson(1);

    const queued = pipeline.requestRender({ replayId: "PlayerOne", replayJson });
    expect(queued.ok).toBe(true);
    expect(queued.entry.status).toBe("queued");

    const queuedMp4 = pipeline.getMp4("PlayerOne");
    expect(queuedMp4.ok).toBe(false);
    expect(queuedMp4.error).toBe("not_found");

    const runningEntry = pipeline.__testables.store.upsert({
      ...queued.entry,
      status: "running"
    });
    const runningMp4 = pipeline.getMp4("PlayerOne");
    expect(runningMp4.ok).toBe(false);
    expect(runningMp4.error).toBe("not_found");
    expect(runningEntry.status).toBe("running");

    const failedEntry = pipeline.__testables.store.upsert({
      ...queued.entry,
      status: "failed",
      error: "encode_failed"
    });
    const failedMp4 = pipeline.getMp4("PlayerOne");
    expect(failedMp4.ok).toBe(false);
    expect(failedMp4.error).toBe("not_found");
    expect(failedEntry.status).toBe("failed");
    expect(failedEntry.error).toBe("encode_failed");
  });
});
