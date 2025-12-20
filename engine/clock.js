/**
 * Fixed clock for deterministic stepping. Consumers advance manually.
 */
export function createFixedClock(startMs = 0) {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms) => {
      if (ms < 0) throw new Error("Clock cannot advance by a negative delta.");
      now += ms;
      return now;
    }
  };
}
