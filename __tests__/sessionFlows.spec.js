import { describe, expect, it, vi } from "vitest";
import { createSessionFlows } from "../public/js/sessionFlows.js";

function createDeps(overrides = {}) {
  const baseNet = {
    online: true,
    user: null,
    trails: [],
    icons: null,
    pipeTextures: [],
    highscores: [],
    achievements: null
  };
  const net = overrides.net ?? baseNet;

  const usernameInput = { value: "" };
  const userHint = { className: "hint", textContent: "" };

  const deps = {
    apiSync: vi.fn(async () => ({
      ok: true,
      user: { username: "bee", keybinds: { jump: "space" }, settings: { dashBehavior: "tap" } },
      trails: [{ id: "classic" }],
      icons: [{ id: "icon-1" }],
      pipeTextures: [{ id: "pipe-1" }],
      achievements: { state: { foo: true } },
      highscores: [{ username: "bee", score: 5 }],
      stats: { totalRuns: 12 }
    })),
    apiRegister: vi.fn(),
    apiSetKeybinds: vi.fn(async () => ({ ok: true })),
    setMenuSubtitle: vi.fn(),
    formatWorldwideRuns: vi.fn((count) => `Runs:${count}`),
    net,
    setNetUser: vi.fn((user) => { net.user = user; }),
    mergeTrailCatalog: vi.fn((trails) => trails || []),
    syncUnlockablesCatalog: vi.fn(),
    syncIconCatalog: vi.fn(),
    syncPipeTextureCatalog: vi.fn(),
    applyAchievementsPayload: vi.fn(),
    normalizeAchievementState: vi.fn(() => ({ normalized: true })),
    ACHIEVEMENTS: [{ id: "a" }],
    mergeBinds: vi.fn((_defaults, serverBinds) => ({ ...serverBinds, shoot: "enter" })),
    DEFAULT_KEYBINDS: { jump: "space" },
    updateSkillSettings: vi.fn(async () => {}),
    setUserHint: vi.fn(),
    refreshTrailMenu: vi.fn(() => ({ selected: "classic", best: 99 })),
    applyIconSelection: vi.fn(() => "icon-1"),
    normalizePipeTextureMode: vi.fn((mode) => mode || "NORMAL"),
    writePipeTextureModeCookie: vi.fn(),
    refreshPipeTextureMenu: vi.fn(() => ({ selected: "pipe-1" })),
    applyPipeTextureSelection: vi.fn(),
    syncMenuProfileBindingsFromState: vi.fn(),
    renderHighscoresUI: vi.fn(),
    renderAchievements: vi.fn(),
    renderBindUI: vi.fn(),
    refreshBootUI: vi.fn(),
    playerIcons: [{ id: "icon-1" }],
    getCurrentIconId: vi.fn(() => "icon-1"),
    getCurrentPipeTextureId: vi.fn(() => "pipe-1"),
    getCurrentPipeTextureMode: vi.fn(() => "NORMAL"),
    setCurrentPipeTextureMode: vi.fn(),
    setBinds: vi.fn(),
    getSkillSettings: vi.fn(() => ({ dashBehavior: "hold" })),
    usernameInput,
    userHint
  };

  const mergedDeps = { ...deps, ...overrides, net };
  return { deps: mergedDeps, net, usernameInput, userHint };
}

describe("session flows", () => {
  it("refreshProfileAndHighscores populates data when online", async () => {
    const { deps, net } = createDeps();
    const flows = createSessionFlows(deps);
    const initialTrails = net.trails;

    await flows.refreshProfileAndHighscores();

    expect(deps.apiSync).toHaveBeenCalledWith(20);
    expect(net.online).toBe(true);
    expect(deps.setNetUser).toHaveBeenCalledWith(expect.objectContaining({ username: "bee" }));
    expect(deps.mergeTrailCatalog).toHaveBeenCalledWith([{ id: "classic" }], { current: initialTrails });
    expect(deps.syncUnlockablesCatalog).toHaveBeenCalledWith({ trails: [{ id: "classic" }] });
    expect(deps.syncIconCatalog).toHaveBeenCalledWith([{ id: "icon-1" }]);
    expect(deps.syncPipeTextureCatalog).toHaveBeenCalledWith([{ id: "pipe-1" }]);
    expect(deps.applyAchievementsPayload).toHaveBeenCalledWith({ state: { foo: true } });
    expect(deps.mergeBinds).toHaveBeenCalledWith(deps.DEFAULT_KEYBINDS, { jump: "space" });
    expect(deps.updateSkillSettings).toHaveBeenCalledWith({ dashBehavior: "tap" }, { persist: false });
    expect(net.highscores).toEqual([{ username: "bee", score: 5 }]);
    expect(deps.setMenuSubtitle).toHaveBeenCalledWith("Runs:12");
    expect(deps.refreshTrailMenu).toHaveBeenCalled();
    expect(deps.applyIconSelection).toHaveBeenCalledWith("icon-1", deps.playerIcons);
    expect(deps.normalizePipeTextureMode).toHaveBeenCalledWith("NORMAL");
    expect(deps.writePipeTextureModeCookie).toHaveBeenCalledWith("NORMAL");
    expect(deps.refreshPipeTextureMenu).toHaveBeenCalledWith("pipe-1");
    expect(deps.applyPipeTextureSelection).toHaveBeenCalledWith("pipe-1", net.pipeTextures);
    expect(deps.syncMenuProfileBindingsFromState).toHaveBeenCalledWith(expect.objectContaining({
      fallbackTrailId: "classic",
      fallbackIconId: "icon-1",
      fallbackPipeTextureId: "pipe-1",
      bestScoreFallback: 99
    }));
    expect(deps.renderHighscoresUI).toHaveBeenCalled();
    expect(deps.renderAchievements).toHaveBeenCalled();
    expect(deps.renderBindUI).toHaveBeenCalled();
    expect(deps.refreshBootUI).toHaveBeenCalled();
  });

  it("refreshProfileAndHighscores handles offline responses", async () => {
    const { deps, net } = createDeps({
      apiSync: vi.fn(async () => ({ ok: false })),
      net: {
        online: true,
        user: { username: "keep" },
        trails: [],
        icons: null,
        pipeTextures: [],
        highscores: [],
        achievements: null
      }
    });
    const flows = createSessionFlows(deps);

    await flows.refreshProfileAndHighscores();

    expect(net.online).toBe(false);
    expect(deps.setNetUser).toHaveBeenCalledWith(null);
    expect(deps.syncIconCatalog).toHaveBeenCalledWith([]);
    expect(net.achievements).toEqual({ definitions: deps.ACHIEVEMENTS, state: { normalized: true } });
    expect(net.highscores).toEqual([]);
  });

  it("refreshProfileAndHighscores preserves user when keepUserOnFailure is true", async () => {
    const { deps, net } = createDeps({
      apiSync: vi.fn(async () => ({ ok: false })),
      net: {
        online: true,
        user: { username: "keep" },
        trails: [],
        icons: null,
        pipeTextures: [],
        highscores: [],
        achievements: null
      }
    });
    const flows = createSessionFlows(deps);

    await flows.refreshProfileAndHighscores({ keepUserOnFailure: true });

    expect(deps.setNetUser).not.toHaveBeenCalled();
    expect(net.user).toEqual({ username: "keep" });
  });

  it("recoverSession reports success when a user is present", async () => {
    const { deps, net } = createDeps();
    const flows = createSessionFlows(deps);

    const recovered = await flows.recoverSession();

    expect(recovered).toBe(true);
    expect(net.user).toEqual(expect.objectContaining({ username: "bee" }));
  });

  it("registerUser handles offline registration attempts", async () => {
    const { deps, net, usernameInput } = createDeps({
      apiRegister: vi.fn(async () => null)
    });
    const flows = createSessionFlows(deps);
    usernameInput.value = "ghost";

    await flows.registerUser();

    expect(net.online).toBe(false);
    expect(deps.setUserHint).toHaveBeenCalled();
    expect(deps.refreshBootUI).toHaveBeenCalled();
  });

  it("registerUser surfaces invalid usernames", async () => {
    const { deps, net, usernameInput, userHint } = createDeps({
      apiRegister: vi.fn(async () => ({ ok: false, status: 400, error: "invalid_username" }))
    });
    const flows = createSessionFlows(deps);
    usernameInput.value = "bad name";

    await flows.registerUser();

    expect(net.online).toBe(true);
    expect(deps.setUserHint).toHaveBeenCalled();
    expect(userHint.className).toBe("hint bad");
    expect(userHint.textContent).toBe("Please enter a valid username.");
    expect(deps.refreshBootUI).toHaveBeenCalled();
  });

  it("registerUser handles server errors", async () => {
    const { deps, net, usernameInput } = createDeps({
      apiRegister: vi.fn(async () => ({ ok: false, status: 500 }))
    });
    const flows = createSessionFlows(deps);
    usernameInput.value = "server_down";

    await flows.registerUser();

    expect(net.online).toBe(false);
    expect(deps.setUserHint).toHaveBeenCalled();
    expect(deps.refreshBootUI).toHaveBeenCalled();
  });

  it("registerUser registers and refreshes session data", async () => {
    const { deps, net, usernameInput } = createDeps({
      apiRegister: vi.fn(async () => ({
        ok: true,
        user: { username: "bee", keybinds: { jump: "space" }, settings: { dashBehavior: "tap" } },
        trails: [{ id: "classic" }],
        icons: [{ id: "icon-1" }],
        pipeTextures: [{ id: "pipe-1" }],
        achievements: { state: { foo: true } }
      })),
      apiSync: vi.fn(async () => ({
        ok: true,
        user: { username: "bee", keybinds: { jump: "space" }, settings: { dashBehavior: "tap" } },
        trails: [{ id: "classic" }],
        icons: [{ id: "icon-1" }],
        pipeTextures: [{ id: "pipe-1" }],
        achievements: { state: { foo: true } },
        highscores: [{ username: "bee", score: 5 }],
        stats: { totalRuns: 12 }
      }))
    });
    const flows = createSessionFlows(deps);
    usernameInput.value = "bee";
    const initialTrails = net.trails;

    await flows.registerUser();

    expect(net.online).toBe(true);
    expect(deps.setNetUser).toHaveBeenCalledWith(expect.objectContaining({ username: "bee" }));
    expect(deps.mergeTrailCatalog).toHaveBeenCalledWith([{ id: "classic" }], { current: initialTrails });
    expect(deps.syncUnlockablesCatalog).toHaveBeenCalledTimes(3);
    expect(deps.syncIconCatalog).toHaveBeenCalledWith([{ id: "icon-1" }]);
    expect(deps.syncPipeTextureCatalog).toHaveBeenCalledWith([{ id: "pipe-1" }]);
    expect(deps.applyAchievementsPayload).toHaveBeenCalled();
    expect(deps.setBinds).toHaveBeenCalledWith({ jump: "space", shoot: "enter" });
    expect(usernameInput.value).toBe("bee");
    expect(deps.updateSkillSettings).toHaveBeenCalledWith({ dashBehavior: "tap" }, { persist: false });
    expect(deps.apiSetKeybinds).toHaveBeenCalledWith({ jump: "space", shoot: "enter" });
    expect(deps.apiSync).toHaveBeenCalledWith(20);
  });
});
