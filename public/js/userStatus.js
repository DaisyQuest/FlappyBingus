// =====================
// FILE: public/js/userStatus.js
// =====================
import { DEFAULT_CURRENCY_ID, SUPPORT_CURRENCY_ID, getUserCurrencyBalance } from "./currencySystem.js";
import { OFFLINE_HINT_TEXT, SIGNED_OUT_TEXT } from "./userStatusCopy.js";

export function getUserHintState({ online = true, user = null } = {}) {
  if (!online) {
    return { className: "hint bad", text: OFFLINE_HINT_TEXT };
  }

  if (!user) {
    return { className: "hint warn", text: SIGNED_OUT_TEXT };
  }

  const coins = getUserCurrencyBalance(user, DEFAULT_CURRENCY_ID);
  const supportCoins = getUserCurrencyBalance(user, SUPPORT_CURRENCY_ID);
  return {
    className: "hint good",
    text: `Signed in as ${user.username}. Runs: ${user.runs} • Total: ${user.totalScore} • `
      + `Bustercoins: ${coins} • Supportcoins: ${supportCoins}`
  };
}
