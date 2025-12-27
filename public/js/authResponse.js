// =======================
// FILE: public/js/authResponse.js
// =======================

export function isUnauthorizedResponse(res) {
  if (!res) return false;
  const status = Number(res.status || 0);
  if (status !== 401) return false;
  const error = res.error || res.body?.error;
  return error === "unauthorized";
}

export function getAuthStatusFromResponse(res) {
  if (!res) {
    return { online: false, unauthorized: false };
  }

  const status = Number(res.status || 0);
  const online = Boolean(status && status < 500);
  return { online, unauthorized: isUnauthorizedResponse(res) };
}
