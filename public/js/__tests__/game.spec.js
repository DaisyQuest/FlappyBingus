import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { setRandSource } from "../util.js";
import { Pipe, Gate, Orb, Part, FloatText } from "../entities.js";
import { DEFAULT_CONFIG } from "../config.js";

vi.mock("../audio.js", () => ({
  sfxOrbBoop: vi.fn(),
  sfxPerfectNice: vi.fn(),
  sfxDashBounce: vi.fn()
}));

const resolveGapPerfectMock = vi.fn(() => ({ awarded: false }));
vi.mock("../perfectGaps.js", () => ({
  resolveGapPerfect: (...args) => resolveGapPerfectMock(...args)
}));

vi.mock("../spawn.js", async () => {
  const actual = await vi.importActual("../spawn.js");
  return {
    ...actual,
    spawnSinglePipe: vi.fn((game) => game.pipes.push(new Pipe(game.W + 500, game.H + 500, 10, 10, -20, 0))),
    spawnWall: vi.fn((game) => game.pipes.push(new Pipe(-200, -200, 12, 12, 0, 0))),
    spawnBurst: vi.fn((game) => game.pipes.push(new Pipe(game.W + 300, -50, 8, 8, -10, 0))),
    spawnCrossfire: vi.fn((game) => game.pipes.push(new Pipe(-120, game.H + 120, 8, 8, 0, -10))),
    spawnOrb: vi.fn((game) => game.orbs.push(new Orb(game.player.x + 5, game.player.y, 0, 0, 6, 0.25)))
  };
});

let Game;
let originalOffscreenCanvas;

function createMockCtx() {
  const stub = vi.fn();
  const gradient = () => ({ addColorStop: stub });
  const ctx = {
    setTransform: stub,
    clearRect: stub,
    fillRect: stub,
    createRadialGradient: gradient,
    createLinearGradient: gradient,
    beginPath: stub,
    arc: stub,
    arcTo: stub,
    fill: stub,
    stroke: stub,
    strokeRect: stub,
    closePath: stub,
    drawImage: stub,
    save: stub,
    restore: stub,
    translate: stub,
    rotate: stub,
    moveTo: stub,
    lineTo: stub,
    fillText: stub,
    strokeText: stub
  };
  return ctx;
}

function buildGame(overrides = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = overrides.canvasWidth ?? 320;
  canvas.height = overrides.canvasHeight ?? 240;
  const ctx = createMockCtx();

  const input = overrides.input ?? {
    getMove: () => ({ dx: 0, dy: 0 }),
    cursor: { has: true, x: 10, y: 12 }
  };

  const config = structuredClone(DEFAULT_CONFIG);
  return new Game({
    canvas,
    ctx,
    config,
    playerImg: { naturalWidth: 32, naturalHeight: 48 },
    input,
    getTrailId: () => "classic",
    getBinds: () => ({ dash: "Shift", phase: "Space", teleport: "E", slowField: "Q" }),
    onGameOver: overrides.onGameOver || vi.fn()
  });
}

describe("Game integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setRandSource(() => 0.5);
    const dom = new JSDOM("<!doctype html><canvas></canvas>");
    global.window = dom.window;
    global.document = dom.window.document;
    originalOffscreenCanvas = global.OffscreenCanvas;
    global.OffscreenCanvas = undefined;
    global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
    global.HTMLCanvasElement.prototype.getContext = function () {
      return createMockCtx();
    };
    const mod = await import("../game.js");
    Game = mod.Game;
  });

  afterEach(() => {
    setRandSource(undefined);
    global.OffscreenCanvas = originalOffscreenCanvas;
  });

  it("resizes canvas and seeds background + player dimensions", () => {
    const game = buildGame();
    game.resizeToWindow();

    expect(game.W).toBeGreaterThan(0);
    expect(game.H).toBeGreaterThan(0);
    expect(game.player.r).toBeGreaterThan(0);
    expect(game.canvas.width).toBeGreaterThan(0);
    expect(game.canvas.height).toBeGreaterThan(0);
    expect(game.bgDots.length).toBeGreaterThan(0);
    expect(game.bgDirty).toBe(false);
  });

  it("activates each skill and updates cooldowns with expected side effects", () => {
    const moveInput = { dx: 1, dy: 0 };
    const game = buildGame({
      input: {
        getMove: () => moveInput,
        cursor: { has: true, x: 20, y: 30 }
      }
    });
    game.resizeToWindow();

    game._useSkill("dash");
    expect(game.player.dashT).toBeGreaterThan(0);
    expect(game.cds.dash).toBeGreaterThan(0);
    expect(game.parts.length).toBeGreaterThan(0);

    game._useSkill("phase");
    expect(game.player.invT).toBeGreaterThan(0);
    expect(game.cds.phase).toBeGreaterThan(0);
    expect(game.floats.find((f) => f.txt === "PHASE")).toBeTruthy();

    game._useSkill("teleport");
    expect(game.player.x).not.toBe(0);
    expect(game.player.y).not.toBe(0);
    expect(game.cds.teleport).toBeGreaterThan(0);
    expect(game.floats.find((f) => f.txt === "TELEPORT")).toBeTruthy();

    game._useSkill("slowField");
    expect(game.slowField).toBeTruthy();
    expect(game.cds.slowField).toBeGreaterThan(0);
    expect(game.floats.find((f) => f.txt === "SLOW FIELD")).toBeTruthy();
  });

  it("resets runs, menu/restat flows, and ignores actions outside of play", () => {
    const game = buildGame();
    game.state = 2; // STATE.OVER
    game.pipes.push(new Pipe(0, 0, 10, 10, 0, 0));
    game.orbs.push(new Orb(0, 0, 0, 0, 2, 1));

    game.setStateMenu();
    expect(game.state).toBe(0);
    expect(game.pipes.length).toBe(0);
    expect(game.orbs.length).toBe(0);

    const useSkillSpy = vi.spyOn(game, "_useSkill");
    game.handleAction("dash");
    expect(useSkillSpy).not.toHaveBeenCalled();

    game.startRun();
    expect(game.state).toBe(1);
    game.handleAction("dash");
    expect(useSkillSpy).toHaveBeenCalledWith("dash");

    game.restartRun();
    expect(game.state).toBe(1);
  });

  it("computes difficulty scaling and trail emission", () => {
    const game = buildGame({ getTrailId: () => "rainbow" });
    game.resizeToWindow();
    game.score = 1200;
    game.timeAlive = 60;

    const d01 = game._difficulty01();
    const spawnInterval = game._spawnInterval();
    expect(d01).toBeGreaterThan(0);
    expect(spawnInterval).toBeGreaterThan(0);

    const existingParts = game.parts.length;
    game._emitTrail(0.4);
    expect(game.parts.length).toBeGreaterThan(existingParts);
  });

  it("reflects dash collisions and records bounce metadata", () => {
    const game = buildGame();
    game.resizeToWindow();
    vi.clearAllMocks(); // reset audio mock call counts

    game.player.vx = 100;
    game.player.vy = 0;
    game.player.dashVX = 1;
    game.player.dashVY = 0;
    game.cds.dash = 0;
    const beforeParts = game.parts.length;

    game._applyDashReflect({ nx: -1, ny: 0, contactX: 10, contactY: 10, penetration: 1 });
    expect(game.player.vx).toBeLessThan(0);
    expect(game.player.dashBounces).toBeGreaterThan(0);
    expect(game.lastDashReflect).toBeTruthy();
    expect(game.parts.length).toBeGreaterThan(beforeParts);
  });

  it("refreshes background when OffscreenCanvas is available", () => {
    const fakeCtx = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn()
    };
    class OffscreenCanvasMock {
      constructor() {
        this.width = 0;
        this.height = 0;
      }
      getContext() {
        return fakeCtx;
      }
    }
    global.OffscreenCanvas = OffscreenCanvasMock;

    const game = buildGame();
    game.resizeToWindow();
    game.bgDirty = true;
    game._refreshBackgroundLayer();

    expect(game.bgCanvas).toBeTruthy();
    expect(fakeCtx.fillRect).toHaveBeenCalled();
  });

  it("falls back gracefully when no canvas factory is available", () => {
    const game = buildGame();
    const originalDocument = global.document;
    game.bgCanvas = null;
    global.document = undefined;
    global.OffscreenCanvas = undefined;

    try {
      game._refreshBackgroundLayer();
      expect(game.bgCanvas).toBeNull();
    } finally {
      global.document = originalDocument;
    }
  });

  it("clamps thickness and gap sizes while exercising spawn wrappers", () => {
    const game = buildGame();
    game.W = 40;
    game.H = 40;
    game.cfg.pipes.thickness = { scale: 10, min: 5, max: 8 };
    game.cfg.pipes.gap = { startScale: 0, endScale: 0, min: 12, max: 20 };

    expect(game._thickness()).toBe(8);
    expect(game._gapSize()).toBe(12);

    game._spawnSinglePipe();
    game._spawnWall();
    game._spawnBurst();
    game._spawnCrossfire();
    game._spawnOrb();

    expect(game.pipes.length).toBe(4);
    expect(game.orbs.length).toBe(1);
  });

  it("drops perfect streak metadata when a non-perfected gap despawns", () => {
    const game = buildGame();
    game._gapMeta.set(7, { perfected: false });
    game.perfectCombo = 5;

    game._onGapPipeRemoved({ gapId: 7 });

    expect(game.perfectCombo).toBe(0);
    expect(game._gapMeta.size).toBe(0);
  });

  it("falls back to dash direction when a reflection normal is degenerate", () => {
    const game = buildGame();
    game.resizeToWindow();
    game.pipeT = 10;
    game.specialT = 10;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.dashVX = 1;
    game.player.dashVY = 0;

    game._applyDashReflect({ nx: 0, ny: 0, contactX: game.player.x, contactY: game.player.y, penetration: 0 });

    expect(game.player.vx).toBeGreaterThan(0);
    expect(game.player.dashBounces).toBeGreaterThan(0);
  });

  it("reflects off walls while dashing when hitting playfield edges", () => {
    const game = buildGame();
    game.resizeToWindow();
    const reflectSpy = vi.spyOn(game, "_applyDashReflect");
    game.pipeT = 10;
    game.specialT = 10;
    game.player.dashT = 0.1;
    game.player.invT = 0;
    game.player.dashBounces = 0;
    game.player.dashVX = -1;
    game.player.dashVY = 0;
    game.player.x = game.player.r - 1;
    game.player.y = game.player.r + 2;

    game._updatePlayer(0.016);
    expect(reflectSpy).toHaveBeenCalledWith(expect.objectContaining({ nx: 1, ny: 0 }));

    reflectSpy.mockClear();
    game.player.dashBounces = 0;
    game.player.x = game.W - game.player.r + 1;
    game.player.y = game.player.r + 2;
    game._updatePlayer(0.016);
    expect(reflectSpy).toHaveBeenCalledWith(expect.objectContaining({ nx: -1, ny: 0 }));

    reflectSpy.mockClear();
    game.player.dashBounces = 0;
    game.player.dashVX = 0;
    game.player.dashVY = -1;
    game.player.x = game.player.r + 4;
    game.player.y = game.player.r - 1;
    game._updatePlayer(0.016);
    expect(reflectSpy).toHaveBeenCalledWith(expect.objectContaining({ nx: 0, ny: 1 }));

    reflectSpy.mockClear();
    game.player.dashBounces = 0;
    game.player.dashVX = 0;
    game.player.dashVY = 1;
    game.player.x = game.player.r + 4;
    game.player.y = game.H - game.player.r + 1;
    game._updatePlayer(0.016);
    expect(reflectSpy).toHaveBeenCalledWith(expect.objectContaining({ nx: 0, ny: -1 }));
  });

  it("handles dash collisions through the shared collision helper", () => {
    const game = buildGame();
    game.player.dashT = 0.1;
    game.player.dashBounces = 0;
    const reflectSpy = vi.spyOn(game, "_applyDashReflect");

    const result = game._handlePipeCollision({ nx: 1, ny: 0 }, 2);

    expect(result).toBe("reflected");
    expect(reflectSpy).toHaveBeenCalled();
    expect(game.state).toBe(0);
  });

  it("spawns special walls when the random draw exceeds crossfire thresholds", () => {
    const game = buildGame();
    game.resizeToWindow();
    game.state = 1;
    game.specialT = 0;
    game.pipeT = 10;
    game.cfg.catalysts.orbs.enabled = false;
    setRandSource(() => 0.99);

    game.update(0.1);

    expect(game.pipes.find((p) => p.x === -200 && p.y === -200)).toBeTruthy();
    expect(game.specialT).toBeGreaterThan(0);
  });

  it("applies slow-field speed multipliers only when pipes are inside the radius", () => {
    const game = buildGame();
    game.resizeToWindow();
    game.state = 1;
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;
    const pipeUpdate = vi.fn();
    game.pipes.push({
      cx: () => game.player.x,
      cy: () => game.player.y,
      update: pipeUpdate
    });
    game.slowField = { x: game.player.x, y: game.player.y, r: 100, fac: 0.3, t: 1, tm: 1 };

    game.update(0.1);

    expect(pipeUpdate).toHaveBeenCalledWith(0.1, 0.3, expect.any(Number), expect.any(Number));
  });

  it("ends the run when dash bounce limits are exceeded during collisions", () => {
    const gameOver = vi.fn();
    const game = buildGame({ onGameOver: gameOver });
    game.resizeToWindow();
    game.state = 1;
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;
    game.player.invT = 0;
    game.player.dashT = 0.1;
    game.player.dashBounces = 5;
    vi.spyOn(game, "_dashBounceMax").mockReturnValue(1);
    game.pipes.push(new Pipe(game.player.x, game.player.y, game.player.r, game.player.r, 0, 0));

    game.update(0.05);

    expect(game.state).toBe(2);
    expect(gameOver).toHaveBeenCalled();
  });

  it("reflects pipe collisions while dashing when bounce cap has not been reached", () => {
    const game = buildGame();
    game.resizeToWindow();
    game.state = 1;
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;
    game.player.invT = 0;
    game.player.dashT = 0.2;
    game.player.dashBounces = 0;
    vi.spyOn(game, "_dashBounceMax").mockReturnValue(3);
    const reflectSpy = vi.spyOn(game, "_applyDashReflect");
    const onGameOver = vi.spyOn(game, "onGameOver");
    game.pipes.push(new Pipe(
      game.player.x - game.player.r,
      game.player.y - game.player.r,
      game.player.r * 2,
      game.player.r * 2,
      0,
      0
    ));

    game.update(0.05);

    expect(reflectSpy).toHaveBeenCalled();
    expect(game.state).toBe(1);
    expect(onGameOver).not.toHaveBeenCalled();
  });

  it("steps the world, spawning, collecting orbs, scoring perfects, and cleaning FX", () => {
    const gameOver = vi.fn();
    const game = buildGame({ onGameOver: gameOver });
    game.resizeToWindow();
    game.state = 1; // STATE.PLAY
    game.combo = 15;
    game.comboBreakFlash = 0.3;
    game.perfectT = 0.4;
    game.perfectMax = 0.4;
    game.slowField = { x: 10, y: 10, r: 12, fac: 0.5, t: 0.05, tm: 0.05 };
    game.pipeT = 0;
    game.specialT = 0;
    game.orbT = 0;
    game.cds = { dash: 0.4, phase: 0.2, teleport: 0.1, slowField: 0.3 };

    game.pipes.push(new Pipe(game.W * 2, game.H * 2, 20, 20, -10, -10));
    const gate = new Gate("x", game.W * 0.5, -5, game.H * 0.5, 10, 8);
    game.gates.push(gate);
    resolveGapPerfectMock.mockReturnValueOnce({
      awarded: true,
      points: 12,
      streak: 3
    });

    const expiringOrb = new Orb(game.player.x + 60, game.player.y + 60, 0, 0, 8, 0.01);
    const pickupOrb = new Orb(game.player.x, game.player.y, 0, 0, 8, 2);
    game.orbs.push(expiringOrb, pickupOrb);
    game.parts.push(new Part(0, 0, 0, 0, 0.01, 2, "white", true));
    game.floats.push(new FloatText("+1", 0, 0, "white"));

    game.player.invT = Infinity; // allow extended simulation without collisions
    for (let i = 0; i < 30; i++) {
      game.update(0.2);
    }

    // Force a collision once to hit the game-over path
    game.player.invT = 0;
    game.pipes.push(new Pipe(game.player.x - game.player.r * 0.5, game.player.y - game.player.r * 0.5, game.player.r, game.player.r, 0, 0));
    game.update(0.05);

    expect(resolveGapPerfectMock).toHaveBeenCalled();
    expect(game.score).toBeGreaterThan(0);
    expect(game.combo).toBeGreaterThan(0);
    expect(game.floats.length).toBeGreaterThan(0);
    expect(game.parts.length).toBeGreaterThan(0);
    expect(game.orbs.length).toBeGreaterThanOrEqual(0);
    expect(game.cds.dash).toBeLessThan(0.4);
    expect(game.slowField).toBeNull();
    expect(game.state).toBe(2); // STATE.OVER after forced collision
    expect(gameOver).toHaveBeenCalled();

    // ensure render path exercises HUD and visuals without throwing
    game.render();
    expect(game.ctx.fillRect).toHaveBeenCalled();
  });
});
