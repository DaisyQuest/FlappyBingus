// =====================
// FILE: public/js/replayBrowser.js
// =====================

const DEFAULT_REPLAY_BROWSER_LIMIT = 100;

function toOptionalNumber(value, { min = 0 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const normalized = Math.floor(num);
  return normalized >= min ? normalized : null;
}

export function formatReplayDuration(durationMs) {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatReplayDate(timestamp) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  return new Date(ts).toISOString().slice(0, 10);
}

export function normalizeReplayFilters(filters = {}) {
  const raw = filters && typeof filters === "object" ? filters : {};
  const search = typeof raw.search === "string" ? raw.search.trim() : "";
  const sort = raw.sort === "recent" || raw.sort === "duration" ? raw.sort : "score";

  const minScore = toOptionalNumber(raw.minScore);
  const maxScore = toOptionalNumber(raw.maxScore);
  const minDuration = toOptionalNumber(raw.minDuration);
  const maxDuration = toOptionalNumber(raw.maxDuration);

  const scoreRange = minScore !== null && maxScore !== null && minScore > maxScore
    ? { min: maxScore, max: minScore }
    : { min: minScore, max: maxScore };

  const durationRange = minDuration !== null && maxDuration !== null && minDuration > maxDuration
    ? { min: maxDuration, max: minDuration }
    : { min: minDuration, max: maxDuration };

  return {
    search,
    sort,
    minScore: scoreRange.min,
    maxScore: scoreRange.max,
    minDuration: durationRange.min,
    maxDuration: durationRange.max
  };
}

export function filterReplayEntries(entries = [], filters = {}) {
  const normalized = normalizeReplayFilters(filters);
  const search = normalized.search.toLowerCase();
  const list = Array.isArray(entries) ? entries : [];

  return list.filter((entry) => {
    const username = String(entry?.username || "").toLowerCase();
    if (search && !username.includes(search)) return false;
    const score = Number(entry?.bestScore) || 0;
    const duration = Number(entry?.durationMs) || 0;
    if (normalized.minScore !== null && score < normalized.minScore) return false;
    if (normalized.maxScore !== null && score > normalized.maxScore) return false;
    if (normalized.minDuration !== null && duration < normalized.minDuration) return false;
    if (normalized.maxDuration !== null && duration > normalized.maxDuration) return false;
    return true;
  });
}

export function sortReplayEntries(entries = [], filters = {}) {
  const normalized = normalizeReplayFilters(filters);
  const list = (Array.isArray(entries) ? entries : []).slice();

  const getTimestamp = (entry) => Number(entry?.updatedAt || entry?.recordedAt) || 0;

  list.sort((a, b) => {
    if (normalized.sort === "recent") {
      return getTimestamp(b) - getTimestamp(a) || (b?.bestScore || 0) - (a?.bestScore || 0);
    }
    if (normalized.sort === "duration") {
      return (b?.durationMs || 0) - (a?.durationMs || 0) || (b?.bestScore || 0) - (a?.bestScore || 0);
    }
    return (b?.bestScore || 0) - (a?.bestScore || 0) || getTimestamp(b) - getTimestamp(a);
  });

  return list;
}

export function renderReplayBrowserList({
  container,
  entries = [],
  onPlay = null,
  emptyText = "No replays match your filters."
} = {}) {
  if (!container) return { rendered: 0 };
  const doc = container.ownerDocument || document;
  container.innerHTML = "";

  if (!entries.length) {
    const empty = doc.createElement("div");
    empty.className = "hint";
    empty.textContent = emptyText;
    container.append(empty);
    return { rendered: 0 };
  }

  entries.forEach((entry) => {
    const row = doc.createElement("div");
    row.className = "replay-browser-entry";
    row.setAttribute("role", "listitem");

    const meta = doc.createElement("div");
    meta.className = "replay-browser-meta";

    const name = doc.createElement("div");
    name.className = "replay-browser-name";
    name.textContent = entry?.username || "Unknown";

    const stats = doc.createElement("div");
    stats.className = "replay-browser-stats";
    const score = Number(entry?.bestScore) || 0;
    const duration = formatReplayDuration(entry?.durationMs);
    const date = formatReplayDate(entry?.recordedAt || entry?.updatedAt);
    stats.textContent = `Score ${score} · Duration ${duration} · Date ${date}`;

    meta.append(name, stats);

    const actions = doc.createElement("div");
    actions.className = "replay-browser-actions";
    const play = doc.createElement("button");
    play.type = "button";
    play.className = "btn ghost replay-browser-play";
    play.textContent = "Play";
    play.dataset.username = entry?.username || "";
    if (typeof onPlay === "function") {
      play.addEventListener("click", () => onPlay(entry));
    }
    actions.append(play);

    row.append(meta, actions);
    container.append(row);
  });

  return { rendered: entries.length };
}

export const __testables = {
  DEFAULT_REPLAY_BROWSER_LIMIT,
  toOptionalNumber
};
