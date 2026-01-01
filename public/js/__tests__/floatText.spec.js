import { describe, expect, it } from "vitest";
import { FloatText } from "../entities.js";
import { buildScorePopupStyle } from "../uiStyles.js";

function createCtx() {
  const calls = [];
  const ctx = {
    calls,
    createLinearGradient(x0, y0, x1, y1) {
      const stops = [];
      calls.push({ op: "gradient", args: [x0, y0, x1, y1], stops });
      return {
        addColorStop(pos, color) {
          stops.push([pos, color]);
        }
      };
    },
    save() { calls.push({ op: "save" }); },
    restore() { calls.push({ op: "restore" }); },
    translate(x, y) { calls.push({ op: "translate", x, y }); },
    rotate(rad) { calls.push({ op: "rotate", rad }); },
    fillText(txt, x, y) { calls.push({ op: "fillText", txt, x, y }); },
    strokeText(txt, x, y) { calls.push({ op: "strokeText", txt, x, y }); },
    beginPath() { calls.push({ op: "beginPath" }); },
    arc(x, y, r) { calls.push({ op: "arc", x, y, r }); },
    fill() { calls.push({ op: "fill" }); },
    set globalAlpha(v) { calls.push({ op: "globalAlpha", v }); },
    set font(v) { calls.push({ op: "font", v }); },
    set textAlign(v) { calls.push({ op: "textAlign", v }); },
    set textBaseline(v) { calls.push({ op: "textBaseline", v }); },
    set shadowColor(v) { calls.push({ op: "shadowColor", v }); },
    set shadowBlur(v) { calls.push({ op: "shadowBlur", v }); },
    set shadowOffsetY(v) { calls.push({ op: "shadowOffsetY", v }); },
    set fillStyle(v) { calls.push({ op: "fillStyle", v }); },
    set strokeStyle(v) { calls.push({ op: "strokeStyle", v }); },
    set lineWidth(v) { calls.push({ op: "lineWidth", v }); },
    set lineJoin(v) { calls.push({ op: "lineJoin", v }); },
    set globalCompositeOperation(v) { calls.push({ op: "globalCompositeOperation", v }); }
  };
  return ctx;
}

describe("FloatText", () => {
  it("uses gradients and wobble for ornate score popups", () => {
    const style = buildScorePopupStyle({ combo: 6, variant: "orb" });
    const ft = new FloatText("+5", 10, 20, style.color, style);
    ft.phase = 0.5; // deterministic wobble position

    const ctx = createCtx();
    ft.draw(ctx);

    const translate = ctx.calls.find((c) => c.op === "translate");
    expect(Math.abs((translate?.x ?? 10) - 10)).toBeGreaterThan(0.1);

    const grad = ctx.calls.find((c) => c.op === "gradient");
    expect(grad?.stops?.length).toBeGreaterThanOrEqual(2);

    const fill = ctx.calls.find((c) => c.op === "fillText");
    expect(fill?.txt).toBe("+5");
  });

  it("adds sparkles for high-combo perfect popups", () => {
    const style = buildScorePopupStyle({ combo: 9, variant: "perfect" });
    const ft = new FloatText("+12", 0, 0, style.color, { ...style, shimmer: 0 });
    const ctx = createCtx();
    ft.draw(ctx);

    const sparkleArcs = ctx.calls.filter((c) => c.op === "arc");
    expect(sparkleArcs.length).toBeGreaterThan(0);
  });

  it("applies gentle comic styling in mild mode", () => {
    FloatText.setComicBookMode("mild");
    const ft = new FloatText("Pow", 0, 0, "#fff");
    const ctx = createCtx();
    ft.draw(ctx);

    const fontCall = ctx.calls.find((c) => c.op === "font");
    expect(fontCall?.v).toMatch(/Comic Sans|Impact/i);
    expect(ft.strokeWidth).toBeGreaterThan(1.8);
    expect(ft.shadowBoost).toBeGreaterThan(0);
    FloatText.setComicBookMode("none");
  });

  it("ramps up styling for extreme comic mode while honoring custom fonts", () => {
    FloatText.setComicBookMode("extreme");
    const ft = new FloatText("Zap", 0, 0, "#fff", { fontFamily: "serif" });

    expect(ft.fontFamily).toBe("serif");
    expect(ft.sparkle).toBe(true);
    expect(ft.size).toBeGreaterThan(18);

    FloatText.setComicBookMode("bogus");
    expect(FloatText.comicBookMode).toBe("none");
  });
});
