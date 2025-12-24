"use strict";

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIPE_TEXTURE_MODE,
  PIPE_TEXTURES,
  normalizePipeTextureMode,
  normalizePipeTextures
} from "../pipeTextures.cjs";

describe("pipeTextures service helpers", () => {
  it("normalizes pipe texture modes", () => {
    expect(normalizePipeTextureMode("ultra")).toBe("ULTRA");
    expect(normalizePipeTextureMode("invalid")).toBe(DEFAULT_PIPE_TEXTURE_MODE);
    expect(normalizePipeTextureMode(null)).toBe(DEFAULT_PIPE_TEXTURE_MODE);
  });

  it("normalizes pipe texture definitions with defaults", () => {
    const normalized = normalizePipeTextures(null);
    expect(normalized.length).toBe(PIPE_TEXTURES.length);
    expect(normalized[0].unlock).toBeTruthy();
  });
});
