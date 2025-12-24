import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_ID,
  canAffordCurrency,
  creditCurrency,
  debitCurrency,
  formatCurrencyAmount,
  getCurrencyBalance,
  getCurrencyDefinition,
  getUserCurrencyBalance,
  normalizeCurrencyAmount,
  normalizeCurrencyId,
  normalizeCurrencyWallet
} from "../currencySystem.js";

describe("currency system", () => {
  it("normalizes currency ids and amounts", () => {
    expect(normalizeCurrencyId("  ")).toBe(DEFAULT_CURRENCY_ID);
    expect(normalizeCurrencyId("tokens")).toBe("tokens");
    expect(normalizeCurrencyAmount(4.9)).toBe(4);
    expect(normalizeCurrencyAmount("9")).toBe(9);
    expect(normalizeCurrencyAmount(-2)).toBe(0);
  });

  it("returns defaults for known and unknown currencies", () => {
    const known = getCurrencyDefinition(DEFAULT_CURRENCY_ID);
    expect(known.shortLabel).toBe("BC");
    const unknown = getCurrencyDefinition("starlight");
    expect(unknown.shortLabel).toBe("STARLIGHT");
  });

  it("normalizes wallets with fallbacks and resolves balances", () => {
    const wallet = normalizeCurrencyWallet({ bustercoin: 3, tokens: 5.2 }, { bustercoin: 1 });
    expect(wallet).toEqual({ bustercoin: 3, tokens: 5 });
    expect(getCurrencyBalance(wallet, "bustercoin")).toBe(3);
    expect(getCurrencyBalance(wallet, "tokens")).toBe(5);
  });

  it("derives balances from user payloads", () => {
    expect(getUserCurrencyBalance({ bustercoins: 7 }, DEFAULT_CURRENCY_ID)).toBe(7);
    expect(getUserCurrencyBalance({ currencies: { bustercoin: 9 } }, DEFAULT_CURRENCY_ID)).toBe(9);
    expect(getUserCurrencyBalance(null, DEFAULT_CURRENCY_ID)).toBe(0);
  });

  it("checks affordability and debits wallets", () => {
    const wallet = { bustercoin: 10 };
    expect(canAffordCurrency(wallet, { currencyId: "bustercoin", cost: 5 })).toBe(true);
    expect(canAffordCurrency(wallet, { currencyId: "bustercoin", cost: 12 })).toBe(false);
    const fail = debitCurrency(wallet, { currencyId: "bustercoin", cost: 12 });
    expect(fail.ok).toBe(false);
    const ok = debitCurrency(wallet, { currencyId: "bustercoin", cost: 4 });
    expect(ok.ok).toBe(true);
    expect(ok.wallet.bustercoin).toBe(6);
  });

  it("credits wallets and formats amounts", () => {
    const credit = creditCurrency({ bustercoin: 2 }, { currencyId: "bustercoin", amount: 3.1 });
    expect(credit.wallet.bustercoin).toBe(5);
    expect(formatCurrencyAmount(5, "bustercoin")).toBe("5 BC");
    expect(formatCurrencyAmount(5, "bustercoin", { showLabel: false })).toBe("5");
  });
});
