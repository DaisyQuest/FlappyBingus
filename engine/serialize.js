import { makeSnapshot } from "./snapshot.js";

export function serializeWorld(world, events) {
  if (!world?.state) throw new Error("World state required.");
  const eventSnapshot = typeof events?.snapshot === "function" ? events.snapshot() : events || [];
  return makeSnapshot(world.state, eventSnapshot);
}
