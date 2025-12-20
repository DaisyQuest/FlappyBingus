/**
 * Seedable, deterministic RNG utilities for headless/CI usage.
 * Default generator: mulberry32 for speed + reproducibility.
 */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed = 1) {
  const base = mulberry32(seed);
  return {
    seed,
    next: () => base(),
    int(min, max) {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      if (hi < lo) throw new Error(`Invalid int range: [${min}, ${max}]`);
      return Math.floor(base() * (hi - lo + 1)) + lo;
    },
    float(min, max) {
      if (max < min) throw new Error(`Invalid float range: [${min}, ${max}]`);
      return base() * (max - min) + min;
    }
  };
}
