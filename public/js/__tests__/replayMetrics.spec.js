import { describe, expect, it } from "vitest";
import { createReplayBytesMeasurer } from "../main/replayMetrics.js";

describe("replay bytes measurer", () => {
  it("returns 0 for non-string values", () => {
    const measure = createReplayBytesMeasurer({ TextEncoderImpl: null });

    expect(measure(null)).toBe(0);
    expect(measure(12)).toBe(0);
  });

  it("falls back to string length without TextEncoder", () => {
    const measure = createReplayBytesMeasurer({ TextEncoderImpl: null });

    expect(measure("abc")).toBe(3);
  });

  it("uses a cached TextEncoder implementation when provided", () => {
    class StubEncoder {
      encode(value) {
        return { byteLength: value === "é" ? 2 : value.length };
      }
    }

    const measure = createReplayBytesMeasurer({ TextEncoderImpl: StubEncoder });

    expect(measure("é")).toBe(2);
    expect(measure("test")).toBe(4);
  });
});
