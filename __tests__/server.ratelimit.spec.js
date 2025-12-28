"use strict";

import { describe, expect, it, vi, beforeEach } from "vitest";

const baseUser = () => ({
  username: "RateLimited",
  key: "rate-limited",
  bestScore: 100,
  selectedTrail: "classic",
  selectedIcon: "hi_vis_orange",
  selectedPipeTexture: "basic",
  pipeTextureMode: "NORMAL",
  ownedIcons: [],
  ownedUnlockables: [],
  keybinds: {},
  settings: {
    dashBehavior: "ricochet",
    slowFieldBehavior: "slow",
    teleportBehavior: "normal",
    invulnBehavior: "short"
  },
  runs: 1,
  totalScore: 100,
  longestRun: 0,
  totalTimePlayed: 0,
  bustercoins: 1,
  currencies: { bustercoin: 1 },
  achievements: { unlocked: {}, progress: {} }
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
    socket: { remoteAddress: "127.0.0.1" },
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
      bustercoins: (user?.bustercoins || 0) + (bustercoinsEarned || 0),
      currencies: {
        bustercoin: (user?.currencies?.bustercoin || user?.bustercoins || 0) + (bustercoinsEarned || 0)
      }
    })),
    setTrail: vi.fn(async (_key, trailId) => ({ ...baseUser(), selectedTrail: trailId })),
    setIcon: vi.fn(async (_key, iconId) => ({ ...baseUser(), selectedIcon: iconId })),
    setKeybinds: vi.fn(async (_key, binds) => ({ ...baseUser(), keybinds: binds })),
    setSettings: vi.fn(async (_key, settings) => ({ ...baseUser(), settings })),
    getUserByKey: vi.fn(async () => baseUser()),
    userCount: vi.fn(async () => 1),
    recentUsers: vi.fn(async () => [{ username: "recent", bestScore: 10, updatedAt: Date.now() }]),
    getStatus: vi.fn(() => ({ connected: true, dbName: "db", uri: "mongodb://***", lastAttemptAt: Date.now() })),
    ...overrides
  };
  server._setDataStoreForTests(mockDataStore);
  return { server, mockDataStore };
}

describe("server rate limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns 429 once the request budget for a route is exhausted", async () => {
    const { server } = await importServer();
    const reqFactory = () =>
      createReq({ url: "/api/me", headers: { cookie: "sugar=RateLimited" } });

    const first = createRes();
    await server.route(reqFactory(), first);
    expect(first.status).not.toBe(429);

    let limited = null;
    for (let i = 0; i < 200; i += 1) {
      const res = createRes();
      await server.route(reqFactory(), res);
      if (res.status === 429) {
        limited = res;
        break;
      }
    }

    expect(limited?.status).toBe(429);
    expect(limited.status).toBe(429);
    expect(JSON.parse(limited.body).error).toBe("rate_limited");
    expect(Number(limited.headers["Retry-After"])).toBeGreaterThanOrEqual(1);
  });
});
