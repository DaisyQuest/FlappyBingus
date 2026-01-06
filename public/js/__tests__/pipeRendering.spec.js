import { afterEach, describe, expect, it, vi } from "vitest";
import { drawPipe } from "../pipes/pipeRendering.js";
import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE
} from "../pipeTextures.js";
import * as pipeTextures from "../pipeTextures.js";

const makeCtx = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; }
});

const basePipe = { x: 10, y: 12, w: 30, h: 40 };

describe("pipeRendering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders low-detail pipes without textures", () => {
    const ctx = makeCtx();
    const drawSpy = vi.spyOn(pipeTextures, "drawPipeTexture");
    drawPipe(ctx, basePipe, "#fff", {
      skillSettings: { extremeLowDetail: true },
      cfg: { pipes: { colors: { stroke: "#111" }, strokeWidth: 2 } }
    });

    expect(ctx.fillRect).toHaveBeenCalledWith(basePipe.x, basePipe.y, basePipe.w, basePipe.h);
    expect(ctx.strokeRect).toHaveBeenCalled();
    expect(drawSpy).not.toHaveBeenCalled();
  });

  it("forces monochrome basic textures when simple textures are enabled", () => {
    const ctx = makeCtx();
    const drawSpy = vi.spyOn(pipeTextures, "drawPipeTexture");
    drawSpy.mockImplementation(() => {});
    drawPipe(ctx, basePipe, "#fff", {
      skillSettings: { simpleTextures: true },
      cfg: { pipes: { colors: { stroke: "#000" }, strokeWidth: 1 } },
      timeAlive: 2,
      getPipeTexture: () => ({ id: "fancy", mode: "GLOW" })
    });

    expect(drawSpy).toHaveBeenCalledWith(ctx, basePipe, "#fff", expect.objectContaining({
      textureId: DEFAULT_PIPE_TEXTURE_ID,
      mode: "MONOCHROME",
      time: 2
    }));
  });

  it("normalizes texture modes for selected pipes", () => {
    const ctx = makeCtx();
    const drawSpy = vi.spyOn(pipeTextures, "drawPipeTexture");
    drawSpy.mockImplementation(() => {});
    drawPipe(ctx, basePipe, "#fff", {
      skillSettings: { simpleTextures: false },
      cfg: { pipes: { colors: { stroke: "#000" }, strokeWidth: 2 } },
      getPipeTexture: () => ({ id: "glow", mode: "invalid" })
    });

    expect(drawSpy).toHaveBeenCalledWith(ctx, basePipe, "#fff", expect.objectContaining({
      textureId: "glow",
      mode: DEFAULT_PIPE_TEXTURE_MODE
    }));
  });
});
