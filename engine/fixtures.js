/**
 * Fixture builders for deterministic headless scenarios.
 */
export function spawnPipe({
  x = 0,
  y = 0,
  w = 64,
  h = 256,
  vx = 0,
  vy = 0,
  entered = false,
  scored = false
} = {}) {
  return { kind: "pipe", x, y, w, h, vx, vy, entered, scored };
}

export function spawnGate({
  axis = "x",
  pos = 0,
  v = 0,
  gapCenter = 0,
  gapHalf = 50,
  thick = 16,
  entered = false,
  cleared = false
} = {}) {
  return { kind: "gate", axis, pos, v, gapCenter, gapHalf, thick, entered, cleared };
}

export function spawnOrb({
  x = 0,
  y = 0,
  vx = 0,
  vy = 0,
  r = 12,
  life = 5
} = {}) {
  return { kind: "orb", x, y, vx, vy, r, life, max: life };
}

export function spawnOrbCluster({
  count = 3,
  startX = 0,
  startY = 0,
  spacing = 20,
  vx = 0,
  vy = 0,
  r = 10,
  life = 5
} = {}) {
  return Array.from({ length: count }, (_, i) =>
    spawnOrb({
      x: startX + i * spacing,
      y: startY,
      vx,
      vy,
      r,
      life
    })
  );
}

/**
 * Run fixed steps on an engine with a constant dt.
 * Returns an array of snapshots for each step.
 */
export function runFixedSteps(engine, dt, steps) {
  if (!engine || typeof engine.step !== "function") throw new Error("Engine with step(dt) is required.");
  if (dt <= 0) throw new Error("dt must be positive.");
  if (steps <= 0) throw new Error("steps must be positive.");
  const snaps = [];
  for (let i = 0; i < steps; i += 1) {
    snaps.push(engine.step(dt));
  }
  return snaps;
}
