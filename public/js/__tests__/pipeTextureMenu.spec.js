import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import {
  DEFAULT_PIPE_TEXTURE_HINT,
  PIPE_TEXTURE_SWATCH_HEIGHT,
  PIPE_TEXTURE_SWATCH_WIDTH,
  describePipeTextureLock,
  pipeTextureHoverText,
  renderPipeTextureOptions,
  togglePipeTextureMenu
} from "../pipeTextureMenu.js";

const TEXTURES = [
  { id: "basic", name: "Basic", unlock: { type: "free", label: "Free" } },
  { id: "locked", name: "Locked", unlock: { type: "score", minScore: 50 } }
];

describe("pipeTextureMenu helpers", () => {
  it("renders pipe texture buttons with lock indicators", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const document = dom.window.document;
    const container = document.getElementById("root");

    const { rendered, swatches } = renderPipeTextureOptions({
      container,
      textures: TEXTURES,
      selectedId: "basic",
      unlockedIds: new Set(["basic"])
    });

    expect(rendered).toBe(2);
    expect(swatches.length).toBe(2);
    const buttons = Array.from(container.querySelectorAll("button[data-pipe-texture-id]"));
    expect(buttons).toHaveLength(2);
    const locked = buttons.find((b) => b.dataset.pipeTextureId === "locked");
    expect(locked?.querySelector(".pipe-texture-lock")?.textContent).toBe("🔒");
    const canvas = container.querySelector(".pipe-texture-swatch-canvas");
    expect(canvas).toBeInstanceOf(dom.window.HTMLCanvasElement);
    expect(canvas?.width).toBe(PIPE_TEXTURE_SWATCH_WIDTH);
    expect(canvas?.height).toBe(PIPE_TEXTURE_SWATCH_HEIGHT);
  });

  it("describes lock status and hover text", () => {
    expect(describePipeTextureLock(TEXTURES[1], { unlocked: false })).toContain("Locked");
    expect(pipeTextureHoverText(TEXTURES[0], { unlocked: true })).toContain("Click to equip");
    expect(pipeTextureHoverText(TEXTURES[1], { unlocked: false })).toContain("Locked");
    expect(DEFAULT_PIPE_TEXTURE_HINT).toContain("pipe texture");
  });

  it("handles empty state and custom swatch sizes", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const document = dom.window.document;
    const container = document.getElementById("root");

    const { rendered } = renderPipeTextureOptions({ container, textures: [] });
    expect(rendered).toBe(0);
    expect(container?.querySelector(".hint.bad")?.textContent).toContain("No pipe textures");

    renderPipeTextureOptions({
      container,
      textures: TEXTURES.slice(0, 1),
      unlockedIds: new Set(["basic"]),
      swatchSize: { width: 160, height: 90 }
    });
    const canvas = container?.querySelector(".pipe-texture-swatch-canvas");
    expect(canvas?.width).toBe(160);
    expect(canvas?.height).toBe(90);
  });

  it("invokes callbacks when rendering swatches", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const document = dom.window.document;
    const container = document.getElementById("root");
    const swatches = [];

    renderPipeTextureOptions({
      container,
      textures: TEXTURES,
      unlockedIds: new Set(["basic"]),
      lockTextFor: () => "Custom lock message",
      onRenderSwatch: (payload) => swatches.push(payload)
    });

    const lockedButton = container?.querySelector("[data-pipe-texture-id='locked']");
    expect(lockedButton?.dataset.statusText).toBe("Custom lock message");
    expect(swatches).toHaveLength(2);
  });

  it("toggles pipe texture overlay visibility", () => {
    const dom = new JSDOM("<!doctype html><body><div id='overlay' class='hidden'></div></body>");
    const overlay = dom.window.document.getElementById("overlay");

    togglePipeTextureMenu(overlay, true);
    expect(overlay?.classList.contains("hidden")).toBe(false);
    expect(overlay?.getAttribute("aria-hidden")).toBe("false");

    togglePipeTextureMenu(overlay, false);
    expect(overlay?.classList.contains("hidden")).toBe(true);
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");
  });
});
