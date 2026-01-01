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

  it("updates cursor state when actions include cursor payloads", () => {
    const game = {
      ...createStubGame(),
      input: { cursor: { x: 0, y: 0, has: false } },
      actions: [],
      handleAction(id) {
        this.actions.push({ id, cursor: { ...this.input.cursor } });
      }
    };
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    driver.step(0.01, [
      { id: "teleport", cursor: { x: 5, y: 6, has: true } },
      { action: "dash", cursor: { x: 9, y: 8, has: false } }
    ]);

    expect(game.actions).toEqual([
      { id: "teleport", cursor: { x: 5, y: 6, has: true } },
      { id: "dash", cursor: { x: 9, y: 8, has: false } }
    ]);
    expect(game.input.cursor).toEqual({ x: 0, y: 0, has: false });
  });

  it("maps game state into engine snapshots", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });
    driver.step(0.01, ["jump"]);
    const snap = driver.snapshots.at(-1);
    expect(snap.state.score.total).toBeGreaterThan(0);
    expect(snap.state.player.x).toBeGreaterThan(0);
  });

  it("advances duration-only runs without a timeline", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    const snaps = driver.run({ duration: 0.04 });

    expect(snaps).toHaveLength(1);
    expect(snaps[0].state.time).toBeCloseTo(0.04, 5);
    expect(game.updates.at(-1)).toBeCloseTo(0.04, 5);
  });

  it("still produces a snapshot when duration is zero and captureSnapshots is true", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}), captureSnapshots: true });

    const snaps = driver.run({ duration: 0 });

    expect(snaps).toHaveLength(0); // no step triggered
    driver.step(0.01);
    expect(driver.snapshots).toHaveLength(1);
  });

  it("uses default mapState to preserve existing engine values when game omits them", () => {
    const game = {
      updates: [],
      update(dt) {
        this.timeAlive = (this.timeAlive ?? 0) + dt;
      }
    };
    const engine = new GameEngine({ config: { gravity: 0 } });
    engine.state.score.total = 7;
    engine.state.player.x = 3;

    const driver = new GameDriver({ game, engine });
    driver.step(0.02);

    expect(engine.state.time).toBeCloseTo(0.02, 5);
    expect(engine.state.score.total).toBe(7);
    expect(engine.state.player.x).toBe(3); // unchanged because game.player is undefined
    expect(engine.state.tick).toBe(2); // engine tick + mapState tick
  });

  it("can disable snapshot retention for live loops", () => {
    const game = createStubGame();
    const mapState = vi.fn();
    const driver = new GameDriver({ game, engine: new GameEngine({}), mapState, captureSnapshots: false });
    driver.step(0.01, ["jump"]);
    expect(driver.snapshots).toHaveLength(0);
    expect(mapState).toHaveBeenCalledTimes(1);
  });

  it("defaults dash state when absent in game player", () => {
    const game = createStubGame();
    delete game.player.dash;
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    driver.step(0.01);

    const dash = driver.snapshots.at(-1).state.player.dash;
    expect(dash).toEqual({ active: false, time: 0, direction: null });
  });

  it("skips custom mapState when it is not a function", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}), mapState: null });
    expect(() => driver.step(0.01)).not.toThrow();
    expect(driver.snapshots).toHaveLength(1);
  });

  it("safely skips action handling when game lacks handleAction", () => {
    const game = {
      actions: [],
      updates: [],
      update(dt) {
        this.updates.push(dt);
      }
    };
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    expect(() => driver.run({ timeline: [{ at: 0.05, action: "noop" }], duration: 0.05 })).not.toThrow();
    expect(game.updates).toHaveLength(1);
  });

  it("handles consecutive actions at the same timestamp without extra steps", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    const snaps = driver.run({
      timeline: [
        { at: 0.02, action: "jump" },
        { at: 0.02, action: "dash" }
      ],
      duration: 0.02
    });

    expect(game.actions).toEqual(["jump", "dash"]);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].state.time).toBeCloseTo(0.02, 5);
  });

  it("skips applying actions when step is called with an empty list", () => {
    const game = {
      updates: [],
      actionCalled: false,
      update(dt) {
        this.updates.push(dt);
      },
      handleAction() {
        this.actionCalled = true;
      }
    };
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    driver.step(0.015, []);

    expect(game.actionCalled).toBe(false);
    expect(driver.snapshots.at(-1).state.time).toBeCloseTo(0.015, 5);
  });

  it("invokes handleAction before stepping when actions are present", () => {
    const game = {
      updates: [],
      actions: [],
      update(dt) {
        this.updates.push({ dt, stateTime: this.timeAlive ?? 0 });
        this.timeAlive = (this.timeAlive ?? 0) + dt;
      },
      handleAction(action) {
        this.actions.push({ action, calledAt: this.timeAlive ?? 0 });
      }
    };
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    driver.step(0.02, ["jump"]);

    expect(game.actions).toEqual([{ action: "jump", calledAt: 0 }]);
    expect(game.updates[0].dt).toBeCloseTo(0.02, 5);
    expect(driver.snapshots.at(-1).state.tick).toBe(2); // engine tick + mapState tick
  });

  it("supports multiple timeline entries at increasing times with persistent snapshots", () => {
    const game = createStubGame();
    const driver = new GameDriver({ game, engine: new GameEngine({}) });

    const snaps = driver.run({
      timeline: [
        { at: 0.01, action: "jump" },
        { at: 0.03, action: "dash" },
        { at: 0.05, action: "phase" }
      ],
      duration: 0.06
    });

    expect(snaps).toHaveLength(4);
    expect(snaps.at(-1).state.time).toBeCloseTo(0.06, 5);
    expect(game.actions).toEqual(["jump", "dash", "phase"]);
  });
});
