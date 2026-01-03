"use strict";

const { SKILL_IDS } = require("./skillConsts.cjs");

const ACHIEVEMENT_REQUIREMENT_FIELDS = Object.freeze([
  { key: "minScore", label: "Minimum score (single run)", type: "number" },
  { key: "maxOrbs", label: "Maximum orbs collected (single run)", type: "number" },
  { key: "maxAbilities", label: "Maximum abilities used (single run)", type: "number" },
  { key: "totalScore", label: "Total score (lifetime)", type: "number" },
  { key: "minRunTime", label: "Minimum run time in seconds", type: "number" },
  { key: "totalRunTime", label: "Total run time in seconds", type: "number" },
  { key: "totalRuns", label: "Total runs played", type: "number" },
  { key: "minOrbs", label: "Minimum orbs collected (single run)", type: "number" },
  { key: "totalOrbs", label: "Total orbs collected", type: "number" },
  { key: "minPerfects", label: "Minimum perfect gaps (single run)", type: "number" },
  { key: "totalPerfects", label: "Total perfect gaps", type: "number" },
  { key: "minPipesDodged", label: "Minimum pipes dodged (single run)", type: "number" },
  { key: "totalPipesDodged", label: "Total pipes dodged", type: "number" },
  { key: "minOrbCombo", label: "Minimum orb combo (single run)", type: "number" },
  { key: "minPerfectCombo", label: "Minimum perfect combo (single run)", type: "number" },
  { key: "minBrokenPipesInExplosion", label: "Minimum pipes broken in one explosion", type: "number" },
  { key: "minBrokenPipesInRun", label: "Minimum pipes broken in one run", type: "number" },
  { key: "totalBrokenPipes", label: "Total pipes broken", type: "number" },
  { key: "minSkillUses", label: "Minimum skill uses (lifetime)", type: "skills" }
]);

const ACHIEVEMENT_SCHEMA = Object.freeze({
  fields: Object.freeze({
    id: { label: "Achievement ID", required: true },
    title: { label: "Title", required: true },
    description: { label: "Description", required: true },
    reward: { label: "Reward", required: false },
    progressKey: { label: "Progress Key", required: false }
  }),
  requirementFields: ACHIEVEMENT_REQUIREMENT_FIELDS,
  skillIds: SKILL_IDS
});

const REQUIREMENT_KEYS = new Set(ACHIEVEMENT_REQUIREMENT_FIELDS.map((field) => field.key));

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeNonNegativeInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function normalizeSkillRequirements(raw, errors, prefix) {
  if (!isPlainObject(raw)) {
    errors.push({ field: `${prefix}.minSkillUses`, error: "invalid_skill_requirements" });
    return null;
  }
  const out = {};
  for (const skillId of SKILL_IDS) {
    if (raw[skillId] === undefined || raw[skillId] === null || raw[skillId] === "") continue;
    const val = normalizeNonNegativeInt(raw[skillId]);
    if (val === null) {
      errors.push({ field: `${prefix}.minSkillUses.${skillId}`, error: "invalid_skill_requirement" });
      return null;
    }
    if (val > 0) out[skillId] = val;
  }
  return out;
}

function normalizeRequirement(requirement, errors, prefix) {
  if (!isPlainObject(requirement)) {
    errors.push({ field: `${prefix}.requirement`, error: "invalid_requirement" });
    return null;
  }
  const result = {};
  for (const key of Object.keys(requirement)) {
    if (!REQUIREMENT_KEYS.has(key)) {
      errors.push({ field: `${prefix}.requirement.${key}`, error: "unknown_requirement_key" });
    }
  }
  for (const key of REQUIREMENT_KEYS) {
    if (requirement[key] === undefined || requirement[key] === null || requirement[key] === "") continue;
    if (key === "minSkillUses") {
      const skills = normalizeSkillRequirements(requirement[key], errors, prefix);
      if (skills) result.minSkillUses = skills;
    } else {
      const val = normalizeNonNegativeInt(requirement[key]);
      if (val === null) {
        errors.push({ field: `${prefix}.requirement.${key}`, error: "invalid_requirement_value" });
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

function normalizeAchievementDefinition(def, index, errors) {
  const prefix = `definitions[${index}]`;
  if (!isPlainObject(def)) {
    errors.push({ field: prefix, error: "invalid_definition" });
    return null;
  }
  const id = typeof def.id === "string" ? def.id.trim() : "";
  const title = typeof def.title === "string" ? def.title.trim() : "";
  const description = typeof def.description === "string" ? def.description.trim() : "";
  const reward = typeof def.reward === "string" ? def.reward.trim() : "";
  const progressKey = def.progressKey === undefined || def.progressKey === null ? null : String(def.progressKey).trim();

  if (!id) errors.push({ field: `${prefix}.id`, error: "missing_id" });
  if (!title) errors.push({ field: `${prefix}.title`, error: "missing_title" });
  if (!description) errors.push({ field: `${prefix}.description`, error: "missing_description" });
  if (progressKey !== null && !progressKey) {
    errors.push({ field: `${prefix}.progressKey`, error: "invalid_progress_key" });
  }

  const requirement = normalizeRequirement(def.requirement, errors, prefix);
  if (!requirement) return null;

  return {
    id,
    title,
    description,
    reward,
    progressKey: progressKey || null,
    requirement
  };
}

function normalizeAchievementDefinitions(raw, { fallback = null } = {}) {
  if (raw === null || raw === undefined) {
    return { ok: true, definitions: null, errors: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, definitions: fallback, errors: [{ field: "definitions", error: "definitions_not_array" }] };
  }

  const errors = [];
  const definitions = raw.map((def, index) => normalizeAchievementDefinition(def, index, errors));
  const ids = new Set();
  definitions.forEach((def, index) => {
    if (!def || !def.id) return;
    if (ids.has(def.id)) {
      errors.push({ field: `definitions[${index}].id`, error: "duplicate_id" });
    } else {
      ids.add(def.id);
    }
  });

  if (errors.length) {
    return { ok: false, definitions: fallback, errors };
  }

  return { ok: true, definitions, errors: [] };
}

function resolveAchievementDefinitions(raw, fallback = []) {
  if (raw === null || raw === undefined) return Array.isArray(fallback) ? fallback : [];
  const normalized = normalizeAchievementDefinitions(raw, { fallback });
  if (!normalized.ok || !normalized.definitions) return Array.isArray(fallback) ? fallback : [];
  return normalized.definitions;
}

module.exports = {
  ACHIEVEMENT_SCHEMA,
  ACHIEVEMENT_REQUIREMENT_FIELDS,
  normalizeAchievementDefinitions,
  resolveAchievementDefinitions
};
