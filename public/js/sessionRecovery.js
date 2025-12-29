// =======================
// FILE: public/js/sessionRecovery.js
// =======================

export async function recoverUserFromUsername({ username, register, onSuccess } = {}) {
  if (!username || typeof register !== "function") return false;
  const res = await register(username);
  if (!res?.ok) return false;
  if (typeof onSuccess === "function") onSuccess(res);
  return true;
}
