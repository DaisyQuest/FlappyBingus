import { escapeHtml } from "./util.js";

const MAX_VISIBLE_ROWS = 10;

function measureHeight(node, fallback) {
  if (!node || typeof node.getBoundingClientRect !== "function") return fallback;
  const rect = node.getBoundingClientRect();
  return rect && Number.isFinite(rect.height) && rect.height > 0 ? rect.height : fallback;
}

function applyLeaderboardHeight(scroll, thead, tbody) {
  if (!scroll || !thead || !tbody) return null;
  const rowCount = tbody.childElementCount || 0;
  const visibleRows = Math.min(Math.max(rowCount, 1), MAX_VISIBLE_ROWS);
  const headerHeight = measureHeight(thead.querySelector("tr"), 36);
  const rowHeight = measureHeight(tbody.querySelector("tr"), 34);
  const maxHeight = headerHeight + visibleRows * rowHeight;
  scroll.style.maxHeight = `${maxHeight}px`;
  return maxHeight;
}

function setWrapState(container, classNames = [], text = "") {
  container.className = ["hsWrap", ...classNames].filter(Boolean).join(" ");
  container.textContent = text;
}

export function renderHighscores({ container, online = true, highscores = [], currentUser = null } = {}) {
  if (!container) return null;
  const doc = container.ownerDocument || document;

  if (!online) {
    setWrapState(container, ["hint", "bad"], "Leaderboard unavailable (offline).");
    return container;
  }
  if (!highscores.length) {
    setWrapState(container, ["hint"], "No scores yet. Be the first.");
    return container;
  }

  container.className = "hsWrap";

  const scroll = doc.createElement("div");
  scroll.className = "hsTableWrap";

  const table = doc.createElement("table");
  table.className = "hsTable";

  const thead = doc.createElement("thead");
  thead.innerHTML = `<tr><th>#</th><th>User</th><th class="mono">Best</th></tr>`;
  table.appendChild(thead);

  const tbody = doc.createElement("tbody");
  highscores.forEach((entry, index) => {
    const tr = doc.createElement("tr");
    const isMe = Boolean(currentUser && entry.username === currentUser.username);
    tr.innerHTML =
      `<td class="mono">${index + 1}</td>` +
      `<td>${escapeHtml(entry.username)}${isMe ? " (you)" : ""}</td>` +
      `<td class="mono">${entry.bestScore | 0}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  scroll.appendChild(table);
  applyLeaderboardHeight(scroll, thead, tbody);

  container.innerHTML = "";
  container.appendChild(scroll);
  return container;
}

export const __testables = { setWrapState, applyLeaderboardHeight, measureHeight };
