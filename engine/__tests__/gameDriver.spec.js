import { describe, expect, it, vi } from "vitest";
import { GameDriver } from "../gameDriver.js";
import { GameEngine } from "../gameEngine.js";

function createStubGame() {
  return {
    updates: [],
    actions: [],
    update(dt) {
      this.updates.push(dt);
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
});
