// ================================
// FILE: public/js/menuProfileBindings.js
// ================================
import { DEFAULT_PLAYER_ICON_ID } from "./playerIcons.js";
import { DEFAULT_PIPE_TEXTURE_ID } from "./pipeTextures.js";
import { DEFAULT_CURRENCY_ID, getUserCurrencyBalance } from "./currencySystem.js";

export function getIconDisplayName(id, icons = []) {
  if (!id) return DEFAULT_PLAYER_ICON_ID;
  return icons.find((i) => i.id === id)?.name || id || DEFAULT_PLAYER_ICON_ID;
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
  fallbackTrailId = "classic",
  fallbackIconId = DEFAULT_PLAYER_ICON_ID,
  fallbackPipeTextureId = DEFAULT_PIPE_TEXTURE_ID,
  bestScoreFallback = 0
} = {}) {
  const username = user?.username || "";
  if (refs.usernameInput) refs.usernameInput.value = username;

  const bestScore = Number.isFinite(user?.bestScore) ? user.bestScore : bestScoreFallback;
  if (refs.pbText) refs.pbText.textContent = String(bestScore);

  const bustercoins = getUserCurrencyBalance(user, DEFAULT_CURRENCY_ID);
  if (refs.bustercoinText) refs.bustercoinText.textContent = String(bustercoins);

  const trailId = user?.selectedTrail || fallbackTrailId;
  if (refs.trailText) refs.trailText.textContent = getTrailDisplayName(trailId, trails);

  const iconId = user?.selectedIcon || fallbackIconId;
  if (refs.iconText) refs.iconText.textContent = getIconDisplayName(iconId, icons);

  const pipeTextureId = user?.selectedPipeTexture || fallbackPipeTextureId;
  if (refs.pipeTextureText) refs.pipeTextureText.textContent = getPipeTextureDisplayName(pipeTextureId, pipeTextures);

  return {
    username,
    bestScore,
    bustercoins,
    trailId,
    iconId,
    pipeTextureId
  };
}
