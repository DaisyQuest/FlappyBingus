// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tutorial } from "../tutorial.js";
import { Game, WORLD_HEIGHT, WORLD_WIDTH } from "../game.js";
import { DEFAULT_CONFIG } from "../config.js";
import { Input } from "../input.js";

beforeEach(() => {
  vi.spyOn(Game.prototype, "_initBackground").mockImplementation(() => {});
  vi.spyOn(Game.prototype, "_refreshBackgroundLayer").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const setupGame = () => {
  globalThis.window = {
    devicePixelRatio: 1,
    visualViewport: { width: 800, height: 600 },
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const gradient = { addColorStop: () => {} };
  const ctx = {
    setTransform: () => {},
    imageSmoothingEnabled: false,
    beginPath: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    moveTo: () => {},
    lineTo: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {}
  };
  const canvas = {
    style: {},
    width: 800,
    height: 600,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
  };
  const input = new Input(canvas, () => ({}));
  const game = new Game({
    canvas,
    ctx,
    config: structuredClone(DEFAULT_CONFIG),
    playerImg: { naturalWidth: 10, naturalHeight: 10 },
    input,
    getTrailId: () => "classic",
    getBinds: () => ({}),
    onGameOver: () => {}
  });
  game.resizeToWindow();
  return game;
};

const logicalToClient = (input, x, y) => {
  const view = input.view || { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT };
  const logicalW = Number.isFinite(input.logicalSize?.width) && input.logicalSize.width > 0 ? input.logicalSize.width : WORLD_WIDTH;
  const logicalH = Number.isFinite(input.logicalSize?.height) && input.logicalSize.height > 0 ? input.logicalSize.height : WORLD_HEIGHT;
  const nx = x / Math.max(1, logicalW);
  const ny = y / Math.max(1, logicalH);
  return {
    clientX: view.x + nx * view.width,
    clientY: view.y + ny * view.height
  };
};

const makeCtx = () => {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn()
  };
  return ctx;
};

const makeOverlayCtx = () => {
  const gradient = { addColorStop: vi.fn() };
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    measureText: vi.fn((text) => ({ width: String(text).length * 6 })),
  };
};

describe("Tutorial sequencing and dash destroy", () => {
  it("keeps teleport as phase 5 in the step order", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    const stepIds = tutorial._steps().map((step) => step.id);
    expect(stepIds).toEqual([
      "move",
      "orbs",
      "perfect",
      "skill_phase",
      "skill_teleport",
      "dash_destroy",
      "practice",
    ]);
  });

  it("teaches destroy dash and advances after a shatter", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();
    const idx = tutorial._steps().findIndex((s) => s.id === "dash_destroy");
    tutorial._enterStep(idx);

    expect(game.skillSettings.dashBehavior).toBe("destroy");
    expect(tutorial.allowAction("dash")).toBe(true);

    const spy = vi.spyOn(tutorial, "_nextStep");
    game.lastPipeShatter = { cause: "dashDestroy" };
    tutorial._stepDashDestroy(0.5);
    tutorial._stepDashDestroy(0.5);
    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("treats cleared destroy-dash pipes as progress to avoid soft locks", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const destroyIdx = tutorial._steps().findIndex((s) => s.id === "dash_destroy");
    tutorial._enterStep(destroyIdx);

    // Simulate the pipe disappearing (e.g., cleanup) before a shatter event.
    const spy = vi.spyOn(tutorial, "_nextStep");
    game.pipes.length = 0;
    tutorial._stepDashDestroy(0.4);
    tutorial._stepDashDestroy(0.6);

    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("boosts movement speed during the WASD step and restores it afterwards", () => {
    const game = setupGame();
    const origSpeed = game.cfg.player.maxSpeed;
    const origAccel = game.cfg.player.accel;
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start(); // lands on move

    expect(game.cfg.player.maxSpeed).toBeGreaterThan(origSpeed);
    expect(game.cfg.player.accel).toBeGreaterThan(origAccel);

    tutorial._enterStep(1); // move -> orbs
    expect(game.cfg.player.maxSpeed).toBe(origSpeed);
    expect(game.cfg.player.accel).toBe(origAccel);
    tutorial.stop();
  });
});

describe("Tutorial copy, guides, and overlay cues", () => {
  it("emits contextual copy for every step", () => {
    const game = setupGame();
    const tutorial = new Tutorial({
      game,
      input: game.input,
      getBinds: () => ({
        dash: { type: "key", code: "KeyV" },
        phase: { type: "key", code: "KeyQ" },
        teleport: { type: "mouse", button: 2 }
      }),
      onExit: () => {}
    });
    tutorial.start();

    const copyFor = (id) => {
      tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === id));
      return tutorial._uiCopy();
    };

    expect(copyFor("move").title).toContain("Movement");
    expect(copyFor("orbs").objective).toContain("Collect 5 orbs");
    expect(copyFor("perfect").body).toContain("dashed line");
    expect(copyFor("skill_phase").hotkey.label).toBeTruthy();
    expect(copyFor("dash_destroy").body).toContain("smashes");
    expect(copyFor("skill_teleport").hotkey.label).toBeTruthy();
    expect(copyFor("practice").hotkey.label).toContain("Enter");
    tutorial.stop();
  });

  it("uses the bound hotkeys for each ability prompt", () => {
    const game = setupGame();
    const tutorial = new Tutorial({
      game,
      input: game.input,
      getBinds: () => ({
        dash: { type: "key", code: "Space" },
        phase: { type: "mouse", button: 2 },
        teleport: { type: "mouse", button: 0 }
      }),
      onExit: () => {}
    });
    tutorial.start();

    const copyFor = (id) => {
      tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === id));
      return tutorial._uiCopy();
    };

    expect(copyFor("skill_phase").hotkey.label).toBe("RMB");
    expect(copyFor("dash_destroy").hotkey.label).toBe("Space");
    expect(copyFor("skill_teleport").hotkey.label).toBe("LMB");
    tutorial.stop();
  });

  it("allows every tutorial step to complete when success conditions are met", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const advance = vi.spyOn(tutorial, "_nextStep");
    const completeStep = (id, fn) => {
      tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === id));
      fn();
      expect(advance).toHaveBeenCalled();
      advance.mockClear();
    };

    completeStep("move", () => {
      tutorial.game.player.x = tutorial._moveTarget.x;
      tutorial.game.player.y = tutorial._moveTarget.y;
      tutorial._stepMove(0.1);
    });

    completeStep("orbs", () => {
      tutorial.game.combo = 5;
      tutorial._stepOrbs(0.1);
    });

    completeStep("perfect", () => {
      tutorial.game.perfectT = 1;
      tutorial._prevPerfectT = 0;
      tutorial._stepPerfect(0.1);
      tutorial.game.perfectT = 1;
      tutorial._prevPerfectT = 0;
      tutorial._stepPerfect(0.1);
      tutorial._stepPerfect(1.0);
    });

    completeStep("skill_phase", () => {
      tutorial._spawnPhaseScenario();
      tutorial.game.player.invT = 1;
      tutorial._phaseWall.x = tutorial.game.player.x + tutorial.game.player.r + 8;
      tutorial._stepSkillPhase(0.1);
      tutorial._stepSkillPhase(1.0);
    });

    completeStep("skill_teleport", () => {
      tutorial._spawnTeleportScenario();
      tutorial._teleUsed = true;
      tutorial.game.player.x = tutorial._teleTarget.x;
      tutorial.game.player.y = tutorial._teleTarget.y;
      tutorial._stepSkillTeleport();
    });

    completeStep("dash_destroy", () => {
      tutorial._spawnDashDestroyScenario();
      tutorial.game.lastPipeShatter = { cause: "dashDestroy" };
      tutorial._stepDashDestroy(0.1);
      tutorial._stepDashDestroy(1.0);
    });

    tutorial.stop();
  });

  it("exits practice mode with Enter once the tutorial is complete", () => {
    const game = setupGame();
    const onExit = vi.fn();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit });
    tutorial.start();

    tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === "practice"));
    tutorial._boundKeyDown({ code: "Enter", preventDefault: vi.fn() });

    expect(onExit).toHaveBeenCalled();
    expect(tutorial.active).toBe(false);
  });

  it("renders visual guides for multiple tutorial steps", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const runGuides = (id) => {
      tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === id));
      if (id === "skill_teleport") {
        tutorial._spawnTeleportScenario();
      }
      const ctx = makeCtx();
      tutorial._renderGuides(ctx, { panel: { y: 20, h: 40 } });
      return ctx;
    };

    expect(runGuides("move").arc).toHaveBeenCalled();
    const perfectCtx = runGuides("perfect");
    expect(perfectCtx.setLineDash).toHaveBeenCalledWith([10, 10]);

    expect(runGuides("skill_teleport").fill).toHaveBeenCalled();
    tutorial.stop();
  });

  it("renders flash text near the top-middle of the screen", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    tutorial._msgFlash = "Try again — you've got this.";
    tutorial._msgFlashT = 1;
    const ctx = makeOverlayCtx();
    tutorial.renderOverlay(ctx);

    const flashCall = ctx.fillText.mock.calls.find(([text]) => text === tutorial._msgFlash);
    expect(flashCall).toBeTruthy();
    const [, x, y] = flashCall;
    expect(x).toBeCloseTo(game.W * 0.5, 1);
    expect(y).toBeGreaterThanOrEqual(32);
    expect(y).toBeLessThan(game.H * 0.3);
    tutorial.stop();
  });

  it("allows stage navigation via tutorial buttons", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    tutorial._enterStep(1);
    tutorial._navButtons = {
      prev: { x: 10, y: 10, w: 40, h: 30 },
      next: { x: 60, y: 10, w: 40, h: 30 }
    };

    const spy = vi.spyOn(tutorial, "_enterStep");
    const backEvent = {
      ...logicalToClient(game.input, 15, 15),
      target: game.canvas,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };
    tutorial._boundPointerDown(backEvent);

    expect(backEvent.preventDefault).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(0);

    spy.mockClear();
    tutorial._stepIndex = 0;
    tutorial._navButtons = {
      prev: null,
      next: { x: 60, y: 10, w: 40, h: 30 }
    };
    const nextEvent = {
      ...logicalToClient(game.input, 70, 15),
      target: game.canvas,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };
    tutorial._boundPointerDown(nextEvent);
    expect(spy).toHaveBeenCalledWith(1);
    tutorial.stop();
  });

  it("renders a compact tutorial bubble with the dash behavior note", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const idx = tutorial._steps().findIndex((s) => s.id === "dash_destroy");
    tutorial._enterStep(idx);

    const ctx = makeOverlayCtx();
    tutorial.renderOverlay(ctx);

    const hasDashNote = ctx.fillText.mock.calls.some(([text]) =>
      String(text).includes("Change Dash behavior in the settings menu!")
    );
    expect(hasDashNote).toBe(true);

    ctx.fillText.mockClear();
    tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === "move"));
    tutorial.renderOverlay(ctx);

    const hasNoteAfterMove = ctx.fillText.mock.calls.some(([text]) =>
      String(text).includes("Change Dash behavior in the settings menu!")
    );
    expect(hasNoteAfterMove).toBe(false);
    tutorial.stop();
  });

  it("hard-clears the world and cooldowns between steps", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    game.pipes.push({}); game.gates.push({}); game.orbs.push({}); game.parts.push({}); game.floats.push({});
    game.slowField = { active: true };
    game.cds = { dash: 5, phase: 4, teleport: 3, slowField: 2 };
    game.player = { invT: 3, dashT: 2 };

    tutorial._hardClearWorld();

    expect(game.pipes).toHaveLength(0);
    expect(game.gates).toHaveLength(0);
    expect(game.orbs).toHaveLength(0);
    expect(game.parts).toHaveLength(0);
    expect(game.floats).toHaveLength(0);
    expect(game.slowField).toBeNull();
    expect(game.cds).toEqual({ dash: 0, phase: 0, teleport: 0, slowField: 0 });
    expect(game.player.invT).toBe(0);
    expect(game.player.dashT).toBe(0);
    tutorial.stop();
  });
});
