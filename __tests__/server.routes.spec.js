"use strict";

import { afterEach, describe, expect, it, vi } from "vitest";

const baseUser = () => ({
  username: "PlayerOne",
  key: "player-one",
  bestScore: 2000,
  selectedTrail: "classic",
  selectedIcon: "hi_vis_orange",
  selectedPipeTexture: "basic",
  pipeTextureMode: "NORMAL",
  ownedIcons: [],
  ownedUnlockables: [],
  keybinds: {},
  settings: {
    dashBehavior: "destroy",
    slowFieldBehavior: "explosion",
    teleportBehavior: "normal",
    invulnBehavior: "long",
    textStylePreset: "basic",
    textStyleCustom: {
      fontFamily: "system",
      fontWeight: 900,
      sizeScale: 1,
      useGameColors: true,
      useGameGlow: true,
      color: "#ffffff",
      glowColor: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 1.8,
      shadowBoost: 0,
      shadowOffsetY: 3,
      wobble: 0,
      spin: 0,
      shimmer: 0,
      sparkle: false,
      useGradient: false,
      gradientStart: "#fff3a6",
      gradientEnd: "#7ce9ff"
    },
    simpleBackground: true,
    simpleTextures: false,
    simpleParticles: true,
    reducedEffects: true,
    extremeLowDetail: false
  },
  runs: 3,
  totalScore: 5000,
  longestRun: 0,
  totalTimePlayed: 0,
  bustercoins: 10,
  currencies: { bustercoin: 10 }
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

function createBinaryRes() {
  return {
    status: null,
    headers: {},
    body: Buffer.alloc(0),
    writeHead(status, headers) {
      this.status = status;
      this.headers = { ...this.headers, ...headers };
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(chunk) {
      if (chunk === undefined || chunk === null) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      this.body = Buffer.concat([this.body, buffer]);
    }
  };
}

function createReq({ method = "GET", url = "/", body, headers = {}, socket } = {}) {
  const data = body === undefined ? null : Buffer.from(body);
  return {
    method,
    url,
    headers: { host: "localhost", ...headers },
    socket,
    [Symbol.asyncIterator]: async function* () {
      if (data) yield data;
    }
  };
}

async function importServer(overrides = {}) {
  const {
    dataStoreOverrides = ("configStoreOverrides" in overrides || "gameConfigStoreOverrides" in overrides) ? {} : overrides,
    configStoreOverrides = {},
    gameConfigStoreOverrides = {}
  } = overrides;
  vi.resetModules();
  const server = await import("../server.cjs");
  const mockDataStore = {
    ensureConnected: vi.fn(async () => true),
    topHighscores: vi.fn(async () => []),
    upsertUser: vi.fn(async (_username, _key, defaults) => ({ ...baseUser(), ...defaults })),
    recordScore: vi.fn(async (user, score, { bustercoinsEarned = 0, achievements, unlockables } = {}) => ({
      ...baseUser(),
      ...user,
      achievements: achievements || { unlocked: {}, progress: {} },
      unlockables: unlockables || { unlocked: {} },
      bestScore: score,
      bustercoins: (user?.bustercoins || 0) + (bustercoinsEarned || 0),
      currencies: {
        bustercoin: (user?.currencies?.bustercoin || user?.bustercoins || 0) + (bustercoinsEarned || 0)
      }
    })),
    recordBestRun: vi.fn(async (_user, payload) => ({ ...payload, bestScore: payload.score })),
    getBestRunByUsername: vi.fn(async () => null),
    listBestRuns: vi.fn(async () => []),
    setTrail: vi.fn(async (_key, trailId) => ({ ...baseUser(), selectedTrail: trailId })),
    setIcon: vi.fn(async (_key, iconId) => ({ ...baseUser(), selectedIcon: iconId })),
    setPipeTexture: vi.fn(async (_key, textureId, mode) => ({ ...baseUser(), selectedPipeTexture: textureId, pipeTextureMode: mode })),
    setKeybinds: vi.fn(async (_key, binds) => ({ ...baseUser(), keybinds: binds })),
    setSettings: vi.fn(async (_key, settings) => ({ ...baseUser(), settings })),
    purchaseUnlockable: vi.fn(async (_key, payload) => ({ ...baseUser(), ...payload })),
    getUserByKey: vi.fn(async () => baseUser()),
    totalRuns: vi.fn(async () => 12),
    userCount: vi.fn(async () => 3),
    recentUsers: vi.fn(async () => [{ username: "recent", bestScore: 10, updatedAt: Date.now() }]),
    getStatus: vi.fn(() => ({ connected: true, dbName: "db", uri: "mongodb://***", lastAttemptAt: Date.now() })),
    ...dataStoreOverrides
  };
  server._setDataStoreForTests(mockDataStore);
  if (Object.keys(configStoreOverrides).length) {
    server._setConfigStoreForTests({
      getConfig: vi.fn(() => ({
        session: { ttlSeconds: 10, refreshWindowSeconds: 5 },
        rateLimits: {},
        unlockableMenus: {},
        achievements: { definitions: null }
      })),
      getMeta: vi.fn(() => ({ lastLoadedAt: 123 })),
      save: vi.fn(async (config) => config),
      maybeReload: vi.fn(async () => ({})),
      ...configStoreOverrides
    });
  }
  if (Object.keys(gameConfigStoreOverrides).length) {
    server._setGameConfigStoreForTests({
      getConfig: vi.fn(() => ({})),
      getMeta: vi.fn(() => ({ lastLoadedAt: 456 })),
      save: vi.fn(async (config) => config),
      ...gameConfigStoreOverrides
    });
  }
  return { server, mockDataStore };
}

function getCookieHeader(res, name) {
  const header = res.headers["Set-Cookie"];
  const values = Array.isArray(header) ? header : header ? [header] : [];
  return values.find((value) => value.startsWith(`${name}=`)) || "";
}

function buildSessionCookie(server, username, { nowMs, exp } = {}) {
  const token = server.__testables.signSessionToken({ sub: username, exp }, { nowMs });
  return `bingus_session=${token}`;
}

function buildAuthHeader(server, username) {
  const token = server.__testables.signSessionToken({ sub: username });
  return `Bearer ${token}`;
}

function readJson(res) {
  return JSON.parse(res.body || "{}");
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("server routes and helpers", () => {
  it("rejects malformed registration payloads and sets appropriate cookie flags on success", async () => {
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

    const successHttp = createRes();
    await server.route(
      createReq({ method: "POST", url: "/api/register", body: JSON.stringify({ username: "ValidUser" }) }),
      successHttp
    );
    expect(successHttp.status).toBe(200);
    const sessionCookie = getCookieHeader(successHttp, "bingus_session");
    expect(sessionCookie).toMatch(/bingus_session=/);
    expect(sessionCookie).toMatch(/HttpOnly/);
    expect(sessionCookie).toMatch(/SameSite=Lax/);
    expect(sessionCookie).not.toMatch(/Secure/);
    const token = sessionCookie.split(";")[0].split("=")[1];
    expect(server.__testables.verifySessionToken(token).ok).toBe(true);
    const savedSettings = readJson(successHttp).user.settings;
    expect(savedSettings.dashBehavior).toBe("destroy");
    expect(savedSettings.teleportBehavior).toBe("normal");
    expect(savedSettings.invulnBehavior).toBe("long");
    expect(savedSettings.textStylePreset).toBe("basic");
    expect(savedSettings.textStyleCustom).toMatchObject({
      fontFamily: "system",
      useGameColors: true,
      useGameGlow: true
    });
    expect(readJson(successHttp).sessionToken).toMatch(/^\S+\.\S+\.\S+$/);

    const successForwarded = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/register",
        body: JSON.stringify({ username: "ForwardedUser" }),
        headers: { "x-forwarded-proto": "https" }
      }),
      successForwarded
    );
    expect(successForwarded.status).toBe(200);
    const forwardedCookie = getCookieHeader(successForwarded, "bingus_session");
    expect(forwardedCookie).toMatch(/Secure/);
    expect(forwardedCookie).toMatch(/SameSite=None/);

    const successEncrypted = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/register",
        body: JSON.stringify({ username: "SecureSocketUser" }),
        socket: { encrypted: true }
      }),
      successEncrypted
    );
    expect(successEncrypted.status).toBe(200);
    const encryptedCookie = getCookieHeader(successEncrypted, "bingus_session");
    expect(encryptedCookie).toMatch(/Secure/);
    expect(encryptedCookie).toMatch(/SameSite=None/);
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

  it("lists saved replay metadata for the replay browser", async () => {
    const replayList = [
      { username: "alpha", bestScore: 100, recordedAt: 10, ticksLength: 10, rngTapeLength: 1, durationMs: 1200, replayBytes: 400 }
    ];
    const { server, mockDataStore } = await importServer({
      listBestRuns: vi.fn(async (limit) => {
        expect(limit).toBe(5);
        return replayList;
      })
    });
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/replays?limit=5" }), res);

    expect(res.status).toBe(200);
    expect(readJson(res)).toEqual(
      expect.objectContaining({
        ok: true,
        count: 1,
        replays: replayList
      })
    );
    expect(mockDataStore.listBestRuns).toHaveBeenCalledWith(5);
  });

  it("serves the replay browser page", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/replayBrowser" }), res);

    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toContain("text/html");
    expect(res.body).toContain("<title>Replay Browser</title>");
  });

  it("serves the endpoint browser page with page links and api entries", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/endpointBrowser" }), res);

    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toContain("text/html");
    expect(res.body).toContain("<title>Endpoint Browser</title>");
    expect(res.body).toContain('data-endpoint="/api/run/best"');
    expect(res.body).toContain('data-endpoint="/endpointBrowser"');
    expect(res.body).toContain('href="/highscores"');
    expect(res.body).toContain('href="/trail_previews?format=html"');
  });

  it("serves a player card JPEG for a valid username", async () => {
    const { server } = await importServer({
      getBestRunByUsername: vi.fn(async () => ({
        username: "PlayerOne",
        bestScore: 1234,
        recordedAt: Date.UTC(2024, 0, 2, 3, 4),
        durationMs: 60_000,
        ticksLength: 120,
        replayBytes: 2048,
        runStats: { orbsCollected: 2, perfects: 1, pipesDodged: 10, abilitiesUsed: 3 }
      }))
    });
    const res = createBinaryRes();

    await server.route(createReq({ method: "GET", url: "/playerCard?user=PlayerOne" }), res);

    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/jpeg");
    expect(res.body.length).toBeGreaterThan(1000);
    expect(res.body[0]).toBe(0xff);
    expect(res.body[1]).toBe(0xd8);
  });

  it("returns errors for invalid or missing player cards", async () => {
    const { server } = await importServer({
      getBestRunByUsername: vi.fn(async () => null)
    });

    const invalid = createRes();
    await server.route(createReq({ method: "GET", url: "/playerCard?user=x" }), invalid);
    expect(invalid.status).toBe(400);
    expect(readJson(invalid).error).toBe("invalid_username");

    const missing = createRes();
    await server.route(createReq({ method: "GET", url: "/playerCard?user=PlayerOne" }), missing);
    expect(missing.status).toBe(404);
    expect(readJson(missing).error).toBe("best_run_not_found");
  });

  it("accepts bearer session tokens when cookies are unavailable", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(
      createReq({
        method: "POST",
        url: "/api/score",
        body: JSON.stringify({ score: 50 }),
        headers: { authorization: buildAuthHeader(server, "PlayerOne") }
      }),
      res
    );

    expect(res.status).toBe(200);
    expect(readJson(res).ok).toBe(true);
  });

  it("clears invalid session cookies and denies access", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(
      createReq({
        method: "POST",
        url: "/api/score",
        body: JSON.stringify({ score: 50 }),
        headers: { cookie: "bingus_session=not-a-token" }
      }),
      res
    );

    expect(res.status).toBe(401);
    const cleared = getCookieHeader(res, "bingus_session");
    expect(cleared).toMatch(/Max-Age=0/);
  });

  it("rejects /api/me when no session is provided", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/me" }), res);

    expect(res.status).toBe(401);
    expect(readJson(res).error).toBe("unauthorized");
  });

  it("upgrades legacy username cookies to session cookies", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(
      createReq({
        method: "GET",
        url: "/api/me",
        headers: { cookie: "sugar=PlayerOne" }
      }),
      res
    );

    expect(res.status).toBe(200);
    const sessionCookie = getCookieHeader(res, "bingus_session");
    expect(sessionCookie).toMatch(/bingus_session=/);
  });

  it("refreshes near-expiry session cookies", async () => {
    const { server } = await importServer();
    const nowMs = Date.now();
    const exp = Math.floor(nowMs / 1000) + 60;
    const res = createRes();

    await server.route(
      createReq({
        method: "GET",
        url: "/api/me",
        headers: { cookie: buildSessionCookie(server, "PlayerOne", { nowMs, exp }) }
      }),
      res
    );

    expect(res.status).toBe(200);
    const refreshed = getCookieHeader(res, "bingus_session");
    expect(refreshed).toMatch(/bingus_session=/);
  });

  it("persists score submissions with earned bustercoins and clamps negative values", async () => {
    const { server, mockDataStore } = await importServer();
    const res = createRes();
    mockDataStore.getUserByKey.mockResolvedValueOnce({ ...baseUser(), bustercoins: 2, currencies: { bustercoin: 2 } });

    await server.route(
      createReq({
        method: "POST",
        url: "/api/score",
        body: JSON.stringify({ score: 50, bustercoinsEarned: 3 }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      negative
    );
    expect(negative.status).toBe(400);
    expect(readJson(negative).error).toBe("invalid_bustercoins");
  });

  it("persists best-run uploads outside of the score service", async () => {
    const { server, mockDataStore } = await importServer();
    const res = createRes();

    await server.route(
      createReq({
        method: "POST",
        url: "/api/run/best",
        body: JSON.stringify({
          score: 5000,
          seed: "seed-best",
          replay: { ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }], rngTape: [1] },
          runStats: { abilitiesUsed: 1 },
          media: { dataUrl: "data:video/webm;base64,AAA", mimeType: "video/webm" }
        }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      res
    );

    expect(res.status).toBe(200);
    const parsed = readJson(res);
    expect(parsed.ok).toBe(true);
    expect(mockDataStore.recordBestRun).toHaveBeenCalledWith(
      expect.objectContaining({ key: "player-one" }),
      expect.objectContaining({ replayBytes: expect.any(Number), media: expect.objectContaining({ mimeType: "video/webm" }) })
    );
  });

  it("skips best-run uploads that are below the saved personal best", async () => {
    const { server, mockDataStore } = await importServer({
      getUserByKey: vi.fn(async () => ({ ...baseUser(), bestScore: 9999 }))
    });
    const res = createRes();

    await server.route(
      createReq({
        method: "POST",
        url: "/api/run/best",
        body: JSON.stringify({
          score: 10,
          replay: { ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }], rngTape: [] },
          runStats: {}
        }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      res
    );

    expect(res.status).toBe(200);
    expect(readJson(res).skipped).toBe("not_best");
    expect(mockDataStore.recordBestRun).not.toHaveBeenCalled();
  });

  it("rejects best-run uploads that exceed the request cap", async () => {
    const { server } = await importServer();
    const res = createRes();
    const largeReplay = "x".repeat(13_000_000);

    await server.route(
      createReq({
        method: "POST",
        url: "/api/run/best",
        body: `{"score":5,"replayJson":"${largeReplay}","ticksLength":1,"rngTapeLength":0}`,
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      res
    );

    expect(res.status).toBe(413);
    expect(readJson(res).error).toBe("payload_too_large");
  });

  it("returns stored best runs for a given username", async () => {
    const { server, mockDataStore } = await importServer({
      getBestRunByUsername: vi.fn(async () => ({
        username: "PlayerOne",
        replayJson: JSON.stringify({ ticks: [{ move: { dx: 0, dy: 0 }, cursor: { x: 0, y: 0, has: false } }], rngTape: [], seed: "abc" }),
        runStats: { orbsCollected: 1 }
      }))
    });
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/run/best?username=PlayerOne" }), res);

    expect(res.status).toBe(200);
    const payload = readJson(res);
    expect(payload.run.seed).toBe("abc");
    expect(payload.run.replayJson).toContain('"ticks"');
    expect(mockDataStore.getBestRunByUsername).toHaveBeenCalledWith("PlayerOne");
  });

  it("returns 404 when no stored best run exists", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(createReq({ method: "GET", url: "/api/run/best?username=missing" }), res);

    expect(res.status).toBe(404);
    expect(readJson(res).error).toBe("best_run_not_found");
  });

  it("returns saved settings from /api/me", async () => {
    const { server } = await importServer({
      getUserByKey: vi.fn(async () => ({
        ...baseUser(),
        settings: {
          dashBehavior: "destroy",
          slowFieldBehavior: "explosion",
          teleportBehavior: "explode",
          invulnBehavior: "long",
          textStylePreset: "comic_book_mild",
          textStyleCustom: {
            fontFamily: "system",
            fontWeight: 900,
            sizeScale: 1,
            useGameColors: true,
            useGameGlow: true,
            color: "#ffffff",
            glowColor: "#ffffff",
            strokeColor: "#000000",
            strokeWidth: 1.8,
            shadowBoost: 0,
            shadowOffsetY: 3,
            wobble: 0,
            spin: 0,
            shimmer: 0,
            sparkle: false,
            useGradient: false,
            gradientStart: "#fff3a6",
            gradientEnd: "#7ce9ff"
          },
          simpleBackground: true,
          simpleTextures: false,
          simpleParticles: true,
          reducedEffects: false,
          extremeLowDetail: false
        }
      }))
    });
    const res = createRes();

    await server.route(
      createReq({ method: "GET", url: "/api/me", headers: { cookie: buildSessionCookie(server, "PlayerOne") } }),
      res
    );

    expect(res.status).toBe(200);
    expect(readJson(res).user.settings).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long",
      textStylePreset: "comic_book_mild",
      textStyleCustom: {
        fontFamily: "system",
        fontWeight: 900,
        sizeScale: 1,
        useGameColors: true,
        useGameGlow: true,
        color: "#ffffff",
        glowColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 1.8,
        shadowBoost: 0,
        shadowOffsetY: 3,
        wobble: 0,
        spin: 0,
        shimmer: 0,
        sparkle: false,
        useGradient: false,
        gradientStart: "#fff3a6",
        gradientEnd: "#7ce9ff"
      },
      simpleBackground: true,
      simpleTextures: false,
      simpleParticles: true,
      reducedEffects: false,
      extremeLowDetail: false
    });
    expect(readJson(res).icons?.length).toBeGreaterThan(0);
    expect(readJson(res).pipeTextures?.length).toBeGreaterThan(0);
    expect(readJson(res).sessionToken).toMatch(/^\S+\.\S+\.\S+$/);
  });

  it("includes achievement payload on /api/me responses", async () => {
    const { server } = await importServer({
      getUserByKey: vi.fn(async () => ({
        ...baseUser(),
        achievements: { unlocked: { no_orbs_100: 1234 }, progress: { maxScoreNoOrbs: 140 } }
      }))
    });
    const res = createRes();

    await server.route(
      createReq({ method: "GET", url: "/api/me", headers: { cookie: buildSessionCookie(server, "PlayerOne") } }),
      res
    );

    const payload = readJson(res);
    expect(payload.achievements.definitions.some((a) => a.id === "no_orbs_100")).toBe(true);
    expect(payload.achievements.definitions.some((a) => a.id === "total_score_10000")).toBe(true);
    expect(payload.achievements.state.unlocked.no_orbs_100).toBe(1234);
    expect(payload.achievements.state.progress).toMatchObject({
      maxScoreNoOrbs: 140,
      maxScoreNoAbilities: 0,
      totalScore: 0
    });
  });

  it("preserves record-holder cosmetics on /api/me responses", async () => {
    const recordUser = { ...baseUser(), username: "champ", key: "champ", selectedTrail: "world_record", bestScore: 12_345 };
    const { server } = await importServer({
      getUserByKey: vi.fn(async () => recordUser),
      topHighscores: vi.fn(async () => [{ username: "champ", bestScore: recordUser.bestScore }])
    });
    const res = createRes();

    await server.route(
      createReq({ method: "GET", url: "/api/me", headers: { cookie: buildSessionCookie(server, "champ") } }),
      res
    );
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      success
    );

    expect(success.status).toBe(200);
    expect(readJson(success).user.selectedTrail).toBe("solar");
  });

  it("equips custom trails and icons defined in admin editors", async () => {
    const customTrailId = "custom_trail";
    const customIconId = "custom_icon";
    const { server, mockDataStore } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          trailStyles: { overrides: { [customTrailId]: { unlock: { type: "free" } } } },
          iconStyles: {
            overrides: {
              [customIconId]: {
                name: "Custom Icon",
                unlock: { type: "free" },
                style: { fill: "#fff" }
              }
            }
          }
        }))
      },
      dataStoreOverrides: {
        getUserByKey: vi.fn(async () => ({ ...baseUser(), bestScore: 0 })),
        setTrail: vi.fn(async (_key, trailId) => ({ ...baseUser(), selectedTrail: trailId })),
        setIcon: vi.fn(async (_key, iconId) => ({ ...baseUser(), selectedIcon: iconId }))
      }
    });

    const trailRes = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/trail",
        body: JSON.stringify({ trailId: customTrailId }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      trailRes
    );
    expect(trailRes.status).toBe(200);
    expect(readJson(trailRes).user.selectedTrail).toBe(customTrailId);

    const iconRes = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/icon",
        body: JSON.stringify({ iconId: customIconId }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      iconRes
    );
    expect(iconRes.status).toBe(200);
    expect(readJson(iconRes).user.selectedIcon).toBe(customIconId);
  });

  it("requires authentication for trail selection requests", async () => {
    const { server } = await importServer();
    const res = createRes();

    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/trail",
        body: JSON.stringify({ trailId: "classic" })
      }),
      res
    );

    expect(res.status).toBe(401);
    expect(readJson(res).error).toBe("unauthorized");
  });

  it("accepts trail selection when the registration cookie is present", async () => {
    const { server } = await importServer();
    const registerRes = createRes();

    await server.route(
      createReq({ method: "POST", url: "/api/register", body: JSON.stringify({ username: "CookiePlayer" }) }),
      registerRes
    );

    expect(registerRes.status).toBe(200);
    const cookieHeader = getCookieHeader(registerRes, "bingus_session");
    expect(cookieHeader).toMatch(/bingus_session=.+/);

    const cookie = cookieHeader.split(";")[0];
    const trailRes = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/trail",
        body: JSON.stringify({ trailId: "classic" }),
        headers: { cookie }
      }),
      trailRes
    );

    expect(trailRes.status).toBe(200);
    expect(readJson(trailRes).user.selectedTrail).toBe("classic");
  });

  it("validates and persists icon selections", async () => {
    const { server, mockDataStore } = await importServer({
      getUserByKey: vi.fn(async () => ({ ...baseUser(), bestScore: 0 })),
      setIcon: vi.fn(async (_key, iconId) => ({ ...baseUser(), selectedIcon: iconId }))
    });

    const invalid = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/icon",
        body: JSON.stringify({ iconId: "missing" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      invalid
    );
    expect(invalid.status).toBe(400);
    expect(readJson(invalid).error).toBe("invalid_icon");

    mockDataStore.setIcon.mockResolvedValueOnce({ ...baseUser(), selectedIcon: "hi_vis_red" });
    const success = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/icon",
        body: JSON.stringify({ iconId: "hi_vis_red" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      success
    );
    const payload = readJson(success);
    expect(success.status).toBe(200);
    expect(payload.user.selectedIcon).toBe("hi_vis_red");
    expect(payload.icons?.length).toBeGreaterThan(0);
  });

  it("returns icon style overrides for the public endpoint", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          iconStyles: {
            overrides: { spark: { name: "Spark", style: { fill: "#fff" } } }
          }
        }))
      }
    });
    const res = createRes();
    await server.route(createReq({ url: "/api/icon-styles" }), res);
    const payload = readJson(res);
    expect(payload.ok).toBe(true);
    expect(payload.overrides.spark.name).toBe("Spark");
  });

  it("serves admin icon styles with merged icons", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          iconStyles: {
            overrides: {
              custom_icon: {
                name: "Custom Icon",
                style: { fill: "#111" }
              }
            }
          }
        })),
        getMeta: vi.fn(() => ({ lastLoadedAt: 999 }))
      }
    });
    const res = createRes();
    await server.route(createReq({ url: "/api/admin/icon-styles" }), res);
    const payload = readJson(res);
    expect(payload.ok).toBe(true);
    expect(payload.overrides.custom_icon.name).toBe("Custom Icon");
    expect(payload.icons.some((icon) => icon.id === "custom_icon")).toBe(true);
    expect(payload.defaults.length).toBeGreaterThan(0);
  });

  it("rejects invalid admin icon style payloads", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        save: vi.fn(async (config) => config)
      }
    });
    const res = createRes();
    await server.route(
      createReq({
        method: "PUT",
        url: "/api/admin/icon-styles",
        body: JSON.stringify({ overrides: { bad: { style: { pattern: { type: "unknown" } } } } })
      }),
      res
    );
    const payload = readJson(res);
    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_icon_style_overrides");
  });

  it("validates and persists pipe texture selections", async () => {
    const { server, mockDataStore } = await importServer({
      getUserByKey: vi.fn(async () => ({ ...baseUser(), bestScore: 0 })),
      setPipeTexture: vi.fn(async (_key, textureId, mode) => ({ ...baseUser(), selectedPipeTexture: textureId, pipeTextureMode: mode }))
    });

    const invalid = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/pipe_texture",
        body: JSON.stringify({ textureId: "missing" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      invalid
    );
    expect(invalid.status).toBe(400);
    expect(readJson(invalid).error).toBe("invalid_pipe_texture");

    const locked = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/pipe_texture",
        body: JSON.stringify({ textureId: "digital", mode: "HIGH" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      locked
    );
    expect(locked.status).toBe(400);
    expect(readJson(locked).error).toBe("pipe_texture_locked");

    const unlockedUser = { ...baseUser(), bestScore: 2000 };
    mockDataStore.getUserByKey.mockResolvedValueOnce(unlockedUser);
    mockDataStore.setPipeTexture.mockResolvedValueOnce({
      ...unlockedUser,
      selectedPipeTexture: "digital",
      pipeTextureMode: "HIGH"
    });
    const success = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/cosmetics/pipe_texture",
        body: JSON.stringify({ textureId: "digital", mode: "HIGH" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      success
    );
    const payload = readJson(success);
    expect(success.status).toBe(200);
    expect(payload.user.selectedPipeTexture).toBe("digital");
    expect(payload.user.pipeTextureMode).toBe("HIGH");
    expect(payload.pipeTextures?.length).toBeGreaterThan(0);
  });

  it("processes shop purchases with currency checks", async () => {
    const { server, mockDataStore } = await importServer();

    const insufficient = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/shop/purchase",
        body: JSON.stringify({ id: "ultradisco", type: "pipe_texture" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      insufficient
    );
    expect(insufficient.status).toBe(400);
    expect(readJson(insufficient).error).toBe("insufficient_funds");

    mockDataStore.getUserByKey.mockResolvedValueOnce({ ...baseUser(), bustercoins: 100, currencies: { bustercoin: 100 } });
    mockDataStore.purchaseUnlockable.mockResolvedValueOnce({
      ...baseUser(),
      bustercoins: 55,
      currencies: { bustercoin: 55 },
      ownedUnlockables: ["ultradisco"],
      ownedIcons: ["ultradisco"]
    });

    const success = createRes();
    await server.route(
      createReq({
        method: "POST",
        url: "/api/shop/purchase",
        body: JSON.stringify({ id: "ultradisco", type: "pipe_texture" }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      success
    );

    expect(success.status).toBe(200);
    expect(mockDataStore.purchaseUnlockable).toHaveBeenCalled();
    expect(readJson(success).user.ownedUnlockables).toContain("ultradisco");
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
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
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
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
        body: JSON.stringify({
          settings: {
            dashBehavior: "destroy",
            slowFieldBehavior: "explosion",
            teleportBehavior: "explode",
            invulnBehavior: "long",
            textStylePreset: "neon_pulse",
            textStyleCustom: {
              fontFamily: "system",
              fontWeight: 900,
              sizeScale: 1,
              useGameColors: true,
              useGameGlow: true,
              color: "#ffffff",
              glowColor: "#ffffff",
              strokeColor: "#000000",
              strokeWidth: 1.8,
              shadowBoost: 0,
              shadowOffsetY: 3,
              wobble: 0,
              spin: 0,
              shimmer: 0,
              sparkle: false,
              useGradient: false,
              gradientStart: "#fff3a6",
              gradientEnd: "#7ce9ff"
            },
            simpleBackground: true,
            simpleTextures: false,
            simpleParticles: true,
            reducedEffects: false,
            extremeLowDetail: false
          }
        }),
        headers: { cookie: buildSessionCookie(server, "PlayerOne") }
      }),
      valid
    );

    expect(valid.status).toBe(200);
    expect(mockDataStore.setSettings).toHaveBeenCalledWith("player-one", {
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long",
      textStylePreset: "neon_pulse",
      textStyleCustom: {
        fontFamily: "system",
        fontWeight: 900,
        sizeScale: 1,
        useGameColors: true,
        useGameGlow: true,
        color: "#ffffff",
        glowColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 1.8,
        shadowBoost: 0,
        shadowOffsetY: 3,
        wobble: 0,
        spin: 0,
        shimmer: 0,
        sparkle: false,
        useGradient: false,
        gradientStart: "#fff3a6",
        gradientEnd: "#7ce9ff"
      },
      simpleBackground: true,
      simpleTextures: false,
      simpleParticles: true,
      reducedEffects: false,
      extremeLowDetail: false
    });
    expect(readJson(valid).user.settings).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "explode",
      invulnBehavior: "long",
      textStylePreset: "neon_pulse",
      textStyleCustom: {
        fontFamily: "system",
        fontWeight: 900,
        sizeScale: 1,
        useGameColors: true,
        useGameGlow: true,
        color: "#ffffff",
        glowColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 1.8,
        shadowBoost: 0,
        shadowOffsetY: 3,
        wobble: 0,
        spin: 0,
        shimmer: 0,
        sparkle: false,
        useGradient: false,
        gradientStart: "#fff3a6",
        gradientEnd: "#7ce9ff"
      },
      simpleBackground: true,
      simpleTextures: false,
      simpleParticles: true,
      reducedEffects: false,
      extremeLowDetail: false
    });
  });

  it("returns worldwide stats including total runs", async () => {
    const { server, mockDataStore } = await importServer();
    const res = createRes();

    await server.route(createReq({ url: "/api/stats" }), res);

    expect(res.status).toBe(200);
    expect(readJson(res)).toEqual({ ok: true, totalRuns: 12 });
    expect(mockDataStore.totalRuns).toHaveBeenCalled();
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

  it("includes trail style overrides in the preview catalog", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          trailStyles: { overrides: { cosmic_dust: { rate: 12 } } }
        }))
      }
    });

    const jsonRes = createRes();
    await server.route(createReq({ url: "/trail_previews", headers: { accept: "application/json" } }), jsonRes);

    const payload = readJson(jsonRes);
    const cosmic = payload.previews.find((preview) => preview.id === "cosmic_dust");
    expect(cosmic).toEqual(expect.objectContaining({ name: "Cosmic Dust", minScore: 0 }));
  });

  it("serves unlockables as JSON by default and HTML when requested", async () => {
    const { server } = await importServer();

    const jsonRes = createRes();
    await server.route(createReq({ url: "/unlockables", headers: { accept: "application/json" } }), jsonRes);
    expect(jsonRes.status).toBe(200);
    const payload = readJson(jsonRes);
    expect(payload.ok).toBe(true);
    expect(payload.unlockables.length).toBeGreaterThan(0);

    const htmlRes = createRes();
    await server.route(createReq({ url: "/unlockables?format=html" }), htmlRes);
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers["Content-Type"]).toContain("text/html");
    expect(htmlRes.body).toContain("<!doctype html>");
  });

  it("includes custom trails in unlockables output", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          trailStyles: { overrides: { comet: { rate: 8 } } }
        }))
      }
    });

    const jsonRes = createRes();
    await server.route(createReq({ url: "/unlockables", headers: { accept: "application/json" } }), jsonRes);
    const payload = readJson(jsonRes);
    const comet = payload.unlockables.find((item) => item.id === "comet" && item.type === "trail");
    expect(comet).toEqual(expect.objectContaining({ name: "Comet", unlock: expect.objectContaining({ type: "free" }) }));
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
