import { clamp, lerp, rand } from "../util.js";
import { Orb } from "../entities.js";

export function spawnOrb(game) {
  const o = game.cfg.catalysts.orbs;
  if (!o.enabled) return;
  if (game.orbs.length >= o.maxOnScreen) return;

  const r = clamp(Number(o.radius) || 12, 6, 40);
  const life = clamp(Number(o.lifetime) || 10, 1, 60);
  const safe = clamp(Number(o.safeDistance) || 120, 0, 800);
  const spread = o.spawnSpread || {};
  const prog = (() => {
    const tc = Math.max(1e-3, Number(spread.timeToMax) || 1);
    const sc = Math.max(1e-3, Number(spread.scoreToMax) || 1);
    const mt = clamp(Number(spread.mixTime) || 0.5, 0, 1);
    const ms = clamp(Number(spread.mixScore) || 0.5, 0, 1);
    const dT = 1 - Math.exp(-(Math.max(0, game.timeAlive) / tc));
    const dS = 1 - Math.exp(-(Math.max(0, game.score) / sc));
    return clamp(mt * dT + ms * dS, 0, 1);
  })();
  const startFrac = clamp(Number(spread.startFraction) || 1, 0.05, 1.0);
  const endFrac = clamp(Number(spread.endFraction) || 1, 0.05, 1.0);
  const frac = clamp(lerp(startFrac, endFrac, prog), 0.05, 1.0);
  const mx = (game.W * (1 - frac)) * 0.5;
  const my = (game.H * (1 - frac)) * 0.5;
  let minX = r + 10 + mx, maxX = game.W - (r + 10) - mx;
  let minY = r + 10 + my, maxY = game.H - (r + 10) - my;
  if (minX >= maxX) { minX = r + 10; maxX = game.W - r - 10; }
  if (minY >= maxY) { minY = r + 10; maxY = game.H - r - 10; }

  let x = game.W * 0.5, y = game.H * 0.5;
  for (let i = 0; i < 18; i++) {
    const px = rand(minX, maxX), py = rand(minY, maxY);
    if (Math.hypot(px - game.player.x, py - game.player.y) >= (game.player.r + r + safe)) { x = px; y = py; break; }
  }

  const sp = rand(o.driftSpeedMin, o.driftSpeedMax);
  const a = rand(0, Math.PI * 2);
  game.orbs.push(new Orb(x, y, Math.cos(a) * sp, Math.sin(a) * sp, r, life));
}
