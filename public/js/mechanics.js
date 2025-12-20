import { clamp } from "./util.js";

export function orbPoints(cfg, comboNow) {
  const base = Math.max(0, Number(cfg?.scoring?.orbBase) || 0);
  const bonus = Math.max(0, Number(cfg?.scoring?.orbComboBonus) || 0);
  return Math.round(base + bonus * Math.max(0, comboNow - 1));
}

export function dashBounceMax(cfg) {
  const dashCfg = cfg?.skills?.dash ?? cfg;
  const n = Number(dashCfg?.maxBounces);
  if (!Number.isFinite(n)) return 2;
  if (n < 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, n | 0);
}

export function tickCooldowns(cds, dt) {
  cds.dash = Math.max(0, cds.dash - dt);
  cds.phase = Math.max(0, cds.phase - dt);
  cds.teleport = Math.max(0, cds.teleport - dt);
  cds.slowField = Math.max(0, cds.slowField - dt);
  return cds;
}
