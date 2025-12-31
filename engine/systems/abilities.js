export function tickAbilities(world, dt, events) {
  if (!world?.state) throw new Error("World state required.");
  const player = world.state.player;

  if (player.dash.active) {
    player.dash.time = Math.max(0, player.dash.time - dt);
    if (player.dash.time === 0) {
      player.dash.active = false;
      events?.emit("dash:end", { direction: player.dash.direction });
    }
  }

  if (player.invulnerable) {
    player.invulnTime = Math.max(0, player.invulnTime - dt);
    if (player.invulnTime === 0) {
      player.invulnerable = false;
      events?.emit("ability:phase:end", {});
    }
  }
}
