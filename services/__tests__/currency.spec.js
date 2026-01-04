import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_ID,
  SUPPORT_CURRENCY_ID,
  creditCurrency,
  debitCurrency,
  getCurrencyBalance,
  getCurrencyDefinition,
  normalizeCurrencyAmount,
  normalizeCurrencyId,
  normalizeCurrencyWallet
} from "../currency.cjs";

describe("currency helpers", () => {
  it("normalizes ids and amounts", () => {
    expect(normalizeCurrencyId(" ")).toBe(DEFAULT_CURRENCY_ID);
    expect(normalizeCurrencyId("spark")).toBe("spark");
    expect(normalizeCurrencyAmount(4.8)).toBe(4);
    expect(normalizeCurrencyAmount(-2)).toBe(0);
  });

  it("defaults invalid ids to the primary currency", () => {
    expect(normalizeCurrencyId()).toBe(DEFAULT_CURRENCY_ID);
    expect(normalizeCurrencyId(null)).toBe(DEFAULT_CURRENCY_ID);
    expect(normalizeCurrencyId(42)).toBe(DEFAULT_CURRENCY_ID);
  });

  it("trims currency ids before returning them", () => {
    expect(normalizeCurrencyId("  tokens ")).toBe("tokens");
  });

  it("handles invalid amounts by returning zero", () => {
    expect(normalizeCurrencyAmount("bad")).toBe(0);
    expect(normalizeCurrencyAmount(Infinity)).toBe(0);
    expect(normalizeCurrencyAmount("5")).toBe(5);
  });

  it("creates defaults for unknown currencies", () => {
    const meta = getCurrencyDefinition("nebula");
    expect(meta.id).toBe("nebula");
    expect(meta.shortLabel).toBe("NEBULA");
  });

  it("returns the configured default currency metadata", () => {
    const meta = getCurrencyDefinition(DEFAULT_CURRENCY_ID);
    expect(meta).toEqual({
      id: DEFAULT_CURRENCY_ID,
      name: "Bustercoin",
      pluralName: "Bustercoins",
      shortLabel: "BC"
    });
  });

  it("normalizes wallets even when inputs are invalid", () => {
    const wallet = normalizeCurrencyWallet("bad", "also bad");
    expect(wallet).toEqual({ [DEFAULT_CURRENCY_ID]: 0 });
  });

  it("merges fallback values with normalized ids", () => {
    const wallet = normalizeCurrencyWallet({ " tokens ": "2" }, { tokens: 5 });
    expect(wallet).toEqual({ tokens: 2 });
  });

  it("uses fallback defaults when wallet is empty", () => {
    const wallet = normalizeCurrencyWallet({}, { bustercoin: 7 });
    expect(wallet).toEqual({ bustercoin: 7 });
  });

  it("exposes the supportcoin currency metadata", () => {
    const support = getCurrencyDefinition(SUPPORT_CURRENCY_ID);
    expect(support.id).toBe(SUPPORT_CURRENCY_ID);
    expect(support.shortLabel).toBe("SC");
  });

  it("normalizes wallets with fallbacks", () => {
    const wallet = normalizeCurrencyWallet({ bustercoin: 3 }, { bustercoin: 2, tokens: 5 });
    expect(wallet).toEqual({ bustercoin: 3, tokens: 5 });
    expect(getCurrencyBalance(wallet, "bustercoin")).toBe(3);
    expect(getCurrencyBalance(wallet, "tokens")).toBe(5);
  });

  it("defaults missing balances to zero", () => {
    const wallet = normalizeCurrencyWallet({ bustercoin: 1 });
    expect(getCurrencyBalance(wallet, "tokens")).toBe(0);
    expect(getCurrencyBalance(null, "bustercoin")).toBe(0);
  });

  it("debits currencies when affordable", () => {
    const fail = debitCurrency({ bustercoin: 1 }, { currencyId: "bustercoin", cost: 3 });
    expect(fail.ok).toBe(false);
    const ok = debitCurrency({ bustercoin: 5 }, { currencyId: "bustercoin", cost: 2 });
    expect(ok.ok).toBe(true);
    expect(ok.wallet.bustercoin).toBe(3);
  });

  it("treats negative debit costs as zero", () => {
    const result = debitCurrency({ bustercoin: 2 }, { currencyId: "bustercoin", cost: -5 });
    expect(result.ok).toBe(true);
    expect(result.balance).toBe(2);
  });

  it("credits currencies by id", () => {
    const credit = creditCurrency({ supportcoin: 2 }, { currencyId: SUPPORT_CURRENCY_ID, amount: 3.7 });
    expect(credit.wallet.supportcoin).toBe(5);
    expect(credit.balance).toBe(5);
  });

  it("creates a wallet when crediting from null", () => {
    const credit = creditCurrency(null, { amount: 4 });
    expect(credit.wallet).toEqual({ bustercoin: 4 });
    expect(credit.balance).toBe(4);
  });
});
