"use strict";

const SKILL_IDS = Object.freeze(["dash", "phase", "teleport", "slowField"]);

function normalizeSkillTotals(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const totals = {};
  for (const id of SKILL_IDS) {
    const val = Number(src[id]);
    totals[id] = Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
  }
  return totals;
}

function parseSkillTotals(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const totals = {};
  for (const id of SKILL_IDS) {
    const val = Number(raw[id]);
    if (!Number.isFinite(val) || val < 0) return null;
    totals[id] = Math.floor(val);
  }
  return totals;
}

function sumSkillTotals(totals) {
  if (!totals || typeof totals !== "object") return 0;
  return SKILL_IDS.reduce((sum, id) => {
    const val = Number(totals[id]);
    return sum + (Number.isFinite(val) && val > 0 ? Math.floor(val) : 0);
  }, 0);
}

const DEFAULT_SKILL_TOTALS = Object.freeze(normalizeSkillTotals({}));

module.exports = {
  DEFAULT_SKILL_TOTALS,
  SKILL_IDS,
  normalizeSkillTotals,
  parseSkillTotals,
  sumSkillTotals
};
