// ================================
// FILE: public/js/menuProfileBindings.js
// ================================
import { DEFAULT_PLAYER_ICON_ID } from "./playerIcons.js";

export function getIconDisplayName(id, icons = []) {
  if (!id) return DEFAULT_PLAYER_ICON_ID;
  return icons.find((i) => i.id === id)?.name || id || DEFAULT_PLAYER_ICON_ID;
}

export function getTrailDisplayName(id, trails = []) {
  if (!id) return "";
  return trails.find((t) => t.id === id)?.name || id;
}

export function syncMenuProfileBindings({
  refs = {},
  user = null,
  trails = [],
  icons = [],
  fallbackTrailId = "classic",
  fallbackIconId = DEFAULT_PLAYER_ICON_ID,
  bestScoreFallback = 0
} = {}) {
  const username = user?.username || "";
  if (refs.usernameInput) refs.usernameInput.value = username;

  const bestScore = Number.isFinite(user?.bestScore) ? user.bestScore : bestScoreFallback;
  if (refs.pbText) refs.pbText.textContent = String(bestScore);

  const bustercoins = Number.isFinite(user?.bustercoins) ? user.bustercoins : 0;
  if (refs.bustercoinText) refs.bustercoinText.textContent = String(bustercoins);

  const trailId = user?.selectedTrail || fallbackTrailId;
  if (refs.trailText) refs.trailText.textContent = getTrailDisplayName(trailId, trails);

  const iconId = user?.selectedIcon || fallbackIconId;
  if (refs.iconText) refs.iconText.textContent = getIconDisplayName(iconId, icons);

  return {
    username,
    bestScore,
    bustercoins,
    trailId,
    iconId
  };
}
