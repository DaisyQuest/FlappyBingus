import { describe, expect, it, vi } from "vitest";
import { handleTrailSaveResponse } from "../trailSaveResponse.js";

describe("handleTrailSaveResponse", () => {
  it("attempts session recovery on 401 responses before clearing the user", async () => {
    const net = {
      online: true,
      user: { username: "PlayerOne", bestScore: 500, bustercoins: 12, achievements: { unlocked: {} } },
      achievements: { state: { unlocked: {} } },
      trails: [{ id: "classic" }]
    };
    const setNetUser = vi.fn((nextUser) => {
      net.user = nextUser;
    });
    const setUserHint = vi.fn();
    const setTrailHint = vi.fn();
    const buildTrailHint = vi.fn(() => ({ className: "hint", text: "Guest hint" }));
    const getAuthStatusFromResponse = vi.fn(() => ({ online: true, unauthorized: true }));
    const recoverSession = vi.fn(async () => false);

    await handleTrailSaveResponse({
      res: { ok: false, status: 401 },
      net,
      orderedTrails: [{ id: "classic" }],
      selectedTrailId: "classic",
      currentTrailId: "classic",
      currentIconId: "icon",
      playerIcons: [],
      setNetUser,
      setUserHint,
      setTrailHint,
      buildTrailHint,
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      refreshTrailMenu: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse,
      recoverSession
    });

    expect(getAuthStatusFromResponse).toHaveBeenCalledWith({ ok: false, status: 401 });
    expect(net.online).toBe(true);
    expect(recoverSession).toHaveBeenCalledTimes(1);
    expect(setNetUser).toHaveBeenCalledWith(null);
    expect(net.user).toBeNull();
    expect(setUserHint).toHaveBeenCalledTimes(1);
    expect(buildTrailHint).toHaveBeenCalledWith(expect.objectContaining({
      online: true,
      user: null,
      bestScore: 0,
      selectedTrail: "classic"
    }));
    expect(setTrailHint).toHaveBeenCalledWith({ className: "hint", text: "Guest hint" });
  });

  it("applies server updates on success without overwriting hints", async () => {
    const net = {
      online: false,
      user: { username: "PlayerOne", bestScore: 500, bustercoins: 12, achievements: { unlocked: {} }, selectedIcon: "old" },
      icons: [{ id: "old" }],
      pipeTextures: [{ id: "basic" }],
      trails: [{ id: "classic" }]
    };
    const setNetUser = vi.fn((nextUser) => {
      net.user = nextUser;
    });
    const setUserHint = vi.fn();
    const setTrailHint = vi.fn();
    const buildTrailHint = vi.fn();
    const normalizeTrails = vi.fn((trails) => trails);
    const syncUnlockablesCatalog = vi.fn();
    const syncIconCatalog = vi.fn();
    const syncPipeTextureCatalog = vi.fn();
    const refreshTrailMenu = vi.fn();
    const applyIconSelection = vi.fn();
    const res = {
      ok: true,
      user: { username: "PlayerOne", bestScore: 600, bustercoins: 20, selectedTrail: "aurora", selectedIcon: "new" },
      trails: [{ id: "aurora" }],
      icons: [{ id: "new" }],
      pipeTextures: [{ id: "basic" }]
    };

    await handleTrailSaveResponse({
      res,
      net,
      orderedTrails: [{ id: "classic" }],
      selectedTrailId: "aurora",
      currentTrailId: "classic",
      currentIconId: "fallback",
      playerIcons: [{ id: "new" }],
      setNetUser,
      setUserHint,
      setTrailHint,
      buildTrailHint,
      normalizeTrails,
      syncUnlockablesCatalog,
      syncIconCatalog,
      syncPipeTextureCatalog,
      refreshTrailMenu,
      applyIconSelection,
      getAuthStatusFromResponse: vi.fn()
    });

    expect(net.online).toBe(true);
    expect(setNetUser).toHaveBeenCalledWith(res.user);
    expect(net.user?.bustercoins).toBe(20);
    expect(net.trails).toEqual(res.trails);
    expect(syncUnlockablesCatalog).toHaveBeenCalledWith({ trails: res.trails });
    expect(syncIconCatalog).toHaveBeenCalledWith(res.icons);
    expect(syncPipeTextureCatalog).toHaveBeenCalledWith(res.pipeTextures);
    expect(refreshTrailMenu).toHaveBeenCalledWith("aurora");
    expect(applyIconSelection).toHaveBeenCalledWith("new", [{ id: "new" }]);
    expect(setUserHint).not.toHaveBeenCalled();
    expect(setTrailHint).not.toHaveBeenCalled();
    expect(buildTrailHint).not.toHaveBeenCalled();
  });

  it("keeps the current user when auth status is online but not unauthorized", async () => {
    const net = {
      online: true,
      user: { username: "PlayerOne", bestScore: 500, bustercoins: 12, achievements: { unlocked: {} } },
      achievements: { state: { unlocked: {} } },
      trails: [{ id: "classic" }]
    };
    const setNetUser = vi.fn((nextUser) => {
      net.user = nextUser;
    });
    const setUserHint = vi.fn();
    const setTrailHint = vi.fn();
    const buildTrailHint = vi.fn(() => ({ className: "hint", text: "Fallback hint" }));

    await handleTrailSaveResponse({
      res: { ok: false, status: 401, error: "csrf_failure" },
      net,
      orderedTrails: [{ id: "classic" }],
      selectedTrailId: "classic",
      currentTrailId: "classic",
      currentIconId: "icon",
      playerIcons: [],
      setNetUser,
      setUserHint,
      setTrailHint,
      buildTrailHint,
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      refreshTrailMenu: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(() => ({ online: true, unauthorized: false }))
    });

    expect(setNetUser).not.toHaveBeenCalled();
    expect(net.user?.username).toBe("PlayerOne");
    expect(setUserHint).toHaveBeenCalledTimes(1);
    expect(buildTrailHint).toHaveBeenCalledWith(expect.objectContaining({
      online: true,
      user: net.user
    }));
    expect(setTrailHint).toHaveBeenCalledWith({ className: "hint", text: "Fallback hint" });
  });

  it("keeps the current user if session recovery succeeds", async () => {
    const net = {
      online: true,
      user: { username: "PlayerOne", bestScore: 500, bustercoins: 12, achievements: { unlocked: {} } },
      achievements: { state: { unlocked: {} } },
      trails: [{ id: "classic" }]
    };
    const setNetUser = vi.fn((nextUser) => {
      net.user = nextUser;
    });
    const setUserHint = vi.fn();
    const setTrailHint = vi.fn();
    const buildTrailHint = vi.fn(() => ({ className: "hint", text: "Guest hint" }));

    await handleTrailSaveResponse({
      res: { ok: false, status: 401 },
      net,
      orderedTrails: [{ id: "classic" }],
      selectedTrailId: "classic",
      currentTrailId: "classic",
      currentIconId: "icon",
      playerIcons: [],
      setNetUser,
      setUserHint,
      setTrailHint,
      buildTrailHint,
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      refreshTrailMenu: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(() => ({ online: true, unauthorized: true })),
      recoverSession: vi.fn(async () => true)
    });

    expect(setNetUser).not.toHaveBeenCalled();
    expect(net.user?.username).toBe("PlayerOne");
    expect(setUserHint).toHaveBeenCalledTimes(1);
    expect(buildTrailHint).toHaveBeenCalledWith(expect.objectContaining({
      online: true,
      user: net.user
    }));
  });
});
