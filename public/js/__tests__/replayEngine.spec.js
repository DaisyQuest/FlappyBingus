import { describe, expect, it, vi, afterEach } from "vitest";
import { createReplayEngine, createReplayRun, cloneReplayRun, __testables } from "../replayEngine.js";

function makeClassList() {
  const classes = new Set();
  return {
    add: vi.fn((name) => classes.add(name)),
    remove: vi.fn((name) => classes.delete(name)),
    contains: (name) => classes.has(name)
  };
}

describe("replayEngine", () => {
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
  });

  it("clones replay runs without mutating the original", () => {
    const run = createReplayRun("seed");
    run.ticks.push({ move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 }, actions: [] });
    run.pendingActions.push({ id: "dash" });
    run.rngTape.push(0.1);

    const clone = cloneReplayRun(run);
    expect(clone).not.toBe(run);
    expect(clone.ticks).toEqual(run.ticks);
    expect(clone.pendingActions).toEqual(run.pendingActions);
    expect(clone.rngTape).toEqual(run.rngTape);

    clone.ticks.push({ move: { dx: 9, dy: 9 }, cursor: { x: 1, y: 2 }, actions: [] });
    expect(run.ticks.length).toBe(1);
  });

  it("starts recording, queues actions, drains them, and records ticks", () => {
    const setRandSource = vi.fn();
    const tapeRecorder = vi.fn(() => "tape");
    const onStatus = vi.fn();

    const engine = createReplayEngine({ setRandSource, tapeRecorder, onStatus });
    const run = engine.startRecording("abc");

    expect(run.seed).toBe("abc");
    expect(setRandSource).toHaveBeenCalledWith("tape");
    expect(tapeRecorder).toHaveBeenCalledWith("abc", run.rngTape);
    expect(onStatus).toHaveBeenCalledWith({
      className: "hint",
      text: "Recording replay… Seed: abc"
    });

    engine.queueAction({ id: "dash" });
    engine.queueAction({ id: "teleport" });

    const drained = engine.drainPendingActions();
    expect(drained.map((action) => action.id)).toEqual(["dash", "teleport"]);
    expect(engine.drainPendingActions()).toEqual([]);

    engine.recordTick(
      { move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 } },
      [{ id: "dash" }]
    );

    expect(run.ticks).toHaveLength(1);
    expect(run.ticks[0].actions[0].id).toBe("dash");

    engine.markEnded();
    engine.queueAction({ id: "phase" });
    expect(engine.drainPendingActions()).toEqual([]);
  });

  it("returns null and reports status when a replay is missing", async () => {
    const onStatus = vi.fn();
    const engine = createReplayEngine({ onStatus });

    const result = await engine.play({ captureMode: "none" });

    expect(result).toBeNull();
    expect(onStatus).toHaveBeenCalledWith({
      className: "hint bad",
      text: "No replay available yet (finish a run first)."
    });
    expect(engine.isReplaying()).toBe(false);
  });

  it("plays a replay with deterministic stepping and restores RNG", async () => {
    const originalRand = () => 0.2;
    const nextRand = () => 0.9;
    const setRandSource = vi.fn();
    const getRandSource = vi.fn(() => originalRand);
    const seededRand = vi.fn(() => nextRand);

    const game = {
      input: { name: "real" },
      state: 1,
      startRun: vi.fn(),
      handleAction: vi.fn(),
      update: vi.fn(),
      render: vi.fn()
    };
    const input = { reset: vi.fn() };
    const menu = { classList: makeClassList() };
    const over = { classList: makeClassList() };
    const stopMusic = vi.fn();

    const engine = createReplayEngine({
      game,
      input,
      menu,
      over,
      stopMusic,
      setRandSource,
      getRandSource,
      seededRand,
      simDt: 1 / 120
    });

    engine.startRecording("seed");
    engine.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, [{ id: "dash" }]);
    engine.markEnded();

    const result = await engine.play({ captureMode: "none", renderEveryTicks: 1, yieldBetweenRenders: () => Promise.resolve() });

    expect(result).toBe(true);
    expect(stopMusic).toHaveBeenCalled();
    expect(setRandSource).toHaveBeenCalledWith(nextRand);
    expect(setRandSource).toHaveBeenCalledWith(originalRand);
    expect(game.handleAction).toHaveBeenCalledWith("dash");
    expect(game.input).toEqual({ name: "real" });
    expect(menu.classList.add).toHaveBeenCalledWith("hidden");
    expect(over.classList.add).toHaveBeenCalledWith("hidden");
    expect(over.classList.remove).toHaveBeenCalledWith("hidden");
    expect(engine.isReplaying()).toBe(false);
  });

  it("uses tape playback when RNG tape is present", async () => {
    const setRandSource = vi.fn();
    const getRandSource = vi.fn(() => () => 0.1);
    const tapePlayer = vi.fn(() => () => 0.5);
    const seededRand = vi.fn(() => () => 0.9);

    const game = { state: 1, update: vi.fn(), render: vi.fn() };
    const engine = createReplayEngine({
      game,
      setRandSource,
      getRandSource,
      tapePlayer,
      seededRand,
      simDt: 1 / 120
    });

    const run = createReplayRun("seed");
    run.ticks.push({ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0 }, actions: [] });
    run.rngTape.push(0.25);
    run.ended = true;

    await engine.play({ captureMode: "none", run, renderEveryTicks: 1, yieldBetweenRenders: () => Promise.resolve() });

    expect(tapePlayer).toHaveBeenCalledWith(run.rngTape);
    expect(seededRand).not.toHaveBeenCalled();
  });

  it("captures a replay when capture mode is enabled", async () => {
    const game = { input: { name: "real" }, state: 1, startRun: vi.fn(), update: vi.fn(), render: vi.fn() };
    const canvas = { captureStream: vi.fn(() => ({ stream: true })) };

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

    const engine = createReplayEngine({
      canvas,
      game,
      simDt: 1 / 120
    });

    engine.startRecording("seed");
    engine.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    engine.markEnded();

    const result = await engine.play({ captureMode: "webm", renderEveryTicks: 1, yieldBetweenRenders: () => Promise.resolve() });

    expect(result).toBeInstanceOf(Blob);
    expect(canvas.captureStream).toHaveBeenCalledWith(__testables.DEFAULT_CAPTURE_FPS);
  });
});
