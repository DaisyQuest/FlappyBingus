/**
 * Lightweight assertion helpers for headless scenario validation.
 * Each helper returns a result object instead of throwing so tests
 * can aggregate multiple outcomes.
 */
export function expectClose({ actual, expected, tolerance = 1e-3, label = "value" }) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  return {
    pass,
    message: pass
      ? `${label} within tolerance (${tolerance}).`
      : `${label} off by ${diff} (expected ${expected}, got ${actual}).`
  };
}

export function expectDelta({ before, after, key, expected }) {
  if (!(key in before) || !(key in after)) {
    return { pass: false, message: `Key "${key}" missing in snapshots.` };
  }
  const delta = after[key] - before[key];
  const pass = Math.abs(delta - expected) < 1e-9;
  return {
    pass,
    message: pass ? `Delta for ${key} matched (${expected}).` : `Delta for ${key} was ${delta} (expected ${expected}).`
  };
}

export function expectEventOrder(events, types) {
  let idx = 0;
  for (const ev of events) {
    if (ev.type === types[idx]) idx += 1;
    if (idx === types.length) break;
  }
  const pass = idx === types.length;
  return {
    pass,
    message: pass ? "Events appeared in order." : `Missing expected sequence: ${types.join(" -> ")}`
  };
}

export function summarizeResults(results) {
  const failures = results.filter((r) => !r.pass);
  return {
    pass: failures.length === 0,
    failures
  };
}
