import { describe, expect, it } from "vitest";
import { resolveGameplayScale } from "../displayScale.js";

describe("resolveGameplayScale", () => {
  it("returns 1 at the reference resolution", () => {
    const scale = resolveGameplayScale({ reference: { width: 2560, height: 1440 } }, 2560, 1440);
    expect(scale).toBeCloseTo(1);
  });

  it("scales down for 1080p and clamps for tiny screens", () => {
    const scale = resolveGameplayScale({ reference: { width: 2560, height: 1440 } }, 1920, 1080);
    expect(scale).toBeCloseTo(0.75);

    const tiny = resolveGameplayScale(
      { reference: { width: 2560, height: 1440 }, scaleClamp: { min: 0.5, max: 1.5 } },
      200,
      100
    );
    expect(tiny).toBeCloseTo(0.5);
  });

  it("clamps large resolutions and guards invalid inputs", () => {
    const large = resolveGameplayScale(
      { reference: { width: 2560, height: 1440 }, scaleClamp: { min: 0.5, max: 1.5 } },
      5120,
      2880
    );
    expect(large).toBeCloseTo(1.5);

    const invertedClamp = resolveGameplayScale(
      { reference: { width: 2560, height: 1440 }, scaleClamp: { min: 2, max: 1 } },
      2560,
      1440
    );
    expect(invertedClamp).toBeCloseTo(1);

    const invalid = resolveGameplayScale({ reference: { width: 0, height: 0 } }, 0, 0);
    expect(invalid).toBeGreaterThan(0);
  });
});
