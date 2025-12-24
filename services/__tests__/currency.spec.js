import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_ID,
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

  it("creates defaults for unknown currencies", () => {
    const meta = getCurrencyDefinition("nebula");
    expect(meta.id).toBe("nebula");
    expect(meta.shortLabel).toBe("NEBULA");
  });

  it("normalizes wallets with fallbacks", () => {
    const wallet = normalizeCurrencyWallet({ bustercoin: 3 }, { bustercoin: 2, tokens: 5 });
    expect(wallet).toEqual({ bustercoin: 3, tokens: 5 });
    expect(getCurrencyBalance(wallet, "bustercoin")).toBe(3);
    expect(getCurrencyBalance(wallet, "tokens")).toBe(5);
  });

  it("debits currencies when affordable", () => {
    const fail = debitCurrency({ bustercoin: 1 }, { currencyId: "bustercoin", cost: 3 });
    expect(fail.ok).toBe(false);
    const ok = debitCurrency({ bustercoin: 5 }, { currencyId: "bustercoin", cost: 2 });
    expect(ok.ok).toBe(true);
    expect(ok.wallet.bustercoin).toBe(3);
  });
});
