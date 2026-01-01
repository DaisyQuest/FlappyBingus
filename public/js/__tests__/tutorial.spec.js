// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tutorial } from "../tutorial.js";
import { Game, WORLD_HEIGHT, WORLD_WIDTH } from "../game.js";
import { DEFAULT_CONFIG } from "../config.js";

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
  const game = new Game({
    canvas,
    ctx,
    config: structuredClone(DEFAULT_CONFIG),
    playerImg: { naturalWidth: 10, naturalHeight: 10 },
    input: { getMove: () => ({ dx: 0, dy: 0 }), cursor: { has: false } },
    getTrailId: () => "classic",
    getBinds: () => ({}),
    onGameOver: () => {}
  });
  game.resizeToWindow();
  return game;
};

const logicalToClient = (canvas, x, y) => {
  const rect = canvas.getBoundingClientRect();
  const view = canvas._view || { x: 0, y: 0, width: rect.width, height: rect.height };
  const nx = x / Math.max(1, canvas._logicalW || WORLD_WIDTH);
  const ny = y / Math.max(1, canvas._logicalH || WORLD_HEIGHT);
  return {
    clientX: rect.left + view.x + nx * view.width,
    clientY: rect.top + view.y + ny * view.height
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

describe("Tutorial skill variants", () => {
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

  it("teaches explosive slow field clearing clusters", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();
    const idx = tutorial._steps().findIndex((s) => s.id === "slow_explosion");
    tutorial._enterStep(idx);

    expect(game.skillSettings.slowFieldBehavior).toBe("explosion");
    const spy = vi.spyOn(tutorial, "_nextStep");
    tutorial._slowExplosionCleared = true;
    tutorial._surviveT = 0.2;
    tutorial._stepSlowExplosion(0.25);
    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("forces ricochet dash during the bounce lesson even if the player prefers destroy", () => {
    const game = setupGame();
    game.setSkillSettings({ dashBehavior: "destroy", slowFieldBehavior: "slow" });
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    expect(game.skillSettings.dashBehavior).toBe("ricochet");

    tutorial._nextStep(); // moves into skill_teleport
    expect(game.skillSettings.dashBehavior).toBe("destroy");
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

  it("enforces the slow-field variant even if the player prefers explosions", () => {
    const game = setupGame();
    game.setSkillSettings({ slowFieldBehavior: "explosion" });
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const slowIdx = tutorial._steps().findIndex((s) => s.id === "skill_slow");
    tutorial._enterStep(slowIdx);

    expect(game.skillSettings.slowFieldBehavior).toBe("slow");

    const explosionIdx = tutorial._steps().findIndex((s) => s.id === "slow_explosion");
    tutorial._enterStep(explosionIdx);
    expect(game.skillSettings.slowFieldBehavior).toBe("explosion");
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

  it("spawns a stationary 90° corner for the bounce lesson", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    expect(tutorial._reflectWalls).toHaveLength(2);
    const horiz = tutorial._reflectWalls.find(({ pipe }) => pipe.w > pipe.h)?.pipe;
    const vert = tutorial._reflectWalls.find(({ pipe }) => pipe.h > pipe.w)?.pipe;
    expect(horiz?.vy).toBe(0);
    expect(vert?.vx).toBe(0);
    expect(vert?.x).toBeCloseTo((horiz?.x || 0) + (horiz?.w || 0) - (vert?.w || 0));
    expect(vert?.y).toBeCloseTo(horiz?.y || 0);
    tutorial.stop();
  });

  it("advances only after two unique wall bounces during the same dash", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    const first = tutorial._reflectWalls[0].pipe;
    const second = tutorial._reflectWalls[1].pipe;
    const bounce = (pipe, serial, count) => {
      tutorial.game.lastDashReflect = { x: pipe.x + pipe.w * 0.5, y: pipe.y + pipe.h * 0.5, serial, count };
      tutorial._stepDashReflect(0.016);
    };

    const spy = vi.spyOn(tutorial, "_nextStep");
    bounce(first, 1, 1);
    expect(tutorial._reflectHitsThisDash).toBe(1);
    expect(tutorial._reflectSuccessDelay).toBe(0);

    bounce(second, 2, 2);
    expect(tutorial._reflectHitsThisDash).toBe(2);
    expect(tutorial._reflectSuccessDelay).toBeGreaterThan(0);
    tutorial._stepDashReflect(1.0);
    expect(spy).toHaveBeenCalled();
    tutorial.stop();
  });

  it("resets bounce tracking when a new dash starts", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const reflectIdx = tutorial._steps().findIndex((s) => s.id === "dash_reflect");
    tutorial._enterStep(reflectIdx);

    const first = tutorial._reflectWalls[0].pipe;
    const bounce = (pipe, serial, count) => {
      tutorial.game.lastDashReflect = { x: pipe.x + pipe.w * 0.5, y: pipe.y + pipe.h * 0.5, serial, count };
      tutorial._stepDashReflect(0.016);
    };

    bounce(first, 1, 1);
    expect(tutorial._reflectHitsThisDash).toBe(1);

    // New dash = bounce count resets to 1, which should clear prior hits.
    bounce(first, 2, 1);
    expect(tutorial._reflectHitsThisDash).toBe(1);
    expect(tutorial._reflectWallsHit.size).toBe(1);
    expect(tutorial._reflectSuccessDelay).toBe(0);
    tutorial.stop();
  });
});

describe("Tutorial copy, guides, and slow-field flows", () => {
  it("emits contextual copy for every step", () => {
    const game = setupGame();
    const tutorial = new Tutorial({
      game,
      input: game.input,
      getBinds: () => ({
        dash: { type: "key", code: "KeyV" },
        phase: { type: "key", code: "KeyQ" },
        teleport: { type: "mouse", button: 2 },
        slowField: { type: "key", code: "KeyE" }
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
    expect(copyFor("skill_dash").objective).toContain("Dash");
    expect(copyFor("dash_destroy").body).toContain("smashes");
    expect(copyFor("skill_teleport").hotkey.label).toBeTruthy();
    expect(copyFor("skill_slow").title).toContain("Slow Field");
    expect(copyFor("slow_explosion").objective).toContain("explosive");
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
        teleport: { type: "mouse", button: 0 },
        slowField: { type: "key", code: "KeyE" }
      }),
      onExit: () => {}
    });
    tutorial.start();

    const copyFor = (id) => {
      tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === id));
      return tutorial._uiCopy();
    };

    expect(copyFor("skill_phase").hotkey.label).toBe("RMB");
    expect(copyFor("skill_dash").hotkey.label).toBe("Space");
    expect(copyFor("skill_teleport").hotkey.label).toBe("LMB");
    expect(copyFor("skill_slow").hotkey.label).toBe("E");
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

    completeStep("skill_dash", () => {
      tutorial._spawnDashScenario();
      tutorial.game.player.dashT = 1;
      tutorial.game.player.x = tutorial._dashTarget.x;
      tutorial.game.player.y = tutorial._dashTarget.y;
      tutorial._stepSkillDash(0.1);
      tutorial._stepSkillDash(1.0);
    });

    completeStep("dash_destroy", () => {
      tutorial._spawnDashDestroyScenario();
      tutorial.game.lastPipeShatter = { cause: "dashDestroy" };
      tutorial._stepDashDestroy(0.1);
      tutorial._stepDashDestroy(1.0);
    });

    completeStep("dash_reflect", () => {
      tutorial._spawnDashReflectScenario();
      tutorial._reflectSuccessDelay = 0.1;
      tutorial._stepDashReflect(0.2);
    });

    completeStep("skill_teleport", () => {
      tutorial._spawnTeleportScenario();
      tutorial._teleUsed = true;
      tutorial.game.player.x = tutorial._teleTarget.x;
      tutorial.game.player.y = tutorial._teleTarget.y;
      tutorial._stepSkillTeleport();
    });

    completeStep("skill_slow", () => {
      tutorial.game.slowField = {};
      tutorial._stepSkillSlow(0.1);
      tutorial._stepSkillSlow(3.0);
    });

    completeStep("slow_explosion", () => {
      tutorial._spawnSlowExplosionScenario();
      tutorial.game.lastSlowBlast = { happened: true };
      tutorial._stepSlowExplosion(0.1);
      tutorial.game.pipes = [];
      tutorial._stepSlowExplosion(0.1);
      tutorial._stepSlowExplosion(1.0);
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

  it("walks through the slow-field survival and completion flow", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();
    tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === "skill_slow"));

    const flash = vi.spyOn(tutorial, "_flash");
    const spawnBurst = vi.spyOn(tutorial, "_spawnSlowBurst").mockImplementation(() => {});
    const advance = vi.spyOn(tutorial, "_nextStep");

    tutorial.game.slowField = {};
    tutorial._stepSkillSlow(0.1);
    expect(tutorial._slowUsed).toBe(true);
    expect(spawnBurst).toHaveBeenCalled();
    expect(flash).toHaveBeenCalled();

    tutorial._stepSkillSlow(3.0);
    expect(advance).toHaveBeenCalled();
    tutorial.stop();
  });

  it("waits for explosion clears before advancing the explosive slow-field step", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();
    tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === "slow_explosion"));

    const advance = vi.spyOn(tutorial, "_nextStep");
    tutorial.game.lastSlowBlast = { happened: true };
    tutorial._stepSlowExplosion(0.1);
    expect(tutorial._slowUsed).toBe(true);

    tutorial.game.pipes = [];
    tutorial._stepSlowExplosion(0.1);
    expect(tutorial._slowExplosionCleared).toBe(true);

    tutorial._stepSlowExplosion(1.0);
    expect(advance).toHaveBeenCalled();
    tutorial.stop();
  });

  it("renders visual guides for multiple tutorial steps", () => {
    const game = setupGame();
    const tutorial = new Tutorial({ game, input: game.input, getBinds: () => ({}), onExit: () => {} });
    tutorial.start();

    const runGuides = (id) => {
      tutorial._enterStep(tutorial._steps().findIndex((s) => s.id === id));
      if (id === "skill_dash") {
        tutorial._spawnDashScenario();
      } else if (id === "skill_teleport") {
        tutorial._spawnTeleportScenario();
      }
      const ctx = makeCtx();
      tutorial._renderGuides(ctx, { panel: { y: 20, h: 40 } });
      return ctx;
    };

    expect(runGuides("move").arc).toHaveBeenCalled();
    const perfectCtx = runGuides("perfect");
    expect(perfectCtx.setLineDash).toHaveBeenCalledWith([10, 10]);

    const dashCtx = runGuides("skill_dash");
    expect(dashCtx.fillText).toHaveBeenCalled();

    const reflectCtx = runGuides("dash_reflect");
    expect(reflectCtx.strokeRect).toHaveBeenCalledTimes(2);

    expect(runGuides("skill_teleport").fill).toHaveBeenCalled();
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
      ...logicalToClient(game.canvas, 15, 15),
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
      ...logicalToClient(game.canvas, 70, 15),
      target: game.canvas,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };
    tutorial._boundPointerDown(nextEvent);
    expect(spy).toHaveBeenCalledWith(1);
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
