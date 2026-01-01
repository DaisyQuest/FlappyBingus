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

describe("playbackTicks", () => {
  const SIM_DT = 1 / 120;

  it("plays ticks in real time and renders each frame when capturing", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [
      { move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 }, actions: [{ id: "a1" }] },
      { move: { dx: 5, dy: 6 }, cursor: { x: 7, y: 8 }, actions: [{ id: "a2" }] },
      { move: { dx: 9, dy: 10 }, cursor: { x: 11, y: 12 }, actions: [{ id: "a3" }] },
      { move: { dx: 13, dy: 14 }, cursor: { x: 15, y: 16 }, actions: [{ id: "a4" }] }
    ];

    // Three animation frames at 60fps, expect all ticks to complete
    const ts = [0, 16, 32, 48, 64];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(4);
    expect(game.render).toHaveBeenCalledTimes(4);
    expect(game.actions).toEqual(["a1", "a2", "a3", "a4"]);
    expect(replayInput.cursor).toEqual({ x: 15, y: 16, has: false });
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
    }, { actions: [{ id: "a4" }] }];
    const step = vi.fn();

    const ts = [0, 16, 32, 48];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "webm", simDt: SIM_DT, requestFrame: raf, step });

    expect(step).toHaveBeenCalledTimes(2);
    expect(step).toHaveBeenNthCalledWith(1, SIM_DT, ["a1", "a2", "a3"]);
    expect(step).toHaveBeenNthCalledWith(2, SIM_DT, ["a4"]);
    expect(game.update).not.toHaveBeenCalled();
    expect(game.handleAction).not.toHaveBeenCalled();
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
      { move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 }, actions: [{ id: "a1" }, { id: "a2" }] },
      { move: { dx: 5, dy: 6 }, cursor: { x: 7, y: 8 }, actions: [{ id: "a3" }] },
      { move: { dx: 9, dy: 10 }, cursor: { x: 11, y: 12 }, actions: [{ id: "a4" }] }
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

    expect(step).toHaveBeenCalledWith(SIM_DT, ["a1", "a2"]);
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
