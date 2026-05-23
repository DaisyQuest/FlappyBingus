import { describe, it, expect, vi } from "vitest";
import { createGameSession } from "../gameSession.js";

describe("gameSession", () => {
  it("creates input, games, and driver", () => {
    const install = vi.fn();
    class FakeInput {
      constructor(canvas, getBinds, onAction) {
        this.canvas = canvas;
        this.getBinds = getBinds;
        this.onAction = onAction;
        this.cursor = { x: 3, y: 4, has: true };
      }
      install() {
        install();
      }
      trigger(actionId) {
        this.onAction(actionId);
      }
    }

    const setSkillSettings = vi.fn();
    class FakeGame {
      constructor(opts) {
        this.opts = opts;
        this.player = { x: 1, y: 2, vx: 3, vy: 4 };
        this.score = 5;
        this.timeAlive = 1;
      }
      setSkillSettings(value) {
        setSkillSettings(value);
      }
    }

    class FakeDriver {
      constructor(opts) {
        this.opts = opts;
      }
    }

    const onActionQueued = vi.fn();
    const session = createGameSession({
      canvas: { id: "canvas" },
      ctx: { id: "ctx" },
      Input: FakeInput,
      Game: FakeGame,
      GameDriver: FakeDriver,
      getBinds: () => ({ bind: true }),
      getTrailId: () => "classic",
      getPipeTexture: () => ({ id: "pipe", mode: "mode" }),
      playerImg: { id: "player" },
      onGameOver: () => {},
      onActionQueued,
      skillSettings: { simpleParticles: true },
      setRandSource: vi.fn()
    });

    expect(install).toHaveBeenCalled();
    expect(setSkillSettings).toHaveBeenCalled();
    session.input.trigger("dash");
    expect(onActionQueued).toHaveBeenCalledWith({
      actionId: "dash",
      cursor: { x: 3, y: 4, has: true }
    });

    const engineState = {};
    session.driver.opts.mapState(engineState, session.game);
    expect(engineState.score.total).toBe(5);
  });
});
