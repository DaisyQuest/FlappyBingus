import { clamp, lerp, norm2, rand } from "../util.js";
import { Pipe, Gate } from "./pipeEntity.js";

export function buildSinglePipePlan(game, opts = {}) {
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

  return {
    type: "single",
    side,
    thickness: th,
    length: len,
    x,
    y,
    w: pw,
    h: ph,
    vx,
    vy
  };
}

export function spawnSinglePipe(game, opts = {}) {
  const plan = buildSinglePipePlan(game, opts);
  spawnSinglePipeFromPlan(game, plan);
  return plan;
}

export function spawnSinglePipeFromPlan(game, plan) {
  game.pipes.push(new Pipe(plan.x, plan.y, plan.w, plan.h, plan.vx, plan.vy));
}

export function buildWallPlan(game, opts = {}) {
  const th = game._thickness();
  const spd = opts.speed != null ? opts.speed : game._pipeSpeed() * 0.95;
  const gap = opts.gap != null ? opts.gap : game._gapSize();
  const side = typeof opts.side === "number" ? opts.side : (rand(0, 4) | 0);
  const pad = Math.max(18, game.player.r * 1.1);
  const pipes = [];
  let gate = null;

  if (side === 0 || side === 1) {
    const gc = rand(pad + gap * 0.5, game.H - (pad + gap * 0.5));
    const top = gc - gap * 0.5; const bot = gc + gap * 0.5;
    const topLen = clamp(top, 10, game.H); const botLen = clamp(game.H - bot, 10, game.H);
    const sx = side === 0 ? -th - 16 : game.W + 16;
    const vx = side === 0 ? spd : -spd;
    if (topLen > 10) {
      pipes.push({ x: sx, y: 0, w: th, h: topLen, vx, vy: 0 });
    }
    if (botLen > 10) {
      pipes.push({ x: sx, y: bot, w: th, h: botLen, vx, vy: 0 });
    }
    gate = { axis: "x", pos: sx + th * 0.5, v: vx, gapCenter: gc, gapHalf: gap * 0.5, thick: th };
  } else {
    const gc = rand(pad + gap * 0.5, game.W - (pad + gap * 0.5));
    const left = gc - gap * 0.5; const right = gc + gap * 0.5;
    const leftLen = clamp(left, 10, game.W); const rightLen = clamp(game.W - right, 10, game.W);
    const sy = side === 2 ? -th - 16 : game.H + 16;
    const vy = side === 2 ? spd : -spd;
    if (leftLen > 10) {
      pipes.push({ x: 0, y: sy, w: leftLen, h: th, vx: 0, vy });
    }
    if (rightLen > 10) {
      pipes.push({ x: right, y: sy, w: rightLen, h: th, vx: 0, vy });
    }
    gate = { axis: "y", pos: sy + th * 0.5, v: vy, gapCenter: gc, gapHalf: gap * 0.5, thick: th };
  }

  return {
    type: "wall",
    side,
    gap,
    gapCenter: gate ? gate.gapCenter : 0,
    gapHalf: gap * 0.5,
    thickness: th,
    speed: spd,
    pipes,
    gate
  };
}

export function spawnWall(game, opts = {}) {
  const plan = buildWallPlan(game, opts);
  spawnWallFromPlan(game, plan);
  return plan;
}

export function spawnWallFromPlan(game, plan) {
  const gapId = game._nextGapId++;
  let pipeCount = 0;
  for (const pipe of plan.pipes) {
    const p = new Pipe(pipe.x, pipe.y, pipe.w, pipe.h, pipe.vx, pipe.vy);
    p.gapId = gapId;
    pipeCount += 1;
    game.pipes.push(p);
  }
  if (plan.gate) {
    const g = new Gate(plan.gate.axis, plan.gate.pos, plan.gate.v, plan.gate.gapCenter, plan.gate.gapHalf, plan.gate.thick);
    g.gapId = gapId;
    game.gates.push(g);
  }
  if (pipeCount > 0 && game._gapMeta) {
    game._gapMeta.set(gapId, { perfected: false, broken: false, pipesRemaining: pipeCount });
  }
}

export function spawnBurst(game) {
  const plan = buildBurstPlans(game);
  for (const pipePlan of plan.pipes) {
    spawnSinglePipeFromPlan(game, pipePlan);
  }
  return plan;
}

export function buildBurstPlans(game) {
  const d = game._difficulty01();
  const side = (rand(0, 4)) | 0;
  const count = Math.floor(lerp(5, 8, d));
  const spd = game._pipeSpeed() * lerp(0.92, 1.12, d);
  const arc = lerp(0.65, 0.95, d);
  const pipes = [];
  for (let i = 0; i < count; i++) {
    const t = (count === 1) ? 0.5 : i / (count - 1);
    const spread = (t - 0.5) * arc;
    pipes.push(buildSinglePipePlan(game, { side, speed: spd, aimAtPlayer: true, spreadRad: spread }));
  }
  return { type: "burst", side, count, pipes };
}

export function spawnCrossfire(game) {
  const plan = buildCrossfirePlans(game);
  for (const pipePlan of plan.pipes) {
    spawnSinglePipeFromPlan(game, pipePlan);
  }
  return plan;
}

export function buildCrossfirePlans(game) {
  const d = game._difficulty01();
  const spd = game._pipeSpeed() * lerp(0.95, 1.10, d);
  const pipes = [
    buildSinglePipePlan(game, { side: 0, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) }),
    buildSinglePipePlan(game, { side: 1, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) }),
    buildSinglePipePlan(game, { side: 2, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) }),
    buildSinglePipePlan(game, { side: 3, speed: spd, aimAtPlayer: true, spreadRad: rand(-0.1, 0.1) })
  ];
  return { type: "crossfire", pipes };
}
