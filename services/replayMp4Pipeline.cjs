"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

const { hydrateReplayFromJson, MAX_REPLAY_BYTES } = require("./bestRuns.cjs");

const DEFAULT_RENDER_PROFILE = Object.freeze({
  id: "720p60",
  label: "HD 720p @ 60fps",
  width: 1280,
  height: 720,
  fps: 60
});

const RENDER_PROFILES = Object.freeze([
  DEFAULT_RENDER_PROFILE,
  { id: "720p30", label: "HD 720p @ 30fps", width: 1280, height: 720, fps: 30 },
  { id: "480p60", label: "SD 480p @ 60fps", width: 854, height: 480, fps: 60 },
  { id: "480p30", label: "SD 480p @ 30fps", width: 854, height: 480, fps: 30 }
]);

const PROFILE_BY_ID = new Map(RENDER_PROFILES.map((profile) => [profile.id, profile]));

const DEFAULT_RENDER_LIMITS = Object.freeze({
  maxReplayBytes: MAX_REPLAY_BYTES,
  maxTicks: 120 * 60 * 5,
  maxDurationMs: 5 * 60_000
});

function normalizeRenderProfile(input = {}) {
  if (!input || typeof input !== "object") {
    return { ok: true, profile: DEFAULT_RENDER_PROFILE };
  }

  const id = typeof input.profileId === "string" ? input.profileId.trim() : "";
  if (id) {
    const profile = PROFILE_BY_ID.get(id);
    if (!profile) return { ok: false, error: "invalid_profile" };
    return { ok: true, profile };
  }

  const width = Number(input.width || 0);
  const height = Number(input.height || 0);
  const fps = Number(input.fps || 0);
  if (width || height || fps) {
    const match = RENDER_PROFILES.find((profile) => profile.width === width && profile.height === height && profile.fps === fps);
    if (!match) return { ok: false, error: "invalid_profile" };
    return { ok: true, profile: match };
  }

  return { ok: true, profile: DEFAULT_RENDER_PROFILE };
}

function validateReplayForRender(replayJson, replayBytes, limits = DEFAULT_RENDER_LIMITS) {
  if (typeof replayJson !== "string" || !replayJson) return { ok: false, error: "missing_replay" };
  const bytes = Number(replayBytes || Buffer.byteLength(replayJson, "utf8"));
  if (bytes > limits.maxReplayBytes) return { ok: false, error: "replay_too_large" };
  const replay = hydrateReplayFromJson({ replayJson });
  if (!replay) return { ok: false, error: "invalid_replay" };
  if (replay.ticksLength > limits.maxTicks) return { ok: false, error: "replay_too_long" };
  if (replay.durationMs > limits.maxDurationMs) return { ok: false, error: "replay_too_long" };

  const replayHash = createHash("sha256").update(replayJson).digest("hex");
  return { ok: true, replay, replayBytes: bytes, replayHash };
}

function createReplayMp4Store({ storageDir, now = () => Date.now() } = {}) {
  const dir = storageDir ? path.resolve(storageDir) : path.join(process.cwd(), "replay_mp4");
  const entries = new Map();
  const hashIndex = new Map();

  function keyFor(replayId, profileId) {
    return `${replayId}:${profileId}`;
  }

  function hashKey(replayHash, profileId) {
    return `${replayHash}:${profileId}`;
  }

  function getByReplay(replayId, profileId) {
    return entries.get(keyFor(replayId, profileId)) || null;
  }

  function getByHash(replayHash, profileId) {
    return hashIndex.get(hashKey(replayHash, profileId)) || null;
  }

  function upsert(entry) {
    const key = keyFor(entry.replayId, entry.profile.id);
    const updated = { ...entry, updatedAt: now() };
    entries.set(key, updated);
    if (updated.replayHash) {
      hashIndex.set(hashKey(updated.replayHash, updated.profile.id), updated);
    }
    return updated;
  }

  function buildMp4Path(entry) {
    return path.join(dir, entry.replayId, entry.replayHash, entry.profile.id, "render.mp4");
  }

  return {
    dir,
    now,
    getByReplay,
    getByHash,
    upsert,
    buildMp4Path
  };
}

function createInMemoryRenderQueue() {
  const jobs = [];
  let handler = null;
  let running = false;

  async function runNext() {
    if (running || !handler || jobs.length === 0) return;
    running = true;
    const job = jobs.shift();
    try {
      await handler(job);
    } finally {
      running = false;
      if (jobs.length > 0) setImmediate(runNext);
    }
  }

  function enqueue(job) {
    jobs.push(job);
    if (handler) setImmediate(runNext);
    return job.id;
  }

  function start(nextHandler) {
    handler = nextHandler;
    if (jobs.length > 0) setImmediate(runNext);
  }

  function stop() {
    handler = null;
    jobs.length = 0;
  }

  async function drain() {
    while ((jobs.length > 0 || running) && handler) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    enqueue,
    start,
    stop,
    size: () => jobs.length,
    drain
  };
}

function deriveTickColor(tick, index) {
  const dx = Number(tick?.move?.dx || 0);
  const dy = Number(tick?.move?.dy || 0);
  const cx = Number(tick?.cursor?.x || 0);
  const cy = Number(tick?.cursor?.y || 0);
  const base = Math.abs(Math.floor(dx * 31 + dy * 17 + cx * 7 + cy * 11 + index * 13));
  return {
    r: (base * 3) % 256,
    g: (base * 5) % 256,
    b: (base * 7) % 256
  };
}

function makeSolidFrame(width, height, color) {
  const size = width * height * 3;
  const buffer = Buffer.allocUnsafe(size);
  const r = color.r & 0xff;
  const g = color.g & 0xff;
  const b = color.b & 0xff;
  for (let i = 0; i < size; i += 3) {
    buffer[i] = r;
    buffer[i + 1] = g;
    buffer[i + 2] = b;
  }
  return buffer;
}

async function* renderReplayFrames(replay, profile, { maxFrames } = {}) {
  const total = Math.min(replay.ticksLength, maxFrames ?? replay.ticksLength);
  for (let i = 0; i < total; i += 1) {
    const tick = replay.ticks[i];
    const color = deriveTickColor(tick, i);
    yield makeSolidFrame(profile.width, profile.height, color);
  }
}

async function encodeMp4({ frameStream, profile, outputPath, timeoutMs = 120_000, ffmpegPath = "ffmpeg" } = {}) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise(async (resolve, reject) => {
    const args = [
      "-y",
      "-f", "rawvideo",
      "-pix_fmt", "rgb24",
      "-s", `${profile.width}x${profile.height}`,
      "-r", String(profile.fps),
      "-i", "-",
      "-an",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-crf", "23",
      outputPath
    ];

    const proc = spawn(ffmpegPath, args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("ffmpeg_timeout"));
    }, timeoutMs);

    proc.stderr.on("data", (chunk) => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    try {
      for await (const frame of frameStream) {
        if (!proc.stdin.write(frame)) {
          await once(proc.stdin, "drain");
        }
      }
      proc.stdin.end();
    } catch (err) {
      clearTimeout(timer);
      proc.kill("SIGKILL");
      reject(err);
      return;
    }

    proc.on("exit", async (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`ffmpeg_failed:${code}:${stderr.slice(0, 200)}`));
        return;
      }
      try {
        const stat = await fs.stat(outputPath);
        resolve({ bytes: stat.size });
      } catch (err) {
        reject(err);
      }
    });
  });
}

function createReplayMp4Pipeline({
  store,
  queue,
  renderer,
  encoder,
  limits = DEFAULT_RENDER_LIMITS,
  storageDir,
  now = () => Date.now()
} = {}) {
  const pipelineStore = store || createReplayMp4Store({ storageDir, now });
  const renderQueue = queue || createInMemoryRenderQueue();
  const renderEngine = renderer || { renderFrames: renderReplayFrames };
  const encoderEngine = encoder || { encodeMp4 };

  async function processJob(job) {
    const entry = pipelineStore.getByReplay(job.replayId, job.profile.id);
    if (!entry) return;

    const running = pipelineStore.upsert({
      ...entry,
      status: "running",
      startedAt: now()
    });

    try {
      const frameStream = renderEngine.renderFrames(running.replay, running.profile, {
        maxFrames: limits.maxTicks
      });
      const mp4Path = pipelineStore.buildMp4Path(running);
      const encoded = await encoderEngine.encodeMp4({
        frameStream,
        profile: running.profile,
        outputPath: mp4Path
      });

      pipelineStore.upsert({
        ...running,
        status: "complete",
        mp4Path,
        mp4Bytes: encoded.bytes,
        completedAt: now(),
        error: null
      });
    } catch (err) {
      pipelineStore.upsert({
        ...running,
        status: "failed",
        error: err?.message || String(err),
        completedAt: now()
      });
    }
  }

  renderQueue.start(processJob);

  function requestRender({ replayId, replayJson, replayBytes, replayHash, requestedBy, profileOptions } = {}) {
    const normalizedProfile = normalizeRenderProfile(profileOptions || {});
    if (!normalizedProfile.ok) return { ok: false, error: normalizedProfile.error };

    const validated = validateReplayForRender(replayJson, replayBytes, limits);
    if (!validated.ok) return { ok: false, error: validated.error };

    const hash = replayHash || validated.replayHash;
    const existingByHash = pipelineStore.getByHash(hash, normalizedProfile.profile.id);
    if (existingByHash) {
      return { ok: true, entry: existingByHash };
    }

    const existing = pipelineStore.getByReplay(replayId, normalizedProfile.profile.id);
    if (existing) {
      return { ok: true, entry: existing };
    }

    const entry = pipelineStore.upsert({
      replayId,
      requestedBy,
      replayHash: hash,
      replayBytes: validated.replayBytes,
      profile: normalizedProfile.profile,
      replay: validated.replay,
      status: "queued",
      requestedAt: now(),
      error: null,
      mp4Path: null,
      mp4Bytes: null,
      jobId: `job_${Math.random().toString(36).slice(2)}`
    });

    renderQueue.enqueue({
      id: entry.jobId,
      replayId: entry.replayId,
      profile: entry.profile
    });

    return { ok: true, entry };
  }

  function getStatus(replayId, profileOptions = {}) {
    const normalizedProfile = normalizeRenderProfile(profileOptions || {});
    if (!normalizedProfile.ok) return { ok: false, error: normalizedProfile.error };
    const entry = pipelineStore.getByReplay(replayId, normalizedProfile.profile.id);
    if (!entry) return { ok: false, error: "not_found" };
    return { ok: true, entry };
  }

  function getMp4(replayId, profileOptions = {}) {
    const normalizedProfile = normalizeRenderProfile(profileOptions || {});
    if (!normalizedProfile.ok) return { ok: false, error: normalizedProfile.error };
    const entry = pipelineStore.getByReplay(replayId, normalizedProfile.profile.id);
    if (!entry || entry.status !== "complete" || !entry.mp4Path) {
      return { ok: false, error: "not_found" };
    }
    return { ok: true, entry };
  }

  return {
    requestRender,
    getStatus,
    getMp4,
    stop: renderQueue.stop,
    __testables: {
      store: pipelineStore,
      queue: renderQueue
    }
  };
}

module.exports = {
  DEFAULT_RENDER_PROFILE,
  RENDER_PROFILES,
  DEFAULT_RENDER_LIMITS,
  normalizeRenderProfile,
  validateReplayForRender,
  createReplayMp4Store,
  createInMemoryRenderQueue,
  renderReplayFrames,
  encodeMp4,
  createReplayMp4Pipeline
};
