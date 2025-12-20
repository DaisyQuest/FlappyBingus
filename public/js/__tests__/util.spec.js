import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  approach,
  circleCircle,
  circleRect,
  circleRectInfo,
  clamp,
  createSeededRand,
  createTapeRandPlayer,
  createTapeRandRecorder,
  escapeHtml,
  getCookie,
  getRandSource,
  hexToRgb,
  hsla,
  lerp,
  lerpC,
  norm2,
  rand,
  rgb,
  setCookie,
  setRandSource,
  shade,
  writeJsonCookie,
  readJsonCookie
} from "../util.js";

describe("math helpers", () => {
  afterEach(() => {
    setRandSource(); // reset to default Math.random
    vi.restoreAllMocks();
  });

  it("clamps and interpolates numeric values", () => {
    expect(clamp(10, 0, 5)).toBe(5);
    expect(clamp(-2, 0, 5)).toBe(0);
    expect(lerp(0, 10, 0.25)).toBeCloseTo(2.5, 5);
  });

  it("supports deterministic random sources and falls back to Math.random", () => {
    setRandSource(() => 0.5);
    expect(rand(0, 4)).toBeCloseTo(2);
    expect(getRandSource()).toBeTypeOf("function");

    const mathSpy = vi.spyOn(Math, "random").mockReturnValue(0.75);
    setRandSource("not-a-function");
    expect(rand(0, 2)).toBeCloseTo(1.5);
    expect(mathSpy).toHaveBeenCalled();
  });

  it("creates deterministic seeded RNGs and tape record/playback pairs", () => {
    const seededA = createSeededRand("alpha");
    const seededB = createSeededRand("alpha");
    const seededC = createSeededRand("beta");

    expect(seededA()).toBeCloseTo(seededB());
    expect(seededA()).not.toBeCloseTo(seededC());

    const tape = [];
    const record = createTapeRandRecorder("seed", tape);
    const first = record();
    const second = record();
    expect(tape).toEqual([first, second]);

    const play = createTapeRandPlayer(tape);
    expect(play()).toBeCloseTo(first);
    expect(play()).toBeCloseTo(second);
    expect(() => play()).toThrow(/underrun/);
  });

  it("normalizes vectors and approaches targets with a max delta", () => {
    const n = norm2(3, 4);
    expect(n.len).toBeCloseTo(5);
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);

    const tiny = norm2(0, 0);
    expect(tiny.len).toBe(0);
    expect(approach(5, 10, 20)).toBe(10);
    expect(approach(0, 10, 3)).toBe(3);
  });
});

describe("collision helpers", () => {
  it("detects circle-rectangle overlap and detailed contact info", () => {
    expect(circleRect(2, 5, 2, 4, 4, 4, 4)).toBe(true);
    expect(circleCircle(0, 0, 2, 5, 0, 1)).toBe(false);

    const hitLeft = circleRectInfo(2, 5, 2, 4, 4, 4, 4);
    expect(hitLeft?.nx).toBe(-1);
    expect(hitLeft?.penetration).toBeGreaterThan(0);

    // tie on axes -> falls back to nearest face selection
    const tie = circleRectInfo(5, 5, 2, 4, 4, 2, 2);
    expect(tie?.nx).toBe(1);
    expect(tie?.ny).toBe(0);

    const topHit = circleRectInfo(5, 2, 2, 4, 4, 2, 2);
    expect(topHit?.ny).toBe(-1);
  });
});

describe("color helpers", () => {
  it("parses hex colors and interpolates/clamps channels", () => {
    expect(hexToRgb("#0f0")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("invalid")).toEqual({ r: 255, g: 255, b: 255 });

    const blended = lerpC({ r: 0, g: 0, b: 0 }, { r: 255, g: 128, b: 64 }, 0.5);
    expect(rgb(blended, 0.5)).toBe("rgba(127,64,32,0.5)");
    const shaded = shade({ r: 200, g: 100, b: 50 }, 1.1);
    expect(shaded.r).toBeCloseTo(220);
    expect(shaded.g).toBeCloseTo(110);
    expect(shaded.b).toBeCloseTo(55);
    expect(hsla(725, 120, -20, 2)).toBe("hsla(5,100%,0%,1)");
  });
});

describe("cookie helpers", () => {
  beforeEach(() => {
    globalThis.document = { cookie: "" };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  it("reads and writes simple cookies safely", () => {
    setCookie("foo", "bar\nbaz", 1);
    expect(document.cookie).toContain("foo=barbaz");
    expect(getCookie("foo")).toBe("barbaz");
    expect(getCookie("missing")).toBeNull();
  });

  it("serializes JSON payloads", () => {
    writeJsonCookie("obj", { a: 1, ok: true }, 0.01);
    expect(readJsonCookie("obj")).toEqual({ a: 1, ok: true });

    document.cookie = "broken=%E0";
    expect(readJsonCookie("broken")).toBeNull();
  });
});

describe("HTML escaping", () => {
  it("escapes all critical characters", () => {
    expect(escapeHtml(`<script>alert("x&y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;"
    );
  });
});
