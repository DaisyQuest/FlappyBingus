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

export function shouldUpdateTrailHint({ currentText, nextText } = {}) {
  if (!nextText) return false;
  if (typeof currentText !== "string") return true;
  return currentText !== nextText;
}

export function shouldTriggerGuestSave({ currentText, nextText, alreadyTriggered } = {}) {
  if (alreadyTriggered) return false;
  if (!nextText) return false;
  if (nextText !== GUEST_TRAIL_HINT_TEXT) return false;
  return shouldUpdateTrailHint({ currentText, nextText });
}

export function shouldTriggerSelectionSave({ previousId, nextId } = {}) {
  if (!nextId) return false;
  return previousId !== nextId;
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
