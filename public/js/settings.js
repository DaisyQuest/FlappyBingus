// =====================
// FILE: public/js/settings.js
// =====================
// Shared helpers for player-configurable skill behaviors.

export const DEFAULT_SKILL_SETTINGS = Object.freeze({
  dashBehavior: "ricochet",
  slowFieldBehavior: "slow"
});

export const SKILL_BEHAVIOR_OPTIONS = Object.freeze({
  dashBehavior: ["ricochet", "destroy"],
  slowFieldBehavior: ["slow", "explosion"]
});

function normalizeValue(name, value) {
  const choices = SKILL_BEHAVIOR_OPTIONS[name] || [];
  return choices.includes(value) ? value : DEFAULT_SKILL_SETTINGS[name];
}

export function normalizeSkillSettings(settings = {}) {
  return {
    dashBehavior: normalizeValue("dashBehavior", settings.dashBehavior),
    slowFieldBehavior: normalizeValue("slowFieldBehavior", settings.slowFieldBehavior)
  };
}

export function mergeSkillSettings(base, incoming) {
  const baseSafe = normalizeSkillSettings(base || DEFAULT_SKILL_SETTINGS);
  const incSafe = normalizeSkillSettings(incoming || {});
  return {
    dashBehavior: incSafe.dashBehavior ?? baseSafe.dashBehavior,
    slowFieldBehavior: incSafe.slowFieldBehavior ?? baseSafe.slowFieldBehavior
  };
}

export function skillSettingsEqual(a, b) {
  const aa = normalizeSkillSettings(a);
  const bb = normalizeSkillSettings(b);
  return aa.dashBehavior === bb.dashBehavior && aa.slowFieldBehavior === bb.slowFieldBehavior;
}
