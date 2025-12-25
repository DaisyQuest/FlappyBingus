"use strict";

const DEFAULT_CURRENCY_ID = "bustercoin";

const CURRENCY_DEFINITIONS = Object.freeze({
  [DEFAULT_CURRENCY_ID]: {
    id: DEFAULT_CURRENCY_ID,
    name: "Bustercoin",
    pluralName: "Bustercoins",
    shortLabel: "BC"
  }
});

function normalizeCurrencyId(id) {
  if (typeof id !== "string") return DEFAULT_CURRENCY_ID;
  const trimmed = id.trim();
  if (!trimmed) return DEFAULT_CURRENCY_ID;
  return trimmed;
}

function normalizeCurrencyAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function getCurrencyDefinition(id = DEFAULT_CURRENCY_ID) {
  const normalized = normalizeCurrencyId(id);
  return CURRENCY_DEFINITIONS[normalized] || {
    id: normalized,
    name: normalized,
    pluralName: `${normalized}s`,
    shortLabel: normalized.toUpperCase()
  };
}

function normalizeCurrencyWallet(wallet = null, fallback = {}) {
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

function getCurrencyBalance(wallet = null, currencyId = DEFAULT_CURRENCY_ID) {
  const normalizedWallet = normalizeCurrencyWallet(wallet);
  const id = normalizeCurrencyId(currencyId);
  return normalizeCurrencyAmount(normalizedWallet[id]);
}

function debitCurrency(wallet, { currencyId = DEFAULT_CURRENCY_ID, cost = 0 } = {}) {
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

module.exports = {
  DEFAULT_CURRENCY_ID,
  CURRENCY_DEFINITIONS,
  normalizeCurrencyId,
  normalizeCurrencyAmount,
  normalizeCurrencyWallet,
  getCurrencyDefinition,
  getCurrencyBalance,
  debitCurrency
};
