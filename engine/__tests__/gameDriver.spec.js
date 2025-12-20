import { describe, expect, it, vi } from "vitest";
import { GameDriver } from "../gameDriver.js";
import { GameEngine } from "../gameEngine.js";

function createStubGame() {
  return {
    updates: [],
    actions: [],
    timeAlive: 0,
    score: 0,
    player: { x: 0, y: 0, vx: 0, vy: 0 },
    update(dt) {
      this.updates.push(dt);
      this.timeAlive += dt;
      this.score += 1;
      this.player.x += 1;
    },
    handleAction(a) {
      this.actions.push(a);
    }
  };
}

describe("GameDriver", () => {
  it("advances game and engine together", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    const snaps = driver.run({
      timeline: [
        { at: 0.01, action: "jump" },
        { at: 0.03, action: "dash" }
      ],
      duration: 0.05
    });

    expect(game.updates.length).toBeGreaterThan(0);
    expect(game.actions).toEqual(["jump", "dash"]);
    expect(snaps.at(-1).state.time).toBeCloseTo(0.05, 5);
    expect(snaps.at(-1).state.player.x).toBeGreaterThan(0);
  });

  it("throws on out-of-order actions", () => {
    const driver = new GameDriver({ game: createStubGame(), engine: new GameEngine({}) });
    expect(() =>
      driver.run({
        timeline: [
          { at: 0.02, action: "dash" },
          { at: 0.01, action: "jump" }
        ]
      })
    ).toThrow();
  });

  it("requires a game with update", () => {
    expect(() => new GameDriver({ game: null })).toThrow();
  });

  it("syncs rand source when provided", () => {
    const sync = vi.fn();
    const driver = new GameDriver({ game: createStubGame(), engine: new GameEngine({}), syncRandSource: sync });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(typeof sync.mock.calls[0][0]).toBe("function");
    // invoke to ensure it calls engine rng
    const randFn = sync.mock.calls[0][0];
    const v = randFn();
    expect(typeof v).toBe("number");
  });

  it("supports incremental stepping with actions", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });
    driver.step(0.01, ["jump"]);
    driver.step(0.02, ["dash"]);
    expect(game.actions).toEqual(["jump", "dash"]);
    expect(driver.snapshots.at(-1).state.time).toBeCloseTo(0.03, 5);
  });

  it("maps game state into engine snapshots", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });
    driver.step(0.01, ["jump"]);
    const snap = driver.snapshots.at(-1);
    expect(snap.state.score.total).toBeGreaterThan(0);
    expect(snap.state.player.x).toBeGreaterThan(0);
  });

  it("can disable snapshot retention for live loops", () => {
    const game = createStubGame();
    const mapState = vi.fn();
    const driver = new GameDriver({ game, engine: new GameEngine({}), mapState, captureSnapshots: false });
    driver.step(0.01, ["jump"]);
    expect(driver.snapshots).toHaveLength(0);
    expect(mapState).toHaveBeenCalledTimes(1);
  });
});
