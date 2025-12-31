import { describe, expect, it } from "vitest";
import { createWorld, resolveWorldConfig } from "../world.js";

describe("world", () => {
  it("resolves config with defaults and world overrides", () => {
    const config = resolveWorldConfig({ world: { width: 120 } });
    expect(config.world.width).toBe(120);
    expect(config.world.height).toBe(300);
    expect(config.gravity).toBe(1200);
  });

  it("creates world state with seeded metadata and centered player", () => {
    const world = createWorld({ seed: 42, config: { world: { width: 100, height: 200 } } });
    expect(world.state.meta.seed).toBe(42);
    expect(world.state.player.x).toBe(50);
    expect(world.state.player.y).toBe(100);
  });

  it("defaults to seed 1 and base dimensions when omitted", () => {
    const world = createWorld();
    expect(world.state.meta.seed).toBe(1);
    expect(world.state.player.x).toBe(150);
    expect(world.state.player.y).toBe(150);
  });
});
