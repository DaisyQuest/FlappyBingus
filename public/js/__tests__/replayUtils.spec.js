import { describe, expect, it, vi } from "vitest";
import { playbackTicks, ticksPerFrameForPlayback, __testables } from "../replayUtils.js";

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

describe("ticksPerFrameForPlayback", () => {
  it("returns 1 when capturing", () => {
    expect(ticksPerFrameForPlayback("webm")).toBe(1);
  });

  it("derives ticks-per-frame from tps/fps when not capturing", () => {
    expect(ticksPerFrameForPlayback("none", 60, 120)).toBe(2);
    expect(ticksPerFrameForPlayback("none", 30, 120)).toBe(4);
  });
});

describe("playbackTicks", () => {
  const SIM_DT = 1 / 120;

  it("plays at least the minimum ticks per frame and renders each frame", async () => {
    const game = makeGame();
    const replayInput = makeReplayInput();
    const ticks = [
      { move: { dx: 1, dy: 2 }, cursor: { x: 3, y: 4 }, actions: [{ id: "a1" }] },
      { move: { dx: 5, dy: 6 }, cursor: { x: 7, y: 8 }, actions: [{ id: "a2" }] },
      { move: { dx: 9, dy: 10 }, cursor: { x: 11, y: 12 }, actions: [{ id: "a3" }] },
      { move: { dx: 13, dy: 14 }, cursor: { x: 15, y: 16 }, actions: [{ id: "a4" }] }
    ];

    // Two animation frames at 60fps, expect 4 ticks (min 2 per frame)
    const ts = [0, 16, 32];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "none", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(4);
    expect(game.render).toHaveBeenCalledTimes(2);
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

    const ts = [0, 40, 80, 120];
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

    const ts = [0, 16, 32, 48];
    const raf = makeRaf(ts);

    await playbackTicks({ ticks, game, replayInput, captureMode: "none", simDt: SIM_DT, requestFrame: raf });

    expect(game.update).toHaveBeenCalledTimes(2);
    expect(game.render).toHaveBeenCalledTimes(1);
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

describe("constants", () => {
  it("exposes defaults", () => {
    expect(__testables.REPLAY_TARGET_FPS).toBe(60);
    expect(__testables.REPLAY_TPS).toBe(120);
    expect(__testables.MAX_FRAME_DT).toBeCloseTo(1 / 15);
  });
});
