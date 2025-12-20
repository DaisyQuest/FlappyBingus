import { describe, expect, it } from "vitest";
import { renderMarkdownSummary, summarizeRun } from "../reports.js";

const sampleRun = {
  scenario: "orb pickup",
  seed: 2,
  snapshots: [
    {
      state: { tick: 1, time: 0.01 },
      events: [{ type: "score:orb" }]
    },
    {
      state: { tick: 2, time: 0.02 },
      events: [{ type: "score:orb" }, { type: "gate:entered" }]
    }
  ]
};

describe("reports", () => {
  it("summarizes a run with ticks/time/events", () => {
    const summary = summarizeRun(sampleRun);
    expect(summary).toMatchObject({
      scenario: "orb pickup",
      seed: 2,
      ticks: 2,
      events: 2
    });
    expect(summary.time).toBeCloseTo(0.02, 5);
  });

  it("renders markdown summary", () => {
    const md = renderMarkdownSummary(summarizeRun(sampleRun));
    expect(md).toContain("# Scenario Summary: orb pickup");
    expect(md).toContain("Seed: `2`");
    expect(md).toContain("Ticks: `2`");
  });
});
