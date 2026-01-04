import { describe, expect, it, vi } from "vitest";
import { createSessionFlows } from "../sessionFlows.js";

const buildDeps = (overrides = {}) => {
  const net = overrides.net || { user: null, online: true, trails: [{ id: "classic" }], icons: [{ id: "cached" }], pipeTextures: [] };
  const deps = {
    apiSync: vi.fn(),
    apiRegister: vi.fn(),
    apiSetKeybinds: vi.fn(),
    setMenuSubtitle: vi.fn(),
    formatWorldwideRuns: vi.fn((v) => String(v)),
    net,
    setNetUser: vi.fn((user) => {
      net.user = user;
    }),
    mergeTrailCatalog: vi.fn((trails) => trails),
    syncUnlockablesCatalog: vi.fn(),
    syncIconCatalog: vi.fn(),
    syncPipeTextureCatalog: vi.fn(),
    applyAchievementsPayload: vi.fn(),
    normalizeAchievementState: vi.fn(() => ({ unlocked: {} })),
    ACHIEVEMENTS: [],
    mergeBinds: vi.fn((a, b) => ({ ...a, ...b })),
    DEFAULT_KEYBINDS: { jump: "space" },
    updateSkillSettings: vi.fn(),
    setUserHint: vi.fn(),
    refreshTrailMenu: vi.fn(() => ({ selected: "classic", best: 0 })),
    applyIconSelection: vi.fn(() => "classic"),
    normalizePipeTextureMode: vi.fn((mode) => mode),
    writePipeTextureModeCookie: vi.fn(),
    refreshPipeTextureMenu: vi.fn(() => ({ selected: "pipe-1" })),
    applyPipeTextureSelection: vi.fn(),
    syncMenuProfileBindingsFromState: vi.fn(),
    renderHighscoresUI: vi.fn(),
    renderAchievements: vi.fn(),
    renderBindUI: vi.fn(),
    refreshBootUI: vi.fn(),
    playerIcons: [{ id: "fallback" }],
    getPlayerIcons: vi.fn(() => [{ id: "from-getter" }]),
    getCurrentIconId: vi.fn(() => "fallback"),
    getCurrentPipeTextureId: vi.fn(() => "pipe-1"),
    getCurrentPipeTextureMode: vi.fn(() => "mode"),
    setCurrentPipeTextureMode: vi.fn(),
    setBinds: vi.fn(),
    getSkillSettings: vi.fn(() => ({})),
    usernameInput: { value: "" },
    userHint: null
  };

  return { ...deps, ...overrides, net };
};

describe("sessionFlows", () => {
  it("syncs the icon catalog from the sync payload", async () => {
    const syncIcons = [{ id: "synced" }];
    const deps = buildDeps({
      apiSync: vi.fn().mockResolvedValue({
        ok: true,
        user: { username: "pilot" },
        trails: [],
        icons: syncIcons,
        pipeTextures: [],
        achievements: {},
        highscores: [],
        stats: { totalRuns: 10 }
      })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.syncIconCatalog).toHaveBeenCalledWith(syncIcons);
    expect(deps.formatWorldwideRuns).toHaveBeenCalledWith(10);
    expect(deps.setMenuSubtitle).toHaveBeenCalledWith("10");
  });

  it("falls back to cached icons when sync returns an empty list", async () => {
    const deps = buildDeps({
      apiSync: vi.fn().mockResolvedValue({
        ok: true,
        user: { username: "pilot" },
        trails: [],
        icons: [],
        pipeTextures: [],
        achievements: {},
        highscores: [],
        stats: {}
      })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.syncIconCatalog).toHaveBeenCalledWith([{ id: "cached" }]);
  });

  it("clears trails and syncs unlockables when the sync fetch fails", async () => {
    const deps = buildDeps({
      apiSync: vi.fn().mockResolvedValue({ ok: false })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.net.trails).toEqual([]);
    expect(deps.syncUnlockablesCatalog).toHaveBeenCalledWith({ trails: [] });
  });

  it("applies icon selection using the latest icons from the getter", async () => {
    const deps = buildDeps({
      apiSync: vi.fn().mockResolvedValue({
        ok: true,
        user: { username: "pilot" },
        trails: [],
        icons: [{ id: "synced" }],
        pipeTextures: [],
        achievements: {},
        highscores: [],
        stats: {}
      })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.getPlayerIcons).toHaveBeenCalled();
    expect(deps.applyIconSelection).toHaveBeenCalledWith("fallback", [{ id: "from-getter" }]);
  });

  it("falls back to the provided player icons when no getter is supplied", async () => {
    const deps = buildDeps({
      apiSync: vi.fn().mockResolvedValue({
        ok: true,
        user: { username: "pilot" },
        trails: [],
        icons: [{ id: "synced" }],
        pipeTextures: [],
        achievements: {},
        highscores: [],
        stats: {}
      }),
      getPlayerIcons: null,
      playerIcons: [{ id: "legacy" }]
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.applyIconSelection).toHaveBeenCalledWith("fallback", [{ id: "legacy" }]);
  });
});
