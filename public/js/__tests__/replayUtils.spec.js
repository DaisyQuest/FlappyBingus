import { describe, expect, it, vi } from "vitest";
import {
  playbackTicks,
  playbackTicksDeterministic,
  chooseReplayRandSource,
  __testables
} from "../replayUtils.js";

function makeGame() {
  return {
    state: 1,
    updates: 0,
    renders: 0,
    actions: [],
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
}

function makeReplayInput() {
  return {
    cursor: { x: 0, y: 0, has: false },
    _move: { dx: 0, dy: 0 },
    getMove() { return this._move; }
  };
}

function makeRaf(timestamps) {
  let i = 0;
  return (cb) => {
    const ts = timestamps[i] ?? timestamps[timestamps.length - 1];
    i += 1;
    cb(ts);
  };
}

function makeIncrementalRaf(stepMs = 100) {
  let ts = 0;
  return (cb) => {
    ts += stepMs;
    cb(ts);
  };
}

function makeSequentialRaf(stepMs, count) {
  const timestamps = Array.from({ length: count }, (_, i) => i * stepMs);
  return makeRaf(timestamps);
}

describe("playbackTicks", () => {
  const SIM_DT = 1 / 120;

  it("plays ticks in real time and renders each frame when capturing", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [
      { move: { dx: 1, dy: 2 }, actions: [{ id: "a1" }] },
      { move: { dx: 5, dy: 6 }, actions: [{ id: "a2" }] },
      { move: { dx: 9, dy: 10 }, actions: [{ id: "a3" }] },
      { move: { dx: 13, dy: 14 }, actions: [{ id: "a4" }] }
    ];

    // Five animation frames at 60fps, expect all ticks to complete
    const ts = [0, 16, 32, 48, 64];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(4);
    expect(game.render).toHaveBeenCalledTimes(4);
    expect(game.actions).toEqual(["a1", "a2", "a3", "a4"]);
    expect(replayInput.cursor).toEqual({ x: 0, y: 0, has: false });
    expect(replayInput._move).toEqual({ dx: 13, dy: 14 });
  });

  it("respects capture mode by limiting to one tick per frame even on long frames", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}];

    const ts = [0, 40, 80, 120, 160];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(3);
    expect(game.render).toHaveBeenCalledTimes(3); // one render per frame while ticks remain
  });

  it("stops when the game reaches OVER state", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}];

    game.update.mockImplementation(function () {
      this.updates += 1;
      if (this.updates >= 2) this.state = 2;
    });

    const ts = [0, 16, 32, 48, 64];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(2);
    expect(game.render).toHaveBeenCalledTimes(2);
  });

  it("uses a custom step handler when provided", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{
      actions: [{ id: "a1" }, { action: "a2" }, "a3", { id: null }, null]
    }, { actions: [{ id: "a4", cursor: { x: 9, y: 12, has: true } }] }];
    const step = vi.fn();

    const ts = [0, 16, 32, 48];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf, step });

    expect(step).toHaveBeenCalledTimes(2);
    expect(step).toHaveBeenNthCalledWith(1, SIM_DT, [
      { id: "a1", cursor: undefined },
      { id: "a2", cursor: undefined },
      { id: "a3", cursor: undefined }
    ]);
    expect(step).toHaveBeenNthCalledWith(2, SIM_DT, [{ id: "a4", cursor: { x: 9, y: 12, has: true } }]);
    expect(game.update).not.toHaveBeenCalled();
    expect(game.handleAction).not.toHaveBeenCalled();
    expect(replayInput.cursor).toEqual({ x: 9, y: 12, has: true });
  });

  it("applies action cursor updates before handling each action", async () => {
    const replayInput = makeReplayInput();
    const game = {
      state: 1,
      update: vi.fn(),
      render: vi.fn(),
      cursorSnapshots: [],
      handleAction: vi.fn(function () {
        this.cursorSnapshots.push({ ...replayInput.cursor });
      })
    };
    const ticks = [{
      actions: [
        { id: "teleport", cursor: { x: 10, y: 20, has: true } },
        { id: "dash", cursor: { x: 30, y: 40, has: true } }
      ]
    }];
    const ts = [0, 16, 32];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.handleAction).toHaveBeenCalledTimes(2);
    expect(game.cursorSnapshots).toEqual([
      { x: 10, y: 20, has: true },
      { x: 30, y: 40, has: true }
    ]);
  });

  it("restores the prior cursor after each action before updating", async () => {
    const replayInput = makeReplayInput();
    replayInput.cursor = { x: 5, y: 6, has: true };
    const game = {
      state: 1,
      update: vi.fn(function () {
        expect(replayInput.cursor).toEqual({ x: 30, y: 40, has: false });
      }),
      render: vi.fn(),
      handleAction: vi.fn()
    };
    const ticks = [{
      actions: [
        { id: "teleport", cursor: { x: 10, y: 20, has: true } },
        { id: "dash", cursor: { x: 30, y: 40, has: false } }
      ]
    }];
    const ts = [0, 16, 32];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.handleAction).toHaveBeenCalledTimes(2);
    expect(game.update).toHaveBeenCalledTimes(1);
    expect(replayInput.cursor).toEqual({ x: 30, y: 40, has: false });
  });

  it("updates the cursor from legacy tick data when present", async () => {
    const replayInput = makeReplayInput();
    const game = makeGame();
    const ticks = [{ cursor: { x: 12, y: 24, has: true }, actions: [] }];
    const ts = [0, 16];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(replayInput.cursor).toEqual({ x: 12, y: 24, has: true });
  });

  it("restores legacy tick cursor after action cursor overrides", async () => {
    const replayInput = makeReplayInput();
    const game = makeGame();
    const ticks = [{
      cursor: { x: 4, y: 8, has: true },
      actions: [{ id: "teleport", cursor: { x: 20, y: 30, has: true } }]
    }];
    const ts = [0, 16];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(replayInput.cursor).toEqual({ x: 4, y: 8, has: true });
  });

  it("normalizes action ids before calling game.handleAction", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{ actions: [{ id: "dash" }, { action: "phase" }, "teleport", { id: null }] }];
    const ts = [0, 16, 32];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.handleAction).toHaveBeenCalledTimes(3);
    expect(game.handleAction).toHaveBeenNthCalledWith(1, "dash");
    expect(game.handleAction).toHaveBeenNthCalledWith(2, "phase");
    expect(game.handleAction).toHaveBeenNthCalledWith(3, "teleport");
  });

  it("guards against invalid inputs", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const raf = makeRaf([0]);
    await expect(playbackTicks({ ticks: null, game, replayInput, simDt: SIM_DT, requestFrame: raf })).resolves.toBeUndefined();
    await expect(playbackTicks({ ticks: [], game: null, replayInput, simDt: SIM_DT, requestFrame: raf })).resolves.toBeUndefined();
    await expect(playbackTicks({ ticks: [], game, replayInput: null, simDt: SIM_DT, requestFrame: raf })).resolves.toBeUndefined();
    await expect(playbackTicks({ ticks: [], game, replayInput, simDt: null, requestFrame: raf })).resolves.toBeUndefined();
  });

  it("reports progress and waits for resume when paused", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}];
    let paused = true;
    let resumeResolve;
    const shouldPause = vi.fn(() => paused);
    const waitForResume = vi.fn(() => new Promise((resolve) => {
      resumeResolve = resolve;
    }));
    const onProgress = vi.fn();

    const playback = playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      shouldPause,
      waitForResume,
      onProgress,
      renderEveryTicks: 1,
      renderMode: "always"
    });

    await Promise.resolve();
    expect(waitForResume).toHaveBeenCalledTimes(1);
    paused = false;
    resumeResolve();

    await playback;

    expect(onProgress).toHaveBeenNthCalledWith(1, { tickIndex: 1, ticksLength: 2 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { tickIndex: 2, ticksLength: 2 });
  });

  it("stops immediately when a stop signal is raised", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}];
    const raf = vi.fn();
    const shouldStop = vi.fn(() => true);

    await playbackTicks({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      requestFrame: raf,
      shouldStop
    });

    expect(raf).not.toHaveBeenCalled();
    expect(game.update).not.toHaveBeenCalled();
  });

  it("uses deterministic playback when capture mode is none", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}];
    const raf = vi.fn();
    const originalRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = undefined;

    await playbackTicks({
      ticks,
      game,
      replayInput,
      captureMode: "none",
      simDt: SIM_DT,
      requestFrame: raf,
      renderEveryTicks: 1,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(game.update).toHaveBeenCalledTimes(2);
    expect(game.render).toHaveBeenCalledTimes(2);
    expect(raf).not.toHaveBeenCalled();
    global.requestAnimationFrame = originalRaf;
  });

  it("plays in real time when playback mode is realtime", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}, {}];
    const ts = [0, 16, 32, 48];
    const raf = makeRaf(ts);

    await playbackTicks({
      ticks,
      game,
      replayInput,
      captureMode: "none",
      playbackMode: "realtime",
      simDt: SIM_DT,
      requestFrame: raf
    });

    expect(game.update).toHaveBeenCalledTimes(4);
    expect(game.render).toHaveBeenCalledTimes(3);
  });

  it("replays long real-time runs without dropping ticks", async () => {
    const totalTicks = 10_000;
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = Array.from({ length: totalTicks }, (_, i) => ({
      move: { dx: i % 7, dy: (i * 2) % 5 },
      actions: [
        { id: `boost-${i % 4}`, cursor: { x: (i * 5) % 300, y: (i * 7) % 300, has: i % 3 === 0 } },
        { id: `dash-${i % 3}` }
      ]
    }));
    const raf = makeIncrementalRaf(100);

    await playbackTicks({
      ticks,
      game,
      replayInput,
      captureMode: "none",
      playbackMode: "realtime",
      simDt: SIM_DT,
      requestFrame: raf
    });

    const tickStep = Math.max(SIM_DT, 1 / (__testables.REPLAY_TPS * 2));
    const firstFrameDt = Math.min(__testables.MAX_FRAME_DT, 1 / __testables.REPLAY_TARGET_FPS);
    const ticksFirstFrame = Math.floor((firstFrameDt + 1e-9) / tickStep);
    const ticksPerFrame = Math.floor((__testables.MAX_FRAME_DT + 1e-9) / tickStep);
    const expectedFrames = 1 + Math.ceil((totalTicks - ticksFirstFrame) / ticksPerFrame);
    const lastTick = ticks[ticks.length - 1];

    expect(game.update).toHaveBeenCalledTimes(totalTicks);
    expect(game.render).toHaveBeenCalledTimes(expectedFrames);
    expect(game.handleAction).toHaveBeenCalledTimes(totalTicks * 2);
    expect(game.actions[0]).toBe("boost-0");
    expect(game.actions[1]).toBe("dash-0");
    expect(game.actions[game.actions.length - 2]).toBe(`boost-${(totalTicks - 1) % 4}`);
    expect(game.actions[game.actions.length - 1]).toBe(`dash-${(totalTicks - 1) % 3}`);
    expect(replayInput._move).toEqual(lastTick.move);
    expect(replayInput.cursor).toEqual({
      x: (totalTicks - 1) * 5 % 300,
      y: (totalTicks - 1) * 7 % 300,
      has: (totalTicks - 1) % 3 === 0
    });
  });

  it("matches capture-mode outcomes when replaying in realtime", async () => {
    const ticks = [
      {
        move: { dx: 1, dy: 2 },
        actions: [{ id: "boost", cursor: { x: 15, y: 25, has: true } }, { id: "dash" }]
      },
      {
        move: { dx: 3, dy: 4 },
        actions: [{ id: "slide", cursor: { x: 18, y: 28, has: false } }]
      },
      {
        move: { dx: 5, dy: 6 },
        actions: [{ id: "hop" }, { id: "bank", cursor: { x: 30, y: 40, has: true } }]
      },
      {
        move: { dx: 7, dy: 8 },
        actions: [{ id: "boost" }]
      },
      {
        move: { dx: 9, dy: 10 },
        actions: [{ id: "flip" }, { id: "dash" }]
      },
      {
        move: { dx: 11, dy: 12 },
        actions: [{ id: "roll", cursor: { x: 44, y: 55, has: true } }]
      }
    ];

    const runPlayback = async ({ captureMode, playbackMode, requestFrame }) => {
      const game = makeGame();
      const replayInput = makeReplayInput();

      await playbackTicks({
        ticks,
        game,
        replayInput,
        captureMode,
        playbackMode,
        simDt: SIM_DT,
        requestFrame
      });

      return {
        updates: game.updates,
        renders: game.renders,
        actions: [...game.actions],
        replayInput: { cursor: { ...replayInput.cursor }, move: { ...replayInput._move } }
      };
    };

    const captureResults = await runPlayback({
      captureMode: "webm",
      playbackMode: "realtime",
      requestFrame: makeSequentialRaf(16, ticks.length + 1)
    });
    const realtimeResults = await runPlayback({
      captureMode: "none",
      playbackMode: "realtime",
      requestFrame: makeIncrementalRaf(100)
    });

    expect(captureResults.updates).toBe(ticks.length);
    expect(realtimeResults.updates).toBe(ticks.length);
    expect(realtimeResults.actions).toEqual(captureResults.actions);
    expect(realtimeResults.replayInput).toEqual(captureResults.replayInput);
    expect(realtimeResults.renders).toBeGreaterThan(0);
    expect(captureResults.renders).toBe(ticks.length);
  });

  it("bails when realtime playback lacks requestAnimationFrame", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}];
    const originalRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = undefined;

    await expect(playbackTicks({
      ticks,
      game,
      replayInput,
      captureMode: "none",
      playbackMode: "realtime",
      simDt: SIM_DT,
      requestFrame: null
    })).resolves.toBeUndefined();

    global.requestAnimationFrame = originalRaf;
  });
});

describe("playbackTicksDeterministic", () => {
  const SIM_DT = 1 / 120;

  it("plays the same tick list deterministically across runs", async () => {
    const ticks = [
      { move: { dx: 1, dy: 2 }, actions: [{ id: "a1" }, { id: "a2" }] },
      { move: { dx: 5, dy: 6 }, actions: [{ id: "a3" }] },
      { move: { dx: 9, dy: 10 }, actions: [{ id: "a4" }] }
    ];

    const runOnce = async () => {
      const game = makeGame();
      const replayInput = makeReplayInput();
      const calls = [];

      game.handleAction.mockImplementation((id) => {
        calls.push(`action:${id}`);
        game.actions.push(id);
      });
      game.update.mockImplementation(() => {
        calls.push("update");
        game.updates += 1;
      });

      await playbackTicksDeterministic({
        ticks,
        game,
        replayInput,
        simDt: SIM_DT,
        yieldBetweenRenders: () => Promise.resolve()
      });

      return {
        calls,
        actions: [...game.actions],
        updates: game.updates,
        replayInput: { cursor: { ...replayInput.cursor }, move: { ...replayInput._move } }
      };
    };

    const first = await runOnce();
    const second = await runOnce();

    expect(second.calls).toEqual(first.calls);
    expect(second.actions).toEqual(first.actions);
    expect(second.updates).toBe(first.updates);
    expect(second.replayInput).toEqual(first.replayInput);
  });

  it("does not double-apply actions when a step handler is provided", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{ actions: [{ id: "a1" }, { action: "a2" }] }];
    const step = vi.fn();

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      step,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(step).toHaveBeenCalledWith(SIM_DT, [
      { id: "a1", cursor: undefined },
      { id: "a2", cursor: undefined }
    ]);
    expect(game.handleAction).not.toHaveBeenCalled();
    expect(game.update).not.toHaveBeenCalled();
  });

  it("renders on the configured cadence and optionally renders a final frame", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}, {}, {}];

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderEveryTicks: 2,
      renderFinal: false,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(game.update).toHaveBeenCalledTimes(5);
    expect(game.render).toHaveBeenCalledTimes(2);

    game.render.mockClear();

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderEveryTicks: 2,
      renderFinal: true,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(game.render).toHaveBeenCalledTimes(3);
  });

  it("uses a custom step handler when provided", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{ actions: [{ id: "a1" }] }, { actions: [{ id: "a2" }] }];
    const step = vi.fn();

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      step,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(step).toHaveBeenCalledTimes(2);
    expect(game.update).not.toHaveBeenCalled();
  });

  it("stops when the game reaches OVER state", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}];

    game.update.mockImplementation(function () {
      this.updates += 1;
      if (this.updates >= 2) this.state = 2;
    });

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderEveryTicks: 5,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(game.update).toHaveBeenCalledTimes(2);
    expect(game.render).toHaveBeenCalled();
  });

  it("renders every tick when renderMode is always", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}];

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderMode: "always",
      renderEveryTicks: 10,
      yieldBetweenRenders: () => Promise.resolve()
    });

    expect(game.render).toHaveBeenCalledTimes(3);
  });

  it("paces playback with sim time when enabled", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}];
    const nowTimes = [0, 0, 4, 10];
    const now = vi.fn(() => nowTimes.shift() ?? 10);
    const waits = [];
    const wait = vi.fn((ms) => {
      waits.push(ms);
      return Promise.resolve();
    });

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderEveryTicks: 1,
      paceWithSim: true,
      now,
      wait
    });

    expect(wait).toHaveBeenCalled();
    expect(waits[0]).toBeCloseTo(8.33, 1);
    expect(waits[1]).toBeCloseTo(12.66, 1);
  });

  it("skips pacing waits when playback is already ahead of schedule", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}];
    const nowTimes = [0, 20, 40];
    const now = vi.fn(() => nowTimes.shift() ?? 40);
    const wait = vi.fn(() => Promise.resolve());

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderEveryTicks: 1,
      paceWithSim: true,
      now,
      wait
    });

    expect(wait).not.toHaveBeenCalled();
  });

  it("uses requestAnimationFrame for yielding when available", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [{}, {}, {}];
    const originalRaf = global.requestAnimationFrame;
    const raf = vi.fn((cb) => cb(0));

    global.requestAnimationFrame = raf;

    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt: SIM_DT,
      renderEveryTicks: 1
    });

    expect(game.render).toHaveBeenCalledTimes(3);
    expect(raf).toHaveBeenCalledTimes(3);

    global.requestAnimationFrame = originalRaf;
  });

  it("guards against invalid inputs", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    await expect(playbackTicksDeterministic({ ticks: null, game, replayInput, simDt: SIM_DT })).resolves.toBeUndefined();
    await expect(playbackTicksDeterministic({ ticks: [], game: null, replayInput, simDt: SIM_DT })).resolves.toBeUndefined();
    await expect(playbackTicksDeterministic({ ticks: [], game, replayInput: null, simDt: SIM_DT })).resolves.toBeUndefined();
    await expect(playbackTicksDeterministic({ ticks: [], game, replayInput, simDt: null })).resolves.toBeUndefined();
  });
});

describe("chooseReplayRandSource", () => {
  it("returns null when dependencies are missing", () => {
    expect(chooseReplayRandSource(null)).toBeNull();
    expect(chooseReplayRandSource({ rngTape: [] }, { tapePlayer: () => {} })).toBeNull();
  });

  it("prefers tape playback when rng tape is present", () => {
    const tapeFn = vi.fn(() => "tape");
    const seedFn = vi.fn(() => "seeded");
    const source = chooseReplayRandSource({ rngTape: [1, 2], seed: "abc" }, { tapePlayer: tapeFn, seededRand: seedFn });

    expect(source).toBe("tape");
    expect(tapeFn).toHaveBeenCalledWith([1, 2]);
    expect(seedFn).not.toHaveBeenCalled();
  });

  it("falls back to seeded RNG when no tape is available", () => {
    const tapeFn = vi.fn(() => "tape");
    const seedFn = vi.fn(() => "seeded");
    const source = chooseReplayRandSource({ rngTape: [], seed: "seed" }, { tapePlayer: tapeFn, seededRand: seedFn });

    expect(source).toBe("seeded");
    expect(seedFn).toHaveBeenCalledWith("seed");
    expect(tapeFn).not.toHaveBeenCalled();
  });
});

describe("constants", () => {
  it("exposes defaults", () => {
    expect(__testables.REPLAY_TARGET_FPS).toBe(60);
    expect(__testables.REPLAY_TPS).toBe(120);
    expect(__testables.MAX_FRAME_DT).toBeCloseTo(1 / 10);
  });
});
