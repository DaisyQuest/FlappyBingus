import { afterEach, describe, expect, it, vi } from "vitest";

describe("api helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.useRealTimers();
    // eslint-disable-next-line no-undef
    global.fetch = undefined;
  });

  it("requests the trail preview catalog", async () => {
    const mockResponse = { ok: true, previews: [{ id: "classic" }], count: 1 };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
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
    expect(res).toEqual(mockResponse);
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
      apiSetTrail,
      apiSetKeybinds,
      apiGetHighscores
    } = await import("../api.js");

    const requests = [
      [apiGetMe, ["/api/me", { method: "GET" }]],
      [apiRegister, ["/api/register", { method: "POST", body: JSON.stringify({ username: "bingus" }) }]],
      [apiSubmitScore, ["/api/score", { method: "POST", body: JSON.stringify({ score: 9001, bustercoinsEarned: 0 }) }]],
      [apiSetTrail, ["/api/cosmetics/trail", { method: "POST", body: JSON.stringify({ trailId: "classic" }) }]],
      [apiSetKeybinds, ["/api/binds", { method: "POST", body: JSON.stringify({ keybinds: { jump: "Space" } }) }]],
      [apiGetHighscores, ["/api/highscores?limit=25", { method: "GET" }]]
    ];

    await apiGetMe();
    await apiRegister("bingus");
    await apiSubmitScore(9001);
    await apiSetTrail("classic");
    await apiSetKeybinds({ jump: "Space" });
    await apiGetHighscores(25);

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

    const badStatusFetch = vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ ok: false }) })
    );
    // eslint-disable-next-line no-undef
    global.fetch = badStatusFetch;
    const { apiSubmitScore } = await import("../api.js");
    const badStatusResult = await apiSubmitScore(1);
    expect(badStatusResult).toBeNull();
    expect(badStatusFetch).toHaveBeenCalledTimes(1);

    const invalidJsonFetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.reject(new Error("parse error")) })
    );
    // eslint-disable-next-line no-undef
    global.fetch = invalidJsonFetch;
    const { apiSetTrail } = await import("../api.js");
    const invalidJsonResult = await apiSetTrail("any");
    expect(invalidJsonResult).toBeNull();
    expect(invalidJsonFetch).toHaveBeenCalledTimes(1);
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
});
