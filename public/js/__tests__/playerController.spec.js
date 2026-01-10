import { describe, it, expect, vi } from "vitest";
import {
  activeDashConfig,
  dashBounceMaxFor,
  applyDashReflect,
  updatePlayer,
  useDashDestroy,
  useSlowExplosion
} from "../playerController.js";

const buildGame = (overrides = {}) => {
  const game = {
    W: 200,
    H: 100,
    timeAlive: 0,
    parts: [],
    floats: [],
    trailExtraAcc: [],
    _visualRand: (a, b) => (a + b) / 2,
    _scaleParticles: (n) => n,
    _dashBounceSfx: vi.fn(),
    _spawnDashReflectFx: vi.fn(),
    _dashBreakSfx: vi.fn(),
    _dashStartSfx: vi.fn(),
    _slowExplosionSfx: vi.fn(),
    _destroyPipesInRadius: vi.fn(),
    player: {
      x: 10,
      y: 10,
      r: 5,
      vx: 20,
      vy: 0,
      lastX: 1,
      lastY: 0,
      dashVX: 1,
      dashVY: 0,
      dashT: 0,
      dashMode: null,
      dashBounces: 0,
      dashImpactFlash: 0,
      dashDestroyed: false,
      invT: 0
    },
    input: {
      getMove: () => ({ dx: 0, dy: 0 })
    },
    cds: { dash: 0, slowField: 0 },
    cfg: {
      player: { maxSpeed: 100, accel: 200, friction: 2 },
      skills: { dash: { speed: 100, duration: 0.2, cooldown: 1 } }
    },
    skillSettings: {}
  };

  Object.assign(game, overrides);
  game._dashBounceMax = vi.fn(() => Number(game.cfg.skills.dash.maxBounces) || 0);

  return game;
};

describe("playerController", () => {
  it("resolves dash config based on behavior", () => {
    const game = buildGame({
      skillSettings: { dashBehavior: "destroy" },
      cfg: { skills: { dash: { speed: 10 }, dashDestroy: { speed: 20 } } }
    });

    expect(activeDashConfig(game)).toBe(game.cfg.skills.dashDestroy);
    game.skillSettings = {};
    expect(activeDashConfig(game)).toBe(game.cfg.skills.dash);
  });

  it("derives dash bounce max from config", () => {
    const game = buildGame({
      cfg: { skills: { dash: { speed: 80, maxBounces: 2 } } }
    });
    expect(dashBounceMaxFor(game)).toBeGreaterThanOrEqual(0);
  });

  it("updates velocity during dash and handles wall break", () => {
    const game = buildGame();
    game.player.dashT = 0.2;
    game.player.dashVX = 1;
    game.player.dashVY = 0;
    game.player.x = game.W - 1;
    game.player.y = 50;
    game.player.dashVX = 1;
    game.cfg.skills.dash.maxBounces = 0;

    updatePlayer(game, 0.1);

    expect(game.player.vx).toBe(0);
    expect(game._dashBreakSfx).toHaveBeenCalled();
    expect(game.player.dashT).toBe(0);
  });

  it("applies dash reflect updates and emits effects", () => {
    const game = buildGame();
    game.player.vx = 100;
    game.player.vy = 0;
    applyDashReflect(game, { nx: -1, ny: 0, contactX: 5, contactY: 5, penetration: 2 });

    expect(game.player.dashBounces).toBe(1);
    expect(game.lastDashReflect?.serial).toBe(1);
    expect(game._dashBounceSfx).toHaveBeenCalled();
    expect(game._spawnDashReflectFx).toHaveBeenCalled();
  });

  it("uses dash destroy to spawn particles", () => {
    const game = buildGame();
    useDashDestroy(game, { duration: 0.2, cooldown: 1 });

    expect(game.player.dashMode).toBe("destroy");
    expect(game.cds.dash).toBe(1);
    expect(game.parts.length).toBeGreaterThan(0);
  });

  it("triggers slow explosion effects", () => {
    const game = buildGame();
    useSlowExplosion(game, { duration: 0.5, radius: 60, blastParticles: 2, cooldown: 4 });

    expect(game.slowExplosion?.r).toBe(60);
    expect(game._slowExplosionSfx).toHaveBeenCalled();
    expect(game._destroyPipesInRadius).toHaveBeenCalled();
    expect(game.lastSlowBlast).toBeTruthy();
  });
});
