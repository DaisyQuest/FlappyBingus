// ===============================
// FILE: public/js/iconMenuHandlers.js
// ===============================
export function createIconMenuHandlers({
  elements,
  getNet,
  getPlayerIcons,
  getCurrentIconId,
  computeUnlockedIconSet,
  openPurchaseModal,
  applyIconSelection,
  ensureLoggedInForSave,
  apiSetIcon,
  classifyIconSaveResponse,
  setNetUser,
  normalizeTrails,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  setUserHint,
  recoverSession,
  renderIconOptions,
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

  const handleOptionsClick = async (event) => {
    const btn = event.target.closest("button[data-icon-id]");
    if (!btn) return;

    const net = getNet();
    const id = btn.dataset.iconId;
    const playerIcons = getPlayerIcons();
    const unlocked = computeUnlockedIconSet(playerIcons);
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
      renderIconOptions(getCurrentIconId(), unlocked, playerIcons);
      return;
    }

    const previous = getCurrentIconId();
    if (net.user) {
      setNetUser({ ...net.user, selectedIcon: id });
    }
    applyIconSelection(id, playerIcons, unlocked);
    if (iconHint) {
      iconHint.className = net.user ? "hint" : "hint good";
      iconHint.textContent = net.user ? "Saving icon choice…" : "Equipped (guest mode).";
    }

    if (!net.user && !(await ensureLoggedInForSave())) return;

    const res = await apiSetIcon(id);
    const outcome = classifyIconSaveResponse(res);
    net.online = outcome.online;

    if (outcome.needsReauth) {
      await recoverSession();
    }

    if (outcome.outcome === "saved" && res) {
      setNetUser(res.user);
      net.trails = normalizeTrails(res.trails ?? net.trails, { allowEmpty: true });
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(res.icons || net.icons);
      syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
      applyIconSelection(res.user?.selectedIcon || id, getPlayerIcons());
    } else if (outcome.revert) {
      applyIconSelection(previous, playerIcons);
    }

    if (!outcome.online || !net.user) {
      setUserHint();
    }

    if (iconHint) {
      iconHint.className = outcome.outcome === "saved" ? "hint good" : "hint bad";
      iconHint.textContent = outcome.message;
    }
  };

  const handleOptionsMouseOver = (event) => {
    const btn = event.target.closest("button[data-icon-id]");
    if (!btn) return;
    const id = btn.dataset.iconId;
    const playerIcons = getPlayerIcons();
    const icon = playerIcons.find((i) => i.id === id);
    const unlocked = computeUnlockedIconSet(playerIcons).has(id);
    if (iconHint) {
      iconHint.className = unlocked ? "hint good" : "hint";
      iconHint.textContent = iconHoverText(icon, { unlocked, lockText: btn.dataset.statusText });
    }
  };

  const handleOptionsMouseOut = (event) => {
    if (!event.relatedTarget || !iconOptions.contains(event.relatedTarget)) {
      resetIconHint(iconHint);
    }
  };

  const handleLauncherClick = () => {
    renderIconOptions(getCurrentIconId(), computeUnlockedIconSet(getPlayerIcons()), getPlayerIcons());
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
