import { describe, it, expect, vi } from "vitest";
import { emitTrail, updateComboSparkles, updateEffects } from "../effectsManager.js";

const buildGame = (overrides = {}) => {
  const game = {
    parts: [],
    floats: [],
    trailExtraAcc: [],
    trailHue: 0,
    trailAcc: 0,
    trailGlintAcc: 0,
    trailSparkAcc: 0,
    trailAuraAcc: 0,
    comboSparkAcc: 0,
    combo: 0,
    cfg: {
      ui: { comboBar: { sparkleAt: 2, sparkleRate: 10 } }
    },
    _particleScale: () => 1,
    _visualRand: (a, b) => (a + b) / 2,
    _scoreHudLayout: () => ({ scoreX: 0, scoreY: 0, arcRadius: 10, arcWidth: 4 }),
    getTrailId: () => "classic",
    _trailStyle: () => ({
      rate: 1,
      speed: [10, 20],
      life: [0.2, 0.4],
      size: [1, 2],
      color: () => "rgba(0,0,0,1)"
    }),
    player: { x: 10, y: 10, r: 4, vx: 1, vy: 0, lastX: 1, lastY: 0 },
    skillSettings: {}
  };

  return { ...game, ...overrides };
};

describe("effectsManager", () => {
  it("emits trail particles", () => {
    const game = buildGame();
    emitTrail(game, 1);

    expect(game.parts.length).toBeGreaterThan(0);
    expect(game.trailAcc).toBeLessThan(1);
  });

  it("updates combo sparkles and resets when below threshold", () => {
    const game = buildGame({ combo: 3 });
    updateComboSparkles(game, 0.1);
    expect(game.parts.length).toBeGreaterThan(0);

    game.combo = 0;
    game.comboSparkAcc = 1.5;
    updateComboSparkles(game, 0.1);
    expect(game.comboSparkAcc).toBe(0);
  });

  it("updates and prunes effects", () => {
    const part = { update: vi.fn(), life: -1 };
    const float = { update: vi.fn(), life: 1 };
    const deadFloat = { update: vi.fn(), life: 0 };
    const game = buildGame({ parts: [part], floats: [float, deadFloat] });

    updateEffects(game, 0.5);

    expect(part.update).toHaveBeenCalledWith(0.5);
    expect(game.parts.length).toBe(0);
    expect(game.floats.length).toBe(1);
  });
});
