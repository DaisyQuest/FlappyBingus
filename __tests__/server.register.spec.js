import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  highscores: [],
  selectedTrail: "world_record",
  bestScore: 5000
};

async function importServer() {
  vi.resetModules();
  const server = await import("../server.cjs");
  const mockDataStore = {
    ensureConnected: vi.fn(async () => true),
    topHighscores: vi.fn(async () => mockState.highscores),
    upsertUser: vi.fn(async (_username, _key, defaults) => ({
      ...defaults,
      selectedTrail: mockState.selectedTrail,
      bestScore: mockState.bestScore
    }))
  };
  server._setDataStoreForTests(mockDataStore);
  return { server, mockDataStore };
}

function createReq(body, path = "/api/register", extraHeaders = {}) {
  const data = JSON.stringify(body);
  return {
    method: "POST",
    url: path,
    headers: { host: "localhost", ...extraHeaders },
    [Symbol.asyncIterator]: async function* () { yield Buffer.from(data); }
  };
}

function createRes() {
  return {
    status: null,
    headers: {},
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(chunk) {
      this.body += chunk ?? "";
    }
  };
}

describe("register flow preserves record-holder cosmetics", () => {
  beforeEach(() => {
    mockState.highscores = [];
    mockState.selectedTrail = "world_record";
    mockState.bestScore = 5000;
  });

  it("keeps the world record trail when the registering user is the record holder", async () => {
    mockState.highscores = [{ username: "champ", bestScore: 9999 }];
    const { server, mockDataStore } = await importServer();

    const req = createReq({ username: "champ" });
    const res = createRes();

    await server.route(req, res);
    const payload = JSON.parse(res.body || "{}");

    expect(res.status).toBe(200);
    expect(mockDataStore.upsertUser).toHaveBeenCalledTimes(1);
    expect(payload.user.selectedTrail).toBe("world_record");
    expect(payload.user.unlockedTrails).toContain("world_record");
    expect(payload.user.settings.dashBehavior).toBe("dashRicochet");
  });

  it("falls back to classic when the registering user is not the record holder", async () => {
    mockState.highscores = [{ username: "someone_else", bestScore: 5000 }];
    const { server } = await importServer();

    const req = createReq({ username: "champ" });
    const res = createRes();

    await server.route(req, res);
    const payload = JSON.parse(res.body || "{}");

    expect(res.status).toBe(200);
    expect(payload.user.selectedTrail).toBe("classic");
    expect(payload.user.unlockedTrails).not.toContain("world_record");
    expect(payload.user.settings.slowFieldBehavior).toBe("slowField");
  });

  it("saves settings via the settings endpoint", async () => {
    vi.resetModules();
    const server = await import("../server.cjs");
    const mockUser = { key: "champ", username: "champ", bestScore: 0, runs: 0, totalScore: 0, selectedTrail: "classic" };
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      topHighscores: vi.fn(async () => []),
      getUserByKey: vi.fn(async () => ({ ...mockUser })),
      setSettings: vi.fn(async (_key, settings) => ({ ...mockUser, settings }))
    };
    server._setDataStoreForTests(mockDataStore);

    const req = createReq({ settings: { dashBehavior: "dashDestroy", slowFieldBehavior: "slowExplosion" } }, "/api/settings", { cookie: "sugar=champ" });
    const res = createRes();

    await server.route(req, res);
    const payload = JSON.parse(res.body || "{}");

    expect(res.status).toBe(200);
    expect(mockDataStore.setSettings).toHaveBeenCalledWith("champ", { dashBehavior: "dashDestroy", slowFieldBehavior: "slowExplosion" });
    expect(payload.user.settings.dashBehavior).toBe("dashDestroy");
    expect(payload.user.settings.slowFieldBehavior).toBe("slowExplosion");
  });

  it("merges partial settings updates without overwriting other preferences", async () => {
    vi.resetModules();
    const server = await import("../server.cjs");
    const mockUser = {
      key: "champ",
      username: "champ",
      bestScore: 0,
      runs: 0,
      totalScore: 0,
      selectedTrail: "classic",
      settings: { dashBehavior: "dashDestroy", slowFieldBehavior: "slowExplosion" }
    };
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      topHighscores: vi.fn(async () => []),
      getUserByKey: vi.fn(async () => ({ ...mockUser })),
      setSettings: vi.fn(async (_key, settings) => ({ ...mockUser, settings }))
    };
    server._setDataStoreForTests(mockDataStore);

    const req = createReq({ settings: { dashBehavior: "dashRicochet" } }, "/api/settings", { cookie: "sugar=champ" });
    const res = createRes();

    await server.route(req, res);
    const payload = JSON.parse(res.body || "{}");

    expect(res.status).toBe(200);
    expect(mockDataStore.setSettings).toHaveBeenCalledWith("champ", {
      dashBehavior: "dashRicochet",
      slowFieldBehavior: "slowExplosion"
    });
    expect(payload.user.settings).toEqual({
      dashBehavior: "dashRicochet",
      slowFieldBehavior: "slowExplosion"
    });
  });

  it("rejects settings updates with unrecognized values", async () => {
    vi.resetModules();
    const server = await import("../server.cjs");
    const mockUser = { key: "champ", username: "champ", bestScore: 0, runs: 0, totalScore: 0, selectedTrail: "classic" };
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      topHighscores: vi.fn(async () => []),
      getUserByKey: vi.fn(async () => ({ ...mockUser })),
      setSettings: vi.fn()
    };
    server._setDataStoreForTests(mockDataStore);

    const req = createReq({ settings: { dashBehavior: "invalid" } }, "/api/settings", { cookie: "sugar=champ" });
    const res = createRes();

    await server.route(req, res);
    expect(res.status).toBe(400);
    expect(mockDataStore.setSettings).not.toHaveBeenCalled();
  });
});
