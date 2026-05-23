import { clamp, norm2, approach } from "./util.js";
import { dashBounceMax } from "./mechanics.js";
import { Part, FloatText } from "./entities.js";

export function activeDashConfig(game) {
  if (game.skillSettings?.dashBehavior === "destroy") return game.cfg.skills.dashDestroy || game.cfg.skills.dash;
  return game.cfg.skills.dash;
}

export function dashBounceMaxFor(game) {
  return dashBounceMax(activeDashConfig(game));
}

export function applyDashReflect(game, hit) {
  const p = game.player;
  const nx = hit?.nx || 0, ny = hit?.ny || 0;
  const dashCfg = activeDashConfig(game);
  const keep = clamp(Number(dashCfg?.bounceRetain) || 0.86, 0, 1);
  const baseSpeed = Math.max(Math.hypot(p.vx, p.vy), Number(dashCfg?.speed) || 0);
  const dot = p.vx * nx + p.vy * ny;
  let rx = p.vx - 2 * dot * nx;
  let ry = p.vy - 2 * dot * ny;

  const n = norm2(rx, ry);
  let dirX = n.x, dirY = n.y;
  if (n.len <= 1e-5) {
    const fallback = norm2((nx !== 0 || ny !== 0) ? -nx : p.dashVX, (nx !== 0 || ny !== 0) ? -ny : p.dashVY);
    dirX = fallback.x; dirY = fallback.y;
  }

  const speed = baseSpeed * keep;
  p.vx = dirX * speed;
  p.vy = dirY * speed;
  p.dashVX = dirX;
  p.dashVY = dirY;
  p.dashBounces = (p.dashBounces | 0) + 1;
  p.dashImpactFlash = Math.max(p.dashImpactFlash, 0.16);

  const push = (hit?.penetration || 0) + 0.6;
  p.x += (nx || 0) * push;
  p.y += (ny || 0) * push;

  const pad = p.r + 2;
  p.x = clamp(p.x, pad, game.W - pad);
  p.y = clamp(p.y, pad, game.H - pad);

  game.lastDashReflect = {
    t: game.timeAlive,
    x: (hit?.contactX != null) ? hit.contactX : p.x,
    y: (hit?.contactY != null) ? hit.contactY : p.y,
    count: p.dashBounces,
    serial: (game.lastDashReflect?.serial || 0) + 1
  };

  game._dashBounceSfx(speed);
  game._spawnDashReflectFx(
    (hit?.contactX != null) ? hit.contactX : p.x,
    (hit?.contactY != null) ? hit.contactY : p.y,
    nx, ny,
    speed / Math.max(1, Number(dashCfg?.speed) || 1)
  );
}

export function updatePlayer(game, dt) {
  const p = game.player;
  p.renderPrevX = p.x;
  p.renderPrevY = p.y;

  if (p.invT > 0) p.invT = Math.max(0, p.invT - dt);
  if (p.dashT > 0) p.dashT = Math.max(0, p.dashT - dt);
  if (p.dashT <= 0 && p.dashMode) p.dashMode = null;
  if (p.dashImpactFlash > 0) p.dashImpactFlash = Math.max(0, p.dashImpactFlash - dt);

  const mv = game.input.getMove();
  const n = norm2(mv.dx, mv.dy);
  if (n.len > 0) { p.lastX = n.x; p.lastY = n.y; }

  if (p.dashT > 0) {
    const dashCfg = activeDashConfig(game);
    const dashSpeed = Math.max(0, Number(dashCfg?.speed) || 0);
    p.vx = p.dashVX * dashSpeed;
    p.vy = p.dashVY * dashSpeed;
  } else {
    const maxS = Number(game.cfg.player.maxSpeed) || 0;
    const accel = Number(game.cfg.player.accel) || 0;
    const fr = Number(game.cfg.player.friction) || 0;

    const tvx = n.x * maxS, tvy = n.y * maxS;
    p.vx = approach(p.vx, tvx, accel * dt);
    p.vy = approach(p.vy, tvy, accel * dt);

    if (n.len === 0) {
      const damp = Math.exp(-fr * dt);
      p.vx *= damp; p.vy *= damp;
    }
  }

  const pad = p.r + 2;

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  let wallBounce = null;
  let wallContact = null;
  const bounceCap = game._dashBounceMax();
  if (p.dashT > 0 && p.invT <= 0) {
    const candidate =
      (p.x < pad) ? { nx: 1, ny: 0, contactX: pad, contactY: p.y, penetration: pad - p.x }
        : (p.x > game.W - pad) ? { nx: -1, ny: 0, contactX: game.W - pad, contactY: p.y, penetration: p.x - (game.W - pad) }
          : (p.y < pad) ? { nx: 0, ny: 1, contactX: p.x, contactY: pad, penetration: pad - p.y }
            : (p.y > game.H - pad) ? { nx: 0, ny: -1, contactX: p.x, contactY: game.H - pad, penetration: p.y - (game.H - pad) }
              : null;
    if (candidate) {
      wallContact = candidate;
      if (p.dashBounces < bounceCap) wallBounce = candidate;
    }
  }

  p.x = clamp(p.x, pad, game.W - pad);
  p.y = clamp(p.y, pad, game.H - pad);

  if (wallBounce) game._applyDashReflect(wallBounce);
  else if (wallContact && Number.isFinite(bounceCap)) {
    game._dashBreakSfx();
    p.dashMode = null;
    p.dashT = 0;
    p.dashBounces = bounceCap;
    p.vx = 0;
    p.vy = 0;
  }
}

export function startDashMotion(game, d) {
  const p = game.player;
  const dur = clamp(Number(d.duration) || 0, 0, 1.2);
  const mv = game.input.getMove();
  const n = norm2(mv.dx, mv.dy);
  const dx = (n.len > 0) ? n.x : p.lastX;
  const dy = (n.len > 0) ? n.y : p.lastY;
  const nn = norm2(dx, dy);

  p.dashVX = (nn.len > 0) ? nn.x : 0;
  p.dashVY = (nn.len > 0) ? nn.y : -1;
  p.dashT = dur;
  p.dashBounces = 0;
  p.dashImpactFlash = 0;
  p.dashDestroyed = false;

  return { dur };
}

export function useDashRicochet(game, d) {
  startDashMotion(game, d);
  const p = game.player;
  p.dashMode = "ricochet";
  game.cds.dash = Math.max(0, Number(d.cooldown) || 0);
  game._dashStartSfx();

  const vrand = (a, b) => game._visualRand(a, b);
  const burst = game._scaleParticles(18);
  for (let i = 0; i < burst; i++) {
    const a = vrand(0, Math.PI * 2), sp = vrand(40, 260);
    const vx = Math.cos(a) * sp - p.dashVX * 220;
    const vy = Math.sin(a) * sp - p.dashVY * 220;
    const prt = new Part(p.x, p.y, vx, vy, vrand(0.18, 0.34), vrand(1.0, 2.2), "rgba(255,255,255,.80)", true);
    prt.drag = 9.5;
    game.parts.push(prt);
  }
}

export function useDashDestroy(game, d) {
  startDashMotion(game, d);
  const p = game.player;
  p.dashMode = "destroy";
  game.cds.dash = Math.max(0, Number(d.cooldown) || 0);
  game._dashStartSfx();

  const vrand = (a, b) => game._visualRand(a, b);
  const burst = game._scaleParticles(26);
  for (let i = 0; i < burst; i++) {
    const a = vrand(0, Math.PI * 2), sp = vrand(60, 320);
    const vx = Math.cos(a) * sp - p.dashVX * 180;
    const vy = Math.sin(a) * sp - p.dashVY * 180;
    const prt = new Part(p.x, p.y, vx, vy, vrand(0.16, 0.36), vrand(1.1, 2.4), "rgba(255,220,180,.85)", true);
    prt.drag = 11;
    game.parts.push(prt);
  }
}

export function useSlowField(game, s) {
  const p = game.player;
  const dur = clamp(Number(s.duration) || 0, 0, 8.0);
  const rad = clamp(Number(s.radius) || 0, 40, 900);
  const fac = clamp(Number(s.slowFactor) || 0.6, 0.10, 1.0);

  game.slowField = { x: p.x, y: p.y, r: rad, fac, t: dur, tm: dur };
  game.slowExplosion = null;
  game.cds.slowField = Math.max(0, Number(s.cooldown) || 0);
  game._slowFieldSfx();
  game.floats.push(new FloatText("SLOW FIELD", p.x, p.y - p.r * 1.8, "rgba(120,210,255,.95)"));
}

export function useSlowExplosion(game, s) {
  const p = game.player;
  const dur = clamp(Number(s.duration) || 0.12, 0, 1.2);
  const rad = clamp(Number(s.radius) || 0, 20, 900);
  const blastParticles = game._scaleParticles(Math.max(0, Number(s.blastParticles) || 0));

  game.slowField = null;
  game.slowExplosion = { x: p.x, y: p.y, r: rad, t: dur, tm: dur };
  game.cds.slowField = Math.max(0, Number(s.cooldown) || 0);
  game._slowExplosionSfx();
  game.floats.push(new FloatText("Explode", p.x, p.y - p.r * 1.8, "rgba(255,210,150,.95)"));

  const shards = [];
  const vrand = (a, b) => game._visualRand(a, b);
  for (let i = 0; i < blastParticles; i++) {
    const a = vrand(0, Math.PI * 2);
    const sp = vrand(160, 440);
    const prt = new Part(
      p.x, p.y,
      Math.cos(a) * sp,
      Math.sin(a) * sp,
      vrand(0.22, 0.45),
      vrand(1.1, 2.6),
      "rgba(255,230,180,.85)",
      true
    );
    prt.drag = 10.8;
    prt.twinkle = true;
    game.parts.push(prt);
    shards.push(prt);
  }

  game._destroyPipesInRadius({ x: p.x, y: p.y, r: rad, cause: "slowExplosion" });
  game.lastSlowBlast = { t: game.timeAlive, x: p.x, y: p.y, shards };
}
