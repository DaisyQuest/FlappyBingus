// ===============================
// FILE: public/js/main/cosmetics.js
// ===============================
// Module boundary: cosmetic resolution and replay cosmetic application.

export function createIconLookup(initialIcons = []) {
  let iconMap = new Map();

  const setIcons = (icons) => {
    iconMap = new Map(icons.map((icon) => [icon.id, icon]));
  };

  setIcons(initialIcons);

  return {
    setIcons,
    getById(id) {
      return iconMap.get(id);
    },
    getFallback() {
      return iconMap.values().next().value;
    }
  };
}

export function resolveActiveCosmetics({
  user,
  currentTrailId,
  currentIconId,
  currentPipeTextureId,
  currentPipeTextureMode,
  defaults
}) {
  return {
    trailId: user?.selectedTrail || currentTrailId || defaults.trailId,
    iconId: user?.selectedIcon || currentIconId || defaults.iconId,
    pipeTextureId: user?.selectedPipeTexture || currentPipeTextureId || defaults.pipeTextureId,
    pipeTextureMode: user?.pipeTextureMode || currentPipeTextureMode || defaults.pipeTextureMode
  };
}

export function makeReplayCosmeticsApplier({
  targetGame,
  resolveCosmetics,
  iconLookup,
  normalizePipeTextureMode,
  getCachedIconSprite
}) {
  return function applyReplayCosmetics(cosmetics) {
    if (!targetGame) return () => {};
    const fallback = resolveCosmetics();
    const resolved = {
      trailId: typeof cosmetics?.trailId === "string" && cosmetics.trailId.trim()
        ? cosmetics.trailId.trim()
        : fallback.trailId,
      iconId: typeof cosmetics?.iconId === "string" && cosmetics.iconId.trim()
        ? cosmetics.iconId.trim()
        : fallback.iconId,
      pipeTextureId: typeof cosmetics?.pipeTextureId === "string" && cosmetics.pipeTextureId.trim()
        ? cosmetics.pipeTextureId.trim()
        : fallback.pipeTextureId,
      pipeTextureMode: normalizePipeTextureMode(cosmetics?.pipeTextureMode || fallback.pipeTextureMode)
    };

    const prevGetTrailId = targetGame.getTrailId;
    const prevGetPipeTexture = targetGame.getPipeTexture;
    const prevPlayerImg = targetGame.playerImg;

    targetGame.getTrailId = () => resolved.trailId;
    targetGame.getPipeTexture = () => ({ id: resolved.pipeTextureId, mode: resolved.pipeTextureMode });

    const icon = iconLookup.getById(resolved.iconId) || iconLookup.getFallback();
    if (icon) targetGame.setPlayerImage(getCachedIconSprite(icon));

    return () => {
      targetGame.getTrailId = prevGetTrailId;
      targetGame.getPipeTexture = prevGetPipeTexture;
      targetGame.setPlayerImage(prevPlayerImg);
    };
  };
}
