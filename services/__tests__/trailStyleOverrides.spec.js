import { describe, expect, it } from "vitest";

import { normalizeTrailStyleOverrides } from "../trailStyleOverrides.cjs";

describe("trail style overrides", () => {
  it("accepts empty payloads", () => {
    const result = normalizeTrailStyleOverrides();
    expect(result.ok).toBe(true);
    expect(result.overrides).toEqual({});
  });

  it("normalizes basic overrides with extras", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        classic: {
          rate: "12",
          life: [0.2, 0.4],
          sparkle: { rate: 4 },
          extras: [
            { mode: "sparkle", rate: 3, color: ["#fff", "#000"] }
          ]
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.overrides.classic.rate).toBe(12);
    expect(result.overrides.classic.life).toEqual([0.2, 0.4]);
    expect(result.overrides.classic.sparkle.rate).toBe(4);
    expect(result.overrides.classic.extras[0].mode).toBe("sparkle");
    expect(result.overrides.classic.extras[0].color).toEqual(["#fff", "#000"]);
  });

  it("rejects invalid shapes and extra modes", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        classic: {
          particleShape: "blob",
          extras: [{ mode: "unknown", rate: 3 }]
        }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
