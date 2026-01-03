async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const error = data?.error || `HTTP ${res.status}`;
    const err = new Error(error);
    err.payload = data;
    throw err;
  }
  return data;
}

export async function getAchievementConfig() {
  return requestJson("/api/admin/achievements", { method: "GET" });
}

export async function saveAchievementConfig({ definitions, unlockableOverrides }) {
  return requestJson("/api/admin/achievements", {
    method: "PUT",
    body: JSON.stringify({ definitions, unlockableOverrides })
  });
}
