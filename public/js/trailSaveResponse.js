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
  mergeTrailCatalog,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  refreshTrailMenu,
  applyIconSelection,
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
    }
    setUserHint({ allowReauth: false });
    const bestScore = net.user ? (net.user.bestScore | 0) : 0;
    const hint = buildTrailHint({
      online: net.online,
      user: net.user,
      bestScore,
      trails: orderedTrails,
      achievements: net.user?.achievements || net.achievements?.state,
      selectedTrail: currentTrailId
    });
    setTrailHint(hint);
    return;
  }

  net.online = true;
  setNetUser(res.user);
  net.trails = mergeTrailCatalog(res.trails, { current: net.trails });
  syncUnlockablesCatalog({ trails: net.trails });
  syncIconCatalog(res.icons || net.icons);
  syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
  refreshTrailMenu(res.user?.selectedTrail || selectedTrailId);
  applyIconSelection(net.user?.selectedIcon || currentIconId, playerIcons);
}
