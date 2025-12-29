import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  DEFAULT_SERVER_CONFIG,
  applyUnlockableMenuConfig,
  createServerConfigStore,
  normalizeServerConfig
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
      unlockableMenus: { trail: { mode: "allowlist", ids: ["ember"] } }
    });
    expect(normalized.session.ttlSeconds).toBe(10);
    expect(normalized.rateLimits["/api/me"].limit).toBe(5);
    expect(normalized.rateLimits["/custom"].limit).toBe(2);
    expect(normalized.unlockableMenus.trail.mode).toBe("allowlist");
  });
});

describe("unlockable menu filtering", () => {
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
});
