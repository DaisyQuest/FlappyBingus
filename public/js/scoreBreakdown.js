// =====================
// FILE: public/js/scoreBreakdown.js
// =====================
export function renderScoreBreakdown(listEl, runStats = {}, finalScore = 0) {
  if (!listEl) return;
  const toInt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  };
  const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
  const breakdown = runStats?.scoreBreakdown || {};
  const baseTotal = toInt(finalScore ?? runStats?.totalScore);

  const orbs = {
    points: toInt(breakdown.orbs?.points),
    count: toInt(breakdown.orbs?.count ?? runStats?.orbsCollected)
  };
  const perfects = {
    points: toInt(breakdown.perfects?.points),
    count: toInt(breakdown.perfects?.count ?? runStats?.perfects)
  };
  const pipes = {
    points: toInt(breakdown.pipes?.points),
    count: toInt(breakdown.pipes?.count ?? runStats?.pipesDodged)
  };

  const accounted = orbs.points + perfects.points + pipes.points;
  const trackedOther = toInt(breakdown.other?.points);
  const remainder = Math.max(0, baseTotal - accounted - trackedOther);
  const other = {
    points: trackedOther + remainder,
    count: toInt(breakdown.other?.count)
  };
  const finalTotal = Math.max(baseTotal, accounted + other.points);

  const addRow = (label, bucket, metaText, extraClass = "") => {
    const row = document.createElement("div");
    row.className = "score-breakdown-row" + (extraClass ? ` ${extraClass}` : "");
    const left = document.createElement("div");
    left.className = "score-breakdown-label";
    left.textContent = label;
    const meta = document.createElement("div");
    meta.className = "score-breakdown-meta";
    meta.textContent = metaText;
    const points = document.createElement("div");
    points.className = "score-breakdown-points";
    points.textContent = `+${bucket.points}`;
    row.append(left, meta, points);
    listEl.append(row);
  };

  listEl.innerHTML = "";
  addRow("Orbs collected", orbs, plural(orbs.count, "orb"));
  addRow("Perfect clears", perfects, plural(perfects.count, "perfect"));
  addRow("Pipes dodged", pipes, plural(pipes.count, "pipe"));
  if (other.points > 0 || other.count > 0) {
    addRow("Other bonuses", other, other.count > 0 ? plural(other.count, "event") : "Carryover");
  }

  const totalRow = document.createElement("div");
  totalRow.className = "score-breakdown-row score-breakdown-total";
  const label = document.createElement("div");
  label.className = "score-breakdown-label";
  label.textContent = "Total score";
  const meta = document.createElement("div");
  meta.className = "score-breakdown-meta";
  meta.textContent = accounted + other.points === finalTotal ? "All points accounted for" : `Accounted: ${accounted + other.points}/${finalTotal}`;
  const points = document.createElement("div");
  points.className = "score-breakdown-points";
  points.textContent = `${finalTotal}`;
  totalRow.append(label, meta, points);
  listEl.append(totalRow);
}

export const __testables = { renderScoreBreakdown };
