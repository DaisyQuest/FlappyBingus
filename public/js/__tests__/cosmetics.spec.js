import { describe, expect, it, vi } from "vitest";
import {
  createIconLookup,
  makeReplayCosmeticsApplier,
  resolveActiveCosmetics
} from "../main/cosmetics.js";

describe("cosmetics helpers", () => {
  it("tracks icons with a lookup map", () => {
    const lookup = createIconLookup([{ id: "spark" }, { id: "dash" }]);

    expect(lookup.getById("spark")).toEqual({ id: "spark" });
    expect(lookup.getFallback()).toEqual({ id: "spark" });

    lookup.setIcons([{ id: "nova" }]);
    expect(lookup.getById("spark")).toBeUndefined();
    expect(lookup.getFallback()).toEqual({ id: "nova" });
  });

  it("resolves active cosmetics with user selections or defaults", () => {
    const defaults = {
      trailId: "classic",
      iconId: "default-icon",
      pipeTextureId: "default-pipe",
      pipeTextureMode: "solid"
    };

    expect(resolveActiveCosmetics({
      user: null,
      currentTrailId: "custom-trail",
      currentIconId: null,
      currentPipeTextureId: null,
      currentPipeTextureMode: null,
      defaults
    })).toEqual({
      trailId: "custom-trail",
      iconId: "default-icon",
      pipeTextureId: "default-pipe",
      pipeTextureMode: "solid"
    });

    expect(resolveActiveCosmetics({
      user: { selectedTrail: "user-trail", selectedIcon: "user-icon", selectedPipeTexture: "user-pipe", pipeTextureMode: "striped" },
      currentTrailId: "custom-trail",
      currentIconId: "custom-icon",
      currentPipeTextureId: "custom-pipe",
      currentPipeTextureMode: "glow",
      defaults
    })).toEqual({
      trailId: "user-trail",
      iconId: "user-icon",
      pipeTextureId: "user-pipe",
      pipeTextureMode: "striped"
    });
  });

  it("applies replay cosmetics and restores originals", () => {
    const targetGame = {
      getTrailId: () => "old-trail",
      getPipeTexture: () => ({ id: "old-pipe", mode: "old-mode" }),
      playerImg: "old-img",
      setPlayerImage: vi.fn()
    };
    const resolveCosmetics = () => ({
      trailId: "fallback-trail",
      iconId: "fallback-icon",
      pipeTextureId: "fallback-pipe",
      pipeTextureMode: "fallback-mode"
    });
    const iconLookup = {
      getById: vi.fn((id) => (id === "selected-icon" ? { id } : null)),
      getFallback: vi.fn(() => ({ id: "fallback-icon" }))
    };
    const normalizePipeTextureMode = vi.fn((mode) => `normalized-${mode}`);
    const getCachedIconSprite = vi.fn((icon) => `sprite-${icon.id}`);

    const apply = makeReplayCosmeticsApplier({
      targetGame,
      resolveCosmetics,
      iconLookup,
      normalizePipeTextureMode,
      getCachedIconSprite
    });

    const reset = apply({
      trailId: "run-trail",
      iconId: "selected-icon",
      pipeTextureId: "run-pipe",
      pipeTextureMode: "run-mode"
    });

    expect(targetGame.getTrailId()).toBe("run-trail");
    expect(targetGame.getPipeTexture()).toEqual({ id: "run-pipe", mode: "normalized-run-mode" });
    expect(getCachedIconSprite).toHaveBeenCalledWith({ id: "selected-icon" });
    expect(targetGame.setPlayerImage).toHaveBeenCalledWith("sprite-selected-icon");

    reset();

    expect(targetGame.getTrailId()).toBe("old-trail");
    expect(targetGame.getPipeTexture()).toEqual({ id: "old-pipe", mode: "old-mode" });
    expect(targetGame.setPlayerImage).toHaveBeenLastCalledWith("old-img");
  });

  it("falls back to defaults when cosmetics are blank", () => {
    const targetGame = {
      getTrailId: () => "old-trail",
      getPipeTexture: () => ({ id: "old-pipe", mode: "old-mode" }),
      playerImg: "old-img",
      setPlayerImage: vi.fn()
    };
    const resolveCosmetics = () => ({
      trailId: "fallback-trail",
      iconId: "fallback-icon",
      pipeTextureId: "fallback-pipe",
      pipeTextureMode: "fallback-mode"
    });
    const iconLookup = {
      getById: vi.fn(() => null),
      getFallback: vi.fn(() => ({ id: "fallback-icon" }))
    };

    const apply = makeReplayCosmeticsApplier({
      targetGame,
      resolveCosmetics,
      iconLookup,
      normalizePipeTextureMode: (mode) => mode,
      getCachedIconSprite: (icon) => `sprite-${icon.id}`
    });

    apply({
      trailId: "",
      iconId: "  ",
      pipeTextureId: "",
      pipeTextureMode: null
    });

    expect(targetGame.getTrailId()).toBe("fallback-trail");
    expect(targetGame.getPipeTexture()).toEqual({ id: "fallback-pipe", mode: "fallback-mode" });
    expect(targetGame.setPlayerImage).toHaveBeenCalledWith("sprite-fallback-icon");
  });
});
