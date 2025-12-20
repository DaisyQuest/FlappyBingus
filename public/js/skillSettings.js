// =====================
// FILE: public/js/skillSettings.js
// =====================
import { dashBounceMax } from "./mechanics.js";

export const DASH_BEHAVIORS = Object.freeze({
  RICOCHET: "dashRicochet",
  DESTROY: "dashDestroy"
});

export const SLOW_BEHAVIORS = Object.freeze({
  FIELD: "slowField",
  EXPLOSION: "slowExplosion"
});

export const DEFAULT_SKILL_SETTINGS = Object.freeze({
  dashBehavior: DASH_BEHAVIORS.RICOCHET,
  slowFieldBehavior: SLOW_BEHAVIORS.FIELD
});

function normalizeChoice(id, allowed, skills = {}) {
  const opt = String(id || "").trim();
  const inConfig = (key) => skills[key] !== undefined;
  const valid = allowed.filter((key) => inConfig(key) || key === allowed[0]);
  if (valid.includes(opt)) return opt;
  return valid[0] || allowed[0];
}

export function normalizeSkillSettings(settings, cfg = {}) {
  const skills = cfg.skills || {};
  const dashBehavior = normalizeChoice(
    settings?.dashBehavior,
    [DASH_BEHAVIORS.RICOCHET, DASH_BEHAVIORS.DESTROY],
    skills
  );
  const slowFieldBehavior = normalizeChoice(
    settings?.slowFieldBehavior,
    [SLOW_BEHAVIORS.FIELD, SLOW_BEHAVIORS.EXPLOSION],
    skills
  );
  return {
    dashBehavior,
    slowFieldBehavior
  };
}

export function selectSkillConfig(skills = {}, id) {
  if (id === DASH_BEHAVIORS.RICOCHET) return skills.dashRicochet || skills.dash || {};
  if (id === DASH_BEHAVIORS.DESTROY) return skills.dashDestroy || skills.dash || {};
  if (id === SLOW_BEHAVIORS.EXPLOSION) return skills.slowExplosion || skills.slowField || {};
  if (id === SLOW_BEHAVIORS.FIELD) return skills.slowField || {};
  return skills[id] || {};
}

export function resolveSkillSlots(cfg = {}, settings = DEFAULT_SKILL_SETTINGS) {
  const normalized = normalizeSkillSettings(settings, cfg);
  const skills = cfg.skills || {};
  return {
    dash: { id: normalized.dashBehavior, config: selectSkillConfig(skills, normalized.dashBehavior) },
    phase: { id: "phase", config: skills.phase || {} },
    teleport: { id: "teleport", config: skills.teleport || {} },
    slowField: { id: normalized.slowFieldBehavior, config: selectSkillConfig(skills, normalized.slowFieldBehavior) }
  };
}

export function dashBounceLimit(slot) {
  if (!slot) return dashBounceMax({});
  if (slot.id === DASH_BEHAVIORS.RICOCHET) return Number.POSITIVE_INFINITY;
  return dashBounceMax({ skills: { dash: slot.config || {} } });
}

export function skillBehaviorOptions() {
  return {
    dash: [
      { id: DASH_BEHAVIORS.RICOCHET, label: "Ricochet" },
      { id: DASH_BEHAVIORS.DESTROY, label: "Destroy" }
    ],
    slowField: [
      { id: SLOW_BEHAVIORS.FIELD, label: "Slow Field" },
      { id: SLOW_BEHAVIORS.EXPLOSION, label: "Explosion" }
    ]
  };
}
