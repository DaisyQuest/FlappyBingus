import { describe, it, expect, vi } from "vitest";
import {
  applyDashDestroy,
  destroyPipesInRadius,
  handlePipeCollision,
  pipeOverlapsCircle,
  shatterPipe
} from "../collisionSystem.js";

const STATE = { OVER: 2 };

const buildGame = (overrides = {}) => {
  const game = {
    pipes: [],
    parts: [],
    timeAlive: 0,
    player: {
      dashT: 0,
      dashMode: null,
      dashDestroyed: false,
      dashBounces: 0,
      dashImpactFlash: 0,
      invT: 0,
      vx: 10,
      vy: 0
    },
    score: 0,
    state: 0,
    onGameOver: vi.fn(),
    _visualRand: (a, b) => (a + b) / 2,
    _scaleParticles: (n) => n,
    _dashDestroySfx: vi.fn(),
    _dashImpactSlowdown: vi.fn(),
    _recordBrokenPipe: vi.fn(),
    _recordBrokenExplosion: vi.fn(),
    _onGapPipeRemovedWithFlags: vi.fn(),
    _applyDashReflect: vi.fn(),
    _gameOverSfx: vi.fn()
  };

  return { ...game, ...overrides };
};

describe("collisionSystem", () => {
  it("checks pipe overlap with circle", () => {
    expect(pipeOverlapsCircle(null, { x: 0, y: 0, r: 1 })).toBe(false);
    expect(pipeOverlapsCircle({ x: 0, y: 0, w: 10, h: 10 }, { x: 100, y: 100, r: 1 })).toBe(false);
    expect(pipeOverlapsCircle({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, r: 3 })).toBe(true);
  });

  it("shatters pipes and records effects", () => {
    const pipe = { x: 0, y: 0, w: 10, h: 10 };
    const game = buildGame({ pipes: [pipe] });

    const result = shatterPipe(game, pipe, { particles: 1, cause: "dashDestroy" });

    expect(result).toBe(true);
    expect(game.pipes.length).toBe(0);
    expect(game._recordBrokenPipe).toHaveBeenCalledWith(1);
    expect(game.parts.length).toBeGreaterThan(0);
  });

  it("destroys pipes in radius and records broken count", () => {
    const pipe = { x: 0, y: 0, w: 10, h: 10 };
    const game = buildGame({ pipes: [pipe] });

    destroyPipesInRadius(game, { x: 5, y: 5, r: 10, cause: "slowExplosion" });

    expect(game._recordBrokenExplosion).toHaveBeenCalledWith(1);
  });

  it("applies dash destroy state changes", () => {
    const pipe = { x: 0, y: 0, w: 10, h: 10 };
    const game = buildGame({ pipes: [pipe], player: { ...buildGame().player, dashMode: "destroy" } });

    const result = applyDashDestroy(game, { pipe }, { shatterParticles: 1, impactIFrames: 0.2 });

    expect(result).toBe("destroyed");
    expect(game._dashDestroySfx).toHaveBeenCalled();
    expect(game.player.dashDestroyed).toBe(true);
  });

  it("handles pipe collision branches", () => {
    const game = buildGame();
    game.player.dashT = 0.2;
    game.player.dashMode = "ricochet";

    const reflected = handlePipeCollision(game, {}, 2, {}, STATE);
    expect(reflected).toBe("reflected");
    expect(game._applyDashReflect).toHaveBeenCalled();

    const gameOver = handlePipeCollision(buildGame(), {}, 0, {}, STATE);
    expect(gameOver).toBe("over");
  });
});
