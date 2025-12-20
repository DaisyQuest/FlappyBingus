/**
 * Helpers to format scenario results and snapshots for human-readable output.
 */
export function summarizeRun(runResult) {
  const { scenario, seed, snapshots } = runResult;
  const last = snapshots.at(-1);
  const events = last?.events ?? [];
  const ticks = last?.state?.tick ?? 0;
  const time = last?.state?.time ?? 0;

  return {
    scenario,
    seed,
    ticks,
    time,
    events: events.length
  };
}

export function renderMarkdownSummary(summary) {
  return [
    `# Scenario Summary: ${summary.scenario}`,
    "",
    `- Seed: \`${summary.seed}\``,
    `- Ticks: \`${summary.ticks}\``,
    `- Time: \`${summary.time.toFixed(3)}s\``,
    `- Events: \`${summary.events}\``,
    ""
  ].join("\n");
}
