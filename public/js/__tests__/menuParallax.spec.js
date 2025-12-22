import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMenuParallaxController, __testables } from "../menuParallax.js";

const { applyParallaxTransforms, computeParallaxDeltas } = __testables;

describe("menuParallax", () => {
  let dom;
  let document;
  let panel;
  let layers;

  const makeLayer = (depth, tilt) => {
    const el = document.createElement("div");
    el.dataset.parallaxDepth = depth;
    el.dataset.parallaxTilt = tilt;
    panel.append(el);
    return el;
  };

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><body></body>");
    document = dom.window.document;
    panel = document.createElement("div");
    document.body.append(panel);
    panel.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 200, height: 120 }));
    layers = [makeLayer("10", "1.5"), makeLayer("16", "2")];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies parallax transforms and resets on leave", () => {
    createMenuParallaxController({ panel, layers });
    const move = new dom.window.MouseEvent("pointermove", { clientX: 200, clientY: 60, bubbles: true });
    panel.dispatchEvent(move);

    expect(layers[0].style.transform).toBe("translate3d(-10px, 0px, 0) rotate(1.5deg)");
    expect(layers[1].style.transform).toBe("translate3d(-16px, 0px, 0) rotate(2deg)");

    const leave = new dom.window.MouseEvent("pointerleave", { bubbles: true });
    panel.dispatchEvent(leave);

    expect(layers[0].style.transform).toBe("translate3d(0px, 0px, 0) rotate(0deg)");
    expect(layers[1].style.transform).toBe("translate3d(0px, 0px, 0) rotate(0deg)");
  });

  it("ignores movement when disabled or hidden", () => {
    const controller = createMenuParallaxController({ panel, layers });
    controller.applyFromPoint({ clientX: 120, clientY: 30 });
    controller.setEnabled(false);

    const moveWhileDisabled = new dom.window.MouseEvent("pointermove", { clientX: 50, clientY: 50, bubbles: true });
    panel.dispatchEvent(moveWhileDisabled);
    expect(layers[0].style.transform).toBe("translate3d(0px, 0px, 0) rotate(0deg)");

    controller.setEnabled(true);
    panel.classList.add("hidden");
    const moveWhileHidden = new dom.window.MouseEvent("pointermove", { clientX: 10, clientY: 10, bubbles: true });
    panel.dispatchEvent(moveWhileHidden);
    expect(layers[1].style.transform).toBe("translate3d(0px, 0px, 0) rotate(0deg)");
  });

  it("guards against zero-sized rects and invalid depth data", () => {
    const shallow = document.createElement("div");
    layers = [shallow];
    applyParallaxTransforms(layers, { dx: 0.5, dy: 0.5 });
    expect(shallow.style.transform).toBe("translate3d(0px, 0px, 0) rotate(0deg)");

    const { dx, dy } = computeParallaxDeltas({ x: 50, y: 50 }, { left: 0, top: 0, width: 0, height: 0 });
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });
});
