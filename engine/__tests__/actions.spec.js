import { describe, expect, it, vi } from "vitest";
import { applyAction, getDashDirections } from "../actions.js";

describe("actions", () => {
  it("throws when world state or config is missing", () => {
    expect(() => applyAction({}, "jump")).toThrow("Missing world state");
  });

  it("applies jump and emits an event", () => {
    const events = { emit: vi.fn() };
    const state = { player: { vy: 0 } };
    const config = { jumpImpulse: 100 };

    applyAction({ state, config, events }, "jump");

    expect(state.player.vy).toBe(-100);
    expect(events.emit).toHaveBeenCalledWith("player:jump", { vy: -100 }, { action: "jump" });
  });

  it("defaults dash direction to right", () => {
    const events = { emit: vi.fn() };
    const state = { player: { dash: {}, vx: 0, vy: 0 } };
    const config = { dashDuration: 0.5, dashSpeed: 10 };

    applyAction({ state, config, events }, "dash");

    expect(state.player.vx).toBe(10);
    expect(state.player.vy).toBe(0);
    expect(state.player.dash.direction).toBe("right");
  });

  it("throws on unknown action and unsupported dash direction", () => {
    const events = { emit: vi.fn() };
    const state = { player: { dash: {}, vx: 0, vy: 0 } };
    const config = { dashDuration: 0.5, dashSpeed: 10 };

    expect(() => applyAction({ state, config, events }, "boost")).toThrow("Unknown action");
    expect(() => applyAction({ state, config, events }, "dash", { direction: "diagonal" })).toThrow(
      "Unsupported dash direction"
    );
  });

  it("enables phase and emits start", () => {
    const events = { emit: vi.fn() };
    const state = { player: { invulnerable: false, invulnTime: 0 } };
    const config = { phaseDuration: 0.3 };

    applyAction({ state, config, events }, "phase");

    expect(state.player.invulnerable).toBe(true);
    expect(state.player.invulnTime).toBe(0.3);
    expect(events.emit).toHaveBeenCalledWith("ability:phase:start", {}, { action: "phase" });
  });

  it("exposes dash direction map copy", () => {
    const dirs = getDashDirections();
    expect(dirs.right).toEqual([1, 0]);
    dirs.right[0] = 99;
    expect(getDashDirections().right).toEqual([1, 0]);
  });
});
