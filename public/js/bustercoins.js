// =====================
// FILE: public/js/bustercoins.js
// =====================
import { DEFAULT_CURRENCY_ID, creditCurrency, normalizeCurrencyAmount } from "./currencySystem.js";

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

  const base = normalizeCurrencyAmount(net.user.bustercoins);
  const gain = normalizeCurrencyAmount(coinsEarned);
  const total = base + gain;
  const walletUpdate = creditCurrency(net.user.currencies, { currencyId: DEFAULT_CURRENCY_ID, amount: gain });

  net.user = { ...net.user, bustercoins: total, currencies: walletUpdate.wallet };
  if (bustercoinText) bustercoinText.textContent = String(total);

  return { applied: true, total };
}

export function _testables() {
  return { normalizeCount };
}
