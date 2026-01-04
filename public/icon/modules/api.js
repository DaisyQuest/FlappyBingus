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

export async function getIconRegistry() {
  return requestJson("/api/admin/icon-registry", { method: "GET" });
}

export async function saveIconRegistry({ icons }) {
  return requestJson("/api/admin/icon-registry", {
    method: "PUT",
    body: JSON.stringify({ icons })
  });
}
