const DASH_DIRECTIONS = {
  right: [1, 0],
  left: [-1, 0],
  up: [0, -1],
  down: [0, 1]
};

export function applyAction({ state, config, events }, action, payload = {}) {
  if (!state || !config) throw new Error("Missing world state or config.");
  const player = state.player;
  switch (action) {
    case "jump": {
      player.vy = -config.jumpImpulse;
      events?.emit("player:jump", { vy: player.vy }, { action });
      break;
    }
    case "dash": {
      const direction = payload.direction || "right";
      const vec = DASH_DIRECTIONS[direction];
      if (!vec) throw new Error(`Unsupported dash direction "${direction}".`);
      player.dash = { active: true, time: config.dashDuration, direction };
      player.vx = vec[0] * config.dashSpeed;
      player.vy = vec[1] * config.dashSpeed;
      events?.emit("dash:start", { direction }, { action });
      break;
    }
    case "phase": {
      player.invulnerable = true;
      player.invulnTime = config.phaseDuration;
      events?.emit("ability:phase:start", {}, { action });
      break;
    }
    default:
      throw new Error(`Unknown action "${action}".`);
  }
}

export function getDashDirections() {
  return Object.fromEntries(Object.entries(DASH_DIRECTIONS).map(([key, value]) => [key, [...value]]));
}
