import { formatRunDuration } from "./util.js";

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatDate(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function formatReplayMeta(entry) {
  const durationSeconds = Math.max(0, Math.round((Number(entry?.durationMs) || 0) / 1000));
  return {
    score: Number(entry?.bestScore) || 0,
    duration: formatRunDuration(durationSeconds),
    recordedAt: formatDate(Number(entry?.recordedAt) || 0),
    ticks: Number(entry?.ticksLength) || 0,
    bytes: formatBytes(entry?.replayBytes)
  };
}

function buildDetailRow(doc, label, value) {
  const row = doc.createElement("div");
  row.className = "replay-detail-row";
  const labelEl = doc.createElement("span");
  labelEl.className = "replay-detail-label";
  labelEl.textContent = label;
  const valueEl = doc.createElement("span");
  valueEl.className = "replay-detail-value";
  valueEl.textContent = value;
  row.append(labelEl, valueEl);
  return row;
}

export function renderReplayDetails({ container, entry, run }) {
  if (!container) return;
  container.innerHTML = "";
  if (!entry) {
    container.textContent = "No replay selected.";
    return;
  }

  const meta = formatReplayMeta(entry);
  const doc = container.ownerDocument;

  const heading = doc.createElement("div");
  heading.className = "replay-detail-heading";
  heading.textContent = entry.username || "Unknown player";

  container.append(
    heading,
    buildDetailRow(doc, "Best score", meta.score.toLocaleString()),
    buildDetailRow(doc, "Duration", meta.duration),
    buildDetailRow(doc, "Recorded", meta.recordedAt),
    buildDetailRow(doc, "Ticks", meta.ticks.toLocaleString()),
    buildDetailRow(doc, "Replay size", meta.bytes)
  );

  if (run?.runStats) {
    const stats = doc.createElement("div");
    stats.className = "replay-detail-stats";
    const statItems = [
      ["Orbs", run.runStats.orbsCollected],
      ["Perfects", run.runStats.perfects],
      ["Pipes dodged", run.runStats.pipesDodged],
      ["Abilities", run.runStats.abilitiesUsed]
    ];
    statItems.forEach(([label, value]) => {
      if (value === undefined || value === null) return;
      stats.appendChild(buildDetailRow(doc, label, String(value)));
    });
    if (stats.childElementCount > 0) container.appendChild(stats);
  }
}

export const __testables = {
  formatBytes,
  formatDate,
  buildDetailRow
};
