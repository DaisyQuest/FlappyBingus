export function createAppBootstrap({
  createBootState,
  createNetState,
  buildBaseIcons,
  normalizePlayerIcons,
  getFirstIconId,
  DEFAULT_TRAILS,
  normalizePipeTextures,
  ACHIEVEMENTS,
  normalizeAchievementState,
  buildUnlockablesCatalog
} = {}) {
  const boot = createBootState();
  const baseIcons = buildBaseIcons();
  const normalizedBaseIcons = normalizePlayerIcons(baseIcons);
  const fallbackIconId = getFirstIconId(normalizedBaseIcons);
  const net = createNetState({
    defaultTrails: DEFAULT_TRAILS,
    icons: normalizedBaseIcons,
    normalizePipeTextures,
    achievements: { definitions: ACHIEVEMENTS, normalizeState: normalizeAchievementState },
    buildUnlockablesCatalog
  });

  return {
    boot,
    net,
    baseIcons,
    normalizedBaseIcons,
    fallbackIconId
  };
}
