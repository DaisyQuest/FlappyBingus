"use strict";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

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

async function importServer({ dataStoreOverrides = {}, configStoreOverrides = {}, gameConfigPath } = {}) {
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
    getConfig: vi.fn(() => ({ session: { ttlSeconds: 10, refreshWindowSeconds: 5 }, rateLimits: {}, unlockableMenus: {} })),
    getMeta: vi.fn(() => ({ lastLoadedAt: 123 })),
    save: vi.fn(async (config) => config),
    maybeReload: vi.fn(async () => ({})),
    ...configStoreOverrides
  };
  server._setConfigStoreForTests(configStore);
  return { server, mockDataStore, configStore };
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

  it("reads and writes game config files", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-game-"));
    const gameConfigPath = path.join(tempDir, "game.json");
    await fs.writeFile(gameConfigPath, JSON.stringify({ pipes: { speed: 5 } }));

    const { server } = await importServer({ gameConfigPath });
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
    const updated = JSON.parse(await fs.readFile(gameConfigPath, "utf8"));
    expect(updated.scoring.pipeDodge).toBe(2);
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

  it("rejects invalid collection names", async () => {
    const { server } = await importServer();
    const res = createRes();
    await server.route(createReq({ method: "GET", url: "/api/admin/collections/bad$name" }), res);
    expect(res.status).toBe(400);
    expect(readJson(res).error).toBe("invalid_collection");
  });
});
