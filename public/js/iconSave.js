// =====================
// FILE: public/js/iconSave.js
// Helpers for interpreting icon save responses from the API so UI layers can
// present accurate feedback without duplicating status checks.
// =====================

/**
 * Normalizes an icon save response into a UI-friendly outcome.
 * @param {object|null} res - Response returned by apiSetIcon (may be null on network failure)
 * @returns {{ outcome: string, online: boolean, revert: boolean, resetUser: boolean, message: string }}
 */
export function classifyIconSaveResponse(res) {
  if (!res) {
    return {
      outcome: "offline",
      online: false,
      revert: false,
      resetUser: false,
      message: "Server unavailable. Icon equipped locally."
    };
  }

  if (!res.ok) {
    const online = Boolean(res.status && res.status < 500);
    const error = res.error || res.body?.error;

    if (res.status === 401) {
      return {
        outcome: "unauthorized",
        online: false,
        revert: true,
        resetUser: true,
        message: "Sign in to save your icon."
      };
    }

    if (error === "icon_locked") {
      return {
        outcome: "locked",
        online,
        revert: true,
        resetUser: false,
        message: "That icon is locked."
      };
    }

    if (res.status >= 500 || res.status === 0) {
      return {
        outcome: "server_error",
        online: false,
        revert: false,
        resetUser: false,
        message: "Icon equipped locally; server will sync when available."
      };
    }

    return {
      outcome: "rejected",
      online,
      revert: true,
      resetUser: false,
      message: "Could not save icon."
    };
  }

  return {
    outcome: "saved",
    online: true,
    revert: false,
    resetUser: false,
    message: "Icon saved."
  };
}

export const __testables = {
  classifyIconSaveResponse
};
