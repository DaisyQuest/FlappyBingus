export function applyPhysics(world, dt) {
  if (!world?.state || !world?.config) throw new Error("World state and config required.");
  const player = world.state.player;
  const { gravity, maxFallSpeed } = world.config;

  if (!player.dash.active) {
    player.vy = Math.min(maxFallSpeed, player.vy + gravity * dt);
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
}
