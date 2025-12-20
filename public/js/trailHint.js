// =====================
// FILE: public/js/trailHint.js
// =====================
import { clamp } from "./util.js";

function coerceScore(v) {
  const n = Number.parseInt(v, 10);
  return clamp(Number.isFinite(n) ? n : 0, 0, 1e9);
}

export function buildTrailHint({ online, user, bestScore, trails } = {}) {
  const best = coerceScore(bestScore);
  const hasLockedTrails = Array.isArray(trails)
    ? trails.some((t) => Number.isFinite(t?.minScore) && t.minScore > best)
    : false;

  if (!online) {
    return {
      className: "hint bad",
      text: `Offline: using your local best (${best}) to determine unlocks. Reconnect to sync cosmetic trails.`
    };
  }

  if (!user) {
    return {
      className: "hint warn",
      text: "Guest mode: unlocks are based on your local best cookie. Register to save progression globally."
    };
  }

  const detail = hasLockedTrails
    ? "Climb higher scores to unlock sparkling new trails."
    : "All trails unlocked!";

  return {
    className: "hint",
    text: `${detail} Your best: ${best}`
  };
}
