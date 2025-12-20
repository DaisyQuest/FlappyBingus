import { describe, expect, it } from "vitest";
import { runScenario, validateScenario } from "../scenarioRunner.js";
import { GameEngine } from "../gameEngine.js";
import { createFixedClock } from "../clock.js";
import { createRng } from "../rng.js";

describe("validateScenario", () => {
  it("rejects invalid shapes", () => {
    expect(() => validateScenario(null)).toThrow();
    expect(() => validateScenario({ name: "no steps" })).toThrow();
    expect(() => validateScenario({ name: "bad", steps: [{}] })).toThrow();
    expect(() => validateScenario({ name: "bad", steps: [{ at: -1, action: "step", dt: 0.01 }] })).toThrow();
  });
});

describe("runScenario", () => {
  it("runs steps chronologically and collects snapshots", () => {
    const result = runScenario({
      scenario: {
        name: "orb pickup",
        seed: 2,
        steps: [
          { at: 0.016, action: "emit", type: "score:orb", payload: { value: 1 } },
          { at: 0.032, action: "step", dt: 0.01 }
        ]
      }
    });

    expect(result.seed).toBe(2);
    expect(result.snapshots.length).toBeGreaterThanOrEqual(2);
    const last = result.snapshots.at(-1);
    expect(last.state.time).toBeCloseTo(0.042, 5);
    expect(last.events[0].type).toBe("score:orb");
  });

  it("throws when steps are out of order", () => {
    expect(() =>
      runScenario({
        scenario: {
          name: "unordered",
          steps: [
            { at: 0.02, action: "step", dt: 0.01 },
            { at: 0.01, action: "emit", type: "late" }
          ]
        }
      })
    ).toThrow();
  });

  it("rejects unsupported actions", () => {
    expect(() =>
      runScenario({
        scenario: {
          name: "bad-action",
          steps: [{ at: 0, action: "unknown" }]
        }
      })
    ).toThrow();
  });

  it("supports custom engine factories for parity checks", () => {
    const engineFactory = (seed) =>
      new GameEngine({ rngSeed: seed, rng: createRng(seed + 1), clock: createFixedClock(5) });

    const result = runScenario({
      scenario: {
        name: "custom",
        seed: 10,
        steps: [{ at: 0.05, action: "step", dt: 0.01 }]
      },
      makeEngine: engineFactory
    });

    const last = result.snapshots.at(-1);
    expect(last.state.meta.seed).toBe(10);
    expect(last.state.time).toBeCloseTo(0.06, 5);
  });
});
