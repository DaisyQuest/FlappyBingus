import { BoundsHandler } from "./boundsHandler.js";

export function handleBounds(world, _dt, events) {
  if (!world?.state || !world?.config) throw new Error("World state and config required.");
  const player = world.state.player;
  const handler = new BoundsHandler(world.config.world);
  const bounces = handler.resolve(player);

  bounces.forEach((bounce) => {
    player.wallBounces += 1;
    events?.emit("dash:bounce", bounce);
  });
}
