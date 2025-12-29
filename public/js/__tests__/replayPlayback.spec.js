import { describe, expect, it, vi } from "vitest";
import { createReplayPlayback, __testables } from "../replayPlayback.js";

function makeRaf() {
  const callbacks = [];
  const raf = (cb) => {
    callbacks.push(cb);
    return callbacks.length;
  };
  const step = (ts) => {
    const cb = callbacks.shift();
    if (cb) cb(ts);
  };
  return { raf, step };
}

function makeGame() {
  return {
    state: 1,
    handleAction: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    startRun: vi.fn()
  };
}

describe("replayPlayback", () => {
  it("plays ticks, applies actions, and completes", () => {
    const { raf, step } = makeRaf();
    const game = makeGame();
    const replayInput = { cursor: { x: 0, y: 0, has: false }, _move: { dx: 0, dy: 0 }, getMove() { return this._move; } };
    const onComplete = vi.fn();
    const onProgress = vi.fn();
    const onStateChange = vi.fn();
    const runner = vi.fn();

    const playback = createReplayPlayback({
      game,
      replayInput,
      simDt: 1 / 120,
      requestFrame: raf,
      step: runner,
      onProgress,
      onStateChange,
      onComplete
    });

    const ticks = [
      { move: { dx: 1, dy: 0 }, cursor: { x: 4, y: 5, has: true }, actions: [{ id: "dash", cursor: { x: 9, y: 9, has: true } }] },
      { move: { dx: 0, dy: 2 }, cursor: { x: 1, y: 2, has: false } }
    ];

    expect(playback.setTicks(ticks)).toBe(true);
    expect(playback.play()).toBe(true);

    step(0);
    step(100);
    step(200);

    expect(game.handleAction).toHaveBeenCalledWith("dash");
    expect(runner).toHaveBeenCalled();
    expect(replayInput._move).toEqual({ dx: 0, dy: 2 });
    expect(replayInput.cursor).toEqual({ x: 1, y: 2, has: false });
    expect(onComplete).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalled();
  });

  it("pauses playback without advancing frames", () => {
    const { raf, step } = makeRaf();
    const game = makeGame();
    const replayInput = { cursor: { x: 0, y: 0, has: false }, _move: { dx: 0, dy: 0 }, getMove() { return this._move; } };
    const runner = vi.fn();

    const playback = createReplayPlayback({
      game,
      replayInput,
      simDt: 1 / 120,
      requestFrame: raf,
      step: runner
    });

    playback.setTicks([{ move: { dx: 1, dy: 1 }, cursor: { x: 2, y: 2, has: true } }]);
    playback.play();
    playback.pause();
    step(0);
    step(100);

    expect(runner).not.toHaveBeenCalled();
  });

  it("steps and seeks while clamping speed", () => {
    const { raf, step } = makeRaf();
    const game = makeGame();
    const replayInput = { cursor: { x: 0, y: 0, has: false }, _move: { dx: 0, dy: 0 }, getMove() { return this._move; } };
    const onComplete = vi.fn();

    const playback = createReplayPlayback({
      game,
      replayInput,
      simDt: 1 / 120,
      requestFrame: raf,
      onComplete
    });

    playback.setTicks([
      { move: { dx: 3, dy: 0 }, cursor: { x: 1, y: 1, has: true } },
      { move: { dx: 4, dy: 0 }, cursor: { x: 2, y: 2, has: true } }
    ]);

    expect(playback.stepOnce()).toBe(true);
    expect(replayInput._move).toEqual({ dx: 3, dy: 0 });
    expect(playback.seek(1)).toBe(true);
    expect(replayInput._move).toEqual({ dx: 4, dy: 0 });

    playback.stepOnce();
    expect(onComplete).toHaveBeenCalled();

    const clamped = playback.setSpeed(99);
    expect(clamped).toBe(__testables.clampSpeed(99));

    step(0);
    step(100);
  });

  it("rejects empty tick lists", () => {
    const { raf } = makeRaf();
    const game = makeGame();
    const replayInput = { cursor: { x: 0, y: 0, has: false }, _move: { dx: 0, dy: 0 }, getMove() { return this._move; } };
    const playback = createReplayPlayback({ game, replayInput, simDt: 1 / 120, requestFrame: raf });

    expect(playback.setTicks([])).toBe(false);
    expect(playback.play()).toBe(false);
  });

  it("throws when required inputs are missing", () => {
    expect(() => createReplayPlayback({})).toThrow("Replay playback requires game, replayInput, and simDt.");
  });

  it("throws when requestAnimationFrame is unavailable", () => {
    const original = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = undefined;
    try {
      expect(() =>
        createReplayPlayback({
          game: makeGame(),
          replayInput: { cursor: { x: 0, y: 0, has: false }, _move: { dx: 0, dy: 0 }, getMove() { return this._move; } },
          simDt: 1 / 120,
          requestFrame: null
        })
      ).toThrow("Replay playback requires requestAnimationFrame.");
    } finally {
      globalThis.requestAnimationFrame = original;
    }
  });
});
