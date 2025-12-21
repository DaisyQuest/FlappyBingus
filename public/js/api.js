
const CLIENT_RATE_LIMITS = Object.freeze({
  default: { limit: 30, windowMs: 10_000 },
  "/api/me": { limit: 8, windowMs: 5_000 },
  "/api/register": { limit: 3, windowMs: 10_000 },
  "/api/score": { limit: 5, windowMs: 10_000 },
  "/api/cosmetics/trail": { limit: 6, windowMs: 10_000 },
  "/api/binds": { limit: 8, windowMs: 10_000 },
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
    const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
    const headers = isFormData
      ? { ...(opts.headers || {}) }
      : { "Content-Type": "application/json", ...(opts.headers || {}) };
    const res = await fetch(url, {
      credentials: "same-origin",
      ...opts,
      headers
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

function encodeBase64(uint8) {
  if (typeof Buffer !== "undefined") return Buffer.from(uint8).toString("base64");
  let binary = "";
  for (let i = 0; i < uint8.length; i += 1) binary += String.fromCharCode(uint8[i]);
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

function decodeBase64ToUint8(base64) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(base64, "base64"));
  // eslint-disable-next-line no-undef
  const binary = typeof atob === "function" ? atob(base64) : "";
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) arr[i] = binary.charCodeAt(i);
  return arr;
}

let COMPRESSION_TIMEOUT_MS = 1000;
let _pakoGzip = null;

async function gzipToBase64(text) {
  if (typeof CompressionStream === "function") {
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    const encoded = new TextEncoder().encode(text);
    await writer.write(encoded);
    await writer.close();
    const compressedBuffer = await new Response(cs.readable).arrayBuffer();
    return encodeBase64(new Uint8Array(compressedBuffer));
  }
  try {
    const compressed = await pakoGzip(text);
    return encodeBase64(compressed);
  } catch {
    // continue to next fallback
  }
  if (typeof require === "function") {
    try {
      // eslint-disable-next-line global-require
      const zlib = require("node:zlib");
      const buf = zlib.gzipSync(text);
      return encodeBase64(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
    } catch {
      return null;
    }
  }
  return null;
}

async function compressReplayPayload(replay) {
  if (replay === undefined || replay === null) return null;
  try {
    const text = typeof replay === "string" ? replay : JSON.stringify(replay);
    const data = await gzipToBase64(text);
    if (!data) return null;
    return { compression: "gzip-base64", data };
  } catch {
    return null;
  }
}

async function safeCompressReplayPayload(replay) {
  if (replay === undefined || replay === null) return null;
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve("__timeout__"), COMPRESSION_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([compressReplayPayload(replay), timeout]);
    if (result === "__timeout__") return null;
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function pakoGzip(text) {
  if (!_pakoGzip) {
    const mod = await import("../vendor/pako.esm.mjs");
    _pakoGzip = mod.gzip;
  }
  return _pakoGzip(text);
}

export async function apiSubmitScore(score, replay) {
  if (hitClientRateLimit("/api/score")) return null;
  const compressedReplay = await safeCompressReplayPayload(replay);
  const hasReplay = replay !== undefined && replay !== null;

  if (hasReplay || compressedReplay) {
    const form = typeof FormData === "undefined" ? null : new FormData();
    if (!form) return null;

    form.append("score", String(score ?? ""));

    if (compressedReplay?.data && compressedReplay?.compression === "gzip-base64") {
      const compressedBytes = decodeBase64ToUint8(compressedReplay.data);
      form.append("replayCompression", "gzip");
      form.append("replay", new Blob([compressedBytes], { type: "application/gzip" }), "replay.gz");
    } else if (hasReplay) {
      try {
        const text = typeof replay === "string" ? replay : JSON.stringify(replay);
        form.append("replay", new Blob([text], { type: "application/json" }), "replay.json");
      } catch {
        form.append("replay", new Blob(["null"], { type: "application/json" }), "replay.json");
      }
    }

    return requestJson("/api/score", { method: "POST", body: form, headers: {} });
  }

  return requestJson("/api/score", { method: "POST", body: JSON.stringify({ score, replay: null }) });
}

// Test-only hook
export function __setCompressionTimeoutMs(ms) {
  COMPRESSION_TIMEOUT_MS = ms;
}

export async function apiSetTrail(trailId) {
  if (hitClientRateLimit("/api/cosmetics/trail")) return null;
  return requestJson("/api/cosmetics/trail", { method: "POST", body: JSON.stringify({ trailId }) });
}

export async function apiSetKeybinds(keybinds) {
  if (hitClientRateLimit("/api/binds")) return null;
  return requestJson("/api/binds", { method: "POST", body: JSON.stringify({ keybinds }) });
}

export async function apiGetHighscores(limit = 20) {
  if (hitClientRateLimit("/api/highscores")) return null;
  return requestJson(`/api/highscores?limit=${encodeURIComponent(String(limit))}`, { method: "GET" });
}

export async function apiGetTrailPreviews() {
  if (hitClientRateLimit("/trail_previews")) return null;
  return requestJson("/trail_previews", { method: "GET" });
}
