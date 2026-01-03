// =====================
// FILE: public/js/trailHint.js
// =====================
import { clamp } from "./util.js";
import { getUnlockedTrails } from "./trailProgression.js";

export const GUEST_TRAIL_HINT_TEXT =
  "Guest mode: register or sign in to track progression and unlocks.";

function coerceScore(v) {
  const n = Number.parseInt(v, 10);
  return clamp(Number.isFinite(n) ? n : 0, 0, 1e9);
}

export function buildTrailHint({ online, user, bestScore, trails, achievements } = {}) {
  const best = coerceScore(bestScore);
  const isRecordHolder = Boolean(user?.isRecordHolder);
  const ownedIds = Array.isArray(user?.ownedUnlockables) ? user.ownedUnlockables : [];
  const recordLocked = Array.isArray(trails)
    ? trails.some((t) => t?.requiresRecordHolder)
    : false;
  const totalTrails = Array.isArray(trails)
    ? trails.filter((t) => !t.requiresRecordHolder || isRecordHolder).length
    : 0;
  const unlockedTrailIds = getUnlockedTrails(trails, achievements, { isRecordHolder, ownedIds, bestScore: best });
  const lockedCount = Math.max(0, totalTrails - unlockedTrailIds.length);
  const purchasableLocked = Array.isArray(trails)
    ? trails.some((t) => t?.unlock?.type === "purchase" && !unlockedTrailIds.includes(t.id))
    : false;

  if (!online) {
    return {
      className: "hint bad",
      text: "Offline: reconnect to sync cosmetic trails and unlock progression."
    };
  }

  if (!user) {
    return {
      className: "hint warn",
      text: GUEST_TRAIL_HINT_TEXT
    };
  }

  if (recordLocked && !isRecordHolder) {
    return {
      className: "hint",
      text: "Record-holder exclusives unlock when you claim the top score."
    };
  }

  const detail = lockedCount > 0
    ? purchasableLocked
      ? `Visit the shop or complete achievements to unlock ${lockedCount} more trail${lockedCount === 1 ? "" : "s"}.`
      : `Complete achievements to unlock ${lockedCount} more trail${lockedCount === 1 ? "" : "s"}.`
    : "All trails unlocked!";

  return {
    className: "hint",
    text: `${detail} Your best: ${best}`
  };
}
