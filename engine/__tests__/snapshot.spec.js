import { describe, expect, it } from "vitest";
import { makeSnapshot } from "../snapshot.js";

describe("makeSnapshot", () => {
  it("deep-freezes state and events", () => {
    const state = { time: 0.1, nested: { value: 1 } };
    const events = [{ type: "a", payload: { score: 1 } }];
    const snap = makeSnapshot(state, events);

    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.state)).toBe(true);
    expect(Object.isFrozen(snap.events[0].payload)).toBe(true);
    expect(() => {
      snap.state.time = 99;
    }).toThrow();
    expect(() => {
      snap.events[0].payload.score = 99;
    }).toThrow();
  });
});
