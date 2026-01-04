// =========================================
// FILE: public/js/main/gameOverStatsController.js
// =========================================
// Module boundary: game-over stats view state and DOM updates.

export function createGameOverStatsController({
  elements,
  buildGameOverStats,
  renderSkillUsageStats,
  statViews
}) {
  let currentStatsView = statViews.run;
  let lastRunStats = null;

  const applyStatsLabels = (labels) => {
    if (elements.overOrbComboLabel) elements.overOrbComboLabel.textContent = labels.orb;
    if (elements.overPerfectComboLabel) elements.overPerfectComboLabel.textContent = labels.perfect;
    if (elements.skillUsageTitle) elements.skillUsageTitle.textContent = labels.skillUsage;
    if (elements.overStatsMode) elements.overStatsMode.textContent = labels.mode;
    if (elements.overStatsToggle) elements.overStatsToggle.textContent = labels.toggle;
  };

  const update = ({
    view = currentStatsView,
    runStats = lastRunStats,
    achievementsState,
    skillTotals
  } = {}) => {
    if (!elements.overOrbCombo || !elements.overPerfectCombo || !elements.skillUsageStats) return;
    const resolved = buildGameOverStats({ view, runStats, achievementsState, skillTotals });
    currentStatsView = resolved.view;
    lastRunStats = runStats;
    elements.overOrbCombo.textContent = String(resolved.combo.orb);
    elements.overPerfectCombo.textContent = String(resolved.combo.perfect);
    renderSkillUsageStats(elements.skillUsageStats, resolved.skillUsage);
    applyStatsLabels(resolved.labels);
  };

  return {
    update,
    getCurrentView: () => currentStatsView,
    setCurrentView: (view) => {
      currentStatsView = view;
    },
    getLastRunStats: () => lastRunStats,
    setLastRunStats: (runStats) => {
      lastRunStats = runStats;
    }
  };
}
