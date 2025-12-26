// =======================
// FILE: public/js/authResponse.js
// =======================

export function getAuthStatusFromResponse(res) {
  if (!res) {
    return { online: false, unauthorized: false };
  }

  const status = Number(res.status || 0);
  const online = Boolean(status && status < 500);
  return { online, unauthorized: status === 401 };
}
