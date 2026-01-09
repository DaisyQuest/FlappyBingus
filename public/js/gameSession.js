export function createGameSession({
  canvas,
  ctx,
  Input,
  Game,
  GameDriver,
  getBinds,
  getTrailId,
  getPipeTexture,
  playerImg,
  onGameOver,
  onActionQueued,
  skillSettings,
  setRandSource
} = {}) {
  const input = new Input(canvas, getBinds, (actionId) => {
    const cursor = { x: input.cursor.x, y: input.cursor.y, has: input.cursor.has };
    if (typeof onActionQueued === "function") {
      onActionQueued({ actionId, cursor });
    }
  });
  input.install();

  const replayIdleInput = {
    cursor: { x: 0, y: 0, has: false },
    _move: { dx: 0, dy: 0 },
    getMove() { return this._move; }
  };

  const buildGameInstance = ({ onGameOver: handler, input: gameInput }) => new Game({
    canvas,
    ctx,
    config: null,
    playerImg,
    input: gameInput,
    getTrailId,
    getPipeTexture,
    getBinds,
    onGameOver: handler
  });

  const game = buildGameInstance({ onGameOver, input });
  const replayGame = buildGameInstance({ onGameOver: () => {}, input: replayIdleInput });
  game.setSkillSettings(skillSettings);
  replayGame.setSkillSettings(skillSettings);

  const driver = new GameDriver({
    game,
    syncRandSource: setRandSource,
    captureSnapshots: false,
    mapState(engineState, g) {
      engineState.time = g.timeAlive ?? engineState.time;
      engineState.tick = (engineState.tick ?? 0) + 1;
      engineState.score = { ...(engineState.score || {}), total: g.score ?? 0 };
      engineState.player = { ...(engineState.player || {}), x: g.player?.x, y: g.player?.y, vx: g.player?.vx, vy: g.player?.vy };
    }
  });

  return {
    input,
    replayIdleInput,
    buildGameInstance,
    game,
    replayGame,
    driver
  };
}
