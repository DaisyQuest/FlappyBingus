// =====================
// FILE: public/js/scoreBreakdown.js
// =====================
export function renderScoreBreakdown(listEl, runStats = {}, finalScore = 0) {
  if (!listEl) return;
  const doc = listEl.ownerDocument || document;
  const toInt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  };
  const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
  const breakdown = runStats?.scoreBreakdown || {};
  const baseTotal = toInt(finalScore ?? runStats?.totalScore);
  const mode = runStats?.mode === "surf" ? "surf" : "flappy";

  const addRow = (label, bucket, metaText, extraClass = "") => {
    const row = doc.createElement("div");
    row.className = "score-breakdown-row" + (extraClass ? ` ${extraClass}` : "");
    const left = doc.createElement("div");
    left.className = "score-breakdown-label";
    left.textContent = label;
    const meta = doc.createElement("div");
    meta.className = "score-breakdown-meta";
    meta.textContent = metaText;
    const points = doc.createElement("div");
    points.className = "score-breakdown-points";
    points.textContent = `+${bucket.points}`;
    row.append(left, meta, points);
    listEl.append(row);
  };

  listEl.innerHTML = "";
  let accounted = 0;
  let trackedOther = 0;
  if (mode === "surf") {
    const airtime = {
      points: toInt(breakdown.airtime?.points),
      seconds: toInt(breakdown.airtime?.seconds ?? runStats?.airtimeSeconds)
    };
    const bigAir = {
      points: toInt(breakdown.bigAir?.points),
      count: toInt(breakdown.bigAir?.count ?? runStats?.bigAirCount)
    };
    const chain = {
      points: toInt(breakdown.chain?.points),
      count: toInt(breakdown.chain?.count ?? runStats?.maxChain)
    };
    accounted = airtime.points + bigAir.points + chain.points;
    addRow("Airtime", airtime, plural(airtime.seconds, "second"));
    addRow("Big air", bigAir, plural(bigAir.count, "launch"));
    addRow("Chain boosts", chain, plural(chain.count, "link"));
  } else {
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
    accounted = orbs.points + perfects.points + pipes.points;
    addRow("Orbs collected", orbs, plural(orbs.count, "orb"));
    addRow("Perfect clears", perfects, plural(perfects.count, "perfect"));
    addRow("Pipes dodged", pipes, plural(pipes.count, "pipe"));
    trackedOther = toInt(breakdown.other?.points);
    const remainder = Math.max(0, baseTotal - accounted - trackedOther);
    const other = {
      points: trackedOther + remainder,
      count: toInt(breakdown.other?.count)
    };
    if (other.points > 0 || other.count > 0) {
      addRow("Other bonuses", other, other.count > 0 ? plural(other.count, "event") : "Carryover");
    }
  }

  const remainder = Math.max(0, baseTotal - accounted - trackedOther);
  const otherPoints = trackedOther + remainder;
  const finalTotal = Math.max(baseTotal, accounted + otherPoints);

  const totalRow = doc.createElement("div");
  totalRow.className = "score-breakdown-row score-breakdown-total";
  const label = doc.createElement("div");
  label.className = "score-breakdown-label";
  label.textContent = "Total score";
  const meta = doc.createElement("div");
  meta.className = "score-breakdown-meta";
  meta.textContent = accounted + otherPoints === finalTotal ? "All points accounted for" : `Accounted: ${accounted + otherPoints}/${finalTotal}`;
  const points = doc.createElement("div");
  points.className = "score-breakdown-points";
  points.textContent = `${finalTotal}`;
  totalRow.append(label, meta, points);
  listEl.append(totalRow);
}

export const __testables = { renderScoreBreakdown };
