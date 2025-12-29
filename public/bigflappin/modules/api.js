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
    throw new Error(error);
  }
  return data;
}

export async function getServerConfig() {
  const res = await requestJson("/api/admin/config", { method: "GET" });
  return res;
}

export async function saveServerConfig(config) {
  const res = await requestJson("/api/admin/config", {
    method: "PUT",
    body: JSON.stringify({ config })
  });
  return res;
}

export async function getGameConfig() {
  return requestJson("/api/admin/game-config", { method: "GET" });
}

export async function saveGameConfig(config) {
  return requestJson("/api/admin/game-config", {
    method: "PUT",
    body: JSON.stringify({ config })
  });
}

export async function listCollections() {
  return requestJson("/api/admin/collections", { method: "GET" });
}

export async function listDocuments(collection, limit = 25) {
  const params = new URLSearchParams({ limit: String(limit) });
  return requestJson(`/api/admin/collections/${encodeURIComponent(collection)}?${params.toString()}`);
}

export async function getDocument(collection, id) {
  return requestJson(`/api/admin/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
}

export async function createDocument(collection, document) {
  return requestJson(`/api/admin/collections/${encodeURIComponent(collection)}`, {
    method: "POST",
    body: JSON.stringify({ document })
  });
}

export async function saveDocument(collection, id, document) {
  return requestJson(`/api/admin/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ document })
  });
}
