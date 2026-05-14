import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_SIM_STEPS_PER_FRAME, planSimulationFrame } from "../frameBudget.js";

describe("frameBudget", () => {
  it("returns no steps when accumulator is below simDt", () => {
    const result = planSimulationFrame({ accumulator: 0.001, simDt: 0.01, maxStepsPerFrame: 8 });
    expect(result).toEqual({
      steps: 0,
      nextAccumulator: 0.001,
      droppedTime: 0,
      overloaded: false
    });
  });

  it("consumes available steps up to max without dropping when under budget", () => {
    const result = planSimulationFrame({ accumulator: 0.025, simDt: 0.01, maxStepsPerFrame: 8 });
    expect(result.steps).toBe(2);
    expect(result.nextAccumulator).toBeCloseTo(0.005, 12);
    expect(result.droppedTime).toBe(0);
    expect(result.overloaded).toBe(false);
  });

  it("caps steps and drops backlog while preserving at most one tick remainder", () => {
    const result = planSimulationFrame({ accumulator: 0.12, simDt: 0.01, maxStepsPerFrame: 8 });
    expect(result.steps).toBe(8);
    expect(result.nextAccumulator).toBeCloseTo(0.01, 12);
    expect(result.droppedTime).toBeCloseTo(0.03, 12);
    expect(result.overloaded).toBe(true);
  });

  it("sanitizes invalid numeric inputs", () => {
    const result = planSimulationFrame({ accumulator: Number.NaN, simDt: Number.NaN, maxStepsPerFrame: Number.NaN });
    expect(result).toEqual({
      steps: 0,
      nextAccumulator: 0,
      droppedTime: 0,
      overloaded: false
    });
  });

  it("handles non-positive simDt and max steps", () => {
    const noDt = planSimulationFrame({ accumulator: 1, simDt: 0, maxStepsPerFrame: 4 });
    expect(noDt.steps).toBe(0);
    expect(noDt.nextAccumulator).toBe(1);

    const noSteps = planSimulationFrame({ accumulator: 1, simDt: 0.01, maxStepsPerFrame: 0 });
    expect(noSteps.steps).toBe(0);
    expect(noSteps.nextAccumulator).toBe(1);
  });

  it("uses default max steps when option is omitted", () => {
    const result = planSimulationFrame({ accumulator: 1, simDt: 0.01 });
    expect(result.steps).toBe(DEFAULT_MAX_SIM_STEPS_PER_FRAME);
    expect(result.overloaded).toBe(true);
  });
});
