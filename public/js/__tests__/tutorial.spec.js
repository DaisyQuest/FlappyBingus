// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tutorial } from "../tutorial.js";
import { Game } from "../game.js";
import { DEFAULT_CONFIG } from "../config.js";

beforeEach(() => {
  vi.spyOn(Game.prototype, "_initBackground").mockImplementation(() => {});
  vi.spyOn(Game.prototype, "_refreshBackgroundLayer").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const setupGame = () => {
  globalThis.window = {
    devicePixelRatio: 1,
    visualViewport: { width: 800, height: 600 },
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const gradient = { addColorStop: () => {} };
  const ctx = {
    setTransform: () => {},
    imageSmoothingEnabled: false,
    beginPath: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    moveTo: () => {},
    lineTo: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {}
  };
  const canvas = { style: {}, width: 800, height: 600, getContext: () => ctx };
  const game = new Game({
    canvas,
    ctx,
    config: structuredClone(DEFAULT_CONFIG),
    playerImg: { naturalWidth: 10, naturalHeight: 10 },
    input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
    getTrailId: () => "classic",
    getBinds: () => ({}),
    onGameOver: () => {}
  });
  game.resizeToWindow();
  return game;
};

describe("Tutorial skill variants", () => {
  it("teaches destroy dash and advances after a shatter", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();
    const idx = tutorial._steps().findIndex((s) => s.id === "dash_destroy");
    tutorial._enterStep(idx);

    expect(game.skillSettings.dashBehavior).toBe("destroy");
    expect(tutorial.allowAction("dash")).toBe(true);

    const spy = vi.spyOn(tutorial, "_nextStep");
    game.lastPipeShatter = { cause: "dashDestroy" };
    tutorial._stepDashDestroy(0.5);
    tutorial._stepDashDestroy(0.5);
    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("teaches explosive slow field clearing clusters", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();
    const idx = tutorial._steps().findIndex((s) => s.id === "slow_explosion");
    tutorial._enterStep(idx);

    expect(game.skillSettings.slowFieldBehavior).toBe("explosion");
    const spy = vi.spyOn(tutorial, "_nextStep");
    tutorial._slowExplosionCleared = true;
    tutorial._surviveT = 0.2;
    tutorial._stepSlowExplosion(0.25);
    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("forces ricochet dash during the bounce lesson even if the player prefers destroy", () => {
    const game = setupGame();
    game.setSkillSettings({ dashBehavior: "destroy", slowFieldBehavior: "slow" });
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    expect(game.skillSettings.dashBehavior).toBe("ricochet");

    tutorial._nextStep(); // moves into dash_destroy
    expect(game.skillSettings.dashBehavior).toBe("destroy");
    tutorial.stop();
  });

  it("treats cleared destroy-dash pipes as progress to avoid soft locks", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const destroyIdx = tutorial._steps().findIndex((s) => s.id === "dash_destroy");
    tutorial._enterStep(destroyIdx);

    // Simulate the pipe disappearing (e.g., cleanup) before a shatter event.
    const spy = vi.spyOn(tutorial, "_nextStep");
    game.pipes.length = 0;
    tutorial._stepDashDestroy(0.4);
    tutorial._stepDashDestroy(0.6);

    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("enforces the slow-field variant even if the player prefers explosions", () => {
    const game = setupGame();
    game.setSkillSettings({ slowFieldBehavior: "explosion" });
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const slowIdx = tutorial._steps().findIndex((s) => s.id === "skill_slow");
    tutorial._enterStep(slowIdx);

    expect(game.skillSettings.slowFieldBehavior).toBe("slow");

    const explosionIdx = tutorial._steps().findIndex((s) => s.id === "slow_explosion");
    tutorial._enterStep(explosionIdx);
    expect(game.skillSettings.slowFieldBehavior).toBe("explosion");
    tutorial.stop();
  });

  it("boosts movement speed during the WASD step and restores it afterwards", () => {
    const game = setupGame();
    const origSpeed = game.cfg.player.maxSpeed;
    const origAccel = game.cfg.player.accel;
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start(); // lands on move

    expect(game.cfg.player.maxSpeed).toBeGreaterThan(origSpeed);
    expect(game.cfg.player.accel).toBeGreaterThan(origAccel);

    tutorial._enterStep(1); // move -> orbs
    expect(game.cfg.player.maxSpeed).toBe(origSpeed);
    expect(game.cfg.player.accel).toBe(origAccel);
    tutorial.stop();
  });

  it("spawns a stationary 90° corner for the bounce lesson", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    expect(tutorial._reflectWalls).toHaveLength(2);
    const horiz = tutorial._reflectWalls.find(({ pipe }) => pipe.w > pipe.h)?.pipe;
    const vert = tutorial._reflectWalls.find(({ pipe }) => pipe.h > pipe.w)?.pipe;
    expect(horiz?.vy).toBe(0);
    expect(vert?.vx).toBe(0);
    expect(vert?.x).toBeCloseTo((horiz?.x || 0) + (horiz?.w || 0) - (vert?.w || 0));
    expect(vert?.y).toBeCloseTo(horiz?.y || 0);
    tutorial.stop();
  });

  it("advances only after two unique wall bounces during the same dash", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    const first = tutorial._reflectWalls[0].pipe;
    const second = tutorial._reflectWalls[1].pipe;
    const bounce = (pipe, serial, count) => {
      tutorial.game.lastDashReflect = { x: pipe.x + pipe.w * 0.5, y: pipe.y + pipe.h * 0.5, serial, count };
      tutorial._stepDashReflect(0.016);
    };

    const spy = vi.spyOn(tutorial, "_nextStep");
    bounce(first, 1, 1);
    expect(tutorial._reflectHitsThisDash).toBe(1);
    expect(tutorial._reflectSuccessDelay).toBe(0);

    bounce(second, 2, 2);
    expect(tutorial._reflectHitsThisDash).toBe(2);
    expect(tutorial._reflectSuccessDelay).toBeGreaterThan(0);
    tutorial._stepDashReflect(1.0);
    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("resets bounce tracking when a new dash starts", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    const first = tutorial._reflectWalls[0].pipe;
    const bounce = (pipe, serial, count) => {
      tutorial.game.lastDashReflect = { x: pipe.x + pipe.w * 0.5, y: pipe.y + pipe.h * 0.5, serial, count };
      tutorial._stepDashReflect(0.016);
    };

    bounce(first, 1, 1);
    expect(tutorial._reflectHitsThisDash).toBe(1);

    // New dash = bounce count resets to 1, which should clear prior hits.
    bounce(first, 2, 1);
    expect(tutorial._reflectHitsThisDash).toBe(1);
    expect(tutorial._reflectWallsHit.size).toBe(1);
    expect(tutorial._reflectSuccessDelay).toBe(0);
    tutorial.stop();
  });
});
