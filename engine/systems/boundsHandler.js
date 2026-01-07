export class BoundsHandler {
  constructor({ width, height } = {}) {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error("World bounds required.");
    }
    this.width = width;
    this.height = height;
  }

  resolve(player) {
    if (!player) throw new Error("Player required.");
    const bounces = [];

    if (player.x < 0) {
      player.x = 0;
      if (player.vx < 0) bounces.push({ axis: "x", side: "left" });
      player.vx = Math.abs(player.vx);
    }
    if (player.x > this.width) {
      player.x = this.width;
      if (player.vx > 0) bounces.push({ axis: "x", side: "right" });
      player.vx = -Math.abs(player.vx);
    }
    if (player.y < 0) {
      player.y = 0;
      if (player.vy < 0) bounces.push({ axis: "y", side: "top" });
      player.vy = Math.abs(player.vy);
    }
    if (player.y > this.height) {
      player.y = this.height;
      if (player.vy > 0) bounces.push({ axis: "y", side: "bottom" });
      player.vy = -Math.abs(player.vy);
    }

    return bounces;
  }
}
