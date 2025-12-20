import { afterEach, describe, expect, it, vi } from "vitest";

const stubFetch = (responses) => {
  const mock = vi.fn();
  for (const res of responses) {
    if (res instanceof Error) {
      mock.mockRejectedValueOnce(res);
    } else {
      mock.mockResolvedValueOnce({
        ok: res.ok ?? true,
        text: async () => JSON.stringify(res.body ?? {}),
      });
    }
  }
  vi.stubGlobal("fetch", mock);
  return mock;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("loadConfig", () => {
  it("returns defaults when remote config is unavailable", async () => {
    stubFetch([new Error("nope"), new Error("still nope")]);
    const { loadConfig, DEFAULT_CONFIG } = await import("../config.js");

    const { config, ok, source } = await loadConfig();
    expect(ok).toBe(false);
    expect(source).toBe("defaults");
    expect(config).toStrictEqual(DEFAULT_CONFIG);
  });

  it("merges and clamps valid config values from the first available file", async () => {
    const merged = {
      pipes: {
        spawnInterval: { start: 2, end: 0.05 }, // will clamp to min/max
        speed: { start: "not-a-number", end: 800 },
        gap: { startScale: 0.4, endScale: 0.1, min: 10, max: 999 },
        patternWeights: { wall: [0.5, 0.5] }
      },
      scoring: { perfect: { enabled: false, bonus: "42" } },
      ui: { comboBar: { glowAt: 2, sparkleRate: 99 } }
    };

    // First candidate fails; second succeeds
    stubFetch([new Error("missing"), { body: merged }]);
    const { loadConfig, DEFAULT_CONFIG } = await import("../config.js");

    const { config, ok, source } = await loadConfig();
    expect(ok).toBe(true);
    expect(source).toBe("config.json"); // second candidate

    expect(config.pipes.spawnInterval.start).toBeCloseTo(DEFAULT_CONFIG.pipes.spawnInterval.max);
    expect(config.pipes.spawnInterval.end).toBeCloseTo(DEFAULT_CONFIG.pipes.spawnInterval.min);

    // Non-number merges keep defaults
    expect(config.pipes.speed.start).toBe(DEFAULT_CONFIG.pipes.speed.start);
    expect(config.pipes.speed.end).toBe(800);

    // Arrays are replaced, not mutated
    expect(config.pipes.patternWeights.wall).toEqual([0.5, 0.5]);
    expect(DEFAULT_CONFIG.pipes.patternWeights.wall).not.toBe(config.pipes.patternWeights.wall);

    // Scalars convert sanely
    expect(config.scoring.perfect.enabled).toBe(false);
    expect(config.scoring.perfect.bonus).toBe(42);
    expect(config.ui.comboBar.sparkleRate).toBe(99);
  });
});
