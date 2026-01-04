import { describe, expect, it, vi } from "vitest";

const baseUser = () => ({
  username: "Syncer",
  key: "syncer",
  bestScore: 100,
  selectedTrail: "classic",
  selectedIcon: "hi_vis_orange",
  selectedPipeTexture: "basic",
  pipeTextureMode: "NORMAL",
  ownedIcons: [],
  ownedUnlockables: [],
  keybinds: {},
  settings: {},
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

function createReq({ url = "/api/sync", headers = {} } = {}) {
  return {
    method: "GET",
    url,
    headers: { host: "localhost", ...headers },
    socket: { remoteAddress: "127.0.0.1" },
    [Symbol.asyncIterator]: async function* () {}
  };
}

async function importServer({ dataStoreOverrides = {}, gameConfig = null } = {}) {
  vi.resetModules();
  const server = await import("../server.cjs");
  const mockDataStore = {
    ensureConnected: vi.fn(async () => true),
    topHighscores: vi.fn(async () => [{ username: "Ace", bestScore: 9001 }]),
    totalRuns: vi.fn(async () => 42),
    getUserByKey: vi.fn(async () => null),
    ...dataStoreOverrides
  };
  server._setDataStoreForTests(mockDataStore);
  if (gameConfig) {
    server._setGameConfigStoreForTests({
      getConfig: () => gameConfig,
      getMeta: () => ({ lastLoadedAt: Date.now() })
    });
  }
  return { server, mockDataStore };
}

function buildSessionCookie(server, username) {
  const token = server.__testables.signSessionToken({ sub: username });
  return `bingus_session=${token}`;
}

describe("/api/sync", () => {
  it("returns catalogs, highscores, and stats without a session", async () => {
    const { server } = await importServer();
    const req = createReq();
    const res = createRes();

    await server.route(req, res);

    const payload = JSON.parse(res.body || "{}");
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.user).toBeNull();
    expect(payload.highscores).toEqual([{ username: "Ace", bestScore: 9001 }]);
    expect(payload.stats).toEqual({ totalRuns: 42 });
    expect(payload.icons.some((icon) => icon.id === "hi_vis_orange")).toBe(true);
  });

  it("returns user data and includes icon editor entries", async () => {
    const gameConfig = {
      iconStyles: {
        icons: [
          { id: "hi_vis_orange", name: "High-Vis Orange", unlock: { type: "free" } },
          { id: "editor_icon", name: "Editor Icon", unlock: { type: "free" }, style: { fill: "#ffffff" } }
        ]
      }
    };
    const { server } = await importServer({
      dataStoreOverrides: {
        getUserByKey: vi.fn(async () => baseUser())
      },
      gameConfig
    });

    const req = createReq({ headers: { cookie: buildSessionCookie(server, "Syncer") } });
    const res = createRes();

    await server.route(req, res);
    const payload = JSON.parse(res.body || "{}");

    expect(res.status).toBe(200);
    expect(payload.user?.username).toBe("Syncer");
    expect(payload.sessionToken).toBeTruthy();
    expect(payload.icons.some((icon) => icon.id === "editor_icon")).toBe(true);
  });
});
