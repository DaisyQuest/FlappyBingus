/**
 * Immutable snapshot helpers to avoid accidental mutation in tests.
 */
function deepClone(data) {
  if (typeof structuredClone === "function") return structuredClone(data);
  return JSON.parse(JSON.stringify(data));
}

function deepFreeze(obj) {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    Object.values(obj).forEach((value) => deepFreeze(value));
  }
  return obj;
}

export function makeSnapshot(state, events) {
  const snap = {
    state: deepClone(state),
    events: deepClone(events)
  };
  return deepFreeze(snap);
}
