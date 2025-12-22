// =====================
// FILE: public/js/skillUsageStats.js
// =====================
import { ACTIONS } from "./keybinds.js";

export function renderSkillUsageStats(listEl, usage) {
  if (!listEl) return;
  listEl.innerHTML = "";
  const skills = usage && typeof usage === "object" ? usage : {};
  ACTIONS.forEach(({ id, label }) => {
    const count = Number.isFinite(skills[id]) ? skills[id] : 0;
    const row = listEl.ownerDocument?.createElement?.("div") || document.createElement("div");
    row.className = "skill-usage-item";

    const name = listEl.ownerDocument?.createElement?.("div") || document.createElement("div");
    name.className = "skill-usage-label";
    name.textContent = label;

    const value = listEl.ownerDocument?.createElement?.("div") || document.createElement("div");
    value.className = "skill-usage-count";
    value.textContent = String(Math.max(0, Math.floor(count)));

    row.append(name, value);
    listEl.append(row);
  });
}
