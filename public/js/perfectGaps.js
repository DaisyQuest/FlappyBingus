import { clamp } from "./util.js";

const DEFAULT_LENIENCY = 0.10; // 10% forgiveness on the perfect window
const MIN_WINDOW = 3;

export function getPerfectGapThreshold({
  gate,
  windowScale = 0.075,
  leniency = DEFAULT_LENIENCY,
  minWindow = MIN_WINDOW
} = {}) {
  const gapHalf = gate?.gapHalf ?? 0;
  const safeWindowScale = clamp(Number(windowScale) || 0, 0, 1);
  const safeLeniency = Math.max(0, Number(leniency) || 0);
  return Math.max(minWindow, gapHalf * safeWindowScale) * (1 + safeLeniency);
}

export function resolvePerfectGapAlignment({
  gate,
  perpAxis,
  windowScale,
  leniency,
  minWindow
} = {}) {
  const threshold = getPerfectGapThreshold({ gate, windowScale, leniency, minWindow });
  const safePerp = Number(perpAxis);
  if (!gate || !Number.isFinite(safePerp)) {
    return { aligned: false, threshold, distance: Infinity };
  }
  const distance = Math.abs(safePerp - gate.gapCenter);
  return { aligned: distance <= threshold, threshold, distance };
}

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
  const threshold = getPerfectGapThreshold({ gate, windowScale, leniency, minWindow });

  if (!gate || !game || gate.perfected) {
    return { crossed: false, perfect: false, awarded: false, threshold, distance: Infinity };
  }

  const safePlayerAxis = Number(playerAxis);
  if (!gate.entered || !Number.isFinite(safePlayerAxis)) {
    return { crossed: false, perfect: false, awarded: false, threshold, distance: Infinity };
  }

  const gateHalf = (Number(gate.thick) || 0) * 0.5;
  const minAxis = Math.min(gate.prev, gate.pos) - gateHalf;
  const maxAxis = Math.max(gate.prev, gate.pos) + gateHalf;
  const crossed = safePlayerAxis >= minAxis && safePlayerAxis <= maxAxis;
  if (!crossed) return { crossed: false, perfect: false, awarded: false, threshold, distance: Infinity };

  gate.cleared = true;

  const safePrevPerp = Number(prevPerpAxis);
  const safeCurrPerp = Number(currPerpAxis);
  if (!Number.isFinite(safePrevPerp) || !Number.isFinite(safeCurrPerp)) {
    return { crossed: true, perfect: false, awarded: false, threshold, distance: Infinity };
  }

  const minPerp = Math.min(safePrevPerp, safeCurrPerp);
  const maxPerp = Math.max(safePrevPerp, safeCurrPerp);
  const perp =
    gate.gapCenter >= minPerp && gate.gapCenter <= maxPerp
      ? gate.gapCenter
      : Math.abs(safePrevPerp - gate.gapCenter) <= Math.abs(safeCurrPerp - gate.gapCenter)
        ? safePrevPerp
        : safeCurrPerp;
  const distance = Math.abs(perp - gate.gapCenter);
  const perfect = distance <= threshold;

  if (!perfect) {
    return { crossed: true, perfect: false, awarded: false, threshold, distance, perp };
  }

  const streak = (game.perfectCombo | 0) + 1;
  const pts = Math.max(0, bonus) * streak;

  gate.perfected = true;
  game.perfectCombo = streak;
  if (typeof game._recordPerfectCombo === "function") {
    game._recordPerfectCombo(streak);
  }
  const awardScore =
    typeof game?._recordPerfectScore === "function"
      ? (amount) => game._recordPerfectScore(amount)
      : (amount) => {
          game.score = (game.score || 0) + amount;
          if (game.runStats) game.runStats.perfects = (game.runStats.perfects || 0) + 1;
        };
  awardScore(pts);

  const fd = clamp(Number(flashDuration) || 0.55, 0.15, 2.0);
  game.perfectT = fd;
  game.perfectMax = fd;

  if (typeof game._perfectNiceSfx === "function") game._perfectNiceSfx();
  if (gate.gapId && game._gapMeta) {
    const meta = game._gapMeta.get(gate.gapId);
    if (meta) meta.perfected = true;
  }

  return { crossed: true, perfect: true, awarded: true, threshold, distance, streak, points: pts, perp };
}
