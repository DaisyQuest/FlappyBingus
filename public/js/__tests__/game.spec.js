// @vitest-environment jsdom
import { describe, it, beforeAll, beforeEach, afterEach, expect, vi } from "vitest";
import { Game } from "../game.js";
import { DEFAULT_CONFIG } from "../config.js";
import { setRandSource } from "../util.js";
import * as pipeColors from "../pipeColors.js";
import * as perfectGaps from "../perfectGaps.js";
import * as mechanics from "../mechanics.js";
import * as spawn from "../spawn.js";
import { ACTIONS } from "../keybinds.js";

vi.mock("../audio.js", () => ({
  sfxOrbBoop: vi.fn(),
  sfxPerfectNice: vi.fn(),
  sfxDashBounce: vi.fn()
}));

const mockCtx = () => {
  const gradient = { addColorStop: vi.fn() };
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    imageSmoothingEnabled: true,
    get globalAlpha() { return this._ga || 0; },
    set globalAlpha(v) { this._ga = v; },
    get fillStyle() { return this._fs; },
    set fillStyle(v) { this._fs = v; },
    get strokeStyle() { return this._ss; },
    set strokeStyle(v) { this._ss = v; },
    get shadowColor() { return this._sc; },
    set shadowColor(v) { this._sc = v; },
    get shadowBlur() { return this._sb; },
    set shadowBlur(v) { this._sb = v; },
    get shadowOffsetY() { return this._soy; },
    set shadowOffsetY(v) { this._soy = v; },
    get lineWidth() { return this._lw; },
    set lineWidth(v) { this._lw = v; }
  };
};

const cloneConfig = (overrides = {}) => {
  const base = structuredClone(DEFAULT_CONFIG);
  const merge = (target, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        target[k] = merge(target[k] ?? {}, v);
      } else {
        target[k] = v;
      }
    }
    return target;
  };
  return merge(base, overrides);
};

const makeInput = (moveRef = { dx: 0, dy: 0 }) => ({
  cursor: { has: true, x: 10, y: 12 },
  getMove: vi.fn(() => moveRef)
});

const makeCanvas = (ctx) => ({ style: {}, width: 0, height: 0, getContext: vi.fn(() => ctx) });

const buildGameWith = (GameClass, configOverrides = {}, moveRef = { dx: 0, dy: 0 }) => {
  const { onGameOver, ...cfgOverrides } = configOverrides || {};
  const ctx = mockCtx();
  const canvas = makeCanvas(ctx);
  const config = cloneConfig(cfgOverrides);
  const playerImg = { naturalWidth: 64, naturalHeight: 32 };
  const input = makeInput(moveRef);
  const binds = { getTrailId: () => "classic", getBinds: () => ({}) };
  return {
    game: new GameClass({ canvas, ctx, config, playerImg, input, onGameOver, ...binds }),
    ctx,
    canvas,
    input,
    moveRef
  };
};

const buildGame = (configOverrides = {}, moveRef = { dx: 0, dy: 0 }) =>
  buildGameWith(Game, configOverrides, moveRef);


const pipeStub = (opts = {}) => {
  const { x = 1000, y = 1000, w = 10, h = 10, off = false } = opts;
  return {
    x, y, w, h, vx: 0, vy: 0, entered: true, gapId: opts.gapId,
    update: vi.fn(),
    off: vi.fn(() => off),
    cx: () => x + w * 0.5,
    cy: () => y + h * 0.5
  };
};

const gateStub = (opts = {}) => {
  const { axis = "x", pos = 5, off = false } = opts;
  return {
    axis,
    pos,
    prev: pos - 1,
    v: 0,
    gapCenter: 4,
    gapHalf: 2,
    thick: 2,
    entered: true,
    perfected: false,
    cleared: false,
    gapId: opts.gapId,
    update: vi.fn(),
    crossed: vi.fn(() => true),
    off: vi.fn(() => off)
  };
};

beforeAll(() => {
  globalThis.OffscreenCanvas = class {
    constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return mockCtx(); }
  };
});

beforeEach(() => {
  Object.defineProperty(window, "visualViewport", { value: { width: 320, height: 200 }, writable: true });
  Object.defineProperty(window, "devicePixelRatio", { value: 2, writable: true });
  setRandSource(() => 0.25);
});

afterEach(() => {
  vi.restoreAllMocks();
  setRandSource(() => Math.random());
});

describe("Game core utilities", () => {
  it("resizes canvas, recomputes player size, and initializes background layers", () => {
    const { game, canvas } = buildGame();
    game.resizeToWindow();

    expect(canvas.style.width).toBe("320px");
    expect(canvas.style.height).toBe("200px");
    expect(game.W).toBeGreaterThan(0);
    expect(game.H).toBeGreaterThan(0);
    expect(game.player.r).toBeGreaterThan(0);
    expect(game.bgCanvas).toBeTruthy();
    expect(game.bgDirty).toBe(false);
    expect(game.bgDots.length).toBeGreaterThan(0);

    const previousCtx = game.bgCtx;
    game.W += 1;
    game._refreshBackgroundLayer();
    expect(game.bgCtx).not.toBeNull();
    expect(game.bgCtx).not.toBe(previousCtx);
  });

  it("toggles audio and guards SFX triggers", async () => {
    const audio = await import("../audio.js");
    const { game } = buildGame();
    game.combo = 3;

    game.setAudioEnabled(false);
    game._orbPickupSfx();
    expect(audio.sfxOrbBoop).not.toHaveBeenCalled();

    game.setAudioEnabled(true);
    game._orbPickupSfx();
    expect(audio.sfxOrbBoop).toHaveBeenCalledWith(3);

    game._perfectNiceSfx();
    expect(audio.sfxPerfectNice).toHaveBeenCalledTimes(1);

    game.setAudioEnabled(false);
    game._perfectNiceSfx();
    expect(audio.sfxPerfectNice).toHaveBeenCalledTimes(1);
  });

  it("handles state transitions and run resets", () => {
    const { game } = buildGame();
    const useSkill = vi.spyOn(game, "_useSkill");

    game.score = 9;
    game.combo = 2;
    game.setStateMenu();
    expect(game.state).toBe(0);
    expect(game.score).toBe(9);
    expect(game.combo).toBe(0);

    game.score = 14;
    game.startRun();
    expect(game.state).toBe(1);
    expect(game.score).toBe(0);
    expect(game.pipes.length).toBe(0);

    game.score = 3;
    game.restartRun();
    expect(game.state).toBe(1);
    expect(game.score).toBe(0);

    game.state = 0;
    game.handleAction("dash");
    expect(useSkill).not.toHaveBeenCalled();

    game.state = 1;
    game.handleAction("dash");
    expect(useSkill).toHaveBeenCalledWith("dash");
  });

  it("computes helper metrics and wrappers", () => {
    const { game } = buildGame();
    game.W = 800; game.H = 400;
    game.player.x = 10; game.player.y = 5; game.player.r = 30;

    expect(game._margin()).toBe(110);
    game.W = 2000; game.H = 2000;
    expect(game._margin()).toBe(240);

    expect(game._isVisibleRect(0, 0, 10, 10)).toBe(true);
    expect(game._isVisibleRect(-1000, -1000, 2, 2)).toBe(false);

    const anchor = game._scorePopupAnchor();
    expect(anchor.x).toBeGreaterThan(0);
    expect(anchor.y).toBeGreaterThan(0);

    game.timeAlive = 5000;
    game.score = 5000;
    const diff = game._difficulty01();
    expect(diff).toBeGreaterThan(0.9);
    const dSpy = vi.spyOn(game, "_difficulty01").mockReturnValue(0.5);
    expect(game._spawnInterval()).toBeCloseTo(0.505, 3);
    expect(game._pipeSpeed()).toBeCloseTo((game.cfg.pipes.speed.start + game.cfg.pipes.speed.end) * 0.5);
    expect(game._gapSize()).toBeGreaterThan(0);
    expect(game._thickness()).toBeGreaterThan(0);
    dSpy.mockReturnValue(0.75);
    const colorSpy = vi.spyOn(pipeColors, "computePipeColor");
    game._pipeColor();
    expect(colorSpy).toHaveBeenCalled();

    expect(game._orbPoints(4)).toBe(mechanics.orbPoints(game.cfg, 4));
  });

  it("breaks combo, gap metadata, and cooldown helpers", () => {
    const { game } = buildGame();
    expect(game.cds.dash).toBe(0);

    game.combo = 2;
    game._breakCombo(1, 1);
    expect(game.combo).toBe(0);
    expect(game.floats.length).toBe(1);
    expect(game.comboBreakFlash).toBeGreaterThan(0);

    game._breakCombo(1, 1);
    expect(game.floats.length).toBe(1);

    game.perfectCombo = 5;
    const pipe = pipeStub({ gapId: 1 });
    game._gapMeta.set(1, { perfected: false });
    game._onGapPipeRemoved(pipe);
    expect(game.perfectCombo).toBe(0);
    expect(game._gapMeta.size).toBe(0);

    game._gapMeta.set(2, { perfected: true });
    game._onGapPipeRemoved(pipeStub({ gapId: 2 }));
    expect(game.perfectCombo).toBe(0);
    expect(game._gapMeta.size).toBe(0);

    game.cds = { dash: 1, phase: 2, teleport: 3, slowField: 4 };
    game._tickCooldowns(0.5);
    expect(game.cds).toEqual(mechanics.tickCooldowns({ dash: 1, phase: 2, teleport: 3, slowField: 4 }, 0.5));
  });
});

describe("Dash interactions", () => {
  it("plays bounce SFX and spawns reflect FX", async () => {
    const audio = await import("../audio.js");
    const { game } = buildGame();
    game.setAudioEnabled(true);

    const start = game.parts.length;
    game._spawnDashReflectFx(5, 6, 1, 0, 1);
    expect(game.parts.length).toBe(start + 17);
    expect(audio.sfxDashBounce).not.toHaveBeenCalled();

    game._dashBounceSfx(300);
    expect(audio.sfxDashBounce).toHaveBeenCalledWith(300);
    game.setAudioEnabled(false);
    game._dashBounceSfx(1);
    expect(audio.sfxDashBounce).toHaveBeenCalledTimes(1);
  });

  it("applies dash reflections including zero-normal fallback", () => {
    const { game } = buildGame({ skills: { dash: { speed: 100, maxBounces: 3 } } });
    game.W = 200; game.H = 120;
    game.player.x = 50; game.player.y = 60;
    game.player.vx = 10; game.player.vy = 0;
    game.player.dashVX = 1; game.player.dashVY = 0;
    game._applyDashReflect({ nx: 1, ny: 0, contactX: 10, contactY: 5, penetration: 2 });

    expect(game.player.dashBounces).toBe(1);
    expect(game.lastDashReflect).toMatchObject({ count: 1, serial: 1 });
    expect(game.player.vx).toBeLessThan(0);

    const prevSerial = game.lastDashReflect.serial;
    game.player.vx = 0; game.player.vy = 0;
    game.player.dashVX = 0; game.player.dashVY = -1;
    game._applyDashReflect({ nx: 0, ny: 0, contactX: 20, contactY: 20, penetration: 0 });
    expect(game.lastDashReflect.serial).toBe(prevSerial + 1);
    expect(Math.hypot(game.player.vx, game.player.vy)).toBeGreaterThan(0);
  });
});

describe("Skill usage", () => {
  it("skips missing or cooling skills and executes all branches", () => {
    const move = { dx: 1, dy: 0 };
    const { game } = buildGame({}, move);

    game._useSkill("unknown");
    expect(game.cds.dash).toBe(0);

    game.cds.dash = 1;
    game._useSkill("dash");
    expect(game.player.dashT).toBe(0);

    game.cds.dash = 0;
    game._useSkill("dash");
    expect(game.player.dashT).toBeGreaterThan(0);
    expect(game.cds.dash).toBeGreaterThan(0);
    expect(game.parts.length).toBeGreaterThanOrEqual(18);

    game.player.invT = 0;
    game._useSkill("phase");
    expect(game.player.invT).toBeGreaterThan(0);
    expect(game.floats.some((f) => f.txt === "PHASE")).toBe(true);

    game.input.cursor.has = false;
    game._useSkill("teleport");
    const beforeTeleports = game.parts.length;
    game.input.cursor = { has: true, x: 5, y: 5 };
    game.canvas.width = 100; game.canvas.height = 100; game.player.r = 6;
    game._useSkill("teleport");
    expect(game.parts.length).toBeGreaterThan(beforeTeleports);
    expect(game.player.x).toBeGreaterThan(0);
    expect(game.player.y).toBeGreaterThan(0);
    expect(game.floats.some((f) => f.txt === "TELEPORT")).toBe(true);

    game._useSkill("slowField");
    expect(game.slowField).toBeTruthy();
    expect(game.floats.some((f) => f.txt === "SLOW FIELD")).toBe(true);
  });
});

describe("Player movement and trail emission", () => {
  it("updates player movement, friction, and wall bounces", () => {
    const move = { dx: 1, dy: 0 };
    const { game } = buildGame({}, move);
    game.W = 120; game.H = 120; game.player.r = 6;

    game._updatePlayer(0.016);
    expect(game.player.lastX).toBe(1);
    expect(game.player.vx).toBeGreaterThan(0);

    game.player.dashT = 1;
    game.player.invT = 0;
    game.player.x = 2;
    game.player.dashVX = -1;
    game.player.dashVY = 0;
    const bounceSpy = vi.spyOn(game, "_applyDashReflect");
    game._updatePlayer(0.5);
    expect(bounceSpy).toHaveBeenCalled();
  });

  it("falls back gracefully when no canvas factory is available", () => {
    const { game } = buildGame();
    const originalDocument = global.document;
    const originalOffscreen = global.OffscreenCanvas;

    game.bgCanvas = null;
    global.document = undefined;
    global.OffscreenCanvas = undefined;

    try {
      game._refreshBackgroundLayer();
      expect(game.bgCanvas).toBeNull();
    } finally {
      global.document = originalDocument;
      global.OffscreenCanvas = originalOffscreen;
    }
  });

  it("clamps thickness and gap sizes while exercising spawn wrappers", () => {
    const { game } = buildGame();
    game.W = 120;
    game.H = 120;
    game.cfg.pipes.thickness = { scale: 10, min: 5, max: 8 };
    game.cfg.pipes.gap = { startScale: 0, endScale: 0, min: 12, max: 20 };

    expect(game._thickness()).toBe(8);
    expect(game._gapSize()).toBe(12);

    game._spawnSinglePipe();
    game._spawnWall();
    game._spawnBurst();
    game._spawnCrossfire();
    game._spawnOrb();

    expect(game.pipes.length).toBeLessThanOrEqual(game._pipeSpawnBudget());
    expect(game.orbs.length).toBe(1);
  });

  it("drops perfect streak metadata when a non-perfected gap despawns", () => {
    const { game } = buildGame();
    game._gapMeta.set(7, { perfected: false });
    game.perfectCombo = 5;

    game._onGapPipeRemoved({ gapId: 7 });

    expect(game.perfectCombo).toBe(0);
    expect(game._gapMeta.size).toBe(0);
  });

  it("falls back to dash direction when a reflection normal is degenerate", () => {
    const { game } = buildGame();
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
    const { game } = buildGame();
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

  it("uses default fallbacks when optional hooks or viewport data are missing", () => {
    const ctx = mockCtx();
    const canvas = makeCanvas(ctx);
    const config = cloneConfig();
    const input = makeInput();

    Object.defineProperty(window, "visualViewport", { value: undefined, writable: true });
    Object.defineProperty(window, "innerWidth", { value: 420, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 240, writable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: undefined, writable: true });

    const game = new Game({ canvas, ctx, config, playerImg: {}, input });
    game.resizeToWindow();

    expect(canvas.style.width).toBe("420px");
    expect(canvas.style.height).toBe("240px");
    expect(game.getTrailId()).toBe("classic");
    expect(game.getBinds()).toEqual({});

    game.playerImg = {};
    game._computePlayerSize();
    expect(game.player.h).toBeCloseTo(game.player.w);
  });

  it("handles dash collisions through the shared collision helper", () => {
    const { game } = buildGame();
    game.player.dashT = 0.1;
    game.player.dashBounces = 0;
    const reflectSpy = vi.spyOn(game, "_applyDashReflect");

    const result = game._handlePipeCollision({ nx: 1, ny: 0 }, 2);

    expect(result).toBe("reflected");
    expect(reflectSpy).toHaveBeenCalled();
    expect(game.state).toBe(0);
  });

  it("spawns special walls when the random draw exceeds crossfire thresholds", () => {
    const { game } = buildGame();
    game.resizeToWindow();
    game.state = 1;
    game.specialT = 0;
    game.pipeT = 10;
    game.cfg.catalysts.orbs.enabled = false;
    setRandSource(() => 0.99);

    game.update(0.1);

    expect(game.pipes.length).toBeGreaterThan(0);
    expect(game.specialT).toBeGreaterThan(0);
  });

  it("applies slow-field speed multipliers only when pipes are inside the radius", () => {
    const { game } = buildGame();
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
    const { game } = buildGame({ onGameOver: gameOver });
    game.resizeToWindow();
    game.state = 1;
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;
    game.player.invT = 0;
    game.player.dashT = 0.1;
    game.player.dashBounces = 5;
    vi.spyOn(game, "_dashBounceMax").mockReturnValue(1);

    // Use a stub pipe; don't depend on the Pipe class being in scope in this test file.
    game.pipes.push(pipeStub({ x: game.player.x - game.player.r, y: game.player.y - game.player.r, w: game.player.r * 2, h: game.player.r * 2 }));

    game.update(0.05);

    expect(game.state).toBe(2);
    expect(gameOver).toHaveBeenCalled();
  });

  it("reflects pipe collisions while dashing when bounce cap has not been reached", () => {
    const { game } = buildGame();
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

    game.pipes.push(pipeStub({
      x: game.player.x - game.player.r,
      y: game.player.y - game.player.r,
      w: game.player.r * 2,
      h: game.player.r * 2
    }));

    game.update(0.05);

    expect(reflectSpy).toHaveBeenCalled();
    expect(game.state).toBe(1);
    expect(onGameOver).not.toHaveBeenCalled();
  });

  it("emits trail, glint, and sparkle particles from style", () => {
    const { game } = buildGame();
    game.player.x = 50; game.player.y = 50;
    game.player.vx = 200; game.player.vy = 0;
    const prev = game.parts.length;
    game._emitTrail(0.5);
    expect(game.parts.length).toBeGreaterThan(prev);
    expect(game.trailAcc).toBeLessThan(1);
    expect(game.trailGlintAcc).toBeLessThan(1);
    expect(game.trailSparkAcc).toBeLessThan(1);
  });

  it("emits an aura and lengthened particles for a mesmerizing trail cloud", () => {
    setRandSource(() => 0.5);
    const { game } = buildGame();
    game.player.x = 100; game.player.y = 120;
    game.player.vx = 0; game.player.vy = 0;
    game.player.r = 20;
    game.getTrailId = () => "custom";
    const style = {
      rate: 3,
      life: [1, 1],
      size: [2, 2],
      speed: [10, 10],
      drag: 0,
      add: false,
      jitterScale: 0.4,
      distanceScale: 3,
      lifeScale: 2,
      glint: { rate: Number.MIN_VALUE, life: [1, 1], size: [1, 1], speed: [1, 1] },
      sparkle: { rate: Number.MIN_VALUE, life: [1, 1], size: [1, 1], speed: [1, 1] },
      aura: {
        rate: 2,
        life: [2, 2],
        size: [3, 3],
        speed: [4, 4],
        orbit: [5, 5],
        add: false,
        drag: 2,
        twinkle: false
      }
    };
    vi.spyOn(game, "_trailStyle").mockReturnValue(style);

    try {
      const prev = game.parts.length;
      game._emitTrail(1);

      const produced = game.parts.slice(prev);
      const baseParts = produced.slice(0, 3);
      const auraParts = produced.slice(3);

      expect(produced).toHaveLength(5);
      expect(baseParts.every((p) => p.life === 2)).toBe(true);
      expect(baseParts.every((p) => Math.abs(p.size - 2.16) < 1e-3)).toBe(true);
      expect(baseParts.every((p) => p.drag === 0)).toBe(true);
      expect(auraParts.every((p) => p.life === 4)).toBe(true);
      expect(auraParts.every((p) => Math.abs(p.size - 3.24) < 1e-3)).toBe(true);
      expect(auraParts.every((p) => p.twinkle === false)).toBe(true);
      expect(game.trailAuraAcc).toBeLessThan(1);
      expect(game.trailAcc).toBeLessThan(1);
    } finally {
      setRandSource();
    }
  });
});

describe("Game loop", () => {
  it("early exits on OVER and drifts dots in MENU", () => {
    const { game } = buildGame();
    game.bgDots = [{ x: 0, y: 0, s: 1 }];

    game.state = 2;
    game.update(1);
    expect(game.bgDots[0].y).toBe(0);

    game.state = 0;
    game.update(1);
    expect(game.bgDots[0].y).toBeGreaterThan(0);
  });

  it("wraps drifting background dots when they exit the playfield", () => {
    const { game } = buildGame();
    game.bgDots = [{ x: 1, y: game.H + 20, s: 5 }];
    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.75);

    game.update(0.1);

    expect(game.bgDots[0].y).toBe(-10);
    expect(game.bgDots[0].x).toBeCloseTo(game.W * 0.75);
    randSpy.mockRestore();
  });

  it("runs full PLAY update including orbs, gates, and scoring", () => {
    setRandSource(() => 0.9);
    const { game } = buildGame();
    const onGameOver = vi.fn();
    game.onGameOver = onGameOver;

    game.resizeToWindow();
    game.state = 1;
    game.player.x = 50;
    game.player.y = 50;
    game.combo = game.cfg.ui.comboBar.sparkleAt;
    game.comboBreakFlash = 0.1;
    game.perfectT = 0.1;
    game.slowField = { x: 10, y: 10, r: 5, fac: 0.5, t: 0.01, tm: 0.01 };
    game.specialT = 0;
    game.pipeT = 0;
    game.orbT = 0;

    const gate = gateStub({ gapId: 3 });
    game.gates.push(gate);

    vi.spyOn(perfectGaps, "resolveGapPerfect").mockReturnValue({ awarded: true, points: 7, streak: 2 });

    const firstOrb = { x: 50, y: 50, r: 5, update: vi.fn(), dead: () => false };
    const expiredOrb = { x: 0, y: 0, r: 5, update: vi.fn(), dead: () => true };
    game.orbs.push(firstOrb, expiredOrb);

    game.pipes.push(pipeStub({ off: true, gapId: 3, w: 5, h: 5 }));
    game._gapMeta.set(3, { perfected: false });
    game.gates.push(gateStub({ off: true }));

    game.parts.push({ life: 0, update: vi.fn() });
    game.floats.push({ life: 0, update: vi.fn() });

    game.pipes.push(...Array.from({ length: 281 }, () => pipeStub()));
    game.parts.push(...Array.from({ length: 1101 }, () => ({ life: 1, update: vi.fn() })));
    game.floats.push(...Array.from({ length: 81 }, () => ({ life: 1, update: vi.fn() })));

    const spawnWallSpy = vi.spyOn(spawn, "spawnWall");
    game.update(0.6);

    expect(spawnWallSpy).toHaveBeenCalled();
    expect(game.comboSparkAcc).toBeLessThan(1);
    expect(game.score).toBeGreaterThan(0);
    expect(game.floats.some((f) => f.txt === "+7")).toBe(true);
    expect(game.orbs.length).toBeGreaterThan(0);
    expect(game.combo).toBeGreaterThan(0);
    expect(game.state).toBe(1);
    expect(onGameOver).not.toHaveBeenCalled();
    expect(game.pipes.length).toBeLessThanOrEqual(280);
    expect(game.parts.length).toBeLessThanOrEqual(1100);
    expect(game.floats.length).toBeLessThanOrEqual(80);
  });

  it("handles collision death", () => {
    const { game } = buildGame();
    game.state = 1;
    game.player.invT = 0;
    game.player.dashT = 0;
    game.player.x = 0; game.player.y = 0; game.player.r = 10;
    game.pipes = [pipeStub({ x: -5, y: -5, w: 20, h: 20 })];

    const onGameOver = vi.fn();
    game.onGameOver = onGameOver;
    game.update(0.01);
    expect(onGameOver).toHaveBeenCalled();
    expect(game.state).toBe(2);
  });

  it("breaks collision processing after a dash reflection", () => {
    const { game } = buildGame();
    game.state = 1;
    game.player.invT = 0;
    game.player.dashT = 0.1;
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;

    const pipeA = pipeStub({ x: game.player.x - game.player.r, y: game.player.y - game.player.r, w: game.player.r * 2, h: game.player.r * 2 });
    const pipeB = pipeStub({ x: game.player.x - game.player.r, y: game.player.y - game.player.r, w: game.player.r * 2, h: game.player.r * 2 });
    game.pipes.push(pipeA, pipeB);

    const collision = vi.spyOn(game, "_handlePipeCollision").mockReturnValueOnce("reflected").mockReturnValue("over");

    game.update(0.01);

    expect(collision).toHaveBeenCalledTimes(1);
    collision.mockRestore();
  });

  it("returns early when dash collisions end the run immediately", () => {
    const { game } = buildGame();
    game.state = 1;
    game.player.invT = 0;
    game.player.dashT = 0.1;
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;

    const pipe = pipeStub({ x: game.player.x - game.player.r, y: game.player.y - game.player.r, w: game.player.r * 2, h: game.player.r * 2 });
    game.pipes.push(pipe);

    const collision = vi.spyOn(game, "_handlePipeCollision").mockReturnValue("over");

    game.update(0.01);

    expect(collision).toHaveBeenCalledTimes(1);
    collision.mockRestore();
  });

  it("awards pipe dodge points when obstacles are culled", () => {
    const { game } = buildGame();
    game.state = 1;
    game.player.invT = 1; // skip collisions
    game.pipeT = 10;
    game.specialT = 10;
    game.orbT = 10;
    game.score = 0;

    const scoredPipe = { ...pipeStub({ x: 1000, y: 1000, off: true }), scored: false };
    const gapSpy = vi.spyOn(game, "_onGapPipeRemoved");
    game.pipes.push(scoredPipe);

    game.update(0.01);

    expect(game.score).toBeGreaterThan(0);
    expect(game.pipes.length).toBe(0);
    expect(gapSpy).toHaveBeenCalledWith(expect.objectContaining(scoredPipe));
    gapSpy.mockRestore();
  });

  it("covers edge-case clamps and guards across helpers", async () => {
    const originalDPR = window.devicePixelRatio;
    const originalViewport = window.visualViewport;
    const originalDocument = global.document;
    const originalOffscreen = global.OffscreenCanvas;

    vi.resetModules();
    window.devicePixelRatio = 0.1;
    window.visualViewport = { width: 0, height: 0 };
    global.document = { createElement: vi.fn(() => ({ width: 0, height: 0, getContext: vi.fn(() => mockCtx()) })) };
    global.OffscreenCanvas = undefined;

    const { Game: FreshGame } = await import("../game.js");
    const moveRef = { dx: 0, dy: 0 };
    const { game, canvas } = buildGameWith(FreshGame, {
      player: { sizeScale: 0.01, sizeMin: 8, sizeMax: 10, radiusScale: 0.5 },
      skills: {
        dash: { duration: -1, cooldown: -2, speed: 0, bounceRetain: 2 },
        phase: { duration: -1, cooldown: -2 },
        teleport: { cooldown: 0, range: 0, effectDuration: 0, burstParticles: -5 },
        slowField: { duration: -1, radius: -5, slowFactor: 2, cooldown: -1 }
      },
      catalysts: { orbs: { enabled: false } },
      pipes: {
        spawnInterval: { start: 2, end: -1, min: 0.5, max: 1 },
        thickness: { scale: 0, min: 1, max: 2 },
        gap: { startScale: 0, endScale: 0, min: 1, max: 2 },
        difficulty: { timeRampStart: 10, scoreRampStart: 5, mixTime: 0, mixScore: 1, timeToMax: 1, scoreToMax: 1, earlyCurvePower: 2 }
      },
      scoring: { pipeDodge: 2 }
    }, moveRef);

    game.resizeToWindow();

    game.bgCanvas = null;
    game._refreshBackgroundLayer();
    expect(game.bgCanvas).not.toBeNull();

    game.bgCanvas.width = Math.round(game.W);
    game.bgCanvas.height = Math.round(game.H);
    game.bgCtx = null;
    game._refreshBackgroundLayer();

    game.bgCtx = mockCtx();
    game._refreshBackgroundLayer();

    game.bgCanvas = { width: 1, height: 1, getContext: vi.fn(() => null) };
    game._refreshBackgroundLayer();

    game.timeAlive = 0;
    game.score = 0;
    expect(game._difficulty01()).toBe(0);
    game.timeAlive = 20;
    game.score = 20;
    expect(game._difficulty01()).toBeGreaterThan(0);

    game.W = Number.NaN; game.H = 100;
    expect(game._pipeSpawnBudget()).toBe(0);
    game.W = 10; game.H = 10;
    expect(game._pipeSpawnBudget()).toBe(4);
    game.W = 199; game.H = 100;
    expect(game._pipeSpawnBudget()).toBe(12);
    game.W = 300; game.H = 300;
    expect(game._pipeSpawnBudget()).toBe(Number.POSITIVE_INFINITY);

    game._gapMeta = null;
    game._onGapPipeRemoved(null);
    game._gapMeta = new Map();
    game._onGapPipeRemoved({});
    game._gapMeta.set(4, { perfected: true });
    game._onGapPipeRemoved({ gapId: 5 });

    game.player.vx = 0; game.player.vy = 0; game.player.dashVX = 0; game.player.dashVY = -1;
    game._applyDashReflect({ nx: 0, ny: 0, contactX: 0, contactY: 0, penetration: 0 });
    game.cfg.skills.dash.bounceRetain = -2;
    game._applyDashReflect({ nx: 1, ny: 0, contactX: 1, contactY: 1, penetration: 0 });

    game.cds.dash = 0;
    game._useSkill("dash");
    expect(game.player.dashVY).toBe(-1);

    game.cds.phase = 0;
    game._useSkill("phase");
    expect(game.player.invT).toBeGreaterThanOrEqual(0);

    game.input.cursor.has = false;
    game._useSkill("teleport");
    game.input.cursor = { has: true, x: 0, y: 0 };
    canvas.width = 0; canvas.height = 0;
    game._useSkill("teleport");

    game.cds.slowField = 0;
    game._useSkill("slowField");
    expect(game.slowField).toBeTruthy();

    game.cfg.skills.dash.duration = 5;
    game.cfg.skills.dash.cooldown = 2;
    game.cfg.skills.dash.speed = -5;
    moveRef.dx = 1; moveRef.dy = 0;
    game._useSkill("dash");

    game.player.dashT = 0.05;
    game._updatePlayer(0.1);
    game.player.dashT = 0;
    game._updatePlayer(0.1);

    game.cfg.skills.phase.duration = 2;
    game._useSkill("phase");

    game.cfg.skills.teleport.effectDuration = 5;
    game.cfg.skills.teleport.burstParticles = 300;
    game.canvas.width = 100; game.canvas.height = 80;
    game._useSkill("teleport");

    game.cfg.skills.slowField = { duration: 20, radius: 5, slowFactor: -5, cooldown: 0 };
    game._useSkill("slowField");
    expect(game.slowField.fac).toBeCloseTo(0.1);

    game.cfg.pipes.difficulty.mixTime = 2;
    game.cfg.pipes.difficulty.mixScore = -1;
    game.cfg.pipes.difficulty.timeRampStart = 0;
    game.cfg.pipes.difficulty.scoreRampStart = 0;
    expect(game._difficulty01()).toBeGreaterThanOrEqual(0);

    game.pipes = [{ ...pipeStub({ off: true }), scored: false }];
    game._difficulty01();
    game.update(0.01);
    expect(game.score).toBeGreaterThanOrEqual(2);

    window.devicePixelRatio = originalDPR;
    window.visualViewport = originalViewport;
    global.document = originalDocument;
    global.OffscreenCanvas = originalOffscreen;
  });
});
