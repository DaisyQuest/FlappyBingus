import { describe, expect, it, vi } from "vitest";
import { createSessionFlows } from "../sessionFlows.js";

const buildDeps = (overrides = {}) => {
  const net = overrides.net || { user: null, online: true, trails: [{ id: "classic" }], icons: [{ id: "cached" }], pipeTextures: [] };
  const deps = {
    apiGetMe: vi.fn(),
    apiGetIconRegistry: vi.fn(),
    apiGetHighscores: vi.fn().mockResolvedValue({ ok: true, highscores: [] }),
    apiGetStats: vi.fn().mockResolvedValue({ ok: false }),
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
  it("prefers the icon registry when user icons are empty", async () => {
    const registryIcons = [{ id: "registry" }];
    const deps = buildDeps({
      apiGetMe: vi.fn().mockResolvedValue({ ok: true, user: { username: "pilot" }, icons: [] }),
      apiGetIconRegistry: vi.fn().mockResolvedValue({ ok: true, icons: registryIcons })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.syncIconCatalog).toHaveBeenCalledWith(registryIcons);
  });

  it("clears trails and syncs unlockables when the profile fetch fails", async () => {
    const deps = buildDeps({
      apiGetMe: vi.fn().mockResolvedValue({ ok: false }),
      apiGetIconRegistry: vi.fn().mockResolvedValue({ ok: true, icons: [] })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.net.trails).toEqual([]);
    expect(deps.syncUnlockablesCatalog).toHaveBeenCalledWith({ trails: [] });
  });

  it("syncs an empty icon catalog when no sources return icons", async () => {
    const deps = buildDeps({
      net: { user: null, online: true, trails: [], icons: [], pipeTextures: [] },
      apiGetMe: vi.fn().mockResolvedValue({ ok: true, user: { username: "pilot" }, icons: [] }),
      apiGetIconRegistry: vi.fn().mockResolvedValue({ ok: true, icons: [] })
    });

    const { refreshProfileAndHighscores } = createSessionFlows(deps);
    await refreshProfileAndHighscores();

    expect(deps.syncIconCatalog).toHaveBeenCalledWith([]);
  });
});
