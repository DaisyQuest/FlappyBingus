// ============================
// FILE: public/js/main/state.js
// ============================
// Module boundary: shared boot + network state for main.js orchestration.
// Keeps construction logic centralized and testable.

export function createBootState() {
  return {
    imgReady: false,
    imgOk: false,
    cfgReady: false,
    cfgOk: false,
    cfgSrc: "defaults"
  };
}

export function createNetState({
  defaultTrails,
  defaultIcons,
  normalizePipeTextures,
  achievements,
  buildUnlockablesCatalog
}) {
  const trails = defaultTrails.map((trail) => ({ ...trail }));
  const icons = defaultIcons.map((icon) => ({ ...icon }));
  const pipeTextures = normalizePipeTextures(null);

  return {
    online: true,
    user: null,
    trails,
    icons,
    pipeTextures,
    highscores: [],
    achievements: { definitions: achievements.definitions, state: achievements.normalizeState() },
    trailStyleOverrides: {},
    unlockables: buildUnlockablesCatalog({
      trails,
      icons,
      pipeTextures
    })
  };
}
