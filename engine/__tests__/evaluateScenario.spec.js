import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../scenarioRunner.js";
import { expectClose } from "../assertions.js";

const simpleScenario = {
  name: "timing-check",
  seed: 3,
  steps: [
    { at: 0.01, action: "step", dt: 0.01 },
    { at: 0.03, action: "step", dt: 0.02 }
  ]
};

describe("evaluateScenario", () => {
  it("evaluates assertions against run results", () => {
    const result = evaluateScenario({
      scenario: simpleScenario,
      assertions: [
        (run) => expectClose({ actual: run.snapshots.at(-1).state.time, expected: 0.05, tolerance: 1e-6, label: "time" })
      ]
    });

    expect(result.pass).toBe(true);
    expect(result.assertions).toHaveLength(1);
  });

  it("marks failures when assertions fail", () => {
    const result = evaluateScenario({
      scenario: simpleScenario,
      assertions: [
        () => ({ pass: false, message: "forced failure" })
      ]
    });
    expect(result.pass).toBe(false);
    expect(result.assertions[0].message).toBe("forced failure");
  });
});
