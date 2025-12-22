// =====================
// FILE: public/js/trailMenu.js
// Helpers for rendering the trail selection menu to mirror the icon picker.
// =====================

export const DEFAULT_TRAIL_HINT = "Click a trail to equip it.";

export function describeTrailLock(trail, { unlocked = false, bestScore = 0, isRecordHolder = false } = {}) {
  if (!trail) return "";
  if (unlocked || trail.alwaysUnlocked) return "Unlocked";
  if (trail.requiresRecordHolder && !isRecordHolder) {
    return "Exclusive to record holders.";
  }
  if (typeof trail.minScore === "number") {
    const remaining = Math.max(0, trail.minScore - (bestScore | 0));
    if (remaining > 0) {
      return `Score ${trail.minScore} in one run to unlock (${remaining} to go).`;
    }
    return `Score ${trail.minScore} in one run to unlock.`;
  }
  if (trail.achievementId) {
    return "Complete its achievement to unlock.";
  }
  return "Unlock more trails by improving your best run.";
}

export function renderTrailOptions({
  container,
  trails = [],
  selectedId,
  unlockedIds = new Set(),
  lockTextFor = describeTrailLock
} = {}) {
  if (!container) return { rendered: 0 };
  const doc = container.ownerDocument || document;
  const unlocked = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);

  container.innerHTML = "";
  if (!trails.length) return { rendered: 0 };

  trails.forEach((trail) => {
    const unlockedTrail = unlocked.has(trail.id);
    const statusText = lockTextFor?.(trail, { unlocked: unlockedTrail }) ?? describeTrailLock(trail, { unlocked: unlockedTrail });
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.dataset.trailId = trail.id;
    btn.dataset.statusText = statusText;
    btn.dataset.trailName = trail.name || trail.id;
    btn.dataset.locked = unlockedTrail ? "false" : "true";
    btn.className = "icon-option trail-option" + (trail.id === selectedId ? " selected" : "") + (unlockedTrail ? "" : " locked");
    btn.setAttribute("aria-pressed", trail.id === selectedId ? "true" : "false");
    btn.setAttribute("aria-label", unlockedTrail ? `${trail.name} (trail)` : `${trail.name} (${statusText})`);
    btn.setAttribute("aria-disabled", unlockedTrail ? "false" : "true");
    btn.tabIndex = unlockedTrail ? 0 : -1;

    const label = doc.createElement("span");
    label.className = "icon-option-name trail-option-name";
    label.textContent = trail.name || trail.id;
    btn.append(label);

    if (!unlockedTrail) {
      const lock = doc.createElement("span");
      lock.className = "icon-lock trail-lock";
      lock.setAttribute("aria-hidden", "true");
      lock.textContent = "🔒";
      btn.append(lock);
    }

    container.append(btn);
  });

  return { rendered: trails.length };
}

export function toggleTrailMenu(overlay, open) {
  if (!overlay) return false;
  const shouldOpen = Boolean(open);
  if (shouldOpen) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  } else {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }
  return shouldOpen;
}

export const __testables = {
  describeTrailLock,
  renderTrailOptions,
  toggleTrailMenu
};
