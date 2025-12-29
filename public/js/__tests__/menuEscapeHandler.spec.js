/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

import { handleMenuEscape, __testables } from "../menuEscapeHandler.js";

describe("menuEscapeHandler", () => {
  it("ignores non-escape keys", () => {
    const closeTrailMenu = vi.fn();
    const handled = handleMenuEscape({ code: "Enter" }, { closeTrailMenu });

    expect(handled).toBe(false);
    expect(closeTrailMenu).not.toHaveBeenCalled();
  });

  it("closes the trail menu first when visible", () => {
    const trailOverlay = document.createElement("div");
    const closeTrailMenu = vi.fn();
    const closeIconMenu = vi.fn();
    const closePipeTextureMenu = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleMenuEscape({ code: "Escape", preventDefault }, {
      trailOverlay,
      iconOverlay: document.createElement("div"),
      pipeTextureOverlay: document.createElement("div"),
      closeTrailMenu,
      closeIconMenu,
      closePipeTextureMenu
    });

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(closeTrailMenu).toHaveBeenCalledTimes(1);
    expect(closeIconMenu).not.toHaveBeenCalled();
    expect(closePipeTextureMenu).not.toHaveBeenCalled();
  });

  it("closes the icon menu when trail menu is hidden", () => {
    const trailOverlay = document.createElement("div");
    trailOverlay.classList.add("hidden");
    const iconOverlay = document.createElement("div");
    const closeIconMenu = vi.fn();

    const handled = handleMenuEscape({ code: "Escape", preventDefault: vi.fn() }, {
      trailOverlay,
      iconOverlay,
      closeIconMenu
    });

    expect(handled).toBe(true);
    expect(closeIconMenu).toHaveBeenCalledTimes(1);
  });

  it("closes the pipe texture menu when others are hidden", () => {
    const trailOverlay = document.createElement("div");
    trailOverlay.classList.add("hidden");
    const iconOverlay = document.createElement("div");
    iconOverlay.classList.add("hidden");
    const pipeTextureOverlay = document.createElement("div");
    const closePipeTextureMenu = vi.fn();

    const handled = handleMenuEscape({ code: "Escape", preventDefault: vi.fn() }, {
      trailOverlay,
      iconOverlay,
      pipeTextureOverlay,
      closePipeTextureMenu
    });

    expect(handled).toBe(true);
    expect(closePipeTextureMenu).toHaveBeenCalledTimes(1);
  });

  it("returns false when no overlays are open", () => {
    const trailOverlay = document.createElement("div");
    const iconOverlay = document.createElement("div");
    const pipeTextureOverlay = document.createElement("div");
    trailOverlay.classList.add("hidden");
    iconOverlay.classList.add("hidden");
    pipeTextureOverlay.classList.add("hidden");

    const handled = handleMenuEscape({ code: "Escape", preventDefault: vi.fn() }, {
      trailOverlay,
      iconOverlay,
      pipeTextureOverlay
    });

    expect(handled).toBe(false);
  });
});

describe("menuEscapeHandler internals", () => {
  it("detects overlay visibility by hidden class", () => {
    const overlay = document.createElement("div");
    expect(__testables.isOverlayOpen(overlay)).toBe(true);
    overlay.classList.add("hidden");
    expect(__testables.isOverlayOpen(overlay)).toBe(false);
  });
});
