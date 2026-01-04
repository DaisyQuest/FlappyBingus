// ================================
// FILE: public/js/iconMenuState.js
// Shared helpers for building icon menu state.
// ================================

export function createIconMenuStateProvider({
  computeUnlockedIconSet
} = {}) {
  return function getIconMenuState({
    icons = [],
    user = null,
    achievementsState = null,
    unlockables = null
  } = {}) {
    const orderedIcons = Array.isArray(icons) ? icons.slice() : [];
    const unlocked = typeof computeUnlockedIconSet === "function"
      ? computeUnlockedIconSet({ icons: orderedIcons, user, achievementsState, unlockables })
      : new Set();
    const bestScore = user ? (user.bestScore | 0) : 0;
    const isRecordHolder = Boolean(user?.isRecordHolder);
    const achievements = user?.achievements || achievementsState;

    return {
      orderedIcons,
      unlocked,
      bestScore,
      isRecordHolder,
      achievements
    };
  };
}

export const __testables = { createIconMenuStateProvider };
