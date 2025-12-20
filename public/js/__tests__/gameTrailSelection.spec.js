import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRandSource } from "../util.js";
import { DEFAULT_CONFIG } from "../config.js";

vi.mock("../trailStyles.js", () => {
  const styleFor = vi.fn((id) => ({
    rate: id === "world_record" ? 12 : 6,
    life: [0.1, 0.2],
    size: [1, 1.5],
    speed: [10, 12],
    drag: 10,
    add: true,
    color: () => "#fff",
    hueRate: 0,
    glint: {
      rate: 0,
      life: [0.1, 0.1],
      size: [1, 1],
      speed: [1, 1],
      drag: 1,
      add: true,
      color: () => "#fff"
    },
    sparkle: {
      rate: 0,
      life: [0.1, 0.1],
      size: [1, 1],
      speed: [1, 1],
      drag: 1,
      add: true,
      color: () => "#fff"
    }
  }));
  return {
    TRAIL_STYLE_IDS: ["classic", "world_record"],
    trailStyleFor: styleFor,
    __esModule: true
  };
});

const makeWindow = () => {
  globalThis.window = {
    devicePixelRatio: 1,
    visualViewport: { width: 320, height: 240 },
    innerWidth: 320,
    innerHeight: 240,
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

describe("Game trail selection", () => {
  beforeEach(() => {
    setRandSource(() => 0.42);
    makeWindow();
  });

  afterEach(() => {
    setRandSource();
    vi.clearAllMocks();
    delete globalThis.window;
  });

  it("emits particles using the currently selected trail id", async () => {
    const { trailStyleFor } = await import("../trailStyles.js");
    const { Game } = await import("../game.js");
    const { canvas, ctx } = baseCanvas();
    const selection = { current: "classic" };

    const game = new Game({
      canvas,
      ctx,
      config: cloneCfg(),
      playerImg: { naturalWidth: 10, naturalHeight: 10 },
      input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
      getTrailId: () => selection.current,
      getBinds: () => ({}),
      onGameOver: () => {}
    });

    game.player.x = 50;
    game.player.y = 50;
    trailStyleFor.mockClear();

    game._emitTrail(0.1);
    expect(trailStyleFor).toHaveBeenCalledWith("classic");

    selection.current = "world_record";
    trailStyleFor.mockClear();
    game._emitTrail(0.1);

    expect(trailStyleFor).toHaveBeenCalledWith("world_record");
    expect(trailStyleFor).toHaveBeenCalledTimes(1);
  });
});
