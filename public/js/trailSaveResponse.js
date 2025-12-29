// =======================
// FILE: public/js/trailSaveResponse.js
// =======================
export async function handleTrailSaveResponse({
  res,
  net,
  orderedTrails,
  selectedTrailId,
  currentTrailId,
  currentIconId,
  playerIcons,
  setNetUser,
  setUserHint,
  setTrailHint,
  buildTrailHint,
  normalizeTrails,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  refreshTrailMenu,
  applyIconSelection,
  readLocalBest,
  getAuthStatusFromResponse,
  recoverSession
}) {
  if (!res || !res.ok) {
    const authStatus = getAuthStatusFromResponse(res);
    net.online = authStatus.online;
    if (authStatus.unauthorized) {
      const recovered = typeof recoverSession === "function"
        ? await recoverSession()
        : false;
      if (!recovered) {
        setNetUser(null);
      }
    }
    setUserHint();
    const hint = buildTrailHint({
      online: net.online,
      user: net.user,
      bestScore: net.user ? (net.user.bestScore | 0) : readLocalBest(),
      trails: orderedTrails,
      achievements: net.user?.achievements || net.achievements?.state,
      selectedTrail: currentTrailId
    });
    setTrailHint(hint);
    return;
  }

  net.online = true;
  setNetUser(res.user);
  net.trails = normalizeTrails(res.trails || net.trails);
  syncUnlockablesCatalog({ trails: net.trails });
  syncIconCatalog(res.icons || net.icons);
  syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
  refreshTrailMenu(res.user?.selectedTrail || selectedTrailId);
  applyIconSelection(net.user?.selectedIcon || currentIconId, playerIcons);
}
