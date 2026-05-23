import { describe, it, expect, vi } from "vitest";
import { createAppBootstrap } from "../appBootstrap.js";

describe("appBootstrap", () => {
  it("builds boot and net state with icon defaults", () => {
    const createBootState = vi.fn(() => ({ ready: true }));
    const createNetState = vi.fn(() => ({ online: true }));
    const buildBaseIcons = vi.fn(() => [{ id: "icon" }]);
    const normalizePlayerIcons = vi.fn((icons) => icons);
    const getFirstIconId = vi.fn(() => "icon");

    const result = createAppBootstrap({
      createBootState,
      createNetState,
      buildBaseIcons,
      normalizePlayerIcons,
      getFirstIconId,
      DEFAULT_TRAILS: [],
      normalizePipeTextures: () => [],
      ACHIEVEMENTS: [],
      normalizeAchievementState: (state) => state,
      buildUnlockablesCatalog: () => ({})
    });

    expect(result.boot.ready).toBe(true);
    expect(result.net.online).toBe(true);
    expect(result.fallbackIconId).toBe("icon");
    expect(createNetState).toHaveBeenCalled();
  });
});
