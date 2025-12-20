import { describe, expect, it } from "vitest";
import { EventLog } from "../eventLog.js";
import { createFixedClock } from "../clock.js";

describe("EventLog", () => {
  it("records events with clock time and payloads", () => {
    const clock = createFixedClock(0);
    const log = new EventLog(clock);
    log.emit("score:orb", { value: 1 });
    clock.advance(5);
    log.emit("gate:entered", { id: "g1" }, { meta: true });

    expect(log.events).toHaveLength(2);
    expect(log.events[0]).toMatchObject({ type: "score:orb", payload: { value: 1 }, time: 0 });
    expect(log.events[1].time).toBe(5);
  });

  it("snapshots are isolated copies", () => {
    const log = new EventLog(createFixedClock(0));
    log.emit("a", { x: 1 }, { tag: "t1" });
    const snap = log.snapshot();
    snap[0].payload.x = 99;
    snap[0].meta.tag = "changed";
    expect(log.events[0].payload.x).toBe(1);
    expect(log.events[0].meta.tag).toBe("t1");
  });

  it("clears events", () => {
    const log = new EventLog(createFixedClock(0));
    log.emit("a");
    log.emit("b");
    log.clear();
    expect(log.events).toHaveLength(0);
  });

  it("caps history when maxSize is provided", () => {
    const log = new EventLog(createFixedClock(0), { maxSize: 2 });
    log.emit("a");
    log.emit("b");
    log.emit("c");

    expect(log.events).toHaveLength(2);
    expect(log.events[0].type).toBe("b");
    expect(log.events[1].type).toBe("c");
  });
});
