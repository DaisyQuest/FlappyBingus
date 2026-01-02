// ======================================
// FILE: public/js/pipeTextureMenuHandlers.js
// ======================================
export function createPipeTextureMenuHandlers({
  elements,
  getNet,
  getCurrentPipeTextureId,
  setCurrentPipeTextureId,
  getCurrentPipeTextureMode,
  setCurrentPipeTextureMode,
  refreshPipeTextureMenu,
  togglePipeTextureMenu,
  shouldClosePipeTextureMenu,
  normalizePipeTextureMode,
  writePipeTextureModeCookie,
  renderPipeTextureModeButtons,
  syncPipeTextureSwatch,
  renderPipeTextureMenuOptions,
  computeUnlockedPipeTextureSet,
  openPurchaseModal,
  applyPipeTextureSelection,
  shouldTriggerSelectionSave,
  triggerUserSave,
  ensureLoggedInForSave,
  apiSetPipeTexture,
  getAuthStatusFromResponse,
  recoverSession,
  setUserHint,
  setNetUser,
  syncPipeTextureCatalog,
  describePipeTextureLock,
  pipeTextureHoverText,
  DEFAULT_PIPE_TEXTURE_HINT,
  DEFAULT_CURRENCY_ID,
  UNLOCKABLE_TYPES
}) {
  const {
    pipeTextureLauncher,
    pipeTextureOverlay,
    pipeTextureOptions,
    pipeTextureModeOptions,
    pipeTextureHint
  } = elements;

  const handleLauncherClick = () => {
    refreshPipeTextureMenu(getCurrentPipeTextureId());
    togglePipeTextureMenu(pipeTextureOverlay, true);
  };

  const closeOverlay = () => {
    togglePipeTextureMenu(pipeTextureOverlay, false);
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint";
      pipeTextureHint.textContent = DEFAULT_PIPE_TEXTURE_HINT;
    }
  };

  const handleOverlayClick = (event) => {
    if (shouldClosePipeTextureMenu(event, { overlay: pipeTextureOverlay })) {
      closeOverlay();
    }
  };

  const handleModeClick = async (event) => {
    const btn = event.target.closest("button[data-pipe-texture-mode]");
    if (!btn) return;
    const net = getNet();
    const nextMode = normalizePipeTextureMode(btn.dataset.pipeTextureMode);
    if (nextMode === getCurrentPipeTextureMode()) return;
    const previous = getCurrentPipeTextureMode();
    setCurrentPipeTextureMode(nextMode);
    writePipeTextureModeCookie(getCurrentPipeTextureMode());
    renderPipeTextureModeButtons(getCurrentPipeTextureMode());
    syncPipeTextureSwatch(getCurrentPipeTextureId(), net.pipeTextures);
    renderPipeTextureMenuOptions(getCurrentPipeTextureId(), computeUnlockedPipeTextureSet(net.pipeTextures), net.pipeTextures);
    if (typeof shouldTriggerSelectionSave === "function" && shouldTriggerSelectionSave({ previousId: previous, nextId: nextMode })) {
      triggerUserSave?.();
    }

    if (!net.user && !(await ensureLoggedInForSave())) return;

    const res = await apiSetPipeTexture(getCurrentPipeTextureId(), getCurrentPipeTextureMode());
    if (!res || !res.ok) {
      const authStatus = getAuthStatusFromResponse(res);
      net.online = authStatus.online;
      if (authStatus.unauthorized) {
        await recoverSession();
      }
      if (!authStatus.online || !net.user) {
        setUserHint();
      }
      setCurrentPipeTextureMode(previous);
      writePipeTextureModeCookie(getCurrentPipeTextureMode());
      renderPipeTextureModeButtons(getCurrentPipeTextureMode());
      syncPipeTextureSwatch(getCurrentPipeTextureId(), net.pipeTextures);
      if (pipeTextureHint) {
        pipeTextureHint.className = "hint bad";
        pipeTextureHint.textContent = res?.error === "pipe_texture_locked"
          ? "That mode is locked with this texture."
          : "Could not save pipe texture mode.";
      }
      return;
    }

    setNetUser(res.user);
    syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
    setCurrentPipeTextureMode(normalizePipeTextureMode(res.user?.pipeTextureMode || getCurrentPipeTextureMode()));
    writePipeTextureModeCookie(getCurrentPipeTextureMode());
    renderPipeTextureModeButtons(getCurrentPipeTextureMode());
    syncPipeTextureSwatch(getCurrentPipeTextureId(), net.pipeTextures);
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint good";
      pipeTextureHint.textContent = "Pipe texture mode saved.";
    }
  };

  const handleOptionsClick = async (event) => {
    const btn = event.target.closest("button[data-pipe-texture-id]");
    if (!btn) return;
    const net = getNet();
    const id = btn.dataset.pipeTextureId;
    const unlocked = computeUnlockedPipeTextureSet(net.pipeTextures);
    if (!unlocked.has(id)) {
      if (btn.dataset.unlockType === "purchase") {
        const texture = net.pipeTextures.find((t) => t.id === id) || { id, name: id, unlock: {} };
        openPurchaseModal({
          id,
          name: texture.name || id,
          type: UNLOCKABLE_TYPES.pipeTexture,
          unlock: {
            type: "purchase",
            cost: Number(btn.dataset.unlockCost || 0),
            currencyId: btn.dataset.unlockCurrency || DEFAULT_CURRENCY_ID
          }
        }, { source: "pipe_texture" });
        return;
      }
      if (pipeTextureHint) {
        pipeTextureHint.className = "hint bad";
        pipeTextureHint.textContent = describePipeTextureLock(
          net.pipeTextures.find((t) => t.id === id) || { unlock: {} },
          { unlocked: false }
        );
      }
      renderPipeTextureMenuOptions(getCurrentPipeTextureId(), unlocked, net.pipeTextures);
      return;
    }

    const previous = getCurrentPipeTextureId();
    applyPipeTextureSelection(id, net.pipeTextures, unlocked);
    setCurrentPipeTextureId(id);
    if (shouldTriggerSelectionSave({ previousId: previous, nextId: id })) {
      triggerUserSave?.();
    }
    if (pipeTextureHint) {
      pipeTextureHint.className = net.user ? "hint" : "hint good";
      pipeTextureHint.textContent = net.user ? "Saving pipe texture…" : "Equipped (guest mode).";
    }

    if (!net.user && !(await ensureLoggedInForSave())) return;

    const res = await apiSetPipeTexture(id, getCurrentPipeTextureMode());
    if (!res || !res.ok) {
      const authStatus = getAuthStatusFromResponse(res);
      net.online = authStatus.online;
      if (authStatus.unauthorized) {
        await recoverSession();
      }
      if (!authStatus.online || !net.user) {
        setUserHint();
      }
      applyPipeTextureSelection(previous, net.pipeTextures, unlocked);
      setCurrentPipeTextureId(previous);
      if (pipeTextureHint) {
        pipeTextureHint.className = "hint bad";
        pipeTextureHint.textContent = res?.error === "pipe_texture_locked"
          ? "That pipe texture is locked."
          : "Could not save pipe texture.";
      }
      return;
    }

    setNetUser(res.user);
    syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
    setCurrentPipeTextureMode(normalizePipeTextureMode(res.user?.pipeTextureMode || getCurrentPipeTextureMode()));
    setCurrentPipeTextureId(res.user?.selectedPipeTexture || id);
    applyPipeTextureSelection(getCurrentPipeTextureId(), net.pipeTextures, computeUnlockedPipeTextureSet(net.pipeTextures));
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint good";
      pipeTextureHint.textContent = "Pipe texture saved.";
    }
  };

  const handleOptionsMouseOver = (event) => {
    const btn = event.target.closest("button[data-pipe-texture-id]");
    if (!btn) return;
    const net = getNet();
    const id = btn.dataset.pipeTextureId;
    const texture = net.pipeTextures.find((t) => t.id === id);
    const unlocked = computeUnlockedPipeTextureSet(net.pipeTextures).has(id);
    if (pipeTextureHint) {
      pipeTextureHint.className = unlocked ? "hint good" : "hint";
      pipeTextureHint.textContent = pipeTextureHoverText(texture, { unlocked });
    }
  };

  const handleOptionsMouseOut = (event) => {
    if (!event.relatedTarget || !pipeTextureOptions.contains(event.relatedTarget)) {
      if (pipeTextureHint) {
        pipeTextureHint.className = "hint";
        pipeTextureHint.textContent = DEFAULT_PIPE_TEXTURE_HINT;
      }
    }
  };

  const bind = () => {
    pipeTextureLauncher?.addEventListener("click", handleLauncherClick);
    pipeTextureOverlay?.addEventListener("click", handleOverlayClick);
    pipeTextureModeOptions?.addEventListener("click", handleModeClick);
    pipeTextureOptions?.addEventListener("click", handleOptionsClick);
    pipeTextureOptions?.addEventListener("mouseover", handleOptionsMouseOver);
    pipeTextureOptions?.addEventListener("mouseout", handleOptionsMouseOut);
  };

  return {
    bind,
    handlers: {
      handleLauncherClick,
      handleOverlayClick,
      handleModeClick,
      handleOptionsClick,
      handleOptionsMouseOver,
      handleOptionsMouseOut,
      closeOverlay
    }
  };
}
