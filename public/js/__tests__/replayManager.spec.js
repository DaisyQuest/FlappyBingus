import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createReplayManager, createReplayRun, cloneReplayRun, __testables } from "../replayManager.js";
import { playbackTicks } from "../replayUtils.js";

function makeClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: vi.fn((name) => classes.add(name)),
    remove: vi.fn((name) => classes.delete(name)),
    contains: (name) => classes.has(name)
  };
}

function makeIncrementalRaf(stepMs = 100) {
  let ts = 0;
  return (cb) => {
    ts += stepMs;
    cb(ts);
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
    run.ticks.push({ move: { dx: 1, dy: 2 }, actions: [] });
    run.pendingActions.push({ id: "dash" });
    run.rngTape.push(0.1);
    run.backgroundSeed = "custom-bg";

    const clone = cloneReplayRun(run);
    expect(clone).not.toBe(run);
    expect(clone.ticks).toEqual(run.ticks);
    expect(clone.pendingActions).toEqual(run.pendingActions);
    expect(clone.rngTape).toEqual(run.rngTape);
    expect(clone.backgroundSeed).toBe("custom-bg");

    clone.ticks.push({ move: { dx: 9, dy: 9 }, actions: [] });
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
    expect(run.ticks[0].cursor).toBeUndefined();
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

    const playbackTicks = vi.fn(({ game: playbackGame, replayInput }) => {
      expect(playbackGame.input).toBe(replayInput);
    });
    const playbackTicksDeterministic = vi.fn();
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
    expect(menu.classList.remove).toHaveBeenCalledWith("hidden");
    expect(over.classList.remove).toHaveBeenCalledWith("hidden");
    expect(playbackTicks).toHaveBeenCalledWith(expect.objectContaining({
      captureMode: "none",
      playbackMode: "realtime"
    }));
    expect(playbackTicksDeterministic).not.toHaveBeenCalled();
    expect(manager.isReplaying()).toBe(false);
  });

  it("forwards playback control hooks to the playback engine", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn() };
    const menu = { classList: makeClassList() };
    const over = { classList: makeClassList() };
    const playbackTicks = vi.fn();
    const playbackTicksDeterministic = vi.fn();
    const shouldPause = vi.fn(() => false);
    const waitForResume = vi.fn();
    const shouldStop = vi.fn(() => false);
    const onProgress = vi.fn();

    const manager = createReplayManager({
      game,
      menu,
      over,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120,
      requestFrame: null
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    await manager.play({
      captureMode: "none",
      playbackMode: "deterministic",
      shouldPause,
      waitForResume,
      shouldStop,
      onProgress
    });

    expect(playbackTicksDeterministic).toHaveBeenCalledWith(expect.objectContaining({
      shouldPause,
      waitForResume,
      shouldStop,
      onProgress
    }));
    expect(playbackTicks).not.toHaveBeenCalled();
  });

  it("restores hidden UI states after replay playback", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn() };
    const menu = { classList: makeClassList(["hidden"]) };
    const over = { classList: makeClassList(["hidden"]) };
    const playbackTicks = vi.fn();
    const playbackTicksDeterministic = vi.fn();

    const manager = createReplayManager({
      game,
      menu,
      over,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120,
      requestFrame: null
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    await manager.play({ captureMode: "none" });

    expect(menu.classList.add).toHaveBeenCalledWith("hidden");
    expect(over.classList.add).toHaveBeenCalledWith("hidden");
    expect(menu.classList.remove).not.toHaveBeenCalledWith("hidden");
    expect(over.classList.remove).not.toHaveBeenCalledWith("hidden");
  });

  it("keeps UI visibility unchanged when hideUI is disabled", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn() };
    const menu = { classList: makeClassList() };
    const over = { classList: makeClassList() };
    const playbackTicks = vi.fn();
    const playbackTicksDeterministic = vi.fn();

    const manager = createReplayManager({
      game,
      menu,
      over,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120,
      requestFrame: null
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    await manager.play({ captureMode: "none", playbackMode: "deterministic", hideUI: false });

    expect(menu.classList.add).not.toHaveBeenCalled();
    expect(over.classList.add).not.toHaveBeenCalled();
    expect(menu.classList.remove).not.toHaveBeenCalled();
    expect(over.classList.remove).not.toHaveBeenCalled();
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
    const playbackTicksDeterministic = vi.fn(({ yieldBetweenRenders, paceWithSim }) => {
      expect(yieldBetweenRenders).toBeNull();
      expect(paceWithSim).toBe(false);
    });
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

  it("uses deterministic playback when requested and paces with requestFrame", async () => {
    const game = { input: { name: "real" }, startRun: vi.fn() };
    const playbackTicks = vi.fn();
    const playbackTicksDeterministic = vi.fn(({ yieldBetweenRenders, playbackMode, paceWithSim }) => {
      expect(playbackMode).toBe("deterministic");
      expect(typeof yieldBetweenRenders).toBe("function");
      expect(paceWithSim).toBe(true);
    });
    const requestFrame = vi.fn((cb) => cb(0));

    const manager = createReplayManager({
      game,
      playbackTicks,
      playbackTicksDeterministic,
      simDt: 1 / 120,
      requestFrame
    });

    manager.startRecording("seed");
    manager.recordTick({ move: { dx: 1, dy: 1 }, cursor: { x: 0, y: 0 } }, []);
    manager.markEnded();

    await manager.play({ captureMode: "none", playbackMode: "deterministic" });

    expect(playbackTicksDeterministic).toHaveBeenCalled();
    expect(playbackTicks).not.toHaveBeenCalled();
  });

  it("replays long runs in real time without dropping ticks", async () => {
    const totalTicks = 10_000;
    const ticks = Array.from({ length: totalTicks }, (_, i) => ({
      move: { dx: i % 7, dy: (i * 2) % 5 },
      actions: [
        { id: `boost-${i % 4}`, cursor: { x: (i * 5) % 300, y: (i * 7) % 300, has: i % 3 === 0 } },
        { id: `dash-${i % 3}` }
      ]
    }));
    const run = {
      seed: "seed",
      backgroundSeed: "seed:background",
      rngTape: [],
      pendingActions: [],
      ticks,
      ended: true
    };
    const game = {
      input: { name: "real" },
      updates: 0,
      renders: 0,
      actions: [],
      startRun: vi.fn(),
      update: vi.fn(function update() {
        this.updates += 1;
      }),
      render: vi.fn(function render() {
        this.renders += 1;
      }),
      handleAction: vi.fn(function handleAction(id) {
        this.actions.push(id);
      })
    };
    const menu = { classList: makeClassList() };
    const over = { classList: makeClassList() };

    const manager = createReplayManager({
      game,
      menu,
      over,
      playbackTicks,
      playbackTicksDeterministic: vi.fn(),
      simDt: 1 / 120,
      requestFrame: makeIncrementalRaf(100)
    });

    const result = await manager.play({ captureMode: "none", run, playbackMode: "realtime" });
    const lastTick = ticks[ticks.length - 1];

    expect(result).toBe(true);
    expect(game.update).toHaveBeenCalledTimes(totalTicks);
    expect(game.handleAction).toHaveBeenCalledTimes(totalTicks * 2);
    expect(game.actions[0]).toBe("boost-0");
    expect(game.actions[1]).toBe("dash-0");
    expect(game.actions[game.actions.length - 2]).toBe(`boost-${(totalTicks - 1) % 4}`);
    expect(game.actions[game.actions.length - 1]).toBe(`dash-${(totalTicks - 1) % 3}`);
    expect(game.input).toEqual({ name: "real" });
    expect(game.renders).toBeGreaterThan(0);
    expect(game.renders).toBeLessThanOrEqual(totalTicks);
    expect(game.update).toHaveBeenCalledTimes(totalTicks);
    expect(lastTick.move).toEqual({ dx: (totalTicks - 1) % 7, dy: ((totalTicks - 1) * 2) % 5 });
  });

  it("captures long replays with elaborate inputs", async () => {
    const totalTicks = 10_000;
    const ticks = Array.from({ length: totalTicks }, (_, i) => ({
      move: { dx: i % 5, dy: (i * 3) % 9 },
      actions: [
        { id: `jump-${i % 6}`, cursor: { x: (i * 11) % 500, y: (i * 13) % 500, has: i % 4 === 0 } },
        { id: `roll-${i % 4}` }
      ]
    }));
    const run = {
      seed: "seed",
      backgroundSeed: "seed:background",
      rngTape: [],
      pendingActions: [],
      ticks,
      ended: true
    };
    const game = {
      input: { name: "real" },
      updates: 0,
      renders: 0,
      actions: [],
      startRun: vi.fn(),
      update: vi.fn(function update() {
        this.updates += 1;
      }),
      render: vi.fn(function render() {
        this.renders += 1;
      }),
      handleAction: vi.fn(function handleAction(id) {
        this.actions.push(id);
      })
    };
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

    const manager = createReplayManager({
      canvas,
      game,
      playbackTicks,
      playbackTicksDeterministic: vi.fn(),
      simDt: 1 / 120,
      requestFrame: makeIncrementalRaf(16)
    });

    const result = await manager.play({ captureMode: "webm", run });

    expect(result).toBeInstanceOf(Blob);
    expect(game.update).toHaveBeenCalledTimes(totalTicks);
    expect(game.handleAction).toHaveBeenCalledTimes(totalTicks * 2);
    expect(game.actions[0]).toBe("jump-0");
    expect(game.actions[1]).toBe("roll-0");
    expect(game.actions[game.actions.length - 2]).toBe(`jump-${(totalTicks - 1) % 6}`);
    expect(game.actions[game.actions.length - 1]).toBe(`roll-${(totalTicks - 1) % 4}`);
    expect(game.renders).toBe(totalTicks);
    expect(canvas.captureStream).toHaveBeenCalledWith(__testables.DEFAULT_CAPTURE_FPS);
  });
});
