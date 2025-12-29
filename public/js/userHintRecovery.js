// =======================
// FILE: public/js/userHintRecovery.js
// =======================
import { SIGNED_OUT_TEXT } from "./userStatusCopy.js";

export function shouldAttemptReauth({ hintText, username, inFlight } = {}) {
  if (inFlight) return false;
  if (!username) return false;
  return hintText === SIGNED_OUT_TEXT;
}
