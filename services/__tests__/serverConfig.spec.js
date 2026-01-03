import { describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  DEFAULT_SERVER_CONFIG,
  applyUnlockableMenuConfig,
  createServerConfigStore,
  normalizeServerConfig,
  resolveConfigPath
} from "../serverConfig.cjs";

const sampleTrails = [
  { id: "classic", name: "Classic" },
  { id: "ember", name: "Ember" }
];
const sampleIcons = [
  { id: "icon-a", name: "A" },
  { id: "icon-b", name: "B" }
];

const sampleTextures = [
  { id: "pipe-a", name: "Pipe A" },
  { id: "pipe-b", name: "Pipe B" }
];

const sampleUnlockables = [
  { id: "classic", type: "trail" },
  { id: "ember", type: "trail" },
  { id: "icon-a", type: "player_texture" },
  { id: "pipe-a", type: "pipe_texture" }
];

describe("server config normalization", () => {
  it("fills defaults when provided config is invalid", () => {
    const normalized = normalizeServerConfig(null);
    expect(normalized.session.ttlSeconds).toBe(DEFAULT_SERVER_CONFIG.session.ttlSeconds);
    expect(normalized.rateLimits.default.limit).toBe(DEFAULT_SERVER_CONFIG.rateLimits.default.limit);
  });

  it("merges custom session and rate limits", () => {
    const normalized = normalizeServerConfig({
      session: { ttlSeconds: 10 },
      rateLimits: { "/api/me": { limit: 5, windowMs: 1000 }, "/custom": { limit: 2, windowMs: 500 } },
      unlockableMenus: { trail: { mode: "allowlist", ids: ["ember"] } },
      achievements: {
        definitions: [
          { id: "sample", title: "Sample", description: "Sample", requirement: { minScore: 1 } }
        ]
      },
      unlockableOverrides: {
        trail: { ember: { type: "achievement", id: "sample" } }
      }
    });
    expect(normalized.session.ttlSeconds).toBe(10);
    expect(normalized.rateLimits["/api/me"].limit).toBe(5);
    expect(normalized.rateLimits["/custom"].limit).toBe(2);
    expect(normalized.unlockableMenus.trail.mode).toBe("allowlist");
    expect(normalized.achievements.definitions).toHaveLength(1);
    expect(normalized.unlockableOverrides.trail.ember).toBeTruthy();
  });

  it("normalizes invalid values and trims menu ids", () => {
    const normalized = normalizeServerConfig({
      session: { ttlSeconds: -10, refreshWindowSeconds: "bad" },
      rateLimits: { "/api/me": { limit: 0, windowMs: -1 } },
      unlockableMenus: {
        trail: { mode: "allowlist", ids: [" ember ", "", null] },
        player_texture: { mode: "unknown", ids: ["icon-a"] }
      },
      achievements: { definitions: { id: "bad" } },
      unlockableOverrides: { trail: { ember: "bad" } }
    });

    expect(normalized.session.ttlSeconds).toBe(1);
    expect(normalized.session.refreshWindowSeconds).toBe(DEFAULT_SERVER_CONFIG.session.refreshWindowSeconds);
    expect(normalized.rateLimits["/api/me"].limit).toBe(1);
    expect(normalized.rateLimits["/api/me"].windowMs).toBe(1);
    expect(normalized.unlockableMenus.trail.ids).toEqual(["ember"]);
    expect(normalized.unlockableMenus.player_texture.mode).toBe("all");
    expect(normalized.achievements.definitions).toBeNull();
    expect(normalized.unlockableOverrides.trail).toEqual({});
  });

  it("adds new rate limit keys with default normalization", () => {
    const normalized = normalizeServerConfig({
      rateLimits: { "/api/new": { limit: 7.4, windowMs: 2500.9 } }
    });

    expect(normalized.rateLimits["/api/new"]).toEqual({ limit: 7, windowMs: 2500 });
  });
});

describe("unlockable menu filtering", () => {
  it("returns all items when no menu config is provided", () => {
    const result = applyUnlockableMenuConfig(
      {
        trails: sampleTrails,
        icons: sampleIcons,
        pipeTextures: sampleTextures,
        unlockables: sampleUnlockables
      },
      null
    );

    expect(result.trails).toEqual(sampleTrails);
    expect(result.icons).toEqual(sampleIcons);
    expect(result.pipeTextures).toEqual(sampleTextures);
    expect(result.unlockables).toEqual(sampleUnlockables);
  });

  it("returns allowlisted items only", () => {
    const result = applyUnlockableMenuConfig(
      {
        trails: sampleTrails,
        icons: sampleIcons,
        pipeTextures: sampleTextures,
        unlockables: sampleUnlockables
      },
      {
        unlockableMenus: {
          trail: { mode: "allowlist", ids: ["ember"] },
          player_texture: { mode: "all", ids: [] },
          pipe_texture: { mode: "allowlist", ids: ["pipe-a"] }
        }
      }
    );

    expect(result.trails).toEqual([{ id: "ember", name: "Ember" }]);
    expect(result.pipeTextures).toEqual([{ id: "pipe-a", name: "Pipe A" }]);
    expect(result.unlockables.map((item) => item.id)).toEqual(["ember", "icon-a", "pipe-a"]);
  });
});

describe("config store", () => {
  it("resolves config path with a default filename", () => {
    const resolved = resolveConfigPath();
    expect(resolved.endsWith("server-config.json")).toBe(true);
  });

  it("resolves custom config paths", () => {
    const resolved = resolveConfigPath("./custom/server.json");
    expect(resolved.endsWith(path.join("custom", "server.json"))).toBe(true);
  });

  it("prefers persisted config and syncs it to disk", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-config-"));
    const configPath = path.join(dir, "server-config.json");
    const persistence = {
      load: vi.fn(async () => ({ session: { ttlSeconds: 33 } }))
    };
    const store = createServerConfigStore({ configPath, reloadIntervalMs: 0, persistence });

    const loaded = await store.load();

    expect(persistence.load).toHaveBeenCalled();
    expect(loaded.session.ttlSeconds).toBe(33);
    const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(raw.session.ttlSeconds).toBe(33);
    expect(store.getMeta().lastPersistedAt).toBeTypeOf("number");
  });

  it("falls back to disk when persisted config is unavailable", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-config-"));
    const configPath = path.join(dir, "server-config.json");
    await fs.writeFile(configPath, JSON.stringify({ session: { ttlSeconds: 44 } }));
    const persistence = {
      load: vi.fn(async () => null)
    };
    const store = createServerConfigStore({ configPath, reloadIntervalMs: 0, persistence });

    const loaded = await store.load();

    expect(persistence.load).toHaveBeenCalled();
    expect(loaded.session.ttlSeconds).toBe(44);
  });

  it("loads defaults when config file is missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-config-"));
    const configPath = path.join(dir, "server-config.json");
    const store = createServerConfigStore({ configPath, reloadIntervalMs: 0 });
    const loaded = await store.load();
    expect(loaded.session.ttlSeconds).toBe(DEFAULT_SERVER_CONFIG.session.ttlSeconds);
  });

  it("reloads when file changes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-config-"));
    const configPath = path.join(dir, "server-config.json");
    const store = createServerConfigStore({ configPath, reloadIntervalMs: 0 });
    await store.save({ session: { ttlSeconds: 99 } });

    const updated = await store.maybeReload();
    expect(updated.session.ttlSeconds).toBe(99);

    await new Promise((resolve) => setTimeout(resolve, 10));
    await fs.writeFile(configPath, JSON.stringify({ session: { ttlSeconds: 17 } }));
    const reloaded = await store.maybeReload();
    expect(reloaded.session.ttlSeconds).toBe(17);
  });

  it("persists updates through the adapter and writes to disk", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-config-"));
    const configPath = path.join(dir, "server-config.json");
    const persistence = {
      save: vi.fn(async () => undefined)
    };
    const store = createServerConfigStore({ configPath, reloadIntervalMs: 0, persistence });

    const saved = await store.save({ session: { ttlSeconds: 77 } });

    expect(persistence.save).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({ ttlSeconds: 77 })
      })
    );
    const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(raw.session.ttlSeconds).toBe(77);
    expect(saved.session.ttlSeconds).toBe(77);
    expect(store.getMeta().lastPersistedAt).toBeTypeOf("number");
  });

  it("skips reload checks before the interval elapses", async () => {
    const fsApi = {
      stat: vi.fn(async () => ({ mtimeMs: 10 })),
      readFile: vi.fn(async () => JSON.stringify({ session: { ttlSeconds: 12 } }))
    };
    const store = createServerConfigStore({
      configPath: "/tmp/server-config.json",
      reloadIntervalMs: 5_000,
      fsApi,
      now: () => 1_000
    });

    const current = await store.maybeReload();

    expect(current.session.ttlSeconds).toBe(DEFAULT_SERVER_CONFIG.session.ttlSeconds);
    expect(fsApi.stat).not.toHaveBeenCalled();
  });

  it("handles stat failures while writing to disk", async () => {
    const fsApi = {
      writeFile: vi.fn(async () => undefined),
      stat: vi.fn(async () => {
        throw new Error("stat_failed");
      })
    };
    const store = createServerConfigStore({
      configPath: "/tmp/server-config.json",
      reloadIntervalMs: 0,
      fsApi,
      now: () => 1000
    });

    await store.save({ session: { ttlSeconds: 55 } });

    expect(fsApi.writeFile).toHaveBeenCalled();
    expect(store.getMeta().lastLoadedAt).toBe(1000);
    expect(store.getMeta().lastMtimeMs).toBeNull();
  });

  it("resets to defaults when the config file disappears during reload", async () => {
    const fsApi = {
      stat: vi.fn(async () => {
        const err = new Error("missing");
        err.code = "ENOENT";
        throw err;
      }),
      readFile: vi.fn()
    };
    const store = createServerConfigStore({
      configPath: "/tmp/server-config.json",
      reloadIntervalMs: 0,
      fsApi,
      now: () => 2000
    });

    const reloaded = await store.maybeReload();

    expect(reloaded.session.ttlSeconds).toBe(DEFAULT_SERVER_CONFIG.session.ttlSeconds);
    expect(store.getMeta().lastMtimeMs).toBeNull();
    expect(store.getMeta().lastLoadedAt).toBe(2000);
  });
});
