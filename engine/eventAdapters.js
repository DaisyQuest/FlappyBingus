const DEFAULT_PLAYER_ID = "player-1";
const SUPPRESSED_RESULTS = new Set(["cooldown", "failed"]);
const SCORE_EVENT_MAP = {
  "score:orb": { type: "anim:orbPickup", scoreType: "orb", scoreKey: "orbs" },
  "score:perfect": { type: "anim:perfectGap", scoreType: "perfect", scoreKey: "perfect" }
};

function shouldSuppress(entry) {
  const payload = entry?.payload;
  if (!payload || typeof payload !== "object") return false;
  if (payload.success === false) return true;
  if (payload.result && SUPPRESSED_RESULTS.has(payload.result)) return true;
  if (payload.cooldown === true) return true;
  return false;
}

function resolvePlayerId(state) {
  return state?.player?.id ?? DEFAULT_PLAYER_ID;
}

function scoreDelta(payload) {
  if (!payload || typeof payload !== "object") return 1;
  if (Number.isFinite(payload.value)) return payload.value;
  if (Number.isFinite(payload.delta)) return payload.delta;
  return 1;
}

function buildBasePayload({ entry, state, skillId }) {
  const payload = {
    time: entry.time ?? 0,
    playerId: resolvePlayerId(state),
    skillId
  };
  if (entry?.payload?.combo !== undefined) payload.combo = entry.payload.combo;
  if (entry?.payload?.comboIndex !== undefined) payload.comboIndex = entry.payload.comboIndex;
  if (entry?.payload?.multiplier !== undefined) payload.multiplier = entry.payload.multiplier;
  return payload;
}

function deriveScorePayload({ entry, state, skillId, scoreType, scoreKey }) {
  const payload = buildBasePayload({ entry, state, skillId });
  payload.score = {
    type: scoreType,
    delta: scoreDelta(entry.payload),
    total: Number.isFinite(state?.score?.[scoreKey]) ? state.score[scoreKey] : null
  };
  return payload;
}

function resolveTeleportVariant(entry) {
  const payload = entry?.payload ?? {};
  if (payload.variant) return payload.variant;
  if (payload.behavior) return payload.behavior;
  if (entry.type === "ability:teleport:explode") return "explode";
  if (entry.type === "ability:teleport:normal") return "normal";
  return "normal";
}

export function createAnimationEventAdapter() {
  const seenTriggerIds = new Set();

  return (entry, context = {}) => {
    if (!entry || !entry.type || entry.type.startsWith("anim:")) return [];
    if (shouldSuppress(entry)) return [];

    const state = context.state;
    const triggerId = entry?.payload?.triggerId;
    const trackKey = triggerId ? `${entry.type}:${triggerId}` : null;
    if (trackKey && seenTriggerIds.has(trackKey)) return [];
    if (trackKey) seenTriggerIds.add(trackKey);

    if (SCORE_EVENT_MAP[entry.type]) {
      const { type, scoreType, scoreKey } = SCORE_EVENT_MAP[entry.type];
      return [
        {
          type,
          payload: deriveScorePayload({ entry, state, skillId: null, scoreType, scoreKey }),
          meta: { derivedFrom: entry.type }
        }
      ];
    }

    if (entry.type === "dash:start") {
      const payload = buildBasePayload({ entry, state, skillId: "dash" });
      if (entry.payload?.direction) payload.direction = entry.payload.direction;
      return [{ type: "anim:dash", payload, meta: { derivedFrom: entry.type } }];
    }

    if (entry.type === "ability:phase:start") {
      const payload = buildBasePayload({ entry, state, skillId: "phase" });
      return [{ type: "anim:phase", payload, meta: { derivedFrom: entry.type } }];
    }

    if (entry.type.startsWith("ability:teleport")) {
      const variant = resolveTeleportVariant(entry);
      const animType = variant === "explode" ? "anim:explode" : "anim:teleport";
      const payload = buildBasePayload({ entry, state, skillId: "teleport" });
      payload.variant = variant;
      return [{ type: animType, payload, meta: { derivedFrom: entry.type } }];
    }

    return [];
  };
}
