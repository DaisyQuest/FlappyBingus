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

  it("filters invalid entries and deduplicates ids", () => {
    const normalized = normalizePipeTextures([
      null,
      { id: " custom ", name: "" },
      { id: "custom", name: "Duplicate" },
      { id: "", name: "Missing" }
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe("custom");
    expect(normalized[0].name).toBe("custom");
    expect(normalized[0].unlock).toBeTruthy();
  });
});
