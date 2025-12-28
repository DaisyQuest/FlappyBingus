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

  it("keeps the record-holder palette saturated instead of washing out to white", () => {
    const style = trailStyleFor("world_record");
    const rand = () => 0.5;
    const glintColor = style.glint.color({ i: 0, hue: 140, rand });
    const sparkleColor = style.sparkle.color({ i: 0, hue: 140, rand });

    expect(style.sparkle.add).toBe(false);
    expect(style.glint.add).toBe(false);
    expect(style.glint.rate).toBeLessThan(46);
    expect(style.sparkle.rate).toBeLessThan(54);
    expect(glintColor).toContain("hsla");
    expect(sparkleColor).toContain("hsla");
    expect(glintColor).not.toContain("255,255,255");
    expect(sparkleColor).not.toContain("255,255,255");
  });

  it("emits palette-driven and band-driven colors for varied trails", () => {
    const glacier = trailStyleFor("glacier");
    const glacierColor = glacier.color({ rand: (min, max) => (min + max) / 2, hue: 210, i: 1 });
    expect(glacierColor).toContain("hsla");
    expect(glacier.sparkle.color({ rand: () => 0.5, hue: 0, i: 0 })).toContain("rgba");

    const ocean = trailStyleFor("ocean");
    const oceanColor = ocean.color({ rand: () => 0, hue: 0, i: 0 });
    expect(oceanColor).toContain("rgba(0,164,214");
    expect(ocean.glint.color({ rand: () => 0, hue: 0, i: 0 })).toContain("rgba");

    const worldRecord = trailStyleFor("world_record");
    const blossom = worldRecord.color({ rand: () => 0.1, i: 2 });
    expect(blossom).toContain("hsla");
    const plasma = trailStyleFor("plasma");
    expect(plasma.color({ rand: () => 0.75, hue: 0, i: 3 })).toContain("rgba");
  });

  it("supports aura mixes and additive overrides for moody trails", () => {
    const nebula = trailStyleFor("nebula");
    expect(nebula.add).toBe(true);
    expect(nebula.sparkle).toBeTruthy();
    expect(nebula.aura).toBeTruthy();
    expect(nebula.aura.add).toBe(true);
    expect(nebula.aura.color({ rand: () => 0.3, hue: 210, i: 1 })).toContain("hsla");

    const gothic = trailStyleFor("gothic");
    expect(gothic.add).toBe(false);
    expect(gothic.glint.rate).toBeLessThan(30);

    const storm = trailStyleFor("storm");
    expect(storm.sparkle.add).toBe(false);
  });

  it("marks lemon slice trails with a dedicated particle shape", () => {
    const lemon = trailStyleFor("lemon_slice");
    expect(lemon.particleShape).toBe("lemon_slice");
    expect(lemon.sliceStyle?.segments).toBeGreaterThan(3);
  });
});
