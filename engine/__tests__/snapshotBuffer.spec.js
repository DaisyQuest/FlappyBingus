import { describe, expect, it } from "vitest";
import { createSnapshotBuffer } from "../snapshotBuffer.js";

describe("snapshot buffer", () => {
  it("validates max size and sample time", () => {
    expect(() => createSnapshotBuffer({ maxSize: 0 })).toThrow("Max size must be positive");
    const buffer = createSnapshotBuffer();
    expect(() => buffer.sample(Number.NaN)).toThrow("Sample time must be a number");
  });

  it("adds snapshots and respects max size", () => {
    const buffer = createSnapshotBuffer({ maxSize: 2 });
    buffer.add(1, { id: 1 });
    buffer.add(2, { id: 2 });
    buffer.add(3, { id: 3 });

    expect(buffer.size()).toBe(2);
    expect(buffer.earliest()).toEqual({ id: 2 });
    expect(buffer.latest()).toEqual({ id: 3 });
  });

  it("samples before and after bounds", () => {
    const buffer = createSnapshotBuffer();
    buffer.add(1, { id: "a" });
    buffer.add(3, { id: "b" });

    expect(buffer.sample(0)).toEqual({ id: "a" });
    expect(buffer.sample(4)).toEqual({ id: "b" });
  });

  it("returns exact snapshot when time matches", () => {
    const buffer = createSnapshotBuffer();
    buffer.add(1, { id: "a" });
    buffer.add(2, { id: "b" });

    expect(buffer.sample(2)).toEqual({ id: "b" });
  });

  it("interpolates when a function is provided", () => {
    const buffer = createSnapshotBuffer();
    buffer.add(0, { value: 0 });
    buffer.add(10, { value: 10 });

    const result = buffer.sample(5, {
      interpolate: (before, after, t) => ({
        value: before.value + (after.value - before.value) * t
      })
    });

    expect(result).toEqual({ value: 5 });
  });

  it("returns previous snapshot when no interpolator is provided", () => {
    const buffer = createSnapshotBuffer();
    buffer.add(0, { value: 0 });
    buffer.add(10, { value: 10 });

    expect(buffer.sample(5)).toEqual({ value: 0 });
  });

  it("accepts out-of-order inserts", () => {
    const buffer = createSnapshotBuffer();
    buffer.add(5, { id: 5 });
    buffer.add(1, { id: 1 });
    buffer.add(3, { id: 3 });

    expect(buffer.sample(2)).toEqual({ id: 1 });
    expect(buffer.sample(4)).toEqual({ id: 3 });
  });

  it("clears stored snapshots", () => {
    const buffer = createSnapshotBuffer();
    buffer.add(1, { id: 1 });
    buffer.clear();
    expect(buffer.size()).toBe(0);
    expect(buffer.latest()).toBeNull();
  });
});
