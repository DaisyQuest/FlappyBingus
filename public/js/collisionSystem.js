import { clamp, norm2, circleRect } from "./util.js";
import { Part } from "./entities.js";

export function pipeOverlapsCircle(pipe, { x, y, r }) {
  if (!pipe || r <= 0) return false;
  return circleRect(x, y, r, pipe.x, pipe.y, pipe.w, pipe.h);
}

export function shatterPipe(game, pipe, { hit, particles = 30, cause = "dashDestroy" } = {}) {
  if (!pipe) return false;
  const idx = game.pipes.indexOf(pipe);
  if (idx >= 0) game.pipes.splice(idx, 1);
  if (idx < 0) return false;
  game._onGapPipeRemovedWithFlags(pipe, { broken: true });
  game._recordBrokenPipe(1);

  const cx = (hit?.contactX != null) ? hit.contactX : (pipe.cx ? pipe.cx() : pipe.x + pipe.w * 0.5);
  const cy = (hit?.contactY != null) ? hit.contactY : (pipe.cy ? pipe.cy() : pipe.y + pipe.h * 0.5);
  const nx = hit?.nx || 0, ny = hit?.ny || 0;

  const vrand = (a, b) => game._visualRand(a, b);
  const burst = game._scaleParticles(particles);
  for (let i = 0; i < burst; i++) {
    const spread = vrand(-0.7, 0.7);
    const baseDir = Math.atan2(ny || 0, nx || 0);
    const dir = (nx || ny) ? baseDir + spread : vrand(0, Math.PI * 2);
    const sp = vrand(160, 420);
    const prt = new Part(
      cx, cy,
      Math.cos(dir) * sp,
      Math.sin(dir) * sp,
      vrand(0.20, 0.42),
      vrand(1.2, 2.8),
      cause === "slowExplosion" ? "rgba(255,230,180,.85)" : "rgba(255,210,160,.90)",
      true
    );
    prt.drag = 10.5;
    prt.twinkle = true;
    game.parts.push(prt);
  }

  game.lastPipeShatter = { t: game.timeAlive, x: cx, y: cy, cause };
  return true;
}

export function dashImpactSlowdown(game, hit) {
  const p = game.player;
  let nx = hit?.nx || 0, ny = hit?.ny || 0;
  const pipeVX = hit?.pipe?.vx || 0;
  const pipeVY = hit?.pipe?.vy || 0;

  if (Math.abs(nx) < 1e-5 && Math.abs(ny) < 1e-5) {
    const fallback = norm2(p.dashVX || p.vx, p.dashVY || p.vy);
    nx = fallback.x; ny = fallback.y;
  }

  const relVx = p.vx - pipeVX;
  const relVy = p.vy - pipeVY;
  const relNormal = relVx * nx + relVy * ny;
  const tangentialX = relVx - relNormal * nx;
  const tangentialY = relVy - relNormal * ny;

  const playerSpeed = Math.max(1e-3, Math.hypot(p.vx, p.vy));
  const closing = Math.max(0, -relNormal);
  const impactScale = clamp(closing / playerSpeed, 0, 1);
  const damp = clamp(0.12 + impactScale * 0.45, 0, 0.65);

  const newRelNormal = relNormal * (1 - damp);
  const newVx = pipeVX + tangentialX + newRelNormal * nx;
  const newVy = pipeVY + tangentialY + newRelNormal * ny;

  p.vx = newVx;
  p.vy = newVy;
  const dir = norm2(newVx, newVy);
  if (dir.len > 1e-5) {
    p.dashVX = dir.x;
    p.dashVY = dir.y;
  }
}

export function applyDashDestroy(game, hit, dashCfg) {
  const p = game.player;
  game._dashDestroySfx();
  shatterPipe(game, hit?.pipe, { hit, particles: Math.max(10, Number(dashCfg?.shatterParticles) || 30), cause: "dashDestroy" });
  dashImpactSlowdown(game, hit);
  p.dashDestroyed = true;
  p.dashMode = null;
  p.dashT = 0;
  p.dashBounces = 0;
  p.dashImpactFlash = Math.max(p.dashImpactFlash, 0.22);
  const iFrames = Math.max(0, Number(dashCfg?.impactIFrames) || 0);
  if (iFrames > 0) p.invT = Math.max(p.invT, iFrames);
  return "destroyed";
}

export function destroyPipesInRadius(game, { x, y, r, cause = "slowExplosion" }) {
  let brokenCount = 0;
  for (let i = game.pipes.length - 1; i >= 0; i--) {
    const pipe = game.pipes[i];
    if (pipeOverlapsCircle(pipe, { x, y, r })) {
      if (shatterPipe(game, pipe, { particles: 24, cause })) brokenCount += 1;
    }
  }
  game._recordBrokenExplosion(brokenCount);
}

export function handlePipeCollision(game, hit, bounceCap, dashCfg, state) {
  if (game.player.dashT > 0) {
    if (game.player.dashMode === "destroy" && !game.player.dashDestroyed) {
      return applyDashDestroy(game, hit, dashCfg);
    }
    if (game.player.dashBounces < bounceCap) {
      game._applyDashReflect(hit);
      return "reflected";
    }
    game._gameOverSfx();
    game.state = state.OVER;
    game.onGameOver(game.score | 0);
    return "over";
  }

  game._gameOverSfx();
  game.state = state.OVER;
  game.onGameOver(game.score | 0);
  return "over";
}
