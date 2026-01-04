const toNonNegativeInt = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;
  return Math.floor(numberValue);
};

const normalizeSkillUsage = (rawSkills = {}) => {
  const source = rawSkills && typeof rawSkills === "object" ? rawSkills : {};
  const skills = {};
  for (const id of ["dash", "phase", "teleport", "slowField"]) {
    skills[id] = toNonNegativeInt(source[id]);
  }
  return skills;
};

const normalizeScoreBucket = (bucket = {}) => {
  const source = bucket && typeof bucket === "object" ? bucket : {};
  return {
    points: toNonNegativeInt(source.points),
    count: toNonNegativeInt(source.count)
  };
};

export const buildRunStats = ({ runStats = {}, timeAlive = 0, score = 0 } = {}) => {
  const breakdown = runStats.scoreBreakdown || {};
  return {
    orbsCollected: toNonNegativeInt(runStats.orbsCollected),
    abilitiesUsed: toNonNegativeInt(runStats.abilitiesUsed),
    perfects: toNonNegativeInt(runStats.perfects),
    pipesDodged: toNonNegativeInt(runStats.pipesDodged),
    maxOrbCombo: toNonNegativeInt(runStats.maxOrbCombo),
    maxPerfectCombo: toNonNegativeInt(runStats.maxPerfectCombo),
    brokenPipes: toNonNegativeInt(runStats.brokenPipes),
    maxBrokenPipesInExplosion: toNonNegativeInt(runStats.maxBrokenPipesInExplosion),
    runTime: toNonNegativeInt(timeAlive),
    totalScore: toNonNegativeInt(score),
    skillUsage: normalizeSkillUsage(runStats.skillUsage),
    scoreBreakdown: {
      orbs: normalizeScoreBucket(breakdown.orbs),
      perfects: normalizeScoreBucket(breakdown.perfects),
      pipes: normalizeScoreBucket(breakdown.pipes),
      other: normalizeScoreBucket(breakdown.other)
    }
  };
};

export const __testables__ = {
  toNonNegativeInt,
  normalizeScoreBucket,
  normalizeSkillUsage
};
