// =======================
// FILE: public/js/session.js
// =======================

const SESSION_STORAGE_KEY = "bingus_session_token";

export function readSessionToken(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const token = storage.getItem(SESSION_STORAGE_KEY);
    return token && typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

export function writeSessionToken(token, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== "function") return;
  if (!token) return;
  try {
    storage.setItem(SESSION_STORAGE_KEY, String(token));
  } catch {
    // ignore storage failures
  }
}

export function clearSessionToken(storage = globalThis.localStorage) {
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
