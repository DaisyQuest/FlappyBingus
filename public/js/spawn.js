import { clamp, lerp, norm2, rand } from "./util.js";
import { Pipe, Gate, Orb } from "./entities.js";

export function spawnSinglePipe(game, opts = {}) {
  const th = game._thickness();
  const len = clamp(th * rand(3.0, 6.5), th * 2.6, Math.max(game.W, game.H) * 0.55);
  const spd = opts.speed != null ? opts.speed : game._pipeSpeed();
  const side = typeof opts.side === "number" ? opts.side : (rand(0, 4) | 0);

  let x = 0; let y = 0; let vx = 0; let vy = 0; let pw = 0; let ph = 0;
  if (side === 0) { pw = th; ph = len; x = -pw - 12; y = rand(-ph * 0.15, game.H - ph * 0.85); vx = spd; vy = rand(-spd * 0.28, spd * 0.28); }
  if (side === 1) { pw = th; ph = len; x = game.W + 12; y = rand(-ph * 0.15, game.H - ph * 0.85); vx = -spd; vy = rand(-spd * 0.28, spd * 0.28); }
  if (side === 2) { pw = len; ph = th; x = rand(-pw * 0.15, game.W - pw * 0.85); y = -ph - 12; vx = rand(-spd * 0.28, spd * 0.28); vy = spd; }
  if (side === 3) { pw = len; ph = th; x = rand(-pw * 0.15, game.W - pw * 0.85); y = game.H + 12; vx = rand(-spd * 0.28, spd * 0.28); vy = -spd; }

  if (opts.aimAtPlayer) {
    const px = game.player.x; const py = game.player.y;
    const cx = side === 0 ? -th * 0.5 : side === 1 ? game.W + th * 0.5 : rand(0, game.W);
    const cy = side === 2 ? -th * 0.5 : side === 3 ? game.H + th * 0.5 : rand(0, game.H);
    const d0 = norm2(px - cx, py - cy);
    const spread = opts.spreadRad != null ? opts.spreadRad : rand(-0.22, 0.22);
    const cs = Math.cos(spread); const sn = Math.sin(spread);
    const ux = d0.x * cs - d0.y * sn; const uy = d0.x * sn + d0.y * cs;
    vx = ux * spd; vy = uy * spd;
    if (side === 0) { x = -pw - 14; y = clamp(cy - ph * 0.5, -ph, game.H + ph); }
    if (side === 1) { x = game.W + 14; y = clamp(cy - ph * 0.5, -ph, game.H + ph); }
    if (side === 2) { y = -ph - 14; x = clamp(cx - pw * 0.5, -pw, game.W + pw); }
    if (side === 3) { y = game.H + 14; x = clamp(cx - pw * 0.5, -pw, game.W + pw); }
  }

  game.pipes.push(new Pipe(x, y, pw, ph, vx, vy));
}

export function spawnWall(game, opts = {}) {
  const th = game._thickness();
  const spd = opts.speed != null ? opts.speed : game._pipeSpeed() * 0.95;
  const gap = opts.gap != null ? opts.gap : game._gapSize();
  const side = typeof opts.side === "number" ? opts.side : (rand(0, 4) | 0);
  const pad = Math.max(18, game.player.r * 1.1);
  const gapId = game._nextGapId++;
  let pipeCount = 0;

  if (side === 0 || side === 1) {
    const gc = rand(pad + gap * 0.5, game.H - (pad + gap * 0.5));
    const top = gc - gap * 0.5; const bot = gc + gap * 0.5;
    const topLen = clamp(top, 10, game.H); const botLen = clamp(game.H - bot, 10, game.H);
    const sx = side === 0 ? -th - 16 : game.W + 16;
    const vx = side === 0 ? spd : -spd;
    if (topLen > 10) {
      const pTop = new Pipe(sx, 0, th, topLen, vx, 0);
      pTop.gapId = gapId;
      pipeCount += 1;
      game.pipes.push(pTop);
    }
    if (botLen > 10) {
      const pBot = new Pipe(sx, bot, th, botLen, vx, 0);
      pBot.gapId = gapId;
      pipeCount += 1;
      game.pipes.push(pBot);
    }
    const g = new Gate("x", sx + th * 0.5, vx, gc, gap * 0.5, th);
    g.gapId = gapId;
    game.gates.push(g);
  } else {
    const gc = rand(pad + gap * 0.5, game.W - (pad + gap * 0.5));
    const left = gc - gap * 0.5; const right = gc + gap * 0.5;
    const leftLen = clamp(left, 10, game.W); const rightLen = clamp(game.W - right, 10, game.W);
    const sy = side === 2 ? -th - 16 : game.H + 16;
    const vy = side === 2 ? spd : -spd;
    if (leftLen > 10) {
      const pLeft = new Pipe(0, sy, leftLen, th, 0, vy);
      pLeft.gapId = gapId;
      pipeCount += 1;
      game.pipes.push(pLeft);
    }
    if (rightLen > 10) {
      const pRight = new Pipe(right, sy, rightLen, th, 0, vy);
      pRight.gapId = gapId;
      pipeCount += 1;
      game.pipes.push(pRight);
    }
    const g = new Gate("y", sy + th * 0.5, vy, gc, gap * 0.5, th);
    g.gapId = gapId;
    game.gates.push(g);
  }

  if (pipeCount > 0 && game._gapMeta) {
    game._gapMeta.set(gapId, { perfected: false });
  }
}

export function spawnBurst(game) {
  const d = game._difficulty01();
  const side = (rand(0, 4)) | 0;
  const count = Math.floor(lerp(5, 8, d));
  const spd = game._pipeSpeed() * lerp(0.92, 1.12, d);
  const arc = lerp(0.65, 0.95, d);
  for (let i = 0; i < count; i++) {
    const t = (count === 1) ? 0.5 : i / (count - 1);
    const spread = (t - 0.5) * arc;
    spawnSinglePipe(game, { side, speed: spd, aimAtPlayer: true, spreadRad: spread });
  }
}

export function spawnCrossfire(game) {
  const d = game._difficulty01();
  const spd = game._pipeSpeed() * lerp(0.95, 1.10, d);
  spawnSinglePipe(game, { side: 0, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) });
  spawnSinglePipe(game, { side: 1, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) });
  spawnSinglePipe(game, { side: 2, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) });
  spawnSinglePipe(game, { side: 3, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) });
}

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
