const DEFAULT_CONFIG = {
  gravity: 1200,
  jumpImpulse: 420,
  dashSpeed: 800,
  dashDuration: 0.2,
  phaseDuration: 0.35,
  maxFallSpeed: 900,
  world: { width: 300, height: 300 },
  eventBufferSize: 500
};

export function resolveWorldConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    world: { ...DEFAULT_CONFIG.world, ...(config.world || {}) }
  };
}

export function createWorld({ seed = 1, config = {} } = {}) {
  const resolvedConfig = resolveWorldConfig(config);
  return {
    config: resolvedConfig,
    state: {
      tick: 0,
      time: 0,
      meta: { seed },
      player: {
        x: resolvedConfig.world.width * 0.5,
        y: resolvedConfig.world.height * 0.5,
        vx: 0,
        vy: 0,
        dash: { active: false, time: 0, direction: null },
        invulnerable: false,
        invulnTime: 0,
        wallBounces: 0
      },
      score: { orbs: 0, time: 0, perfect: 0 }
    }
  };
}
