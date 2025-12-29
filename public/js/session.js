// =======================
// FILE: public/js/session.js
// =======================

const SESSION_STORAGE_KEY = "bingus_session_token";
let cachedToken = null;

export function readSessionToken(storage = globalThis.localStorage) {
  if (cachedToken) return cachedToken;
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const token = storage.getItem(SESSION_STORAGE_KEY);
    cachedToken = token && typeof token === "string" ? token : null;
    return cachedToken;
  } catch {
    return null;
  }
}

export function writeSessionToken(token, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== "function") return;
  if (!token) return;
  cachedToken = String(token);
  try {
    storage.setItem(SESSION_STORAGE_KEY, cachedToken);
  } catch {
    // ignore storage failures
  }
}

export function clearSessionToken(storage = globalThis.localStorage) {
  if (!storage || typeof storage.removeItem !== "function") return;
  cachedToken = null;
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
