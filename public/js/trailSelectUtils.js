// =====================
// FILE: public/js/trailSelectUtils.js
// =====================

/**
 * Determine the best trail selection to use, prioritizing the user's latest
 * choice before falling back to server data or defaults.
 * @param {Object} params
 * @param {string|null} params.currentId - Locally tracked selection (last user choice).
 * @param {string|null} params.userSelectedId - Selection reported by the server.
 * @param {string|null} params.selectValue - Current <select> value (may be stale).
 * @param {Iterable<string>|Set<string>} params.unlockedIds - All unlocked trail ids.
 * @param {string} params.fallbackId - The default trail id.
 */
export function normalizeTrailSelection({
  currentId,
  userSelectedId,
  selectValue,
  unlockedIds,
  fallbackId = "classic"
}) {
  const unlocked = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const candidates = [currentId, userSelectedId, selectValue, fallbackId];
  for (const id of candidates) {
    if (id && unlocked.has(id)) return id;
  }
  return fallbackId;
}

/**
 * Rebuild the <select> options from the available trails and ensure the final
 * value is set to the requested selection (if unlocked).
 * @param {HTMLSelectElement|null} selectEl
 * @param {Array<{id:string,name:string,minScore:number}>} trails
 * @param {Iterable<string>|Set<string>} unlockedIds
 * @param {string} selectedId
 */
export function rebuildTrailOptions(selectEl, trails, unlockedIds, selectedId, fallbackId = "classic") {
  if (!selectEl || !trails) return fallbackId;
  const unlocked = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const doc = selectEl.ownerDocument || document;
  selectEl.innerHTML = "";

  const availableIds = new Set();
  for (const t of trails) {
    availableIds.add(t.id);
    const opt = doc.createElement("option");
    opt.value = t.id;
    const locked = !unlocked.has(t.id);
    opt.textContent = locked ? `${t.name} (locked: ${t.minScore})` : t.name;
    opt.disabled = locked;
    selectEl.appendChild(opt);
  }

  const fallbackChoice = availableIds.has(fallbackId) ? fallbackId : (trails[0]?.id || fallbackId);
  const firstUnlocked = trails.find((t) => unlocked.has(t.id))?.id;
  const safeSel = (availableIds.has(selectedId) && unlocked.has(selectedId))
    ? selectedId
    : (firstUnlocked || fallbackChoice);
  selectEl.value = safeSel;
  return safeSel;
}
