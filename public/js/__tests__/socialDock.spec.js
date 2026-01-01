import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { initSocialDock } from "../socialDock.js";

const buildDock = () => {
  const dom = new JSDOM("<!doctype html><body></body>");
  const { document } = dom.window;
  const dock = document.createElement("div");
  dock.className = "social-dock";

  const discordButton = document.createElement("button");
  discordButton.id = "discordButton";
  const discordPopover = document.createElement("div");
  discordPopover.id = "discordPopover";

  const donateButton = document.createElement("button");
  donateButton.id = "donateButton";
  const donatePopover = document.createElement("div");
  donatePopover.id = "donatePopover";

  dock.append(discordButton, discordPopover, donateButton, donatePopover);
  document.body.append(dock);

  return {
    document,
    dock,
    discordButton,
    discordPopover,
    donateButton,
    donatePopover
  };
};

describe("initSocialDock", () => {
  it("toggles popovers and keeps aria state in sync", () => {
    const { document, dock, discordButton, discordPopover, donateButton, donatePopover } = buildDock();

    initSocialDock({
      discordButton,
      donateButton,
      discordPopover,
      donatePopover,
      dock,
      document
    });

    expect(discordButton.getAttribute("aria-expanded")).toBe("false");
    expect(donateButton.getAttribute("aria-expanded")).toBe("false");
    expect(discordPopover.hidden).toBe(true);
    expect(donatePopover.hidden).toBe(true);

    discordButton.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
    expect(discordButton.getAttribute("aria-expanded")).toBe("true");
    expect(discordPopover.hidden).toBe(false);
    expect(donateButton.getAttribute("aria-expanded")).toBe("false");
    expect(donatePopover.hidden).toBe(true);

    donateButton.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
    expect(donateButton.getAttribute("aria-expanded")).toBe("true");
    expect(donatePopover.hidden).toBe(false);
    expect(discordButton.getAttribute("aria-expanded")).toBe("false");
    expect(discordPopover.hidden).toBe(true);

    donateButton.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
    expect(donatePopover.hidden).toBe(true);
    expect(donateButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes popovers on outside click and escape", () => {
    const { document, dock, discordButton, discordPopover, donateButton, donatePopover } = buildDock();

    initSocialDock({
      discordButton,
      donateButton,
      discordPopover,
      donatePopover,
      dock,
      document
    });

    discordButton.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
    expect(discordPopover.hidden).toBe(false);

    document.body.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
    expect(discordPopover.hidden).toBe(true);

    donateButton.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
    expect(donatePopover.hidden).toBe(false);

    document.dispatchEvent(new document.defaultView.KeyboardEvent("keydown", { key: "Escape" }));
    expect(donatePopover.hidden).toBe(true);
  });

  it("returns early when controls are missing", () => {
    const { document } = new JSDOM("<!doctype html><body></body>").window;
    expect(() => initSocialDock({ document })).not.toThrow();
  });
});
