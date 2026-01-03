// =====================
// FILE: public/js/currencySystem.js
// =====================

export const DEFAULT_CURRENCY_ID = "bustercoin";
export const SUPPORT_CURRENCY_ID = "supportcoin";

export const CURRENCY_DEFINITIONS = Object.freeze({
  [DEFAULT_CURRENCY_ID]: {
    id: DEFAULT_CURRENCY_ID,
    name: "Bustercoin",
    pluralName: "Bustercoins",
    shortLabel: "BC"
  },
  [SUPPORT_CURRENCY_ID]: {
    id: SUPPORT_CURRENCY_ID,
    name: "Supportcoin",
    pluralName: "Supportcoins",
    shortLabel: "SC"
  }
});

export function normalizeCurrencyId(id) {
  if (typeof id !== "string") return DEFAULT_CURRENCY_ID;
  const trimmed = id.trim();
  if (!trimmed) return DEFAULT_CURRENCY_ID;
  return trimmed;
}

export function getCurrencyDefinition(id = DEFAULT_CURRENCY_ID) {
  const normalized = normalizeCurrencyId(id);
  return CURRENCY_DEFINITIONS[normalized] || {
    id: normalized,
    name: normalized,
    pluralName: `${normalized}s`,
    shortLabel: normalized.toUpperCase()
  };
}

export function normalizeCurrencyAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function normalizeCurrencyWallet(wallet = null, fallback = {}) {
  const out = {};
  const src = wallet && typeof wallet === "object" ? wallet : {};
  const fallbackObj = fallback && typeof fallback === "object" ? fallback : {};

  const ids = new Set([
    ...Object.keys(fallbackObj),
    ...Object.keys(src)
  ]);

  ids.forEach((id) => {
    const normalizedId = normalizeCurrencyId(id);
    const raw = src[id] ?? src[normalizedId] ?? fallbackObj[id] ?? fallbackObj[normalizedId];
    out[normalizedId] = normalizeCurrencyAmount(raw);
  });

  if (!ids.size) {
    const fallbackId = normalizeCurrencyId(DEFAULT_CURRENCY_ID);
    out[fallbackId] = normalizeCurrencyAmount(fallbackObj[fallbackId] ?? 0);
  }

  return out;
}

export function getCurrencyBalance(wallet = null, currencyId = DEFAULT_CURRENCY_ID) {
  const normalizedWallet = normalizeCurrencyWallet(wallet);
  const id = normalizeCurrencyId(currencyId);
  return normalizeCurrencyAmount(normalizedWallet[id]);
}

export function getUserCurrencyBalance(user = null, currencyId = DEFAULT_CURRENCY_ID) {
  if (!user || typeof user !== "object") return 0;
  const wallet = user.currencies || user.wallet || null;
  if (wallet) return getCurrencyBalance(wallet, currencyId);
  if (currencyId === DEFAULT_CURRENCY_ID) return normalizeCurrencyAmount(user.bustercoins);
  return 0;
}

export function canAffordCurrency(wallet, { currencyId = DEFAULT_CURRENCY_ID, cost = 0 } = {}) {
  const amount = normalizeCurrencyAmount(cost);
  return getCurrencyBalance(wallet, currencyId) >= amount;
}

export function debitCurrency(wallet, { currencyId = DEFAULT_CURRENCY_ID, cost = 0 } = {}) {
  const amount = normalizeCurrencyAmount(cost);
  const id = normalizeCurrencyId(currencyId);
  const normalized = normalizeCurrencyWallet(wallet);
  const balance = getCurrencyBalance(normalized, id);
  if (balance < amount) {
    return { ok: false, wallet: normalized, balance };
  }
  const next = { ...normalized, [id]: balance - amount };
  return { ok: true, wallet: next, balance: balance - amount };
}

export function creditCurrency(wallet, { currencyId = DEFAULT_CURRENCY_ID, amount = 0 } = {}) {
  const credit = normalizeCurrencyAmount(amount);
  const id = normalizeCurrencyId(currencyId);
  const normalized = normalizeCurrencyWallet(wallet);
  const balance = getCurrencyBalance(normalized, id);
  const next = { ...normalized, [id]: balance + credit };
  return { wallet: next, balance: balance + credit };
}

export function formatCurrencyAmount(amount = 0, currencyId = DEFAULT_CURRENCY_ID, { showLabel = true } = {}) {
  const normalized = normalizeCurrencyAmount(amount);
  if (!showLabel) return String(normalized);
  const meta = getCurrencyDefinition(currencyId);
  return `${normalized} ${meta.shortLabel || meta.name}`.trim();
}

export const __testables = {
  normalizeCurrencyId,
  normalizeCurrencyAmount
};
