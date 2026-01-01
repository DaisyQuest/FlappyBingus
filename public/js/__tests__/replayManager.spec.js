import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createReplayManager, createReplayRun, cloneReplayRun, __testables } from "../replayManager.js";

function makeClassList() {
  const classes = new Set();
  return {
    add: vi.fn((name) => classes.add(name)),
    remove: vi.fn((name) => classes.delete(name)),
    contains: (name) => classes.has(name)
  };
}

describe("replayManager", () => {
  const originalMediaRecorder = global.MediaRecorder;

  afterEach(() => {
    global.MediaRecorder = originalMediaRecorder;
  });

  it("creates replay runs with default fields", () => {
    const run = createReplayRun("seed");

    expect(run.seed).toBe("seed");
    expect(run.ticks).toEqual([]);
    expect(run.pendingActions).toEqual([]);
    expect(run.rngTape).toEqual([]);
    expect(run.ended).toBe(false);
    expect(run.backgroundSeed).toBe("seed:background");
  });

  it("clones replay runs without mutating the original", () => {
    const run = createReplayRun("seed");
    run.ticks.push({ move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 }, actions: [] });
    run.pendingActions.push({ id: "dash" });
    run.rngTape.push(0.1);
    run.backgroundSeed = "custom-bg";

    const clone = cloneReplayRun(run);
    expect(clone).not.toBe(run);
    expect(clone.ticks).toEqual(run.ticks);
    expect(clone.pendingActions).toEqual(run.pendingActions);
    expect(clone.rngTape).toEqual(run.rngTape);
    expect(clone.backgroundSeed).toBe("custom-bg");

    clone.ticks.push({ move: { dx: 9, dy: 9 }, cursor: { x: 1, y: 2 }, actions: [] });
    expect(run.ticks.length).toBe(1);
  });

  it("starts recording, queues actions, drains them, and records ticks", () => {
    const game = { setBackgroundRand: vi.fn() };
    const setRandSource = vi.fn();
    const tapeRecorder = vi.fn(() => "tape");
    const seededRand = vi.fn(() => "bg-rand");
    const onStatus = vi.fn();

    const manager = createReplayManager({ game, setRandSource, tapeRecorder, seededRand, onStatus });
    const run = manager.startRecording("abc");

    expect(run.seed).toBe("abc");
    expect(run.backgroundSeed).toBe("abc:background");
    expect(setRandSource).toHaveBeenCalledWith("tape");
    expect(tapeRecorder).toHaveBeenCalledWith("abc", run.rngTape);
    expect(seededRand).toHaveBeenCalledWith("abc:background");
    expect(game.setBackgroundRand).toHaveBeenCalledWith("bg-rand");
    expect(onStatus).toHaveBeenCalledWith({
      className: "hint",
      text: "Recording replay… Seed: abc"
    });

    manager.queueAction({ id: "dash" });
    manager.queueAction({ id: "teleport" });

    const drained = manager.drainPendingActions();
    expect(drained.map((action) => action.id)).toEqual(["dash", "teleport"]);
    expect(manager.drainPendingActions()).toEqual([]);

    manager.recordTick(
      { move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 } },
      [{ id: "dash" }]
    );

    expect(run.ticks).toHaveLength(1);
    expect(run.ticks[0].actions[0].id).toBe("dash");

    manager.markEnded();
    manager.queueAction({ id: "phase" });
    expect(manager.drainPendingActions()).toEqual([]);
  });

  it("returns null and reports status when a replay is missing", async () => {
    const onStatus = vi.fn();
    const manager = createReplayManager({ onStatus });

    const result = await manager.play({ captureMode: "none" });

    expect(result).toBeNull();
    expect(onStatus).toHaveBeenCalledWith({
      className: "hint bad",
      text: "No replay available yet (finish a run first)."
    });
    expect(manager.isReplaying()).toBe(false);
  });

  it("plays a replay in real time when requestAnimationFrame is available", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn(), setBackgroundRand: vi.fn() };
    const input = { reset: vi.fn() };
    const menu = { classList: makeClassList() };
    const over = { classList: makeClassList() };
    const stopMusic = vi.fn();
    const setRandSource = vi.fn();
    const tapePlayer = vi.fn(() => "tape");
    const seededRand = vi.fn(() => "seeded");

    const playbackTicks = vi.fn();
    const playbackTicksDeterministic = vi.fn(({ game: playbackGame, replayInput }) => {
      expect(playbackGame.input).toBe(replayInput);
    });
    const requestFrame = vi.fn((cb) => cb(0));

    const manager = createReplayManager({
      game,
      input,
      menu,
      over,
      stopMusic,
      setRandSource,
      tapePlayer,
      seededRand,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120,
      requestFrame
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    const result = await manager.play({ captureMode: "none" });

    expect(result).toBe(true);
    expect(stopMusic).toHaveBeenCalled();
    expect(setRandSource).toHaveBeenCalledWith("seeded");
    expect(tapePlayer).not.toHaveBeenCalled();
    expect(seededRand).toHaveBeenCalledWith("seed:background");
    expect(game.setBackgroundRand).toHaveBeenCalledWith("seeded");
    expect(game.input).toEqual({ name: "real" });
    expect(menu.classList.add).toHaveBeenCalledWith("hidden");
    expect(over.classList.add).toHaveBeenCalledWith("hidden");
    expect(over.classList.remove).toHaveBeenCalledWith("hidden");
    expect(playbackTicks).toHaveBeenCalledWith(expect.objectContaining({
      captureMode: "none",
      playbackMode: "realtime"
    }));
    expect(playbackTicksDeterministic).not.toHaveBeenCalled();
    expect(manager.isReplaying()).toBe(false);
  });

  it("captures a replay when capture mode is enabled", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn() };
    const canvas = { captureStream: vi.fn(() => ({ stream: true })) };
    const playbackTicks = vi.fn(async () => {});
    const playbackTicksDeterministic = vi.fn();

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      constructor(stream, options) {
        this.stream = stream;
        this.mimeType = options?.mimeType || "video/webm";
        this.ondataavailable = null;
        this.onstop = null;
      }

      start() {
        this.ondataavailable?.({ data: new Blob(["chunk"]) });
      }

      stop() {
        this.onstop?.();
      }
    }

    global.MediaRecorder = FakeMediaRecorder;

    const manager = createReplayManager({
      canvas,
      game,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    const result = await manager.play({ captureMode: "webm" });

    expect(result).toBeInstanceOf(Blob);
    expect(canvas.captureStream).toHaveBeenCalledWith(__testables.DEFAULT_CAPTURE_FPS);
    expect(playbackTicks).toHaveBeenCalled();
    expect(playbackTicksDeterministic).not.toHaveBeenCalled();
  });

  it("falls back to deterministic playback when requestFrame is unavailable", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn() };
    const playbackTicks = vi.fn();
    const playbackTicksDeterministic = vi.fn();
    const originalRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = undefined;

    const manager = createReplayManager({
      game,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120,
      requestFrame: null
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    await manager.play({ captureMode: "none" });

    expect(playbackTicksDeterministic).toHaveBeenCalled();
    expect(playbackTicks).not.toHaveBeenCalled();
    global.requestAnimationFrame = originalRaf;
  });
});
