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
});
