// ================================
// FILE: public/js/main/trailMenuController.js
// Centralized trail menu UI controller.
// ================================

export function createTrailMenuController({
  elements = {},
  getNet,
  getTrailMenuState,
  getCurrentTrailId,
  setCurrentTrailId,
  getCurrentIconId,
  getPlayerIcons,
  getPlayerImage,
  getTrailDisplayName,
  normalizeTrailSelection,
  renderTrailMenuOptions,
  describeTrailLock,
  buildTrailHint,
  shouldTriggerGuestSave,
  syncMenuProfileBindingsFromState,
  syncLauncherSwatch,
  trailPreview,
  saveUserButton,
  DEFAULT_TRAIL_HINT,
  GUEST_TRAIL_HINT_TEXT
} = {}) {
  let lastTrailHint = { className: "hint", text: DEFAULT_TRAIL_HINT };
  let guestSaveTriggered = false;

  const applyTrailSelection = (id = getCurrentTrailId?.(), trails = getNet?.().trails) => {
    const safeId = id || "classic";
    if (typeof setCurrentTrailId === "function") {
      setCurrentTrailId(safeId);
    }

    if (elements.trailText) {
      elements.trailText.textContent = getTrailDisplayName?.(safeId, trails) ?? safeId;
    }
    if (elements.trailLauncher) {
      const nameEl = elements.trailLauncher.querySelector(".trail-launcher-name");
      if (nameEl) nameEl.textContent = getTrailDisplayName?.(safeId, trails) ?? safeId;
    }
    trailPreview?.setTrail?.(safeId);
    syncLauncherSwatch?.(
      getCurrentIconId?.(),
      getPlayerIcons?.(),
      getPlayerImage?.()
    );
    return safeId;
  };

  const setTrailHint = (hint, { persist = true } = {}) => {
    if (elements.trailHint) {
      const current = elements.trailHint.textContent;
      const nextText = hint?.text;
      if (shouldTriggerGuestSave?.({
        currentText: current,
        nextText,
        alreadyTriggered: guestSaveTriggered
      })) {
        guestSaveTriggered = true;
        saveUserButton?.click?.();
      } else if (nextText !== GUEST_TRAIL_HINT_TEXT) {
        guestSaveTriggered = false;
      }
      elements.trailHint.className = hint?.className || "hint";
      elements.trailHint.textContent = hint?.text || DEFAULT_TRAIL_HINT;
    }
    if (persist) {
      lastTrailHint = hint;
    }
  };

  const refreshTrailMenu = (selectedId = getCurrentTrailId?.()) => {
    const net = getNet?.() || {};
    const menuState = getTrailMenuState?.({
      trails: net.trails,
      user: net.user,
      achievementsState: net.achievements?.state
    }) || {};
    const {
      orderedTrails = Array.isArray(net.trails) ? net.trails : [],
      unlocked = new Set(),
      bestScore = net.user ? (net.user.bestScore | 0) : 0,
      isRecordHolder = Boolean(net.user?.isRecordHolder),
      achievements
    } = menuState;

    const selected = normalizeTrailSelection?.({
      currentId: selectedId,
      userSelectedId: net.user?.selectedTrail,
      selectValue: selectedId,
      unlockedIds: unlocked,
      fallbackId: "classic"
    }) || (selectedId || "classic");

    applyTrailSelection(selected, orderedTrails);

    const { rendered } = renderTrailMenuOptions?.({
      container: elements.trailOptions,
      trails: orderedTrails,
      selectedId: selected,
      unlockedIds: unlocked,
      lockTextFor: (trail, { unlocked: unlockedTrail }) => describeTrailLock?.(trail, {
        unlocked: unlockedTrail ?? unlocked.has(trail.id),
        bestScore,
        isRecordHolder
      })
    }) || { rendered: 0 };

    syncMenuProfileBindingsFromState?.({ bestScoreFallback: bestScore, fallbackTrailId: selected });

    const hint = buildTrailHint?.({
      online: net.online,
      user: net.user,
      bestScore,
      trails: orderedTrails,
      achievements
    });

    if (elements.trailHint) {
      setTrailHint(rendered ? hint : { className: "hint bad", text: "No trails available." });
    }

    return { selected, unlocked, orderedTrails, best: bestScore };
  };

  const resumeTrailPreview = (selectedId = getCurrentTrailId?.()) => {
    applyTrailSelection(selectedId || getCurrentTrailId?.() || "classic");
    trailPreview?.start?.();
  };

  const pauseTrailPreview = () => {
    trailPreview?.stop?.();
  };

  const getLastTrailHint = () => lastTrailHint;

  return {
    applyTrailSelection,
    setTrailHint,
    refreshTrailMenu,
    resumeTrailPreview,
    pauseTrailPreview,
    getLastTrailHint
  };
}

export const __testables = { createTrailMenuController };
