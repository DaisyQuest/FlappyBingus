import { beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

const previewInstances = [];

vi.mock("../trailPreview.js", () => ({
  TrailPreview: class {
    constructor({ canvas, anchor, playerImg }) {
      this.canvas = canvas;
      this.anchor = anchor;
      this.playerImg = playerImg;
      this.setPlayerImage = vi.fn();
      this.setTrail = vi.fn();
      this.step = vi.fn();
      previewInstances.push(this);
    }
  }
}));

vi.mock("../playerIconSprites.js", () => ({
  createPlayerIconSprite: vi.fn((icon) => ({ ...icon, mocked: true }))
}));

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
    previewInstances.length = 0;
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

  it("updates previews when icons or trails change", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    const swatch = makeSwatch(document);
    const preview = previewer.attach(swatch, { icon: { id: "alpha" }, trailId: "classic" });

    previewer.attach(swatch, { icon: { id: "beta" }, trailId: "ember" });

    expect(preview.setPlayerImage).toHaveBeenCalled();
    expect(preview.setTrail).toHaveBeenCalledWith("ember");
  });

  it("stops ticking when no previews remain", () => {
    let rafCallback = null;
    const raf = vi.fn((cb) => { rafCallback = cb; return 1; });
    const previewer = new IconTrailPreviewer({ requestFrame: raf, cancelFrame: null, now: () => 0 });

    previewer.running = true;
    previewer._tick();
    expect(previewer.running).toBe(false);

    previewer.attach(makeSwatch(document), { icon: { id: "gamma" } });
    previewer.running = true;
    rafCallback?.(10);
    expect(previewer.previews.size).toBe(1);
  });

  it("does not start when no RAF is available", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    previewer.attach(makeSwatch(document), { icon: { id: "delta" } });
    previewer.start();
    expect(previewer.running).toBe(false);
  });

  it("returns null when attach is missing required elements", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    const empty = document.createElement("div");

    expect(previewer.attach(null)).toBeNull();
    expect(previewer.attach(empty)).toBeNull();
  });

  it("caches sprites across swatches sharing an icon id", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    const first = makeSwatch(document);
    const second = makeSwatch(document);

    previewer.attach(first, { icon: { id: "same" } });
    previewer.attach(second, { icon: { id: "same" } });

    expect(previewInstances).toHaveLength(2);
    expect(previewInstances[0].playerImg).toEqual({ id: "same", mocked: true });
    expect(previewInstances[1].playerImg).toEqual({ id: "same", mocked: true });
  });

  it("stores provided sprites and reuses them on later attaches", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    const sprite = { id: "provided" };
    const first = makeSwatch(document);
    const second = makeSwatch(document);

    previewer.attach(first, { icon: { id: "provided" }, playerImg: sprite });
    previewer.attach(second, { icon: { id: "provided" } });

    expect(previewInstances[0].playerImg).toBe(sprite);
    expect(previewInstances[1].playerImg).toBe(sprite);
  });

  it("stops immediately when RAF scheduling fails", () => {
    const raf = vi.fn(() => null);
    const previewer = new IconTrailPreviewer({ requestFrame: raf, cancelFrame: null, now: () => 0 });

    previewer.attach(makeSwatch(document), { icon: { id: "halt" } });
    previewer.start();

    expect(raf).toHaveBeenCalled();
    expect(previewer.running).toBe(false);
    expect(previewer._frame).toBeNull();
  });

  it("keeps preview entries when synced by swatch property", () => {
    const previewer = new IconTrailPreviewer({ requestFrame: null, cancelFrame: null, now: () => 0 });
    const swatch = makeSwatch(document);

    previewer.sync([{ swatch, icon: { id: "swatch" } }], { group: "options" });

    expect(previewer.previews.size).toBe(1);
    expect(previewer.previews.has(swatch)).toBe(true);
  });
});
