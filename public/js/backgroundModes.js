import { clamp, getRandSource } from "./util.js";
import { createSpaceBackground, updateSpaceBackground } from "./spaceBackground.js";

const DEFAULT_BACKGROUND_COLOR = "#07101a";
const DEFAULT_MONOCHROME_COLOR = "#111827";

export function createProceduralBackground({ width, height, rand = getRandSource() } = {}) {
  const w = Math.max(1, width || 0);
  const h = Math.max(1, height || 0);
  const count = Math.floor(clamp((w * h) / 11000, 80, 220));
  const dots = [];
  for (let i = 0; i < count; i += 1) {
    dots.push({
      x: rand() * w,
      y: rand() * h,
      r: 0.8 + rand() * (2.2 - 0.8),
      s: 4 + rand() * (22 - 4)
    });
  }

  return {
    type: "procedural",
    dots,
    color: DEFAULT_BACKGROUND_COLOR,
    vignetteStrength: 0.44
  };
}

export function updateProceduralBackground(state, { width, height, dt, rand = getRandSource() } = {}) {
  if (!state?.dots) throw new Error("Procedural background state required.");
  const w = Math.max(1, width || 0);
  const h = Math.max(1, height || 0);
  const delta = Number(dt) || 0;
  for (const dot of state.dots) {
    dot.y += dot.s * delta;
    if (dot.y > h + 10) {
      dot.y = -10;
      dot.x = rand() * w;
    }
  }
}

export function createMonochromeBackground({ color = DEFAULT_MONOCHROME_COLOR } = {}) {
  return {
    type: "monochrome",
    color
  };
}

export function createVideoBackground({ src, loop = true, muted = true } = {}) {
  if (!src || typeof src !== "string") {
    throw new Error("Video source is required.");
  }
  return {
    type: "video",
    src,
    loop: !!loop,
    muted: !!muted
  };
}

export { createSpaceBackground, updateSpaceBackground };
