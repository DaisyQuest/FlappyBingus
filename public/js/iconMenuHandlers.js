// ===============================
// FILE: public/js/iconMenuHandlers.js
// ===============================
export function createIconMenuHandlers({
  elements,
  getNet,
  getPlayerIcons,
  getCurrentIconId,
  getIconMenuState,
  computeUnlockedIconSet,
  openPurchaseModal,
  applyIconSelection,
  apiSetIcon,
  classifyIconSaveResponse,
  setNetUser,
  mergeTrailCatalog,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  setUserHint,
  recoverSession,
  refreshIconMenu,
  toggleIconMenu,
  resetIconHint,
  describeIconLock,
  iconHoverText,
  DEFAULT_CURRENCY_ID,
  UNLOCKABLE_TYPES
}) {
  const {
    iconOptions,
    iconHint,
    iconLauncher,
    iconOverlay,
    iconOverlayClose
  } = elements;
  let iconSaveInFlight = null;

  const resolveIconState = () => {
    const icons = getPlayerIcons();
    const net = getNet();
    const state = typeof getIconMenuState === "function"
      ? getIconMenuState({
        icons,
        user: net.user,
        achievementsState: net.achievements?.state,
        unlockables: net.unlockables?.unlockables
      })
      : null;
    const unlocked = state?.unlocked instanceof Set
      ? state.unlocked
      : typeof computeUnlockedIconSet === "function"
        ? computeUnlockedIconSet(icons)
        : new Set();
    return { icons, unlocked };
  };

  const isIconInCatalog = (icons, id) => icons.some((icon) => icon?.id === id);

  const handleOptionsClick = async (event) => {
    const btn = event.target.closest("button[data-icon-id]");
    if (!btn) return;

    const net = getNet();
    const id = btn.dataset.iconId;
    if (iconSaveInFlight === id) return;
    let { icons: playerIcons, unlocked } = resolveIconState();
    if (!unlocked.has(id)) {
      if (btn.dataset.unlockType === "purchase") {
        const icon = playerIcons.find((i) => i.id === id) || { id, name: id, unlock: {} };
        openPurchaseModal({
          id,
          name: icon.name || id,
          type: UNLOCKABLE_TYPES.playerTexture,
          unlock: {
            type: "purchase",
            cost: Number(btn.dataset.unlockCost || 0),
            currencyId: btn.dataset.unlockCurrency || DEFAULT_CURRENCY_ID
          }
        }, { source: "icon" });
        return;
      }
      if (iconHint) {
        iconHint.className = "hint bad";
        iconHint.textContent = describeIconLock(
          playerIcons.find((i) => i.id === id) || { unlock: {} },
          { unlocked: false }
        );
      }
      refreshIconMenu?.(getCurrentIconId());
      return;
    }

    const previous = getCurrentIconId();
    if (net.user) {
      setNetUser({ ...net.user, selectedIcon: id });
    }
    applyIconSelection(id, playerIcons, unlocked);
    if (iconHint) {
      iconHint.className = net.user ? "hint" : "hint good";
      iconHint.textContent = net.user
        ? "Saving icon choice…"
        : "Equipped (guest mode). Sign in to save.";
    }

    if (!net.user) return;

    ({ icons: playerIcons, unlocked } = resolveIconState());
    if (!isIconInCatalog(playerIcons, id) || !unlocked.has(id)) {
      applyIconSelection(previous, playerIcons, unlocked);
      if (iconHint) {
        const fallback = { unlock: {} };
        const lockTarget = playerIcons.find((icon) => icon.id === id) || fallback;
        iconHint.className = "hint bad";
        iconHint.textContent = isIconInCatalog(playerIcons, id)
          ? describeIconLock(lockTarget, { unlocked: false })
          : "That icon is unavailable.";
      }
      refreshIconMenu?.(getCurrentIconId());
      return;
    }

    iconSaveInFlight = id;
    try {
      const res = await apiSetIcon(id);
      const outcome = classifyIconSaveResponse(res);
      net.online = outcome.online;

      if (outcome.needsReauth) {
        await recoverSession();
      }

      if (outcome.outcome === "saved" && res) {
        setNetUser(res.user);
        net.trails = mergeTrailCatalog(res.trails, { current: net.trails });
        syncUnlockablesCatalog({ trails: net.trails });
        if (Array.isArray(res.icons) && res.icons.length) {
          const selected = res.user?.selectedIcon || id;
          if (isIconInCatalog(res.icons, selected)) {
            syncIconCatalog(res.icons);
          }
        }
        syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
        applyIconSelection(res.user?.selectedIcon || id, getPlayerIcons());
      } else if (outcome.revert) {
        applyIconSelection(previous, playerIcons);
      }

      if (!outcome.online || !net.user) {
        setUserHint({ allowReauth: false });
      }

      if (iconHint) {
        iconHint.className = outcome.outcome === "saved" ? "hint good" : "hint bad";
        iconHint.textContent = outcome.message;
      }
    } finally {
      if (iconSaveInFlight === id) {
        iconSaveInFlight = null;
      }
    }
  };

  const handleOptionsMouseOver = (event) => {
    const btn = event.target.closest("button[data-icon-id]");
    if (!btn) return;
    const id = btn.dataset.iconId;
    const { icons: playerIcons, unlocked } = resolveIconState();
    const icon = playerIcons.find((i) => i.id === id);
    const isUnlocked = unlocked.has(id);
    if (iconHint) {
      iconHint.className = isUnlocked ? "hint good" : "hint";
      iconHint.textContent = iconHoverText(icon, { unlocked: isUnlocked, lockText: btn.dataset.statusText });
    }
  };

  const handleOptionsMouseOut = (event) => {
    if (!event.relatedTarget || !iconOptions.contains(event.relatedTarget)) {
      resetIconHint(iconHint);
    }
  };

  const handleLauncherClick = () => {
    refreshIconMenu?.(getCurrentIconId());
    toggleIconMenu(iconOverlay, true);
  };

  const handleOverlayCloseClick = () => {
    toggleIconMenu(iconOverlay, false);
    resetIconHint(iconHint);
  };

  const handleOverlayClick = (event) => {
    if (event.target === iconOverlay) {
      toggleIconMenu(iconOverlay, false);
      resetIconHint(iconHint);
    }
  };

  const bind = () => {
    iconOptions?.addEventListener("click", handleOptionsClick);
    iconOptions?.addEventListener("mouseover", handleOptionsMouseOver);
    iconOptions?.addEventListener("mouseout", handleOptionsMouseOut);
    iconLauncher?.addEventListener("click", handleLauncherClick);
    iconOverlayClose?.addEventListener("click", handleOverlayCloseClick);
    iconOverlay?.addEventListener("click", handleOverlayClick);
  };

  return {
    bind,
    handlers: {
      handleOptionsClick,
      handleOptionsMouseOver,
      handleOptionsMouseOut,
      handleLauncherClick,
      handleOverlayCloseClick,
      handleOverlayClick
    }
  };
}
