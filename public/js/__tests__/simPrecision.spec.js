import { describe, expect, it } from "vitest";
import { SIM_DT, SIM_TICK_MS, SIM_TPS } from "../simPrecision.js";

describe("simPrecision", () => {
  it("defines consistent simulation timing constants", () => {
    expect(SIM_TPS).toBeGreaterThan(0);
    expect(SIM_DT).toBeCloseTo(1 / SIM_TPS, 12);
    expect(SIM_TICK_MS).toBeCloseTo(1000 / SIM_TPS, 6);
  });
});
