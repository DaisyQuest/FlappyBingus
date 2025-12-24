import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import {
  DEFAULT_PIPE_TEXTURE_HINT,
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
    expect(container.querySelector(".pipe-texture-swatch-canvas")).toBeInstanceOf(dom.window.HTMLCanvasElement);
  });

  it("describes lock status and hover text", () => {
    expect(describePipeTextureLock(TEXTURES[1], { unlocked: false })).toContain("Locked");
    expect(pipeTextureHoverText(TEXTURES[0], { unlocked: true })).toContain("Click to equip");
    expect(pipeTextureHoverText(TEXTURES[1], { unlocked: false })).toContain("Locked");
    expect(DEFAULT_PIPE_TEXTURE_HINT).toContain("pipe texture");
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
