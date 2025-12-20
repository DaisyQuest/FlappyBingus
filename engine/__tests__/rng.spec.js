import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";

describe("createRng", () => {
  it("produces deterministic sequences for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("supports integer ranges inclusively", () => {
    const rng = createRng(7);
    const values = Array.from({ length: 20 }, () => rng.int(1, 3));
    expect(values.every((v) => v >= 1 && v <= 3)).toBe(true);
  });

  it("throws on invalid ranges", () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 4)).toThrowError();
    expect(() => rng.float(3, 2)).toThrowError();
  });
});
