// =====================
// FILE: public/js/personalBest.js
// =====================
const sanitizeScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

export function computePersonalBestStatus(finalScore, userBestScore = 0, localBestScore = 0) {
  const score = sanitizeScore(finalScore);
  const userBest = sanitizeScore(userBestScore);
  const localBest = sanitizeScore(localBestScore);
  const personalBest = Math.max(userBest, localBest);
  const displayBest = Math.max(personalBest, score);
  const isPersonalBest = score >= personalBest;
  const shouldPersistLocalBest = score > localBest;

  return {
    score,
    userBest,
    localBest,
    personalBest,
    displayBest,
    isPersonalBest,
    shouldPersistLocalBest
  };
}

export function updatePersonalBestElements(elements = {}, status = {}) {
  const { personalBestEl, badgeEl, statusEl } = elements;
  const { displayBest = 0, isPersonalBest = false } = status;

  if (personalBestEl) {
    personalBestEl.textContent = String(displayBest);
  }

  if (badgeEl) {
    badgeEl.classList.toggle("hidden", !isPersonalBest);
    badgeEl.classList.toggle("visible", Boolean(isPersonalBest));
    badgeEl.textContent = isPersonalBest ? "New personal best!" : "";
  }

  if (statusEl) {
    statusEl.textContent = isPersonalBest
      ? "You beat your personal best—amazing run!"
      : "Score again to chase a new personal best.";
    statusEl.classList.toggle("highlight", Boolean(isPersonalBest));
  }
}

export const __testables = { sanitizeScore };
