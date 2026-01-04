import { describe, expect, it, vi } from "vitest";
import { createBootState, createNetState } from "../main/state.js";

describe("main state", () => {
  it("creates a boot state with expected defaults", () => {
    const boot = createBootState();

    expect(boot).toEqual({
      imgReady: false,
      imgOk: false,
      cfgReady: false,
      cfgOk: false,
      cfgSrc: "defaults"
    });
  });

  it("builds net state with normalized assets and cloned arrays", () => {
    const defaultTrails = [{ id: "trail-1" }];
    const icons = [{ id: "icon-1" }];
    const normalizePipeTextures = vi.fn(() => [{ id: "pipe-1" }]);
    const achievements = {
      definitions: [{ id: "ach-1" }],
      normalizeState: vi.fn(() => ({ done: true }))
    };
    const buildUnlockablesCatalog = vi.fn(({ trails, icons, pipeTextures }) => ({
      unlockables: [trails[0]?.id, icons[0]?.id, pipeTextures[0]?.id]
    }));

    const net = createNetState({
      defaultTrails,
      icons,
      normalizePipeTextures,
      achievements,
      buildUnlockablesCatalog
    });

    expect(net.trails).toEqual([]);
    expect(net.icons).toHaveLength(1);
    expect(net.icons).not.toBe(icons);
    expect(net.icons[0]).not.toBe(icons[0]);
    expect(net.pipeTextures).toEqual([{ id: "pipe-1" }]);
    expect(net.achievements.definitions).toEqual([{ id: "ach-1" }]);
    expect(net.achievements.state).toEqual({ done: true });
    expect(achievements.normalizeState).toHaveBeenCalled();
    expect(buildUnlockablesCatalog).toHaveBeenCalledWith({
      trails: net.trails,
      icons: net.icons,
      pipeTextures: net.pipeTextures
    });
  });
});
