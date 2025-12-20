const STORAGE_KEY = "fb_pending_replay_v1";

function getStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readEntry(storage) {
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function savePendingReplay(username, payload) {
  const storage = getStorage();
  const user = String(username || "").trim();
  if (!storage || !user || !payload || typeof payload !== "object") return null;

  const entry = { username: user, payload, savedAt: Date.now() };
  storage.setItem(STORAGE_KEY, JSON.stringify(entry));
  return entry;
}

export function loadPendingReplay(username = null) {
  const storage = getStorage();
  const entry = readEntry(storage);
  if (!entry || !entry.username || !entry.payload) return null;

  const target = (username === null || username === undefined) ? null : String(username || "").trim();
  if (target && entry.username !== target) return null;
  return entry;
}

export function clearPendingReplay(username = null) {
  const storage = getStorage();
  if (!storage) return false;

  const target = (username === null || username === undefined) ? null : String(username || "").trim();
  if (target) {
    const entry = readEntry(storage);
    if (entry && entry.username && entry.username !== target) return false;
  }

  storage.removeItem(STORAGE_KEY);
  return true;
}
