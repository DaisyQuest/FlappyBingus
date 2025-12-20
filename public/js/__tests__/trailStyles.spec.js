import { describe, expect, it } from "vitest";
import { TRAIL_STYLE_IDS, trailStyleFor } from "../trailStyles.js";

describe("trailStyles", () => {
  it("falls back to the classic style when the id is unknown", () => {
    const classic = trailStyleFor("classic");
    const fallback = trailStyleFor("does-not-exist");

    expect(fallback.rate).toBe(classic.rate);
    expect(fallback.size).toEqual(classic.size);
    expect(typeof fallback.color).toBe("function");
  });

  it("populates sparkle and glint defaults when not explicitly provided", () => {
    const style = trailStyleFor("classic");
    expect(style.sparkle).toBeTruthy();
    expect(style.glint).toBeTruthy();
    expect(style.sparkle.rate).toBeGreaterThan(0);
    expect(style.glint.size?.length).toBe(2);
  });

  it("returns fresh objects so callers can mutate safely", () => {
    const first = trailStyleFor("rainbow");
    const second = trailStyleFor("rainbow");

    expect(first).not.toBe(second);
    expect(first.sparkle).not.toBe(second.sparkle);
    expect(TRAIL_STYLE_IDS).toContain("rainbow");
  });

  it("includes an extravagant record-holder blossom style", () => {
    const style = trailStyleFor("world_record");
    expect(TRAIL_STYLE_IDS).toContain("world_record");
    expect(style.sparkle.size[1]).toBeGreaterThan(style.sparkle.size[0]);
    expect(style.glint.size[1]).toBeGreaterThan(style.glint.size[0]);
  });
});
