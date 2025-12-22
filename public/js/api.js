
const CLIENT_RATE_LIMITS = Object.freeze({
  default: { limit: 30, windowMs: 10_000 },
  "/api/me": { limit: 8, windowMs: 5_000 },
  "/api/register": { limit: 3, windowMs: 10_000 },
  "/api/score": { limit: 5, windowMs: 10_000 },
  "/api/cosmetics/trail": { limit: 6, windowMs: 10_000 },
  "/api/cosmetics/icon": { limit: 6, windowMs: 10_000 },
  "/api/binds": { limit: 8, windowMs: 10_000 },
  "/api/settings": { limit: 8, windowMs: 10_000 },
  "/api/highscores": { limit: 10, windowMs: 5_000 },
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

async function requestJson(url, opts = {}) {
  try {
    const res = await fetch(url, {
      credentials: "same-origin",
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function apiGetMe() {
  if (hitClientRateLimit("/api/me")) return null;
  return requestJson("/api/me", { method: "GET" });
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

export async function apiSetTrail(trailId) {
  if (hitClientRateLimit("/api/cosmetics/trail")) return null;
  return requestJson("/api/cosmetics/trail", { method: "POST", body: JSON.stringify({ trailId }) });
}

export async function apiSetIcon(iconId) {
  if (hitClientRateLimit("/api/cosmetics/icon")) return null;
  return requestJson("/api/cosmetics/icon", { method: "POST", body: JSON.stringify({ iconId }) });
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

export async function apiGetTrailPreviews() {
  if (hitClientRateLimit("/trail_previews")) return null;
  return requestJson("/trail_previews", { method: "GET" });
}
