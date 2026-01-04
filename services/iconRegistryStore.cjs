"use strict";

const { normalizeIconCatalog } = require("./iconCatalog.cjs");

function cloneIcons(list) {
  return (Array.isArray(list) ? list : []).map((icon) => ({ ...icon }));
}

function createIconRegistryStore({ now = Date.now, persistence = null } = {}) {
  let icons = [];
  let lastLoadedAt = 0;
  let lastSavedAt = 0;
  let lastPersistedAt = null;
  let persistenceAdapter = persistence;

  function setPersistence(nextPersistence) {
    persistenceAdapter = nextPersistence;
  }

  function getMeta() {
    return { lastLoadedAt, lastSavedAt, lastPersistedAt };
  }

  function getIcons() {
    return cloneIcons(icons);
  }

  async function load() {
    let loaded = [];
    if (persistenceAdapter?.load) {
      loaded = await persistenceAdapter.load();
      lastPersistedAt = now();
    }
    const result = normalizeIconCatalog({ icons: loaded });
    icons = result.icons;
    lastLoadedAt = now();
    return getIcons();
  }

  async function save(nextIcons) {
    const result = normalizeIconCatalog({ icons: nextIcons });
    if (!result.ok) {
      const error = new Error("invalid_icon_catalog");
      error.details = result.errors;
      throw error;
    }
    if (persistenceAdapter?.save) {
      await persistenceAdapter.save(result.icons);
      lastPersistedAt = now();
    }
    icons = result.icons;
    lastSavedAt = now();
    return getIcons();
  }

  return {
    getIcons,
    getMeta,
    load,
    save,
    setPersistence
  };
}

module.exports = {
  createIconRegistryStore
};
