import { DEFAULT_BACKGROUND_CONFIG, normalizeBackgroundConfig } from "./backgroundStudioEngine.js";

async function tryFetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return JSON.parse(await res.text());
}

export async function loadBackgroundConfig() {
  try {
    const payload = await tryFetchJson("/api/background-configs");
    const config = normalizeBackgroundConfig(payload?.config ?? payload ?? DEFAULT_BACKGROUND_CONFIG);
    return { ok: true, config, source: "api" };
  } catch (err) {
    try {
      const fallback = await tryFetchJson("/backgrounds/background-config.json");
      return { ok: true, config: normalizeBackgroundConfig(fallback), source: "file" };
    } catch {
      return { ok: false, config: normalizeBackgroundConfig(DEFAULT_BACKGROUND_CONFIG), source: "defaults", error: err?.message || String(err) };
    }
  }
}

export async function saveBackgroundConfig(config) {
  const payload = { config };
  const res = await fetch("/api/background-configs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return JSON.parse(await res.text());
}
