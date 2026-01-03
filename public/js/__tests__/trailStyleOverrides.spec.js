import { describe, expect, it } from "vitest";

import { normalizeTrailStyleOverrides } from "../trailStyleOverrides.js";

describe("trailStyleOverrides", () => {
  it("normalizes overrides and filters invalid entries", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        classic: {
          rate: "8",
          life: [0.2, 0.4],
          sparkle: { rate: 3 },
          extras: [{ mode: "sparkle", rate: 2, color: ["#fff", "#000"] }]
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.overrides.classic.rate).toBe(8);
    expect(result.overrides.classic.life).toEqual([0.2, 0.4]);
    expect(result.overrides.classic.sparkle.rate).toBe(3);
    expect(result.overrides.classic.extras[0].mode).toBe("sparkle");
  });

  it("rejects invalid overrides payloads", () => {
    const result = normalizeTrailStyleOverrides({ overrides: { classic: { particleShape: "blob" } } });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
