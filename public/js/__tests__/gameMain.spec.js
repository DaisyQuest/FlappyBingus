import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../config.js";
import { setRandSource } from "../util.js";

const makeWindow = (w = 320, h = 240, dpr = 2) => {
  globalThis.window = {
    devicePixelRatio: dpr,
    visualViewport: { width: w, height: h },
    innerWidth: w,
    innerHeight: h,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
};

const baseCanvas = () => {
  const ctx = { setTransform: vi.fn(), imageSmoothingEnabled: false };
  const canvas = { style: {}, width: 0, height: 0, getContext: () => ctx };
  return { canvas, ctx };
};

const cloneCfg = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG));

describe("Game core loop hooks", () => {
  beforeEach(() => {
    setRandSource(() => 0.25);
  });

  afterEach(() => {
    setRandSource(); // reset
    vi.restoreAllMocks();
    delete globalThis.window;
  });

  it("resizes to window dimensions and recomputes player size", async () => {
    makeWindow(300, 200, 2);
    const { canvas, ctx } = baseCanvas();
    const { Game } = await import("../game.js");
    const game = new Game({
      canvas,
      ctx,
      config: cloneCfg(),
      playerImg: { naturalWidth: 10, naturalHeight: 20 },
      input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
      getTrailId: () => "classic",
      getBinds: () => ({}),
      onGameOver: () => {}
    });

    const bgSpy = vi.spyOn(game, "_initBackground").mockImplementation(() => {});
    game.resizeToWindow();

    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(game.W).toBeCloseTo(300);
    expect(game.H).toBeCloseTo(200);
    expect(canvas._logicalW).toBeCloseTo(300);
    expect(canvas._logicalH).toBeCloseTo(200);
    expect(game.player.r).toBeGreaterThan(0);
    expect(bgSpy).toHaveBeenCalled();
  });

  it("resets run state and timers deterministically", async () => {
    makeWindow();
    const { canvas, ctx } = baseCanvas();
    const { Game } = await import("../game.js");
    const cfg = cloneCfg();
    cfg.catalysts.orbs.intervalMin = 1;
    cfg.catalysts.orbs.intervalMax = 3;

    const game = new Game({
      canvas,
      ctx,
      config: cfg,
      playerImg: { naturalWidth: 10, naturalHeight: 10 },
      input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
      getTrailId: () => "classic",
      getBinds: () => ({}),
      onGameOver: () => {}
    });

    game.score = 100;
    game.pipes.push({}); game.gates.push({}); game.orbs.push({});
    game.parts.push({}); game.floats.push({});
    game._gapMeta.set(99, { perfected: true });
    game._resetRun(true);

    expect(game.score).toBe(0);
    expect(game.pipes).toHaveLength(0);
    expect(game.gates).toHaveLength(0);
    expect(game.orbs).toHaveLength(0);
    expect(game._gapMeta.size).toBe(0);
    expect(game._nextGapId).toBe(1);
    expect(game.cds).toEqual({ dash: 0, phase: 0, teleport: 0, slowField: 0 });
    const expectedOrbT = cfg.catalysts.orbs.intervalMin + (cfg.catalysts.orbs.intervalMax - cfg.catalysts.orbs.intervalMin) * 0.25;
    expect(game.orbT).toBeCloseTo(expectedOrbT);
  });

  it("routes actions only while playing", async () => {
    makeWindow();
    const { canvas, ctx } = baseCanvas();
    const { Game } = await import("../game.js");
    const game = new Game({
      canvas,
      ctx,
      config: cloneCfg(),
      playerImg: { naturalWidth: 10, naturalHeight: 10 },
      input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
      getTrailId: () => "classic",
      getBinds: () => ({}),
      onGameOver: () => {}
    });

    const spy = vi.spyOn(game, "_useSkill");
    game.handleAction("dash");
    expect(spy).not.toHaveBeenCalled();

    game.state = 1; // STATE.PLAY
    game.handleAction("dash");
    expect(spy).toHaveBeenCalledWith("dash");
  });

  it("executes dash, phase, and teleport skill flows", async () => {
    makeWindow(200, 200, 1.5);
    const { canvas, ctx } = baseCanvas();
    canvas.width = 100; canvas.height = 100;
    const { Game } = await import("../game.js");
    const cfg = cloneCfg();
    cfg.skills.dash.cooldown = 0.5;
    cfg.skills.phase.cooldown = 0.25;
    cfg.skills.teleport.cooldown = 0.75;
    cfg.skills.teleport.burstParticles = 2;

    const input = {
      getMove: () => ({ dx: 1, dy: 0 }),
      cursor: { has: true, x: 40, y: 60 }
    };

    const game = new Game({
      canvas,
      ctx,
      config: cfg,
      playerImg: { naturalWidth: 20, naturalHeight: 20 },
      input,
      getTrailId: () => "classic",
      getBinds: () => ({}),
      onGameOver: () => {}
    });

    game.W = 200; game.H = 200;
    game.player.x = 50; game.player.y = 50; game.player.r = 10;

    game._useSkill("dash");
    expect(game.cds.dash).toBeCloseTo(cfg.skills.dash.cooldown);
    expect(game.player.dashVX).toBeGreaterThan(0);
    expect(game.parts.length).toBeGreaterThanOrEqual(18);

    game._useSkill("phase");
    expect(game.cds.phase).toBeCloseTo(cfg.skills.phase.cooldown);
    expect(game.player.invT).toBeGreaterThan(0);
    expect(game.floats.some((f) => f.txt === "PHASE")).toBe(true);

    const prevParts = game.parts.length;
    game._useSkill("teleport");
    expect(game.cds.teleport).toBeCloseTo(cfg.skills.teleport.cooldown);
    expect(game.player.x).not.toBe(50);
    expect(game.player.y).not.toBe(50);
    expect(game.parts.length).toBeGreaterThan(prevParts);
    expect(game.floats.some((f) => f.txt === "TELEPORT")).toBe(true);
  });
});
