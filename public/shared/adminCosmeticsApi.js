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

export async function getCosmeticsConfig() {
  return requestJson("/api/admin/cosmetics", { method: "GET" });
}

export async function saveCosmeticsConfig({ icons, trails, trailStyles }) {
  return requestJson("/api/admin/cosmetics", {
    method: "PUT",
    body: JSON.stringify({ cosmetics: { icons, trails, trailStyles } })
  });
}
