import { clamp, lerp } from "./util.js";

const DEFAULT_LENIENCY = 0.10; // 10% forgiveness on the perfect window
const MIN_WINDOW = 3;

export function resolveGapPerfect({
  gate,
  game,
  playerAxis,
  prevPerpAxis,
  currPerpAxis,
  bonus = 0,
  flashDuration = 0.55,
  windowScale = 0.075,
  leniency = DEFAULT_LENIENCY,
  minWindow = MIN_WINDOW
}) {
  const gapHalf = gate?.gapHalf ?? 0;
  const safeWindowScale = clamp(Number(windowScale) || 0, 0, 1);
  const safeLeniency = Math.max(0, Number(leniency) || 0);
  const threshold = Math.max(minWindow, gapHalf * safeWindowScale) * (1 + safeLeniency);

  if (!gate || !game || gate.perfected) {
    return { crossed: false, perfect: false, awarded: false, threshold, distance: Infinity };
  }

  const crossed = gate.crossed(playerAxis, { allowCleared: true });
  if (!crossed) return { crossed: false, perfect: false, awarded: false, threshold, distance: Infinity };

  gate.cleared = true;

  const denom = gate.pos - gate.prev;
  const alpha = denom === 0 ? 0 : clamp((playerAxis - gate.prev) / denom, 0, 1);
  const perp = lerp(prevPerpAxis, currPerpAxis, alpha);
  const distance = Math.abs(perp - gate.gapCenter);
  const perfect = distance <= threshold;

  if (!perfect) {
    return { crossed: true, perfect: false, awarded: false, threshold, distance, alpha, perp };
  }

  const streak = (game.perfectCombo | 0) + 1;
  const pts = Math.max(0, bonus) * streak;

  gate.perfected = true;
  game.perfectCombo = streak;
  game.score = (game.score || 0) + pts;

  const fd = clamp(Number(flashDuration) || 0.55, 0.15, 2.0);
  game.perfectT = fd;
  game.perfectMax = fd;

  if (typeof game._perfectNiceSfx === "function") game._perfectNiceSfx();
  if (gate.gapId && game._gapMeta) {
    const meta = game._gapMeta.get(gate.gapId);
    if (meta) meta.perfected = true;
  }

  return { crossed: true, perfect: true, awarded: true, threshold, distance, streak, points: pts, alpha, perp };
}
