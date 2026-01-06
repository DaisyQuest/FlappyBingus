import { describe, expect, it, vi } from "vitest";
import { drawPipe, resolvePipeTextureSelection } from "../pipes/pipeRendering.js";
import { DEFAULT_PIPE_TEXTURE_ID, DEFAULT_PIPE_TEXTURE_MODE } from "../pipeTextures.js";
import * as pipeTextures from "../pipeTextures.js";

const makeCtx = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; }
});

describe("pipe rendering helpers", () => {
  it("resolves monochrome defaults when simple textures are enabled", () => {
    const resolved = resolvePipeTextureSelection({ skillSettings: { simpleTextures: true }, selection: { id: "gold" } });

    expect(resolved).toEqual({ textureId: DEFAULT_PIPE_TEXTURE_ID, mode: "MONOCHROME" });
  });

  it("resolves selection strings and object selections with normalized modes", () => {
    const fromString = resolvePipeTextureSelection({ selection: "neon" });
    expect(fromString).toEqual({ textureId: "neon", mode: DEFAULT_PIPE_TEXTURE_MODE });

    const fromObject = resolvePipeTextureSelection({ selection: { id: "glass", mode: "ultra" } });
    expect(fromObject).toEqual({ textureId: "glass", mode: "ULTRA" });
  });

  it("falls back to defaults when selection is missing or invalid", () => {
    const missing = resolvePipeTextureSelection({ selection: null });
    expect(missing).toEqual({ textureId: DEFAULT_PIPE_TEXTURE_ID, mode: DEFAULT_PIPE_TEXTURE_MODE });

    const invalid = resolvePipeTextureSelection({ selection: { id: " ", mode: "unknown" } });
    expect(invalid).toEqual({ textureId: DEFAULT_PIPE_TEXTURE_ID, mode: DEFAULT_PIPE_TEXTURE_MODE });
  });

  it("draws minimal pipes when extreme low detail is enabled", () => {
    const ctx = makeCtx();
    const drawSpy = vi.spyOn(pipeTextures, "drawPipeTexture");
    const pipe = { x: 1, y: 2, w: 3, h: 4 };

    drawPipe(ctx, pipe, { r: 10, g: 20, b: 30 }, { skillSettings: { extremeLowDetail: true } });

    expect(ctx.fillRect).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(drawSpy).not.toHaveBeenCalled();
  });

  it("renders textured pipes with resolved selection data", () => {
    const ctx = makeCtx();
    const drawSpy = vi.spyOn(pipeTextures, "drawPipeTexture").mockImplementation(() => {});
    const pipe = { x: 0, y: 0, w: 10, h: 20 };

    drawPipe(ctx, pipe, "#fff", { selection: { id: "glass", mode: "high" }, time: 4 });

    expect(drawSpy).toHaveBeenCalledWith(ctx, pipe, "#fff", {
      textureId: "glass",
      mode: "HIGH",
      time: 4
    });
  });
});
