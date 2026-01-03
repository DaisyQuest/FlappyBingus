"use strict";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function readJson(res) {
  return JSON.parse(res.body || "{}");
}

async function importServer({ dataStoreOverrides = {}, configStoreOverrides = {}, gameConfigStoreOverrides = {}, gameConfigPath } = {}) {
  vi.resetModules();
  if (gameConfigPath) process.env.GAME_CONFIG_PATH = gameConfigPath;
  const server = await import("../server.cjs");
  const mockDataStore = {
    ensureConnected: vi.fn(async () => true),
    listCollections: vi.fn(async () => ["users"]),
    listDocuments: vi.fn(async () => [{ _id: "id-1", username: "neo" }]),
    getDocumentById: vi.fn(async () => ({ _id: "id-1", username: "neo" })),
    replaceDocument: vi.fn(async () => ({ _id: "id-1", username: "updated" })),
    insertDocument: vi.fn(async () => ({ _id: "id-2", username: "created" })),
    getStatus: vi.fn(() => ({ connected: true })),
    ...dataStoreOverrides
  };
  server._setDataStoreForTests(mockDataStore);
  const configStore = {
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
  };
  server._setConfigStoreForTests(configStore);
  const gameConfigStore = {
    getConfig: vi.fn(() => ({ pipes: { speed: 5 } })),
    getMeta: vi.fn(() => ({ lastLoadedAt: 456 })),
    save: vi.fn(async (config) => config),
    ...gameConfigStoreOverrides
  };
  server._setGameConfigStoreForTests(gameConfigStore);
  return { server, mockDataStore, configStore, gameConfigStore };
}

beforeEach(() => {
  delete process.env.GAME_CONFIG_PATH;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GAME_CONFIG_PATH;
});

describe("admin routes", () => {
  it("returns server config and persists updates", async () => {
    const { server, configStore } = await importServer();

    const getRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/config" }), getRes);
    expect(getRes.status).toBe(200);
    expect(readJson(getRes).config.session.ttlSeconds).toBe(10);

    const putRes = createRes();
    await server.route(
      createReq({ method: "PUT", url: "/api/admin/config", body: JSON.stringify({ session: { ttlSeconds: 42 } }) }),
      putRes
    );
    expect(putRes.status).toBe(200);
    expect(configStore.save).toHaveBeenCalled();
  });

  it("reads and writes game config via the store", async () => {
    const { server, gameConfigStore } = await importServer();
    const getRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/game-config" }), getRes);
    expect(getRes.status).toBe(200);
    expect(readJson(getRes).config.pipes.speed).toBe(5);

    const putRes = createRes();
    await server.route(
      createReq({ method: "PUT", url: "/api/admin/game-config", body: JSON.stringify({ scoring: { pipeDodge: 2 } }) }),
      putRes
    );
    expect(putRes.status).toBe(200);
    expect(gameConfigStore.save).toHaveBeenCalledWith({ scoring: { pipeDodge: 2 } });
  });

  it("reads and writes trail style overrides through the game config store", async () => {
    const { server, gameConfigStore } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          trailStyles: { overrides: { classic: { rate: 10 } } }
        })),
        save: vi.fn(async (config) => config)
      }
    });

    const getRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/trail-styles" }), getRes);
    expect(getRes.status).toBe(200);
    expect(readJson(getRes).overrides.classic.rate).toBe(10);
    expect(readJson(getRes).trails.some((trail) => trail.id === "classic")).toBe(true);

    const putRes = createRes();
    await server.route(
      createReq({
        method: "PUT",
        url: "/api/admin/trail-styles",
        body: JSON.stringify({ overrides: { classic: { rate: 12 } } })
      }),
      putRes
    );
    expect(putRes.status).toBe(200);
    expect(gameConfigStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        trailStyles: expect.objectContaining({
          overrides: { classic: { rate: 12 } }
        })
      })
    );
  });

  it("rejects invalid trail style overrides payloads", async () => {
    const { server } = await importServer();
    const putRes = createRes();
    await server.route(
      createReq({
        method: "PUT",
        url: "/api/admin/trail-styles",
        body: JSON.stringify({ overrides: { classic: { particleShape: "blob" } } })
      }),
      putRes
    );
    expect(putRes.status).toBe(400);
    expect(readJson(putRes).error).toBe("invalid_trail_style_overrides");
  });

  it("exposes trail style overrides for runtime clients", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        getConfig: vi.fn(() => ({
          trailStyles: { overrides: { classic: { rate: 9 } } }
        }))
      }
    });

    const getRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/trail-styles" }), getRes);
    expect(getRes.status).toBe(200);
    expect(readJson(getRes).overrides.classic.rate).toBe(9);
  });

  it("persists player config changes via the game config store", async () => {
    const { server, gameConfigStore } = await importServer();

    const putRes = createRes();
    await server.route(
      createReq({
        method: "PUT",
        url: "/api/admin/game-config",
        body: JSON.stringify({ player: { maxSpeed: 420, accel: 900 } })
      }),
      putRes
    );
    expect(putRes.status).toBe(200);
    expect(gameConfigStore.save).toHaveBeenCalledWith({ player: { maxSpeed: 420, accel: 900 } });
  });

  it("persists unlockable menu updates through the server config store", async () => {
    const { server, configStore } = await importServer();

    const putRes = createRes();
    await server.route(
      createReq({
        method: "PUT",
        url: "/api/admin/config",
        body: JSON.stringify({
          unlockableMenus: {
            trail: { mode: "allowlist", ids: ["ember"] },
            player_texture: { mode: "all", ids: [] },
            pipe_texture: { mode: "allowlist", ids: ["pipe-a"] }
          }
        })
      }),
      putRes
    );
    expect(putRes.status).toBe(200);
    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        unlockableMenus: expect.objectContaining({
          trail: expect.objectContaining({ mode: "allowlist", ids: ["ember"] }),
          pipe_texture: expect.objectContaining({ mode: "allowlist", ids: ["pipe-a"] })
        })
      })
    );
  });

  it("returns errors when game config persistence fails", async () => {
    const { server } = await importServer({
      gameConfigStoreOverrides: {
        save: vi.fn(async () => {
          throw new Error("boom");
        })
      }
    });

    const putRes = createRes();
    await server.route(
      createReq({ method: "PUT", url: "/api/admin/game-config", body: JSON.stringify({ scoring: { pipeDodge: 2 } }) }),
      putRes
    );
    expect(putRes.status).toBe(500);
    expect(readJson(putRes).error).toBe("game_config_write_failed");
  });

  it("lists, creates, and updates documents", async () => {
    const { server, mockDataStore } = await importServer();

    const listRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/collections" }), listRes);
    expect(listRes.status).toBe(200);
    expect(readJson(listRes).collections).toEqual(["users"]);

    const docsRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/collections/users?limit=1" }), docsRes);
    expect(docsRes.status).toBe(200);
    expect(readJson(docsRes).documents[0].username).toBe("neo");

    const docRes = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/collections/users/id-1" }), docRes);
    expect(docRes.status).toBe(200);
    expect(readJson(docRes).document.username).toBe("neo");

    const createResObj = createRes();
    await server.route(
      createReq({ method: "POST", url: "/api/admin/collections/users", body: JSON.stringify({ username: "new" }) }),
      createResObj
    );
    expect(createResObj.status).toBe(201);
    expect(mockDataStore.insertDocument).toHaveBeenCalled();

    const updateRes = createRes();
    await server.route(
      createReq({ method: "PUT", url: "/api/admin/collections/users/id-1", body: JSON.stringify({ username: "edit" }) }),
      updateRes
    );
    expect(updateRes.status).toBe(200);
    expect(mockDataStore.replaceDocument).toHaveBeenCalled();
  });

  it("exposes unlockables data for admin tools", async () => {
    const { server } = await importServer();
    const res = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/unlockables" }), res);
    expect(res.status).toBe(200);
    const json = readJson(res);
    expect(json.unlockables).toBeDefined();
    expect(json.trails).toBeDefined();
  });

  it("returns achievement editor payloads", async () => {
    const { server } = await importServer();
    const res = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/achievements" }), res);
    expect(res.status).toBe(200);
    const json = readJson(res);
    expect(json.achievements.definitions.length).toBeGreaterThan(0);
    expect(json.achievements.schema).toBeTruthy();
  });

  it("persists achievement definition updates", async () => {
    const { server, configStore } = await importServer();
    const payload = {
      definitions: [
        {
          id: "custom_1",
          title: "Custom",
          description: "Custom",
          reward: "",
          progressKey: null,
          requirement: { minScore: 5 }
        }
      ]
    };
    const res = createRes();
    await server.route(
      createReq({ method: "PUT", url: "/api/admin/achievements", body: JSON.stringify(payload) }),
      res
    );
    expect(res.status).toBe(200);
    expect(configStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        achievements: expect.objectContaining({ definitions: payload.definitions })
      })
    );
  });

  it("rejects invalid achievement payloads", async () => {
    const { server } = await importServer();
    const res = createRes();
    await server.route(
      createReq({
        method: "PUT",
        url: "/api/admin/achievements",
        body: JSON.stringify({ definitions: [{ id: "", title: "", description: "", requirement: { foo: 1 } }] })
      }),
      res
    );
    expect(res.status).toBe(400);
    expect(readJson(res).error).toBe("invalid_achievement_definitions");
  });

  it("rejects invalid collection names", async () => {
    const { server } = await importServer();
    const res = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/collections/bad$name" }), res);
    expect(res.status).toBe(400);
    expect(readJson(res).error).toBe("invalid_collection");
  });
});
