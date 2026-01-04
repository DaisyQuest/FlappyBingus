// ================================
// FILE: public/js/main/iconMenuController.js
// Centralized icon menu UI controller.
// ================================

export function createIconMenuController({
  elements = {},
  getNet,
  getIconMenuState,
  getCurrentIconId,
  setCurrentIconId,
  getPlayerIcons,
  setPlayerImage,
  getIconDisplayName,
  normalizeIconSelection,
  applyIconSwatchStyles,
  renderIconMenuOptions,
  getCachedIconSprite,
  paintIconCanvas,
  syncLauncherSwatch,
  refreshTrailMenu,
  writeIconCookie,
  DEFAULT_ICON_HINT,
  fallbackIconId
} = {}) {
  const resolveIcons = (icons) => (Array.isArray(icons) ? icons : []);

  const resolveMenuState = (icons) => {
    const net = getNet?.() || {};
    return getIconMenuState?.({
      icons,
      user: net.user,
      achievementsState: net.achievements?.state,
      unlockables: net.unlockables?.unlockables
    }) || {};
  };

  const resolveUnlockedSet = (icons, unlocked) => {
    if (unlocked instanceof Set) return unlocked;
    if (Array.isArray(unlocked)) return new Set(unlocked);
    const state = resolveMenuState(icons);
    return state.unlocked instanceof Set ? state.unlocked : new Set(state.unlocked || []);
  };

  const renderIconOptions = (selectedId, unlockedIds, icons, selectedImg) => {
    const { rendered = 0, swatches = [] } = renderIconMenuOptions?.({
      container: elements.iconOptions,
      icons,
      selectedId,
      unlockedIds
    }) || {};

    swatches.forEach((entry) => {
      const sprite = entry.icon?.id === selectedId ? selectedImg : getCachedIconSprite?.(entry.icon);
      paintIconCanvas?.(entry.canvas, entry.icon, { sprite });
    });

    if (elements.iconHint) {
      const text = rendered ? DEFAULT_ICON_HINT : "No icons available.";
      elements.iconHint.className = rendered ? "hint" : "hint bad";
      elements.iconHint.textContent = text;
    }

    return rendered;
  };

  const applyIconSelection = (
    id = getCurrentIconId?.(),
    icons = getPlayerIcons?.(),
    unlocked = null
  ) => {
    const orderedIcons = resolveIcons(icons);
    const unlockedIds = resolveUnlockedSet(orderedIcons, unlocked);
    const net = getNet?.() || {};
    const nextId = normalizeIconSelection?.({
      currentId: id || getCurrentIconId?.() || fallbackIconId,
      userSelectedId: net.user?.selectedIcon,
      unlockedIds,
      fallbackId: fallbackIconId
    }) || (id || fallbackIconId);

    setCurrentIconId?.(nextId);

    if (elements.iconText) {
      elements.iconText.textContent = getIconDisplayName?.(nextId, orderedIcons) ?? nextId;
    }
    if (elements.iconLauncher) {
      const swatch = elements.iconLauncher.querySelector(".icon-swatch");
      applyIconSwatchStyles?.(swatch, orderedIcons.find((icon) => icon.id === nextId));
      const nameEl = elements.iconLauncher.querySelector(".icon-launcher-name");
      if (nameEl) nameEl.textContent = getIconDisplayName?.(nextId, orderedIcons) ?? nextId;
    }

    const selectedIcon = orderedIcons.find((icon) => icon.id === nextId) || orderedIcons[0];
    const selectedImg = selectedIcon ? getCachedIconSprite?.(selectedIcon) : null;
    if (selectedImg) {
      setPlayerImage?.(selectedImg);
    }
    syncLauncherSwatch?.(nextId, orderedIcons, selectedImg);
    renderIconOptions(nextId, unlockedIds, orderedIcons, selectedImg);
    refreshTrailMenu?.();
    writeIconCookie?.(nextId);
    return nextId;
  };

  const refreshIconMenu = (selectedId = getCurrentIconId?.()) => {
    const orderedIcons = resolveIcons(getPlayerIcons?.());
    const menuState = resolveMenuState(orderedIcons);
    const unlockedIds = menuState.unlocked instanceof Set
      ? menuState.unlocked
      : new Set(menuState.unlocked || []);
    const net = getNet?.() || {};
    const selected = normalizeIconSelection?.({
      currentId: selectedId || getCurrentIconId?.() || fallbackIconId,
      userSelectedId: net.user?.selectedIcon,
      unlockedIds,
      fallbackId: fallbackIconId
    }) || (selectedId || fallbackIconId);

    const nextId = applyIconSelection(selected, orderedIcons, unlockedIds);

    return {
      selected: nextId,
      unlocked: unlockedIds,
      orderedIcons,
      best: menuState.bestScore,
      achievements: menuState.achievements,
      isRecordHolder: menuState.isRecordHolder
    };
  };

  return {
    applyIconSelection,
    refreshIconMenu
  };
}

export const __testables = { createIconMenuController };
