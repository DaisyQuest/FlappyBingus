export function mapGameDriverState(engineState, game) {
  engineState.time = game.timeAlive ?? engineState.time;
  engineState.tick = (engineState.tick ?? 0) + 1;
  engineState.score = { ...(engineState.score || {}), total: game.score ?? 0 };
  engineState.player = {
    ...(engineState.player || {}),
    x: game.player?.x,
    y: game.player?.y,
    vx: game.player?.vx,
    vy: game.player?.vy
  };
}
