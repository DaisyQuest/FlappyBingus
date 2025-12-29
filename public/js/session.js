// =======================
// FILE: public/js/session.js
// =======================

const SESSION_STORAGE_KEY = "bingus_session_token";
const USERNAME_STORAGE_KEY = "bingus_username";
let cachedToken = null;
let cachedUsername = null;

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

export function readSessionUsername(storage = globalThis.localStorage) {
  if (cachedUsername) return cachedUsername;
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const username = storage.getItem(USERNAME_STORAGE_KEY);
    cachedUsername = username && typeof username === "string" ? username : null;
    return cachedUsername;
  } catch {
    return null;
  }
}

export function writeSessionUsername(username, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== "function") return;
  if (!username) return;
  cachedUsername = String(username);
  try {
    storage.setItem(USERNAME_STORAGE_KEY, cachedUsername);
  } catch {
    // ignore storage failures
  }
}

export function clearSessionUsername(storage = globalThis.localStorage) {
  if (!storage || typeof storage.removeItem !== "function") return;
  cachedUsername = null;
  try {
    storage.removeItem(USERNAME_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
