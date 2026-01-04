// ================================
// FILE: public/js/menuProfileBindings.js
// ================================
import { getFirstIconId } from "./playerIcons.js";
import { DEFAULT_PIPE_TEXTURE_ID } from "./pipeTextures.js";
import { DEFAULT_CURRENCY_ID, SUPPORT_CURRENCY_ID, getUserCurrencyBalance } from "./currencySystem.js";

export function getIconDisplayName(id, icons = []) {
  const fallbackId = getFirstIconId(icons);
  if (!id) return fallbackId;
  return icons.find((i) => i.id === id)?.name || id || fallbackId;
}

export function getTrailDisplayName(id, trails = []) {
  if (!id) return "";
  return trails.find((t) => t.id === id)?.name || id;
}

export function getPipeTextureDisplayName(id, textures = []) {
  if (!id) return DEFAULT_PIPE_TEXTURE_ID;
  return textures.find((t) => t.id === id)?.name || id || DEFAULT_PIPE_TEXTURE_ID;
}

export function syncMenuProfileBindings({
  refs = {},
  user = null,
  trails = [],
  icons = [],
  pipeTextures = [],
  fallbackUsername = "",
  fallbackTrailId = "classic",
  fallbackIconId = "",
  fallbackPipeTextureId = DEFAULT_PIPE_TEXTURE_ID,
  bestScoreFallback = 0
} = {}) {
  const resolvedFallbackIconId = fallbackIconId || getFirstIconId(icons);
  const username = user?.username || fallbackUsername || "";
  if (refs.usernameInput) refs.usernameInput.value = username;

  const bestScore = Number.isFinite(user?.bestScore) ? user.bestScore : bestScoreFallback;
  if (refs.pbText) refs.pbText.textContent = String(bestScore);

  const bustercoins = getUserCurrencyBalance(user, DEFAULT_CURRENCY_ID);
  if (refs.bustercoinText) refs.bustercoinText.textContent = String(bustercoins);

  const supportcoins = getUserCurrencyBalance(user, SUPPORT_CURRENCY_ID);
  if (refs.supportcoinText) refs.supportcoinText.textContent = String(supportcoins);

  const trailId = user?.selectedTrail || fallbackTrailId;
  if (refs.trailText) refs.trailText.textContent = getTrailDisplayName(trailId, trails);

  const iconId = user?.selectedIcon || resolvedFallbackIconId;
  if (refs.iconText) refs.iconText.textContent = getIconDisplayName(iconId, icons);

  const pipeTextureId = user?.selectedPipeTexture || fallbackPipeTextureId;
  if (refs.pipeTextureText) refs.pipeTextureText.textContent = getPipeTextureDisplayName(pipeTextureId, pipeTextures);

  return {
    username,
    bestScore,
    bustercoins,
    supportcoins,
    trailId,
    iconId,
    pipeTextureId
  };
}

export function createMenuProfileModel({
  refs = {},
  user = null,
  trails = [],
  icons = [],
  pipeTextures = [],
  fallbackUsername = "",
  fallbackTrailId = "classic",
  fallbackIconId = "",
  fallbackPipeTextureId = DEFAULT_PIPE_TEXTURE_ID,
  bestScoreFallback = 0
} = {}) {
  let model = {
    refs,
    user,
    trails,
    icons,
    pipeTextures,
    fallbackUsername,
    fallbackTrailId,
    fallbackIconId,
    fallbackPipeTextureId,
    bestScoreFallback
  };

  function sync(overrides = {}) {
    model = { ...model, ...overrides };
    return syncMenuProfileBindings(model);
  }

  function updateUser(nextUser) {
    return sync({ user: nextUser });
  }

  function updateCatalogs({ trails: nextTrails, icons: nextIcons, pipeTextures: nextPipeTextures } = {}) {
    return sync({
      trails: nextTrails ?? model.trails,
      icons: nextIcons ?? model.icons,
      pipeTextures: nextPipeTextures ?? model.pipeTextures
    });
  }

  function getModel() {
    return { ...model };
  }

  return {
    sync,
    updateUser,
    updateCatalogs,
    getModel
  };
}
