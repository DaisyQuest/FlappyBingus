// =======================
// FILE: public/js/userHintRecovery.js
// =======================
import { GUEST_TRAIL_HINT_TEXT } from "./trailHint.js";
import { SIGNED_OUT_TEXT } from "./userStatusCopy.js";

function normalizeUsername(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function resolveReauthUsername({ inputValue, sessionUsername } = {}) {
  const input = normalizeUsername(inputValue);
  if (input) return input;
  return normalizeUsername(sessionUsername);
}

function shouldAttemptReauthForHint({ hintText, username, inFlight, matchText } = {}) {
  if (inFlight) return false;
  if (!normalizeUsername(username)) return false;
  return hintText === matchText;
}

export function shouldAttemptReauth({ hintText, username, inFlight } = {}) {
  return shouldAttemptReauthForHint({ hintText, username, inFlight, matchText: SIGNED_OUT_TEXT });
}

export function shouldAttemptReauthForGuestHint({ hintText, username, inFlight } = {}) {
  return shouldAttemptReauthForHint({ hintText, username, inFlight, matchText: GUEST_TRAIL_HINT_TEXT });
}
