import { describe, expect, it, vi } from "vitest";
import { Pipe, Gate, Orb, FloatText } from "../entities.js";

vi.mock("../audio.js", () => ({
  sfxOrbBoop: vi.fn(),
  sfxPerfectNice: vi.fn(),
  sfxDashBounce: vi.fn()
}));

const createGameForAudio = async () => {
  // Game reads window globals at module evaluation time
  const prevWindow = globalThis.window;
  globalThis.window = {
    devicePixelRatio: 1,
    visualViewport: { width: 800, height: 600 },
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const { Game } = await import("../game.js");
  const audio = await import("../audio.js");

  const canvas = { style: {}, getContext: () => ({ setTransform: () => {} }) };
  const ctx = { setTransform: () => {}, imageSmoothingEnabled: false };
  const cfg = {
    player: { sizeScale: 1, sizeMin: 24, sizeMax: 64 },
    catalysts: { orbs: { intervalMin: 1, intervalMax: 1 } },
    scoring: { perfect: { windowScale: 0.075 } }
  };

  const game = new Game({
    canvas,
    ctx,
    config: cfg,
    playerImg: { naturalWidth: 10, naturalHeight: 10 },
    input: { snapshot: () => ({ move: { x: 0, y: 0 }, cursor: {} }) },
    getTrailId: () => "classic",
    getBinds: () => ({}),
    onGameOver: () => {}
  });

  const cleanup = () => {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
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
});
