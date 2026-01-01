import { afterEach, describe, expect, it, vi } from "vitest";

describe("api helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.useRealTimers();
    // eslint-disable-next-line no-undef
    global.fetch = undefined;
    // eslint-disable-next-line no-undef
    global.localStorage = undefined;
  });

  it("requests the trail preview catalog", async () => {
    const mockResponse = { ok: true, previews: [{ id: "classic" }], count: 1 };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { apiGetTrailPreviews } = await import("../api.js");
    const res = await apiGetTrailPreviews();

    expect(fetchMock).toHaveBeenCalledWith("/trail_previews", {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "GET"
    });
    expect(res).toEqual({ ...mockResponse, status: 200 });
  });

  it("includes bearer tokens when a session is stored", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true })
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;
    // eslint-disable-next-line no-undef
    global.localStorage = {
      getItem: vi.fn((key) => (key === "bingus_session_token" ? "session-token" : null)),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    const { apiGetMe } = await import("../api.js");
    await apiGetMe();

    expect(fetchMock).toHaveBeenCalledWith("/api/me", {
      credentials: "same-origin",
      headers: {
        Authorization: "Bearer session-token",
        "Content-Type": "application/json"
      },
      method: "GET"
    });
  });

  it("persists and clears session tokens from responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, sessionToken: "fresh-token", user: { username: "bingus" } })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ ok: false, error: "unauthorized" })
      });
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;
    const store = { token: null, username: null };
    // eslint-disable-next-line no-undef
    global.localStorage = {
      getItem: vi.fn((key) => {
        if (key === "bingus_session_token") return store.token;
        if (key === "bingus_username") return store.username;
        return null;
      }),
      setItem: vi.fn((key, value) => {
        if (key === "bingus_session_token") store.token = value;
        if (key === "bingus_username") store.username = value;
      }),
      removeItem: vi.fn((key) => {
        if (key === "bingus_session_token") store.token = null;
        if (key === "bingus_username") store.username = null;
      })
    };

    const { apiGetMe } = await import("../api.js");
    await apiGetMe();
    expect(store.token).toBe("fresh-token");
    expect(store.username).toBe("bingus");

    await apiGetMe();
    expect(store.token).toBeNull();
    expect(store.username).toBeNull();
  });

  it("stops calling fetch when the client limit is exceeded", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { apiGetTrailPreviews } = await import("../api.js");
    let last = null;
    // Limit is 4; the 5th call should be rate limited client-side.
    for (let i = 0; i < 5; i += 1) {
      last = await apiGetTrailPreviews();
    }

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(last).toBeNull();
  });

  it("sends requests for each helper with appropriate payloads", async () => {
    const mockResponse = { ok: true };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const {
      apiGetMe,
      apiRegister,
      apiSubmitScore,
      apiGetBestRun,
      apiListBestRuns,
      apiUploadBestRun,
      apiSetTrail,
      apiSetIcon,
      apiSetPipeTexture,
      apiPurchaseUnlockable,
      apiSetKeybinds,
      apiGetHighscores,
      apiGetStats
    } = await import("../api.js");

    const requests = [
      [apiGetMe, ["/api/me", { method: "GET" }]],
      [apiRegister, ["/api/register", { method: "POST", body: JSON.stringify({ username: "bingus" }) }]],
      [apiSubmitScore, ["/api/score", { method: "POST", body: JSON.stringify({ score: 9001, bustercoinsEarned: 0 }) }]],
      [apiGetBestRun, ["/api/run/best?username=bingus", { method: "GET" }]],
      [apiUploadBestRun, ["/api/run/best", { method: "POST", body: JSON.stringify({ score: 9001 }) }]],
      [apiListBestRuns, ["/api/run/best/list?search=bingus&limit=5&sort=recent", { method: "GET" }]],
      [apiSetTrail, ["/api/cosmetics/trail", { method: "POST", body: JSON.stringify({ trailId: "classic" }) }]],
      [apiSetIcon, ["/api/cosmetics/icon", { method: "POST", body: JSON.stringify({ iconId: "hi_vis_orange" }) }]],
      [apiSetPipeTexture, ["/api/cosmetics/pipe_texture", { method: "POST", body: JSON.stringify({ textureId: "basic", mode: "NORMAL" }) }]],
      [apiPurchaseUnlockable, ["/api/shop/purchase", { method: "POST", body: JSON.stringify({ id: "spark", type: "player_texture" }) }]],
      [apiSetKeybinds, ["/api/binds", { method: "POST", body: JSON.stringify({ keybinds: { jump: "Space" } }) }]],
      [apiGetHighscores, ["/api/highscores?limit=25", { method: "GET" }]],
      [apiGetStats, ["/api/stats", { method: "GET" }]]
    ];

    await apiGetMe();
    await apiRegister("bingus");
    await apiSubmitScore(9001);
    await apiGetBestRun("bingus");
    await apiUploadBestRun({ score: 9001 });
    await apiListBestRuns({ search: "bingus", limit: 5, sort: "recent" });
    await apiSetTrail("classic");
    await apiSetIcon("hi_vis_orange");
    await apiSetPipeTexture("basic", "NORMAL");
    await apiPurchaseUnlockable({ id: "spark", type: "player_texture" });
    await apiSetKeybinds({ jump: "Space" });
    await apiGetHighscores(25);
    await apiGetStats();

    expect(fetchMock).toHaveBeenCalledTimes(requests.length);
    requests.forEach(([_, [expectedUrl, expectedInit]], idx) => {
      expect(fetchMock.mock.calls[idx][0]).toBe(expectedUrl);
      expect(fetchMock.mock.calls[idx][1]).toMatchObject({
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        ...expectedInit
      });
    });
  });

  it("returns null on network errors or malformed responses", async () => {
    const failingFetch = vi.fn(() => Promise.reject(new Error("boom")));
    // eslint-disable-next-line no-undef
    global.fetch = failingFetch;
    const { apiRegister } = await import("../api.js");

    const fetchResult = await apiRegister("failcase");
    expect(fetchResult).toBeNull();
    expect(failingFetch).toHaveBeenCalledTimes(1);

    const invalidJsonFetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error("parse error")) })
    );
    // eslint-disable-next-line no-undef
    global.fetch = invalidJsonFetch;
    const { apiSetTrail } = await import("../api.js");
    const invalidJsonResult = await apiSetTrail("any");
    expect(invalidJsonResult).toEqual({ ok: false, status: 200 });
    expect(invalidJsonFetch).toHaveBeenCalledTimes(1);
  });

  it("returns structured errors for non-OK responses", async () => {
    const badStatusFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ ok: false, error: "database_unavailable" })
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = badStatusFetch;
    const { apiSubmitScore } = await import("../api.js");
    const badStatusResult = await apiSubmitScore(1);
    expect(badStatusResult).toEqual({ ok: false, status: 503, error: "database_unavailable" });
    expect(badStatusFetch).toHaveBeenCalledTimes(1);
  });

  it("resets client rate limits after their window elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { apiGetMe } = await import("../api.js");

    for (let i = 0; i < 9; i += 1) {
      // The 9th call should fail because the limit is 8 within a 5 second window.
      // eslint-disable-next-line no-await-in-loop
      await apiGetMe();
    }

    expect(fetchMock).toHaveBeenCalledTimes(8);

    vi.advanceTimersByTime(5_000);

    const afterReset = await apiGetMe();
    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(afterReset).toEqual({ ok: true });
  });

  it("re-registers and retries requests after unauthorized responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ ok: false, error: "unauthorized" })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, sessionToken: "fresh-token", user: { username: "bingus" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true })
      });
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;
    // eslint-disable-next-line no-undef
    global.localStorage = {
      getItem: vi.fn((key) => (key === "bingus_username" ? "bingus" : null)),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    const { apiGetMe } = await import("../api.js");
    const res = await apiGetMe();

    expect(res).toEqual({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/me", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/register", {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ username: "bingus" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/me", expect.any(Object));
  });
});
