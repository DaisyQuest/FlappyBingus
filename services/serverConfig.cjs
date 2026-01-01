"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");

const DEFAULT_RATE_LIMIT_CONFIG = Object.freeze({
  default: { limit: 120, windowMs: 60_000 },
  "/api/me": { limit: 60, windowMs: 60_000 },
  "/api/register": { limit: 20, windowMs: 60_000 },
  "/api/score": { limit: 30, windowMs: 60_000 },
  "/api/cosmetics/trail": { limit: 30, windowMs: 60_000 },
  "/api/cosmetics/icon": { limit: 30, windowMs: 60_000 },
  "/api/cosmetics/pipe_texture": { limit: 30, windowMs: 60_000 },
  "/api/shop/purchase": { limit: 30, windowMs: 60_000 },
  "/api/binds": { limit: 30, windowMs: 60_000 },
  "/api/settings": { limit: 30, windowMs: 60_000 },
  "/api/highscores": { limit: 90, windowMs: 60_000 },
  "/api/stats": { limit: 90, windowMs: 60_000 },
  "/api/run/best": { limit: 10, windowMs: 60_000 },
  "/api/run/best/list": { limit: 20, windowMs: 60_000 }
});

const DEFAULT_SERVER_CONFIG = Object.freeze({
  version: 1,
  session: Object.freeze({
    ttlSeconds: 60 * 60 * 24 * 30,
    refreshWindowSeconds: 60 * 60 * 24 * 7
  }),
  rateLimits: DEFAULT_RATE_LIMIT_CONFIG,
  unlockableMenus: Object.freeze({
    trail: Object.freeze({ mode: "all", ids: Object.freeze([]) }),
    player_texture: Object.freeze({ mode: "all", ids: Object.freeze([]) }),
    pipe_texture: Object.freeze({ mode: "all", ids: Object.freeze([]) })
  })
});

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRateLimit(entry, fallback) {
  if (!isPlainObject(entry)) return fallback;
  const limit = Number.isFinite(entry.limit) ? Math.max(1, Math.floor(entry.limit)) : fallback.limit;
  const windowMs = Number.isFinite(entry.windowMs) ? Math.max(1, Math.floor(entry.windowMs)) : fallback.windowMs;
  return { limit, windowMs };
}

function normalizeMenuConfig(entry, fallback) {
  if (!isPlainObject(entry)) return fallback;
  const mode = entry.mode === "allowlist" ? "allowlist" : "all";
  const ids = Array.isArray(entry.ids) ? entry.ids.map((id) => String(id || "").trim()).filter(Boolean) : [];
  return { mode, ids };
}

function normalizeServerConfig(raw) {
  const base = clone(DEFAULT_SERVER_CONFIG);
  if (!isPlainObject(raw)) return base;

  const session = isPlainObject(raw.session) ? raw.session : {};
  base.session = {
    ttlSeconds: Number.isFinite(session.ttlSeconds) ? Math.max(1, Math.floor(session.ttlSeconds)) : base.session.ttlSeconds,
    refreshWindowSeconds: Number.isFinite(session.refreshWindowSeconds)
      ? Math.max(1, Math.floor(session.refreshWindowSeconds))
      : base.session.refreshWindowSeconds
  };

  const rateLimits = isPlainObject(raw.rateLimits) ? raw.rateLimits : {};
  const normalizedRateLimits = {};
  for (const [key, value] of Object.entries(DEFAULT_RATE_LIMIT_CONFIG)) {
    normalizedRateLimits[key] = normalizeRateLimit(rateLimits[key], value);
  }
  for (const [key, value] of Object.entries(rateLimits)) {
    if (!normalizedRateLimits[key]) {
      normalizedRateLimits[key] = normalizeRateLimit(value, DEFAULT_RATE_LIMIT_CONFIG.default);
    }
  }
  base.rateLimits = normalizedRateLimits;

  const menus = isPlainObject(raw.unlockableMenus) ? raw.unlockableMenus : {};
  base.unlockableMenus = {
    trail: normalizeMenuConfig(menus.trail, base.unlockableMenus.trail),
    player_texture: normalizeMenuConfig(menus.player_texture, base.unlockableMenus.player_texture),
    pipe_texture: normalizeMenuConfig(menus.pipe_texture, base.unlockableMenus.pipe_texture)
  };

  return base;
}

function applyMenuFilter(list, menuConfig) {
  const items = Array.isArray(list) ? list : [];
  if (!menuConfig || menuConfig.mode === "all") return items.slice();
  const allow = new Set(menuConfig.ids);
  return items.filter((item) => allow.has(String(item.id || "")));
}

function applyUnlockableMenuConfig({ trails = [], icons = [], pipeTextures = [], unlockables = [] } = {}, config) {
  const menus = config?.unlockableMenus || DEFAULT_SERVER_CONFIG.unlockableMenus;
  const visibleTrails = applyMenuFilter(trails, menus.trail);
  const visibleIcons = applyMenuFilter(icons, menus.player_texture);
  const visibleTextures = applyMenuFilter(pipeTextures, menus.pipe_texture);
  const visibleIds = new Set([
    ...visibleTrails.map((item) => item.id),
    ...visibleIcons.map((item) => item.id),
    ...visibleTextures.map((item) => item.id)
  ]);

  const visibleUnlockables = (Array.isArray(unlockables) ? unlockables : []).filter((item) => {
    if (!item) return false;
    return visibleIds.has(item.id);
  });

  return {
    trails: visibleTrails,
    icons: visibleIcons,
    pipeTextures: visibleTextures,
    unlockables: visibleUnlockables
  };
}

function resolveConfigPath(customPath) {
  if (customPath) return path.resolve(customPath);
  return path.join(process.cwd(), "server-config.json");
}

function createServerConfigStore({ configPath, reloadIntervalMs = 15_000, fsApi = fs, now = Date.now, persistence = null } = {}) {
  const resolvedPath = resolveConfigPath(configPath);
  let current = clone(DEFAULT_SERVER_CONFIG);
  let lastChecked = 0;
  let lastLoadedAt = 0;
  let lastMtimeMs = null;
  let lastPersistedAt = null;
  let persistenceAdapter = persistence;

  function setPersistence(nextPersistence) {
    persistenceAdapter = nextPersistence;
  }

  async function writeToDisk(config) {
    const payload = JSON.stringify(config, null, 2);
    await fsApi.writeFile(resolvedPath, payload);
    lastLoadedAt = now();
    try {
      const stat = await fsApi.stat(resolvedPath);
      lastMtimeMs = stat.mtimeMs;
    } catch {
      lastMtimeMs = null;
    }
  }

  async function readFromDisk() {
    const raw = await fsApi.readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(raw);
    current = normalizeServerConfig(parsed);
    lastLoadedAt = now();
    return current;
  }

  async function load() {
    if (persistenceAdapter?.load) {
      const persisted = await persistenceAdapter.load();
      if (persisted) {
        current = normalizeServerConfig(persisted);
        lastLoadedAt = now();
        lastPersistedAt = lastLoadedAt;
        await writeToDisk(current);
        return current;
      }
    }
    try {
      const stat = await fsApi.stat(resolvedPath);
      lastMtimeMs = stat.mtimeMs;
      return await readFromDisk();
    } catch (err) {
      if (err && err.code === "ENOENT") {
        current = normalizeServerConfig();
        lastLoadedAt = now();
        lastMtimeMs = null;
        return current;
      }
      throw err;
    }
  }

  async function maybeReload() {
    const time = now();
    if (time - lastChecked < reloadIntervalMs) return current;
    lastChecked = time;
    try {
      const stat = await fsApi.stat(resolvedPath);
      if (lastMtimeMs && stat.mtimeMs <= lastMtimeMs) return current;
      lastMtimeMs = stat.mtimeMs;
      return await readFromDisk();
    } catch (err) {
      if (err && err.code === "ENOENT") {
        current = normalizeServerConfig();
        lastLoadedAt = now();
        lastMtimeMs = null;
        return current;
      }
      throw err;
    }
  }

  async function save(nextConfig) {
    const normalized = normalizeServerConfig(nextConfig);
    if (persistenceAdapter?.save) {
      await persistenceAdapter.save(normalized);
      lastPersistedAt = now();
    }
    current = normalized;
    await writeToDisk(current);
    return current;
  }

  return {
    configPath: resolvedPath,
    getConfig: () => current,
    getMeta: () => ({ lastLoadedAt, lastCheckedAt: lastChecked, lastMtimeMs, lastPersistedAt }),
    load,
    save,
    maybeReload,
    setPersistence
  };
}

module.exports = {
  DEFAULT_SERVER_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  normalizeServerConfig,
  applyUnlockableMenuConfig,
  createServerConfigStore,
  resolveConfigPath
};
