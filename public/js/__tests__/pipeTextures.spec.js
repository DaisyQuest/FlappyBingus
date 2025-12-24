import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  PIPE_TEXTURES,
  getPipeTextureDisplayName,
  normalizePipeTextureMode,
  normalizePipeTextures,
  paintPipeTextureSwatch
} from "../pipeTextures.js";

describe("pipeTextures", () => {
  it("normalizes texture modes with fallbacks", () => {
    expect(normalizePipeTextureMode("ultra")).toBe("ULTRA");
    expect(normalizePipeTextureMode("unknown")).toBe(DEFAULT_PIPE_TEXTURE_MODE);
    expect(normalizePipeTextureMode(null)).toBe(DEFAULT_PIPE_TEXTURE_MODE);
  });

  it("normalizes pipe texture definitions", () => {
    const custom = normalizePipeTextures([
      { id: "basic", name: "Basic", unlock: { type: "free" } },
      { id: "basic", name: "Dup" },
      { id: "glass", name: "Glass" }
    ]);
    expect(custom).toHaveLength(2);
    expect(custom[0].unlock).toMatchObject({ type: "free" });
  });

  it("falls back to defaults when definitions are missing", () => {
    const normalized = normalizePipeTextures(null);
    expect(normalized.length).toBe(PIPE_TEXTURES.length);
  });

  it("resolves display names with defaults", () => {
    expect(getPipeTextureDisplayName("basic", PIPE_TEXTURES)).toBe("Basic");
    expect(getPipeTextureDisplayName("unknown", PIPE_TEXTURES)).toBe("unknown");
    expect(getPipeTextureDisplayName("", PIPE_TEXTURES)).toBe(DEFAULT_PIPE_TEXTURE_ID);
  });

  it("paints swatches safely even with missing contexts", () => {
    const canvas = { getContext: () => null };
    expect(() => paintPipeTextureSwatch(canvas, "basic")).not.toThrow();
  });
});
