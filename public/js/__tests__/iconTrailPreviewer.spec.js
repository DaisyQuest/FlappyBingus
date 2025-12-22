import { beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { IconTrailPreviewer } from "../iconTrailPreviewer.js";

function makeSwatch(document) {
  const span = document.createElement("span");
  span.className = "icon-swatch";
  const canvas = document.createElement("canvas");
  canvas.className = "icon-swatch-canvas";
  span.append(canvas);
  return span;
}

describe("IconTrailPreviewer", () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    document = dom.window.document;
  });

  it("shares a single RAF loop across multiple swatches", () => {
    let rafCallback = null;
    const raf = vi.fn((cb) => { rafCallback = cb; return (rafCallback ? 1 : 0); });
    const cancel = vi.fn();
    const previewer = new IconTrailPreviewer({
      requestFrame: raf,
      cancelFrame: cancel,
      now: () => 0
    });

    const first = makeSwatch(document);
    const second = makeSwatch(document);

    previewer.attach(first, { icon: { id: "one", style: { fill: "#123" } } });
    previewer.attach(second, { icon: { id: "two", style: { fill: "#456" } } });

    expect(raf).toHaveBeenCalledTimes(1);
    const firstPreview = previewer.previews.get(first)?.preview;
    const secondPreview = previewer.previews.get(second)?.preview;
    const stepOne = vi.spyOn(firstPreview, "step");
    const stepTwo = vi.spyOn(secondPreview, "step");

    rafCallback?.(16);

    expect(stepOne).toHaveBeenCalled();
    expect(stepTwo).toHaveBeenCalled();

    const scheduled = previewer._frame;
    previewer.stop();
    expect(cancel).toHaveBeenCalledWith(scheduled);
  });

  it("clears stale option swatches without dropping launcher previews", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    const launcher = makeSwatch(document);
    const option = makeSwatch(document);

    previewer.attach(launcher, { icon: { id: "launcher" }, group: "launcher" });
    previewer.attach(option, { icon: { id: "option" }, group: "options" });
    expect(previewer.previews.size).toBe(2);

    previewer.sync([], { group: "options" });

    const groups = Array.from(previewer.previews.values()).map((p) => p.group);
    expect(groups).toContain("launcher");
    expect(groups).not.toContain("options");
  });
});
