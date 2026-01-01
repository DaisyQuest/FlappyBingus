export function normalizeWorldwideRuns(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

export function formatWorldwideRuns(value) {
  const total = normalizeWorldwideRuns(value);
  return `Games Played (Worldwide): ${total.toLocaleString("en-US")}`;
}
