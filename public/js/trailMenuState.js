// ================================
// FILE: public/js/trailMenuState.js
// Shared helpers for building trail menu state.
// ================================

export function createTrailMenuStateProvider({
  sortTrailsForDisplay,
  computeUnlockedTrailSet
} = {}) {
  return function getTrailMenuState({
    trails = [],
    user = null,
    achievementsState = null
  } = {}) {
    const isRecordHolder = Boolean(user?.isRecordHolder);
    const orderedTrails = typeof sortTrailsForDisplay === "function"
      ? sortTrailsForDisplay(trails, { isRecordHolder })
      : (Array.isArray(trails) ? trails.slice() : []);
    const unlocked = typeof computeUnlockedTrailSet === "function"
      ? computeUnlockedTrailSet({ trails: orderedTrails, user, achievementsState })
      : new Set();
    const bestScore = user ? (user.bestScore | 0) : 0;
    const achievements = user?.achievements || achievementsState;

    return {
      orderedTrails,
      unlocked,
      bestScore,
      isRecordHolder,
      achievements
    };
  };
}

export const __testables = { createTrailMenuStateProvider };
