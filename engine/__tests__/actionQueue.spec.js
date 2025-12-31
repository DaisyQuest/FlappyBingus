import { describe, expect, it } from "vitest";
import { createActionQueue } from "../actionQueue.js";

describe("action queue", () => {
  it("enqueues and drains actions", () => {
    const queue = createActionQueue();
    queue.enqueue("jump");
    queue.enqueue("dash", { direction: "left" });

    const drained = queue.drain();
    expect(drained).toEqual([
      { action: "jump", payload: {} },
      { action: "dash", payload: { direction: "left" } }
    ]);
    expect(queue.size()).toBe(0);
  });

  it("rejects invalid action names", () => {
    const queue = createActionQueue();
    expect(() => queue.enqueue("")).toThrow("Action name is required");
  });

  it("clears queued actions", () => {
    const queue = createActionQueue();
    queue.enqueue("jump");
    queue.clear();
    expect(queue.size()).toBe(0);
  });

  it("drains empty queues to an empty array", () => {
    const queue = createActionQueue();
    expect(queue.drain()).toEqual([]);
  });
});
