import { describe, it, expect, vi } from "vitest";
import { createReplayPlaybackController, __testables } from "../replayBrowserPlayer.js";

function makeGame() {
  const game = {
    state: 0,
    input: null,
    setStateMenu: vi.fn(() => {
      game.state = 0;
    }),
    startRun: vi.fn(() => {
      game.state = 1;
    }),
    update: vi.fn(),
    render: vi.fn(),
    handleAction: vi.fn()
  };
  return game;
}

const baseRun = () => ({
  ticks: [
    { move: { dx: 1, dy: 0 }, cursor: { x: 10, y: 20, has: true }, actions: [{ id: "dash" }] },
    { move: { dx: 0, dy: 1 }, cursor: { x: 5, y: 6, has: false }, actions: [] }
  ]
});

describe("replayBrowserPlayer", () => {
  it("clamps playback speed to a safe range", () => {
    expect(__testables.clampSpeed("bad")).toBe(1);
    expect(__testables.clampSpeed(0.1)).toBe(__testables.SPEED_MIN);
    expect(__testables.clampSpeed(10)).toBe(__testables.SPEED_MAX);
  });

  it("loads runs and resets the game state", () => {
    const game = makeGame();
    const controller = createReplayPlaybackController({ game, simDt: 1 });

    controller.loadRun(baseRun());

    const state = controller.getState();
    expect(game.startRun).toHaveBeenCalled();
    expect(game.setStateMenu).not.toHaveBeenCalled();
    expect(state.total).toBe(2);
    expect(state.index).toBe(0);
  });

  it("applies cosmetics when loading replay runs", () => {
    const game = makeGame();
    const restore = vi.fn();
    const applyCosmetics = vi.fn(() => restore);
    const controller = createReplayPlaybackController({ game, simDt: 1, applyCosmetics });
    const run = { ...baseRun(), cosmetics: { trailId: "ember" } };

    controller.loadRun(run);

    expect(applyCosmetics).toHaveBeenCalledWith(run.cosmetics);

    controller.loadRun(baseRun());

    expect(restore).toHaveBeenCalled();
    expect(applyCosmetics).toHaveBeenCalledWith(undefined);
  });

  it("falls back to menu state resets when startRun is unavailable", () => {
    const game = {
      state: 0,
      input: null,
      setStateMenu: vi.fn(() => {
        game.state = 0;
      }),
      update: vi.fn(),
      render: vi.fn(),
      handleAction: vi.fn()
    };
    const controller = createReplayPlaybackController({ game, simDt: 1 });

    controller.loadRun(baseRun());

    expect(game.setStateMenu).toHaveBeenCalled();
    expect(controller.getState().total).toBe(2);
  });

  it("refuses to play when no run is loaded", () => {
    const frames = [];
    const controller = createReplayPlaybackController({
      game: makeGame(),
      requestFrame: (cb) => frames.push(cb),
      simDt: 1
    });

    expect(controller.play()).toBe(false);
    expect(frames).toHaveLength(0);
  });

  it("steps through a replay tick-by-tick", () => {
    const game = makeGame();
    const controller = createReplayPlaybackController({ game, simDt: 1 });
    controller.loadRun(baseRun());

    expect(controller.stepOnce()).toBe(true);
    expect(game.handleAction).toHaveBeenCalledWith("dash");
    expect(controller.getState().index).toBe(1);
    expect(controller.stepOnce()).toBe(true);
    expect(controller.getState().index).toBe(2);
    expect(controller.stepOnce()).toBe(false);
  });

  it("plays runs over successive animation frames", () => {
    const game = makeGame();
    const frames = [];
    const controller = createReplayPlaybackController({
      game,
      simDt: 1,
      requestFrame: (cb) => frames.push(cb)
    });
    controller.loadRun(baseRun());

    expect(controller.play()).toBe(true);
    expect(frames).toHaveLength(1);

    frames.shift()(0);
    expect(frames).toHaveLength(1);
    expect(controller.getState().index).toBe(0);

    frames.shift()(1000);
    expect(frames).toHaveLength(1);
    expect(controller.getState().index).toBe(1);

    frames.shift()(2000);
    expect(frames).toHaveLength(0);
    expect(controller.getState().index).toBe(2);
    expect(controller.getState().playing).toBe(false);
  });

  it("stops and restarts playback", () => {
    const game = makeGame();
    const controller = createReplayPlaybackController({ game, simDt: 1 });
    controller.loadRun(baseRun());
    controller.stepOnce();

    expect(controller.stop()).toBe(true);
    expect(controller.getState().index).toBe(0);
    expect(controller.restart()).toBe(true);
    expect(controller.getState().index).toBe(0);
  });
});
