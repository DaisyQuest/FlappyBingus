import { describe, expect, it, vi } from "vitest";
import { playbackTicks, chooseReplayRandSource, getReplaySimDt, __testables } from "../replayUtils.js";

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

  it("plays ticks in real time and renders each frame", async () => {
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

    await playbackTicks({ ticks, game, replayInput, captureMode: "none", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(4);
    expect(game.render).toHaveBeenCalledTimes(3);
    expect(game.actions).toEqual(["a1", "a2", "a3", "a4"]);
    expect(replayInput.cursor).toEqual({ x: 15, y: 16, has: false });
    expect(replayInput._move).toEqual({ dx: 13, dy: 14 });
  });

  it("catches up when the frame rate drops by running additional ticks", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = new Array(6).fill(null).map((_, i) => ({ move: { dx: i, dy: i } }));

    // First frame is long (~33ms), so 4 ticks should run to catch up; second frame runs the rest
    const ts = [0, 33, 50];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "none", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(6);
    expect(game.render).toHaveBeenCalledTimes(2);
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

    await playbackTicks({ ticks, game, replayInput, captureMode: "none", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(2);
    expect(game.render).toHaveBeenCalledTimes(2);
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

describe("getReplaySimDt", () => {
  const SIM_DT = 1 / 120;

  it("falls back when run data is missing", () => {
    expect(getReplaySimDt(null, SIM_DT)).toBe(SIM_DT);
    expect(getReplaySimDt({ ticks: [] }, SIM_DT)).toBe(SIM_DT);
    expect(getReplaySimDt({ ticks: [1], durationMs: 0 }, SIM_DT)).toBe(SIM_DT);
  });

  it("derives a bounded sim dt from duration and tick count", () => {
    const run = { ticks: new Array(120).fill({}), durationMs: 1000 };
    expect(getReplaySimDt(run, SIM_DT)).toBeCloseTo(SIM_DT);

    const slower = { ticks: new Array(120).fill({}), durationMs: 4000 };
    expect(getReplaySimDt(slower, SIM_DT)).toBeCloseTo(SIM_DT * 2);

    const faster = { ticks: new Array(120).fill({}), durationMs: 250 };
    expect(getReplaySimDt(faster, SIM_DT)).toBeCloseTo(SIM_DT * 0.5);
  });
});

describe("constants", () => {
  it("exposes defaults", () => {
    expect(__testables.REPLAY_TARGET_FPS).toBe(60);
    expect(__testables.REPLAY_TPS).toBe(120);
    expect(__testables.MAX_FRAME_DT).toBeCloseTo(1 / 10);
  });
});
