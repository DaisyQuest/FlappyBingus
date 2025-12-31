export function handleBounds(world, _dt, events) {
  if (!world?.state || !world?.config) throw new Error("World state and config required.");
  const player = world.state.player;
  const { width, height } = world.config.world;
  const bounces = [];

  if (player.x < 0) {
    player.x = 0;
    if (player.vx < 0) bounces.push({ axis: "x", side: "left" });
    player.vx = Math.abs(player.vx);
  }
  if (player.x > width) {
    player.x = width;
    if (player.vx > 0) bounces.push({ axis: "x", side: "right" });
    player.vx = -Math.abs(player.vx);
  }
  if (player.y < 0) {
    player.y = 0;
    if (player.vy < 0) bounces.push({ axis: "y", side: "top" });
    player.vy = Math.abs(player.vy);
  }
  if (player.y > height) {
    player.y = height;
    if (player.vy > 0) bounces.push({ axis: "y", side: "bottom" });
    player.vy = -Math.abs(player.vy);
  }

  bounces.forEach((bounce) => {
    player.wallBounces += 1;
    events?.emit("dash:bounce", bounce);
  });
}
