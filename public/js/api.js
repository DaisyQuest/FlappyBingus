
const CLIENT_RATE_LIMITS = Object.freeze({
  default: { limit: 30, windowMs: 10_000 },
  "/api/me": { limit: 8, windowMs: 5_000 },
  "/api/sync": { limit: 8, windowMs: 5_000 },
  "/api/register": { limit: 3, windowMs: 10_000 },
  "/api/score": { limit: 5, windowMs: 10_000 },
  "/api/run/best": { limit: 3, windowMs: 20_000 },
  "/api/cosmetics/trail": { limit: 6, windowMs: 10_000 },
  "/api/cosmetics/icon": { limit: 6, windowMs: 10_000 },
  "/api/cosmetics/pipe_texture": { limit: 6, windowMs: 10_000 },
  "/api/shop/purchase": { limit: 6, windowMs: 10_000 },
  "/api/binds": { limit: 8, windowMs: 10_000 },
  "/api/settings": { limit: 8, windowMs: 10_000 },
  "/api/icon-registry": { limit: 8, windowMs: 10_000 },
  "/api/highscores": { limit: 10, windowMs: 5_000 },
  "/api/stats": { limit: 10, windowMs: 10_000 },
  "/api/trail-styles": { limit: 6, windowMs: 10_000 },
  "/trail_previews": { limit: 4, windowMs: 5_000 }
});

const _clientRateState = new Map();

function hitClientRateLimit(name) {
  const cfg = { ...CLIENT_RATE_LIMITS.default, ...(CLIENT_RATE_LIMITS[name] || {}) };
  const now = Date.now();
  const entry = _clientRateState.get(name);
  if (!entry || now >= entry.reset) {
    _clientRateState.set(name, { count: 1, reset: now + cfg.windowMs });
    return false;
  }
  if (entry.count >= cfg.limit) return true;
  entry.count += 1;
  return false;
}

import {
  clearSessionToken,
  clearSessionUsername,
  readSessionToken,
  readSessionUsername,
  writeSessionToken,
  writeSessionUsername
} from "./session.js";

function applySessionFromResponse(data) {
  if (!data) return;
  if (data.sessionToken) {
    writeSessionToken(data.sessionToken);
  }
  if (data.user?.username) {
    writeSessionUsername(data.user.username);
  }
}

async function requestJsonRaw(url, opts = {}) {
  const sessionToken = readSessionToken();
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {})
  };
  if (sessionToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  try {
    const res = await fetch(url, {
      credentials: "same-origin",
      ...opts,
      headers
    });
    const data = await res.json().catch(() => null);
    return {
      ...(data || {}),
      ok: res.ok && data !== null && data?.ok !== false,
      status: res.status
    };
  } catch {
    return null;
  }
}

async function requestJson(url, opts = {}) {
  const res = await requestJsonRaw(url, opts);
  applySessionFromResponse(res);
  if (res?.status === 401 && res?.error === "unauthorized") {
    const username = readSessionUsername();
    if (username) {
      const reauth = await requestJsonRaw("/api/register", {
        method: "POST",
        body: JSON.stringify({ username })
      });
      applySessionFromResponse(reauth);
      if (reauth?.ok) {
        const retry = await requestJsonRaw(url, opts);
        applySessionFromResponse(retry);
        return retry;
      }
    }
    clearSessionToken();
    clearSessionUsername();
  }
  return res;
}

export async function apiGetMe() {
  if (hitClientRateLimit("/api/me")) return null;
  return requestJson("/api/me", { method: "GET" });
}

export async function apiSync(limit = 20) {
  if (hitClientRateLimit("/api/sync")) return null;
  const cap = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 20;
  return requestJson(`/api/sync?limit=${encodeURIComponent(String(cap))}`, { method: "GET" });
}

export async function apiGetIconRegistry() {
  if (hitClientRateLimit("/api/icon-registry")) return null;
  return requestJson("/api/icon-registry", { method: "GET" });
}

export async function apiRegister(username) {
  if (hitClientRateLimit("/api/register")) return null;
  return requestJson("/api/register", { method: "POST", body: JSON.stringify({ username }) });
}

export async function apiSubmitScore(scoreOrPayload, bustercoinsEarned) {
  if (hitClientRateLimit("/api/score")) return null;
  let payload;
  if (scoreOrPayload && typeof scoreOrPayload === "object" && !Array.isArray(scoreOrPayload)) {
    payload = {
      score: scoreOrPayload.score,
      bustercoinsEarned: scoreOrPayload.bustercoinsEarned ?? 0,
      runStats: scoreOrPayload.runStats ?? null
    };
  } else {
    payload = { score: scoreOrPayload, bustercoinsEarned: bustercoinsEarned ?? 0 };
  }
  return requestJson("/api/score", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiUploadBestRun(payload) {
  if (hitClientRateLimit("/api/run/best")) return null;
  return requestJson("/api/run/best", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiGetBestRun(username) {
  if (hitClientRateLimit("/api/run/best")) return null;
  const target = encodeURIComponent(String(username || ""));
  return requestJson(`/api/run/best?username=${target}`, { method: "GET" });
}

export async function apiSetTrail(trailId) {
  if (hitClientRateLimit("/api/cosmetics/trail")) return null;
  return requestJson("/api/cosmetics/trail", { method: "POST", body: JSON.stringify({ trailId }) });
}

export async function apiSetIcon(iconId) {
  if (hitClientRateLimit("/api/cosmetics/icon")) return null;
  return requestJson("/api/cosmetics/icon", { method: "POST", body: JSON.stringify({ iconId }) });
}

export async function apiSetPipeTexture(textureId, mode) {
  if (hitClientRateLimit("/api/cosmetics/pipe_texture")) return null;
  return requestJson("/api/cosmetics/pipe_texture", {
    method: "POST",
    body: JSON.stringify({ textureId, mode })
  });
}

export async function apiPurchaseUnlockable({ id, type } = {}) {
  if (hitClientRateLimit("/api/shop/purchase")) return null;
  return requestJson("/api/shop/purchase", {
    method: "POST",
    body: JSON.stringify({ id, type })
  });
}

export async function apiSetKeybinds(keybinds) {
  if (hitClientRateLimit("/api/binds")) return null;
  return requestJson("/api/binds", { method: "POST", body: JSON.stringify({ keybinds }) });
}

export async function apiSetSettings(settings) {
  if (hitClientRateLimit("/api/settings")) return null;
  return requestJson("/api/settings", { method: "POST", body: JSON.stringify({ settings }) });
}

export async function apiGetHighscores(limit = 20) {
  if (hitClientRateLimit("/api/highscores")) return null;
  return requestJson(`/api/highscores?limit=${encodeURIComponent(String(limit))}`, { method: "GET" });
}

export async function apiGetStats() {
  if (hitClientRateLimit("/api/stats")) return null;
  return requestJson("/api/stats", { method: "GET" });
}

export async function apiGetTrailStyles() {
  if (hitClientRateLimit("/api/trail-styles")) return null;
  return requestJson("/api/trail-styles", { method: "GET" });
}

export async function apiGetTrailPreviews() {
  if (hitClientRateLimit("/trail_previews")) return null;
  return requestJson("/trail_previews", { method: "GET" });
}
