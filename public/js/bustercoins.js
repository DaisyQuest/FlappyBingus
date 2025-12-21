// =====================
// FILE: public/js/bustercoins.js
// =====================

function normalizeCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/**
 * Adds the earned bustercoins for the current run to the in-memory user model and UI text.
 * Returns the new total so callers can optimistically render while waiting for the server
 * response. If no user is available, this function is a no-op.
 */
export function applyBustercoinEarnings(net, coinsEarned = 0, bustercoinText) {
  if (!net?.user) return { applied: false, total: null };

  const base = normalizeCount(net.user.bustercoins);
  const gain = normalizeCount(coinsEarned);
  const total = base + gain;

  net.user = { ...net.user, bustercoins: total };
  if (bustercoinText) bustercoinText.textContent = String(total);

  return { applied: true, total };
}

export function _testables() {
  return { normalizeCount };
}

