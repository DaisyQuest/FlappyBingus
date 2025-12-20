import { describe, expect, it } from "vitest";
import { expectClose, expectDelta, expectEventOrder, summarizeResults } from "../assertions.js";

describe("assertions helpers", () => {
  it("checks closeness within tolerance", () => {
    const ok = expectClose({ actual: 1.001, expected: 1, tolerance: 0.01, label: "tick" });
    const bad = expectClose({ actual: 1.2, expected: 1, tolerance: 0.01, label: "tick" });
    expect(ok.pass).toBe(true);
    expect(bad.pass).toBe(false);
    expect(bad.message).toContain("off by");
  });

  it("computes delta between snapshots", () => {
    const before = { score: 1 };
    const after = { score: 4 };
    const res = expectDelta({ before, after, key: "score", expected: 3 });
    expect(res.pass).toBe(true);
  });

  it("fails delta when key missing", () => {
    const res = expectDelta({ before: {}, after: {}, key: "missing", expected: 0 });
    expect(res.pass).toBe(false);
  });

  it("validates ordered events", () => {
    const events = [{ type: "score:orb" }, { type: "gate:entered" }, { type: "score:perfect" }];
    const res = expectEventOrder(events, ["score:orb", "gate:entered"]);
    expect(res.pass).toBe(true);
    const fail = expectEventOrder(events, ["gate:entered", "score:orb"]);
    expect(fail.pass).toBe(false);
  });

  it("summarizes multiple results", () => {
    const summary = summarizeResults([
      { pass: true, message: "ok" },
      { pass: false, message: "oops" }
    ]);
    expect(summary.pass).toBe(false);
    expect(summary.failures).toHaveLength(1);
  });
});
