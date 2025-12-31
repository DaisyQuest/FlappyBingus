import { describe, expect, it } from "vitest";
import { serializeWorld } from "../serialize.js";
import { createWorld } from "../world.js";

describe("serializeWorld", () => {
  it("serializes world state and event snapshots", () => {
    const world = createWorld({ seed: 9 });
    const events = { snapshot: () => [{ type: "event", time: 0 }] };

    const snap = serializeWorld(world, events);

    expect(snap.state.meta.seed).toBe(9);
    expect(snap.events).toHaveLength(1);
    expect(() => {
      // @ts-expect-error immutability check
      snap.state.meta.seed = 2;
    }).toThrow();
  });

  it("accepts raw event arrays", () => {
    const world = createWorld();
    const snap = serializeWorld(world, [{ type: "raw", time: 1 }]);
    expect(snap.events[0].type).toBe("raw");
  });

  it("throws when world state is missing", () => {
    expect(() => serializeWorld(null, [])).toThrow("World state required");
  });
});
