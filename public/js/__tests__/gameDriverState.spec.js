import { describe, expect, it } from "vitest";
import { mapGameDriverState } from "../gameDriverState.js";

describe("mapGameDriverState", () => {
  it("maps core runtime values from the game into the engine state", () => {
    const engineState = { time: 0, tick: 3, score: { total: 9 }, player: { x: 1, y: 2, vx: 3, vy: 4 } };
    const game = {
      timeAlive: 12.5,
      score: 42,
      player: { x: 10, y: 20, vx: -5, vy: 7 }
    };

    mapGameDriverState(engineState, game);

    expect(engineState.time).toBe(12.5);
    expect(engineState.tick).toBe(4);
    expect(engineState.score).toEqual({ total: 42 });
    expect(engineState.player).toEqual({ x: 10, y: 20, vx: -5, vy: 7 });
  });

  it("preserves existing time but overwrites score/player when game data is missing", () => {
    const engineState = { time: 4, tick: 0, score: { total: 12 }, player: { x: 9, y: 8, vx: 7, vy: 6 } };
    const game = { timeAlive: undefined, score: undefined, player: undefined };

    mapGameDriverState(engineState, game);

    expect(engineState.time).toBe(4);
    expect(engineState.tick).toBe(1);
    expect(engineState.score).toEqual({ total: 0 });
    expect(engineState.player).toEqual({ x: undefined, y: undefined, vx: undefined, vy: undefined });
  });
});
