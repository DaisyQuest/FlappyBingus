"use strict";

import { afterEach, describe, expect, it, vi } from "vitest";

const baseUser = () => ({
  username: "PlayerOne",
  key: "player-one",
  bestScore: 2000,
  selectedTrail: "classic",
  keybinds: {},
  settings: { dashBehavior: "ricochet", slowFieldBehavior: "slow" },
  runs: 3,
  totalScore: 5000,
  bustercoins: 10
});

function createRes() {
  return {
    status: null,
    headers: {},
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = { ...this.headers, ...headers };
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(chunk) {
      this.body += chunk ?? "";
    }
  };
}

function createReq({ method = "GET", url = "/", body, headers = {} } = {}) {
  const data = body === undefined ? null : Buffer.from(body);
  return {
    method,
    url,
    headers: { host: "localhost", ...headers },
    [Symbol.asyncIterator]: async function* () {
      if (data) yield data;
    }
  };
}

async function importServer(overrides = {}) {
  vi.resetModules();
  const server = await import("../server.cjs");
  const mockDataStore = {
    ensureConnected: vi.fn(async () => true),
    topHighscores: vi.fn(async () => []),
    upsertUser: vi.fn(async (_username, _key, defaults) => ({ ...baseUser(), ...defaults })),
    recordScore: vi.fn(async (user, score, { bustercoinsEarned = 0, achievements } = {}) => ({
      ...baseUser(),
      ...user,
      achievements: achievements || { unlocked: {}, progress: {} },
      bestScore: score,
      bustercoins: (user?.bustercoins || 0) + (bustercoinsEarned || 0)
    })),
    setTrail: vi.fn(async (_key, trailId) => ({ ...baseUser(), selectedTrail: trailId })),
    setKeybinds: vi.fn(async (_key, binds) => ({ ...baseUser(), keybinds: binds })),
    setSettings: vi.fn(async (_key, settings) => ({ ...baseUser(), settings })),
    getUserByKey: vi.fn(async () => baseUser()),
    userCount: vi.fn(async () => 3),
    recentUsers: vi.fn(async () => [{ username: "recent", bestScore: 10, updatedAt: Date.now() }]),
    getStatus: vi.fn(() => ({ connected: true, dbName: "db", uri: "mongodb://***", lastAttemptAt: Date.now() })),
    ...overrides
  };
  server._setDataStoreForTests(mockDataStore);
  return { server, mockDataStore };
}

function readJson(res) {
  return JSON.parse(res.body || "{}");
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("server routes and helpers", () => {
  it("rejects malformed registration payloads and sets secure cookies on success", async () => {
    const prevSecure = process.env.COOKIE_SECURE;
    process.env.COOKIE_SECURE = "1";
    const { server } = await importServer();

    const invalidName = createRes();
    await server.route(
      createReq({ method: "POST", url: "/api/register", body: JSON.stringify({ username: "x" }) }),
      invalidName
    );
    expect(invalidName.status).toBe(400);
    expect(readJson(invalidName).error).toBe("invalid_username");

    const badJson = createRes();
    await server.route(createReq({ method: "POST", url: "/api/register", body: "{" }), badJson);
    expect(badJson.status).toBe(400);
    expect(readJson(badJson).error).toBe("invalid_json");

    const success = createRes();
    await server.route(
      createReq({ method: "POST", url: "/api/register", body: JSON.stringify({ username: "ValidUser" }) }),
      success
    );
    expect(success.status).toBe(200);
    expect(success.headers["Set-Cookie"]).toMatch(/sugar=ValidUser/);
    expect(success.headers["Set-Cookie"]).toMatch(/HttpOnly/);
    expect(success.headers["Set-Cookie"]).toMatch(/Secure/);
    expect(readJson(success).user.settings.dashBehavior).toBe("ricochet");

    process.env.COOKIE_SECURE = prevSecure;
  });

  it("requires authentication before accepting scores", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(
      createReq({ method: "POST", url: "/api/score", body: JSON.stringify({ score: 50 }) }),
      res
    );

    expect(res.status).toBe(401);
    expect(readJson(res).error).toBe("unauthorized");
  });

  it("persists score submissions with earned bustercoins and clamps negative values", async () => {
    const { server, mockDataStore } = await importServer();
    const res = createRes();
    mockDataStore.getUserByKey.mockResolvedValueOnce({ ...baseUser(), bustercoins: 2 });

    await server.route(
      createReq({
        method: "POST",
        url: "/api/score",
        body: JSON.stringify({ score: 50, bustercoinsEarned: 3 }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      res
    );

    expect(res.status).toBe(200);
    expect(mockDataStore.recordScore).toHaveBeenCalledWith(
      expect.objectContaining({ key: "player-one" }),
      50,
      expect.objectContaining({ bustercoinsEarned: 3 })
    );
    const parsed = readJson(res);
    expect(parsed.user.bustercoins).toBe(5);
    expect(parsed.achievements).toBeTruthy();

    const negative = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/score",
        body: JSON.stringify({ score: 10, bustercoinsEarned: -5 }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      negative
    );
    expect(negative.status).toBe(400);
    expect(readJson(negative).error).toBe("invalid_bustercoins");
  });

  it("returns saved settings from /api/me", async () => {
    const { server } = await importServer({
      getUserByKey: vi.fn(async () => ({
        ...baseUser(),
        settings: { dashBehavior: "destroy", slowFieldBehavior: "explosion" }
      }))
    });
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/me", headers: { cookie: "sugar=PlayerOne" } }), res);

    expect(res.status).toBe(200);
    expect(readJson(res).user.settings).toEqual({ dashBehavior: "destroy", slowFieldBehavior: "explosion" });
  });

  it("includes achievement payload on /api/me responses", async () => {
    const { server } = await importServer({
      getUserByKey: vi.fn(async () => ({
        ...baseUser(),
        achievements: { unlocked: { no_orbs_100: 1234 }, progress: { maxScoreNoOrbs: 140 } }
      }))
    });
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/me", headers: { cookie: "sugar=PlayerOne" } }), res);

    const payload = readJson(res);
    expect(payload.achievements.definitions.some((a) => a.id === "no_orbs_100")).toBe(true);
    expect(payload.achievements.state.unlocked.no_orbs_100).toBe(1234);
  });

  it("preserves record-holder cosmetics on /api/me responses", async () => {
    const recordUser = { ...baseUser(), username: "champ", key: "champ", selectedTrail: "world_record", bestScore: 12_345 };
    const { server } = await importServer({
      getUserByKey: vi.fn(async () => recordUser),
      topHighscores: vi.fn(async () => [{ username: "champ", bestScore: recordUser.bestScore }])
    });
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/me", headers: { cookie: "sugar=champ" } }), res);
    const payload = readJson(res);

    expect(res.status).toBe(200);
    expect(payload.user.isRecordHolder).toBe(true);
    expect(payload.user.selectedTrail).toBe("world_record");
    expect(payload.user.unlockedTrails).toContain("world_record");
  });

  it("protects trail selection with validation and progression checks", async () => {
    const lockedUser = { ...baseUser(), bestScore: 0 };
    const { server, mockDataStore } = await importServer({
      getUserByKey: vi.fn(async () => lockedUser),
      setTrail: vi.fn(async (_key, trailId) => ({ ...lockedUser, selectedTrail: trailId }))
    });

    const invalidTrail = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/trail",
        body: JSON.stringify({ trailId: "missing" }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      invalidTrail
    );
    expect(invalidTrail.status).toBe(400);
    expect(readJson(invalidTrail).error).toBe("invalid_trail");

    const locked = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/trail",
        body: JSON.stringify({ trailId: "ember" }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      locked
    );
    expect(locked.status).toBe(400);
    expect(readJson(locked).error).toBe("trail_locked");

    const unlockedUser = { ...baseUser(), bestScore: 5000 };
    mockDataStore.getUserByKey.mockResolvedValueOnce(unlockedUser);
    mockDataStore.setTrail.mockResolvedValueOnce({ ...unlockedUser, selectedTrail: "solar" });
    const success = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/trail",
        body: JSON.stringify({ trailId: "solar" }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      success
    );

    expect(success.status).toBe(200);
    expect(readJson(success).user.selectedTrail).toBe("solar");
  });

  it("validates and persists keybind payloads", async () => {
    const { server, mockDataStore } = await importServer();
    const duplicate = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/binds",
        body: JSON.stringify({
          keybinds: {
            dash: { type: "key", code: "KeyQ" },
            phase: { type: "key", code: "KeyQ" },
            teleport: { type: "mouse", button: 0 },
            slowField: { type: "key", code: "KeyE" }
          }
        }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      duplicate
    );
    expect(duplicate.status).toBe(400);
    expect(readJson(duplicate).error).toBe("invalid_keybinds");

    const valid = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/binds",
        body: JSON.stringify({
          keybinds: {
            dash: { type: "key", code: "Space" },
            phase: { type: "key", code: "KeyZ" },
            teleport: { type: "mouse", button: 2 },
            slowField: { type: "key", code: "KeyE" }
          }
        }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      valid
    );

    expect(valid.status).toBe(200);
    expect(mockDataStore.setKeybinds).toHaveBeenCalled();
    expect(readJson(valid).user.keybinds.phase).toEqual({ type: "key", code: "KeyZ" });
  });

  it("validates and persists settings payloads", async () => {
    const { server, mockDataStore } = await importServer();
    const invalid = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/settings",
        body: JSON.stringify({ settings: { dashBehavior: "laser" } }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      invalid
    );
    expect(invalid.status).toBe(400);
    expect(readJson(invalid).error).toBe("invalid_settings");

    const valid = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/settings",
        body: JSON.stringify({ settings: { dashBehavior: "destroy", slowFieldBehavior: "explosion" } }),
        headers: { cookie: "sugar=PlayerOne" }
      }),
      valid
    );

    expect(valid.status).toBe(200);
    expect(mockDataStore.setSettings).toHaveBeenCalledWith("player-one", {
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion"
    });
    expect(readJson(valid).user.settings.dashBehavior).toBe("destroy");
  });

  it("serves previews as JSON by default and HTML when requested", async () => {
    const { server } = await importServer();

    const jsonRes = createRes();
    await server.route(createReq({ url: "/trail_previews", headers: { accept: "application/json" } }), jsonRes);
    expect(jsonRes.status).toBe(200);
    expect(readJson(jsonRes).ok).toBe(true);

    const htmlRes = createRes();
    await server.route(createReq({ url: "/trail_previews?format=html" }), htmlRes);
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers["Content-Type"]).toContain("text/html");
    expect(htmlRes.body).toContain("<!doctype html>");
  });

  it("renders the status page with uptime and database error details", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const { server } = await importServer({
      ensureConnected: vi.fn(async () => {
        throw new Error("kaput");
      }),
      getStatus: vi.fn(() => ({
        connected: false,
        dbName: "db",
        uri: "mongodb://masked",
        lastAttemptAt: Date.now()
      }))
    });

    vi.setSystemTime(new Date("2024-01-02T01:01:01Z"));

    const res = createRes();
    await server.route(createReq({ url: "/status" }), res);

    expect(res.status).toBe(200);
    expect(res.body).toContain("1d 1h 1m 1s");
    expect(res.body).toContain("Database error");
  });

  it("blocks traversal attempts when serving static assets", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(createReq({ url: "/../server.cjs" }), res);

    expect(res.status).toBe(404);
    expect(readJson(res).error).toBe("not_found");
  });
});
