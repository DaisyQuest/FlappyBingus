// =======================
// FILE: public/js/netUser.js
// =======================
export function applyNetUserUpdate({ net, syncMenuProfileBindingsFromState }, nextUser, { syncProfile = true } = {}) {
  net.user = nextUser;
  if (syncProfile) {
    syncMenuProfileBindingsFromState();
  }
}
