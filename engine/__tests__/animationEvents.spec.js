import { describe, expect, it } from "vitest";
import { GameEngine } from "../gameEngine.js";
import { createFixedClock } from "../clock.js";
import { expectEventOrder } from "../assertions.js";

describe("animation trigger event adapter", () => {
  it("emits anim:orbPickup with deterministic payload metadata", () => {
    const clock = createFixedClock(0);
    const engine = new GameEngine({ clock });
    engine.state.player.id = "pilot-1";
    engine.state.score.orbs = 4;

    engine.emit("score:orb", { value: 2, combo: 3, multiplier: 1.5, triggerId: "orb-1" });

    const events = engine.events.events;
    expect(events.map((e) => e.type)).toEqual(["score:orb", "anim:orbPickup"]);
    expect(events[1].payload).toMatchObject({
      time: 0,
      playerId: "pilot-1",
      skillId: null,
      combo: 3,
      multiplier: 1.5,
      score: { type: "orb", delta: 2, total: 4 }
    });
  });

  it("adds derived metadata on animation trigger events", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });

    engine.emit("score:orb", { value: 1, triggerId: "orb-meta" });

    const animEvent = engine.events.events.find((entry) => entry.type === "anim:orbPickup");
    expect(animEvent?.meta).toMatchObject({ derivedFrom: "score:orb" });
  });

  it("falls back to the default player id when no player is set", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });
    engine.state.player = null;

    engine.emit("score:orb", { value: 1, triggerId: "orb-default" });

    const animEvent = engine.events.events.find((entry) => entry.type === "anim:orbPickup");
    expect(animEvent?.payload?.playerId).toBe("player-1");
  });

  it("emits anim:perfectGap after perfect score events", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });
    engine.state.player.id = "pilot-2";
    engine.state.score.perfect = 6;

    engine.emit("score:perfect", { delta: 1, combo: 2, triggerId: "perfect-1" });

    const events = engine.events.events;
    expect(events.map((e) => e.type)).toEqual(["score:perfect", "anim:perfectGap"]);
    expect(events[1].payload).toMatchObject({
      playerId: "pilot-2",
      skillId: null,
      combo: 2,
      score: { type: "perfect", delta: 1, total: 6 }
    });
  });

  it("defaults score deltas when none are provided", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });
    engine.state.score.orbs = 10;

    engine.emit("score:orb", { triggerId: "orb-default-delta" });

    const animEvent = engine.events.events.find((entry) => entry.type === "anim:orbPickup");
    expect(animEvent?.payload?.score).toMatchObject({ delta: 1, total: 10 });
  });

  it("emits anim:dash and anim:phase for ability starts", () => {
    const engine = new GameEngine({
      config: { gravity: 0, dashDuration: 0.05, phaseDuration: 0.05 }
    });
    engine.state.player.id = "pilot-3";

    engine.command("dash", { direction: "right" });
    engine.command("phase");

    const animDash = engine.events.events.find((e) => e.type === "anim:dash");
    const animPhase = engine.events.events.find((e) => e.type === "anim:phase");

    expect(animDash?.payload).toMatchObject({
      playerId: "pilot-3",
      skillId: "dash",
      direction: "right"
    });
    expect(animPhase?.payload).toMatchObject({
      playerId: "pilot-3",
      skillId: "phase"
    });
  });

  it("derives teleport variants from payload behavior and entry type", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });
    engine.state.player.id = "pilot-variant";

    engine.emit("ability:teleport", { behavior: "explode", triggerId: "tele-behavior" });
    engine.emit("ability:teleport:explode", { triggerId: "tele-type" });

    const animEvents = engine.events.events.filter((e) => e.type.startsWith("anim:"));
    expect(animEvents.map((event) => event.type)).toEqual(["anim:explode", "anim:explode"]);
    expect(animEvents[0].payload.variant).toBe("explode");
    expect(animEvents[1].payload.variant).toBe("explode");
  });

  it("handles teleport variants with explicit anim triggers", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });
    engine.state.player.id = "pilot-4";

    engine.emit("ability:teleport", { variant: "normal", triggerId: "tele-1" });
    engine.emit("ability:teleport", { variant: "explode", triggerId: "tele-2" });

    const events = engine.events.events;
    expect(events.map((e) => e.type)).toEqual([
      "ability:teleport",
      "anim:teleport",
      "ability:teleport",
      "anim:explode"
    ]);

    const normal = events[1];
    const explode = events[3];
    expect(normal.payload).toMatchObject({
      playerId: "pilot-4",
      skillId: "teleport",
      variant: "normal"
    });
    expect(explode.payload).toMatchObject({
      playerId: "pilot-4",
      skillId: "teleport",
      variant: "explode"
    });
  });

  it("skips animation triggers for failed or cooldown abilities", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });

    engine.emit("ability:teleport", { result: "cooldown" });
    engine.emit("ability:teleport", { success: false });
    engine.emit("ability:teleport", { cooldown: true });
    engine.emit("ability:teleport", { result: "failed" });

    const animEvents = engine.events.events.filter((e) => e.type.startsWith("anim:"));
    expect(animEvents).toHaveLength(0);
  });

  it("deduplicates trigger ids to avoid double firing", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });

    engine.emit("score:orb", { value: 1, triggerId: "orb-dup" });
    engine.emit("score:orb", { value: 1, triggerId: "orb-dup" });

    const animEvents = engine.events.events.filter((e) => e.type === "anim:orbPickup");
    expect(animEvents).toHaveLength(1);
  });

  it("deduplicates per event type while allowing shared trigger ids", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });

    engine.emit("score:orb", { value: 1, triggerId: "shared" });
    engine.emit("score:perfect", { value: 1, triggerId: "shared" });

    const animEvents = engine.events.events.filter((e) => e.type.startsWith("anim:"));
    expect(animEvents.map((event) => event.type)).toEqual(["anim:orbPickup", "anim:perfectGap"]);
  });

  it("allows repeated trigger events without a trigger id", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });

    engine.emit("score:orb", { value: 1 });
    engine.emit("score:orb", { value: 1 });

    const animEvents = engine.events.events.filter((e) => e.type === "anim:orbPickup");
    expect(animEvents).toHaveLength(2);
  });

  it("orders score events before animation triggers in the event log", () => {
    const engine = new GameEngine({ clock: createFixedClock(0) });

    engine.emit("score:orb", { value: 1, triggerId: "orb-order" });

    const orderResult = expectEventOrder(engine.events.events, ["score:orb", "anim:orbPickup"]);
    expect(orderResult.pass).toBe(true);
  });
});
