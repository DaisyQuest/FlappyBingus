// ================================
// FILE: public/js/trailMenuHandlers.js
// ================================
export function createTrailMenuHandlers({
  elements,
  getNet,
  getCurrentTrailId,
  getCurrentIconId,
  getPlayerIcons,
  getLastTrailHint,
  apiSetTrail,
  refreshTrailMenu,
  toggleTrailMenu,
  setTrailHint,
  applyTrailSelection,
  ensureLoggedInForSave,
  openPurchaseModal,
  handleTrailSaveResponse,
  setNetUser,
  setUserHint,
  buildTrailHint,
  mergeTrailCatalog,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  applyIconSelection,
  getAuthStatusFromResponse,
  recoverSession,
  getTrailMenuState,
  describeTrailLock,
  trailHoverText,
  DEFAULT_TRAIL_HINT,
  DEFAULT_CURRENCY_ID,
  UNLOCKABLE_TYPES
}) {
  const {
    trailLauncher,
    trailOverlay,
    trailOverlayClose,
    trailOptions
  } = elements;
  let trailSaveInFlight = null;

  const handleLauncherClick = () => {
    refreshTrailMenu(getCurrentTrailId());
    toggleTrailMenu(trailOverlay, true);
  };

  const handleOverlayCloseClick = () => {
    toggleTrailMenu(trailOverlay, false);
    const lastHint = getLastTrailHint();
    if (lastHint) setTrailHint(lastHint, { persist: false });
  };

  const handleOverlayClick = (event) => {
    if (event.target === trailOverlay) {
      toggleTrailMenu(trailOverlay, false);
      const lastHint = getLastTrailHint();
      if (lastHint) setTrailHint(lastHint, { persist: false });
    }
  };

  const handleOptionsClick = async (event) => {
    const btn = event.target.closest("button[data-trail-id]");
    if (!btn) return;

    const net = getNet();
    const id = btn.dataset.trailId;
    if (trailSaveInFlight === id) return;
    const menuState = getTrailMenuState?.({ trails: net.trails, user: net.user, achievementsState: net.achievements?.state }) || {};
    const {
      orderedTrails: ordered = Array.isArray(net.trails) ? net.trails : [],
      unlocked = new Set(),
      bestScore: best = net.user ? (net.user.bestScore | 0) : 0,
      isRecordHolder = Boolean(net.user?.isRecordHolder)
    } = menuState;
    const targetTrail = ordered.find((t) => t.id === id) || { id, name: id };

    if (!unlocked.has(id)) {
      if (btn.dataset.unlockType === "purchase") {
        openPurchaseModal({
          id,
          name: targetTrail.name || id,
          type: UNLOCKABLE_TYPES.trail,
          unlock: {
            type: "purchase",
            cost: Number(btn.dataset.unlockCost || 0),
            currencyId: btn.dataset.unlockCurrency || DEFAULT_CURRENCY_ID
          }
        }, { source: "trail" });
        return;
      }
      const lockText = btn.dataset.statusText
        || describeTrailLock(targetTrail, {
          unlocked: false,
          bestScore: best,
          isRecordHolder
        });
      refreshTrailMenu(getCurrentTrailId());
      setTrailHint({ className: "hint bad", text: lockText }, { persist: false });
      return;
    }

    if (net.user) {
      setNetUser({ ...net.user, selectedTrail: id });
    }
    applyTrailSelection(id, ordered);
    refreshTrailMenu(id);
    setTrailHint({
      className: net.user ? "hint" : "hint good",
      text: net.user ? "Saving trail choice…" : "Equipped (guest mode)."
    }, { persist: Boolean(net.user) });

    if (!net.user && !(await ensureLoggedInForSave())) return;

    trailSaveInFlight = id;
    try {
      const res = await apiSetTrail(id);
      await handleTrailSaveResponse({
        res,
        net,
        orderedTrails: ordered,
        selectedTrailId: id,
        currentTrailId: getCurrentTrailId(),
        currentIconId: getCurrentIconId(),
        playerIcons: getPlayerIcons(),
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
      });
    } finally {
      if (trailSaveInFlight === id) {
        trailSaveInFlight = null;
      }
    }
  };

  const handleOptionsMouseOver = (event) => {
    const btn = event.target.closest("button[data-trail-id]");
    if (!btn) return;
    const net = getNet();
    const id = btn.dataset.trailId;
    const menuState = getTrailMenuState?.({ trails: net.trails, user: net.user, achievementsState: net.achievements?.state }) || {};
    const {
      orderedTrails: ordered = Array.isArray(net.trails) ? net.trails : [],
      unlocked = new Set(),
      bestScore: best = net.user ? (net.user.bestScore | 0) : 0,
      isRecordHolder = Boolean(net.user?.isRecordHolder)
    } = menuState;
    const trail = ordered.find((item) => item.id === id) || { id, name: btn.dataset.trailName || id };
    const unlockedTrail = unlocked.has(id);
    const lockText = btn.dataset.statusText
      || describeTrailLock(trail, { unlocked: unlockedTrail, bestScore: best, isRecordHolder });
    const text = trailHoverText(trail, { unlocked: unlockedTrail, lockText });
    setTrailHint({ className: unlockedTrail ? "hint good" : "hint", text }, { persist: false });
  };

  const handleOptionsMouseOut = (event) => {
    if (!event.relatedTarget || !trailOptions.contains(event.relatedTarget)) {
      setTrailHint(getLastTrailHint() || { className: "hint", text: DEFAULT_TRAIL_HINT }, { persist: false });
    }
  };

  const bind = () => {
    trailLauncher?.addEventListener("click", handleLauncherClick);
    trailOverlayClose?.addEventListener("click", handleOverlayCloseClick);
    trailOverlay?.addEventListener("click", handleOverlayClick);
    trailOptions?.addEventListener("click", handleOptionsClick);
    trailOptions?.addEventListener("mouseover", handleOptionsMouseOver);
    trailOptions?.addEventListener("mouseout", handleOptionsMouseOut);
  };

  return {
    bind,
    handlers: {
      handleLauncherClick,
      handleOverlayCloseClick,
      handleOverlayClick,
      handleOptionsClick,
      handleOptionsMouseOver,
      handleOptionsMouseOut
    }
  };
}
