import { describe, expect, it } from "vitest";
import { runScenario } from "../scenarioRunner.js";

const sampleScenario = {
  name: "determinism-check",
  seed: 7,
  steps: [
    { at: 0.01, action: "emit", type: "score:orb", payload: { value: 1 } },
    { at: 0.02, action: "step", dt: 0.005 },
    { at: 0.025, action: "emit", type: "gate:entered", payload: { id: "g1" } },
    { at: 0.03, action: "step", dt: 0.01 }
  ]
};

describe("runScenario determinism", () => {
  it("produces identical snapshots for same seed and steps", () => {
    const run1 = runScenario({ scenario: sampleScenario });
    const run2 = runScenario({ scenario: sampleScenario });
    expect(run1.snapshots).toEqual(run2.snapshots);
  });

  it("honors temporal gaps by auto-stepping", () => {
    const result = runScenario({ scenario: sampleScenario });
    const last = result.snapshots.at(-1);
    expect(last.state.time).toBeCloseTo(0.04, 5); // 0.01 gap + 0.005 + 0.005 gap + 0.01
    expect(last.events).toHaveLength(3);
    expect(last.events[0].type).toBe("score:orb");
    expect(last.events[1].type).toBe("anim:orbPickup");
  });
});
