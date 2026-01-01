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
    expect(style.particleShape).toBe("petal");
    expect(style.sparkle.particleShape).toBe("star");
    expect(style.glint.particleShape).toBe("leaf");
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
    expect(style.glint.rate).toBeLessThan(20);
    expect(style.sparkle.rate).toBeLessThan(10);
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

    const rainbow = trailStyleFor("rainbow");
    const fixedRand = () => 0;
    expect(rainbow.color({ rand: fixedRand, hue: 0, i: 0 })).toContain("hsla(0,");
    expect(rainbow.color({ rand: fixedRand, hue: 0, i: 1 })).toContain("hsla(30,");
    expect(rainbow.color({ rand: fixedRand, hue: 0, i: 2 })).toContain("hsla(55,");

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
    expect(nebula.particleShape).toBe("star");
    expect(nebula.sparkle.particleShape).toBe("star");
    expect(nebula.glint.particleShape).toBe("star");
    expect(nebula.aura.particleShape).toBe("star");
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
    expect(lemon.sliceStyle?.rind).toBe("rgba(255, 214, 96, 0.98)");
    expect(lemon.sliceStyle?.segment).toBe("rgba(255, 184, 36, 0.95)");
  });

  it("adds a sparkly starlight trail without blossom petals", () => {
    const starlight = trailStyleFor("starlight_pop");
    expect(TRAIL_STYLE_IDS).toContain("starlight_pop");
    expect(starlight.particleShape).toBe("heart");
    expect(starlight.sparkle.particleShape).toBe("star");
    expect(starlight.glint.particleShape).toBe("heart");
    expect(starlight.life[1]).toBeGreaterThan(starlight.life[0]);
    expect(starlight.sparkle.rate).toBeCloseTo(starlight.rate * 0.1, 5);
    const sparkleColor = starlight.sparkle.color({ rand: () => 0, hue: 0, i: 0 });
    const baseColor = starlight.color({ rand: () => 0, i: 0 });
    expect(sparkleColor).toContain("hsla(");
    expect(baseColor).toContain("hsla(");
    expect(Number(sparkleColor.match(/hsla\((\d+)/)?.[1])).toBeGreaterThanOrEqual(300);
    expect(Number(baseColor.match(/hsla\((\d+)/)?.[1])).toBeGreaterThanOrEqual(300);
  });

  it("uses honeycomb hexagons with a matching outline style", () => {
    const honey = trailStyleFor("honeycomb");
    expect(honey.particleShape).toBe("hexagon");
    expect(honey.hexStyle?.stroke).toContain("rgba");
    expect(honey.sparkle.particleShape).toBe("hexagon");
    expect(honey.glint.particleShape).toBe("hexagon");
  });
});
