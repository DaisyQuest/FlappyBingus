"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function resolveConfigPath(configPath) {
  if (!configPath) {
    throw new Error("config_path_required");
  }
  return path.resolve(configPath);
}

function createGameConfigStore({ configPath, fsApi = fs, now = Date.now, persistence = null } = {}) {
  const resolvedPath = resolveConfigPath(configPath);
  let current = {};
  let lastLoadedAt = 0;
  let lastSavedAt = 0;
  let lastPersistedAt = null;
  let persistenceAdapter = persistence;

  function setPersistence(nextPersistence) {
    persistenceAdapter = nextPersistence;
  }

  async function readFromDisk() {
    try {
      const raw = await fsApi.readFile(resolvedPath, "utf8");
      const parsed = JSON.parse(raw);
      current = clone(parsed);
      lastLoadedAt = now();
      return current;
    } catch (err) {
      if (err && err.code === "ENOENT") {
        current = {};
        lastLoadedAt = now();
        return current;
      }
      throw err;
    }
  }

  async function writeToDisk(config) {
    const payload = JSON.stringify(config ?? {}, null, 2);
    await fsApi.writeFile(resolvedPath, payload);
    lastSavedAt = now();
  }

  async function load() {
    if (persistenceAdapter?.load) {
      const persisted = await persistenceAdapter.load();
      if (persisted !== null && persisted !== undefined) {
        current = clone(persisted);
        lastLoadedAt = now();
        lastPersistedAt = lastLoadedAt;
        await writeToDisk(current);
        return current;
      }
    }
    return await readFromDisk();
  }

  async function save(nextConfig) {
    const payload = clone(nextConfig);
    if (persistenceAdapter?.save) {
      await persistenceAdapter.save(payload);
      lastPersistedAt = now();
    }
    current = payload;
    await writeToDisk(current);
    return current;
  }

  return {
    configPath: resolvedPath,
    getConfig: () => current,
    getMeta: () => ({ lastLoadedAt, lastSavedAt, lastPersistedAt }),
    load,
    save,
    setPersistence
  };
}

module.exports = {
  createGameConfigStore,
  resolveConfigPath
};
