import { describe, expect, it, vi } from "vitest";
import { Pipe, Gate, Orb, FloatText } from "../entities.js";
import { DEFAULT_CONFIG } from "../config.js";

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const stubWindow = () => {
  const prevWindow = globalThis.window;
  globalThis.window = {
    devicePixelRatio: 1,
    visualViewport: { width: 800, height: 600 },
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  return () => {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
  };
};

vi.mock("../audio.js", () => ({
  sfxOrbBoop: vi.fn(),
  sfxPerfectNice: vi.fn(),
  sfxDashStart: vi.fn(),
  sfxDashBounce: vi.fn(),
  sfxDashDestroy: vi.fn(),
  sfxDashBreak: vi.fn(),
  sfxTeleport: vi.fn(),
  sfxPhase: vi.fn(),
  sfxExplosion: vi.fn(),
  sfxGameOver: vi.fn(),
  sfxSlowField: vi.fn(),
  sfxSlowExplosion: vi.fn()
}));

const createGame = async (cfg = DEFAULT_CONFIG) => {
  const restoreWindow = stubWindow();
  const { Game } = await import("../game.js");
  const cfgCopy = clone(cfg);
  const canvas = { style: {}, getContext: () => ({ setTransform: () => {} }), width: 800, height: 600 };
  const ctx = { setTransform: () => {}, imageSmoothingEnabled: false };
  const game = new Game({
    canvas,
    ctx,
    config: cfgCopy,
    playerImg: { naturalWidth: 10, naturalHeight: 10 },
    input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
    getTrailId: () => "classic",
    getBinds: () => ({}),
    onGameOver: () => {}
  });
  return { game, restoreWindow };
};

const createGameForAudio = async () => {
  const restoreWindow = stubWindow();
  const { Game } = await import("../game.js");
  const audio = await import("../audio.js");

  const canvas = { style: {}, getContext: () => ({ setTransform: () => {} }) };
  const ctx = { setTransform: () => {}, imageSmoothingEnabled: false };
  const cfg = {
    ...clone(DEFAULT_CONFIG),
    player: { ...DEFAULT_CONFIG.player, sizeScale: 1, sizeMin: 24, sizeMax: 64 },
    catalysts: { ...DEFAULT_CONFIG.catalysts, orbs: { intervalMin: 1, intervalMax: 1 } },
    scoring: { ...DEFAULT_CONFIG.scoring, perfect: { ...DEFAULT_CONFIG.scoring.perfect, windowScale: 0.075 } }
  };

  const game = new Game({
    canvas,
    ctx,
    config: cfg,
    playerImg: { naturalWidth: 10, naturalHeight: 10 },
    input: {
      snapshot: () => ({ move: { x: 0, y: 0 }, cursor: {} }),
      getMove: () => ({ dx: 0, dy: 0 })
    },
    getTrailId: () => "classic",
    getBinds: () => ({}),
    onGameOver: () => {}
  });

  const cleanup = () => {
    restoreWindow();
  };

  return { game, audio, cleanup };
};

describe("Pipe", () => {
  it("marks pipes as entered when crossing bounds and reports off-screen", () => {
    const pipe = new Pipe(-70, 0, 64, 50, 80, 0);
    expect(pipe.entered).toBe(false);

    pipe.update(1, 1, 100, 100);
    expect(pipe.entered).toBe(true);
    expect(pipe.off(100, 100, 0)).toBe(false);

    pipe.x = 500;
    expect(pipe.off(100, 100, 20)).toBe(true);
  });
});

describe("Gate", () => {
  it("detects crossings only after entering the playfield", () => {
    const gate = new Gate("x", -10, 40, 0, 0, 10);
    gate.update(0.5, 100, 100); // moves to x=10, marks entered
    expect(gate.entered).toBe(true);
    expect(gate.crossed(0)).toBe(true);

    gate.cleared = true;
    expect(gate.crossed(0)).toBe(false);
  });
});

describe("Orb", () => {
  it("bounces off arena walls and clamps to padded bounds", () => {
    const orb = new Orb(38, 20, 30, 0, 5, 1); // pad = 9, W - pad = 31
    orb.update(0.2, 40, 40);
    expect(orb.x).toBeCloseTo(31, 5);
    expect(orb.vx).toBeLessThan(0);
    expect(orb.dead()).toBe(false);
  });

  it("expires when life hits zero", () => {
    const orb = new Orb(0, 0, 0, 0, 5, 0.05);
    orb.update(0.1, 100, 100);
    expect(orb.dead()).toBe(true);
  });
});

describe("FloatText", () => {
  it("decays life and damps velocity over time", () => {
    const text = new FloatText("hi", 0, 0, "#fff");
    text.vx = 100;
    text.vy = -50;

    text.update(0.1);
    expect(text.life).toBeCloseTo(0.8, 5);
    expect(text.vx).toBeLessThan(100);
    expect(text.vy).toBeGreaterThan(-50); // magnitude decreased by drag factor
  });
});

describe("Game score popups", () => {
  it("anchors popups to the player's top-right while clamping on-screen", async () => {
    const { game, restoreWindow } = await createGame(clone(DEFAULT_CONFIG));
    try {
      game.W = 200;
      game.H = 200;
      game.player.x = 80;
      game.player.y = 90;
      game.player.r = 20;

      const anchor = game._scorePopupAnchor();

      expect(anchor.x).toBeGreaterThan(game.player.x);
      expect(anchor.y).toBeLessThan(game.player.y);
      expect(anchor.x).toBeLessThanOrEqual(game.W - 14);
      expect(anchor.y).toBeGreaterThanOrEqual(14);
    } finally {
      restoreWindow();
    }
  });

  it("positions orb pickup popups at the anchor instead of behind the player", async () => {
    const { game, restoreWindow } = await createGame(clone(DEFAULT_CONFIG));
    try {
      game.W = 320;
      game.H = 240;
      game.startRun();
      game.player.x = 100;
      game.player.y = 120;
      game.player.r = 18;
      game.pipeT = game.specialT = game.orbT = 999;
      const anchor = game._scorePopupAnchor();

      game.orbs = [new Orb(game.player.x, game.player.y, 0, 0, 10, 1)];
      game.update(0);

      const popup = game.floats.find((f) => f.txt.startsWith("+"));
      expect(popup).toBeTruthy();
      expect(popup?.x).toBeCloseTo(anchor.x, 5);
      expect(popup?.y).toBeCloseTo(anchor.y, 5);
    } finally {
      restoreWindow();
    }
  });

  it("renders perfect-gap popups at the same anchored offset", async () => {
    const { game, restoreWindow } = await createGame(clone(DEFAULT_CONFIG));
    try {
      game.W = 320;
      game.H = 240;
      game.startRun();
      game.player.x = 100;
      game.player.y = 120;
      game.player.r = 16;
      game.pipeT = game.specialT = game.orbT = 999;

      const gate = new Gate("x", 90, 1000, game.player.y, 18, 10);
      game.gates = [gate];
      const anchor = game._scorePopupAnchor();

      const dt = 0.02;
      game.update(dt);

      const popup = game.floats.find((f) => f.txt.startsWith("+"));
      expect(popup).toBeTruthy();
      expect(Math.abs((popup?.x ?? 0) - anchor.x)).toBeLessThan(2);
      expect(Math.abs((popup?.y ?? 0) - anchor.y)).toBeLessThan(2);
      expect(popup?.x).toBeGreaterThan(game.player.x);
      expect(popup?.y).toBeLessThan(game.player.y);
    } finally {
      restoreWindow();
    }
  });
});

describe("Game audio enable/disable", () => {
  it("suppresses SFX when audioEnabled is false", async () => {
    const { game, audio, cleanup } = await createGameForAudio();
    const { sfxOrbBoop, sfxPerfectNice, sfxDashBounce } = audio;

    sfxOrbBoop.mockClear();
    sfxPerfectNice.mockClear();
    sfxDashBounce.mockClear();

    game.setAudioEnabled(false);
    game._orbPickupSfx();
    game._perfectNiceSfx();
    game._dashBounceSfx(1.1);

    expect(sfxOrbBoop).not.toHaveBeenCalled();
    expect(sfxPerfectNice).not.toHaveBeenCalled();
    expect(sfxDashBounce).not.toHaveBeenCalled();

    game.setAudioEnabled(true);
    game._orbPickupSfx();
    game._perfectNiceSfx();
    game._dashBounceSfx(1.1);

    expect(sfxOrbBoop).toHaveBeenCalledTimes(1);
    expect(sfxPerfectNice).toHaveBeenCalledTimes(1);
    expect(sfxDashBounce).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("plays bounce SFX when ricocheting off arena walls", async () => {
    const { game, audio, cleanup } = await createGameForAudio();
    const { sfxDashBounce } = audio;

    game.setSkillSettings({ dashBehavior: "ricochet" });
    game.setAudioEnabled(true);
    game.startRun();
    game.W = 200;
    game.H = 120;
    const pad = game.player.r + 2;
    game.player.x = pad - 1; // ensure a wall collision on the left edge
    game.player.y = game.H * 0.5;
    game.player.vx = -500;
    game.player.vy = 0;
    game.player.dashT = 0.1;
    game.player.dashMode = "ricochet";
    game.player.dashVX = -1;
    game.player.dashVY = 0;

    sfxDashBounce.mockClear();
    game.update(0.05);

    expect(sfxDashBounce).toHaveBeenCalled();

    cleanup();
  });
});
