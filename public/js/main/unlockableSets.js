import { buildUnlockablesCatalog, getUnlockedIdsByType, UNLOCKABLE_TYPES } from "../unlockables.js";
import { getUnlockedTrails } from "../trailProgression.js";

export const getOwnedUnlockables = (user) => {
  if (!user) return [];
  if (Array.isArray(user.ownedUnlockables)) return user.ownedUnlockables;
  if (Array.isArray(user.ownedIcons)) return user.ownedIcons;
  return [];
};

const buildUnlockContext = ({ user, achievementsState }) => ({
  bestScore: user ? (user.bestScore | 0) : 0,
  achievements: user?.achievements || achievementsState,
  ownedIds: getOwnedUnlockables(user),
  recordHolder: Boolean(user?.isRecordHolder)
});

export const computeUnlockedIconSet = ({
  icons = [],
  user,
  achievementsState,
  unlockables
} = {}) => {
  const context = buildUnlockContext({ user, achievementsState });
  const catalog = Array.isArray(unlockables)
    ? unlockables
    : buildUnlockablesCatalog({ icons }).unlockables;
  return new Set(getUnlockedIdsByType({
    unlockables: catalog,
    type: UNLOCKABLE_TYPES.playerTexture,
    state: user?.unlockables,
    context
  }));
};

export const computeUnlockedTrailSet = ({
  trails = [],
  user,
  achievementsState
} = {}) => {
  const context = buildUnlockContext({ user, achievementsState });
  return new Set(getUnlockedTrails(trails, context.achievements, {
    isRecordHolder: context.recordHolder,
    ownedIds: context.ownedIds,
    bestScore: context.bestScore
  }));
};

export const computeUnlockedPipeTextureSet = ({
  textures = [],
  user,
  achievementsState,
  unlockables
} = {}) => {
  const context = buildUnlockContext({ user, achievementsState });
  const catalog = Array.isArray(unlockables) ? unlockables : [];
  return new Set(getUnlockedIdsByType({
    unlockables: catalog,
    type: UNLOCKABLE_TYPES.pipeTexture,
    state: user?.unlockables,
    context
  }));
};

export const __testables__ = { buildUnlockContext };
