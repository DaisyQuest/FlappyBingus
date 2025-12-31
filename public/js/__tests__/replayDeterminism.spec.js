// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { Game } from "../game.js";
import { DEFAULT_CONFIG } from "../config.js";
import { createReplayManager, cloneReplayRun } from "../replayManager.js";
import { playbackTicks, playbackTicksDeterministic, __testables as replayTestables } from "../replayUtils.js";
import {
  createTapeRandRecorder,
  createTapeRandPlayer,
  createSeededRand,
  setRandSource
} from "../util.js";

vi.mock("../audio.js", () => ({
  sfxOrbBoop: vi.fn(),
  sfxPerfectNice: vi.fn(),
  sfxDashStart: vi.fn(),
  sfxDashBounce: vi.fn(),
  sfxDashDestroy: vi.fn(),
  sfxDashBreak: vi.fn(),
  sfxTeleport: vi.fn(),
  sfxPhase: vi.fn(),
  sfxExplosion: vi.fn(),
  sfxGameOver: vi.fn(),
  sfxSlowField: vi.fn(),
  sfxSlowExplosion: vi.fn()
}));

const SIM_DT = 1 / 120;

function makeClassList() {
  const classes = new Set();
  return {
    add: vi.fn((name) => classes.add(name)),
    remove: vi.fn((name) => classes.delete(name)),
    contains: (name) => classes.has(name)
  };
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (!value || typeof value !== "object") return value;
  if (typeof value.__gradientId === "number") return { gradientId: value.__gradientId };
  if (value.__assetId) return { assetId: value.__assetId };
  return { type: value.constructor?.name || "Object" };
}

function createRecordingContext() {
  const ops = [];
  let gradientIndex = 0;

  const record = (entry) => ops.push(entry);

  const makeGradient = () => {
    const gradient = { __gradientId: gradientIndex++ };
    gradient.addColorStop = (offset, color) => {
      record({ type: "gradientStop", id: gradient.__gradientId, offset, color });
    };
    return gradient;
  };

  const ctx = {
    setTransform: (...args) => record({ type: "call", name: "setTransform", args: args.map(normalizeValue) }),
    clearRect: (...args) => record({ type: "call", name: "clearRect", args: args.map(normalizeValue) }),
    fillRect: (...args) => record({ type: "call", name: "fillRect", args: args.map(normalizeValue) }),
    beginPath: (...args) => record({ type: "call", name: "beginPath", args: args.map(normalizeValue) }),
    arc: (...args) => record({ type: "call", name: "arc", args: args.map(normalizeValue) }),
    arcTo: (...args) => record({ type: "call", name: "arcTo", args: args.map(normalizeValue) }),
    quadraticCurveTo: (...args) => record({ type: "call", name: "quadraticCurveTo", args: args.map(normalizeValue) }),
    fill: (...args) => record({ type: "call", name: "fill", args: args.map(normalizeValue) }),
    stroke: (...args) => record({ type: "call", name: "stroke", args: args.map(normalizeValue) }),
    strokeRect: (...args) => record({ type: "call", name: "strokeRect", args: args.map(normalizeValue) }),
    drawImage: (...args) => record({ type: "call", name: "drawImage", args: args.map(normalizeValue) }),
    save: (...args) => record({ type: "call", name: "save", args: args.map(normalizeValue) }),
    restore: (...args) => record({ type: "call", name: "restore", args: args.map(normalizeValue) }),
    fillText: (...args) => record({ type: "call", name: "fillText", args: args.map(normalizeValue) }),
    strokeText: (...args) => record({ type: "call", name: "strokeText", args: args.map(normalizeValue) }),
    moveTo: (...args) => record({ type: "call", name: "moveTo", args: args.map(normalizeValue) }),
    lineTo: (...args) => record({ type: "call", name: "lineTo", args: args.map(normalizeValue) }),
    closePath: (...args) => record({ type: "call", name: "closePath", args: args.map(normalizeValue) }),
    translate: (...args) => record({ type: "call", name: "translate", args: args.map(normalizeValue) }),
    rotate: (...args) => record({ type: "call", name: "rotate", args: args.map(normalizeValue) }),
    rect: (...args) => record({ type: "call", name: "rect", args: args.map(normalizeValue) }),
    clip: (...args) => record({ type: "call", name: "clip", args: args.map(normalizeValue) }),
    setLineDash: (...args) => record({ type: "call", name: "setLineDash", args: args.map(normalizeValue) }),
    measureText: (...args) => {
      record({ type: "call", name: "measureText", args: args.map(normalizeValue) });
      return { width: 0 };
    },
    createLinearGradient: (...args) => {
      const gradient = makeGradient();
      record({
        type: "call",
        name: "createLinearGradient",
        args: args.map(normalizeValue),
        gradientId: gradient.__gradientId
      });
      return gradient;
    },
    createRadialGradient: (...args) => {
      const gradient = makeGradient();
      record({
        type: "call",
        name: "createRadialGradient",
        args: args.map(normalizeValue),
        gradientId: gradient.__gradientId
      });
      return gradient;
    }
  };

  const defineProp = (name) => {
    let value = null;
    Object.defineProperty(ctx, name, {
      get() {
        return value;
      },
      set(next) {
        value = next;
        record({ type: "set", name, value: normalizeValue(next) });
      }
    });
  };

  [
    "imageSmoothingEnabled",
    "globalAlpha",
    "fillStyle",
    "strokeStyle",
    "shadowColor",
    "shadowBlur",
    "shadowOffsetX",
    "shadowOffsetY",
    "lineWidth",
    "textAlign",
    "textBaseline",
    "font",
    "lineCap",
    "lineJoin",
    "globalCompositeOperation"
  ].forEach(defineProp);

  return {
    ctx,
    ops,
    reset() {
      ops.length = 0;
      gradientIndex = 0;
    }
  };
}

function makeInput() {
  const moveRef = { dx: 0, dy: 0 };
  const input = {
    cursor: { x: 0, y: 0, has: true },
    getMove: () => ({ dx: moveRef.dx, dy: moveRef.dy }),
    snapshot: () => ({
      move: { dx: moveRef.dx, dy: moveRef.dy },
      cursor: { x: input.cursor.x, y: input.cursor.y, has: input.cursor.has }
    }),
    reset: vi.fn()
  };
  return { input, moveRef };
}

function buildGame({ ctx, input, playerImg }) {
  const canvas = {
    style: {},
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx)
  };
  const config = structuredClone(DEFAULT_CONFIG);
  const game = new Game({
    canvas,
    ctx,
    config,
    playerImg,
    input,
    getTrailId: () => "classic",
    getBinds: () => ({})
  });
  game.resizeToWindow();
  return { game, canvas };
}

function wrapRender(game, ops) {
  const original = game.render.bind(game);
  game.render = () => {
    ops.push({ type: "frame" });
    return original();
  };
  return () => {
    game.render = original;
  };
}

function getActionSchedule() {
  return new Map([
    [4, [{ id: "dash" }]],
    [9, [{ id: "teleport", cursor: { x: 160, y: 70, has: true } }]],
    [12, [{ id: "phase" }]],
    [16, [{ id: "slowField", cursor: { x: 40, y: 110, has: true } }]],
    [20, [{ id: "dash" }, { id: "phase" }]]
  ]);
}

function applyInputPattern({ tick, moveRef, input }) {
  moveRef.dx = (tick % 3) - 1;
  moveRef.dy = tick % 2;
  input.cursor.x = 60 + tick * 2;
  input.cursor.y = 40 + tick;
  input.cursor.has = true;
}

function runLiveGame({ totalTicks, seed, playerImg }) {
  const frameMs = 1000 / replayTestables.REPLAY_TARGET_FPS;
  const frameTimestamps = Array.from({ length: totalTicks + 2 }, (_, i) => (i + 1) * frameMs);
  const recorder = createRecordingContext();
  const { input, moveRef } = makeInput();
  const { game } = buildGame({ ctx: recorder.ctx, input, playerImg });
  const manager = createReplayManager({
    game,
    input,
    setRandSource,
    tapeRecorder: createTapeRandRecorder,
    tapePlayer: createTapeRandPlayer,
    seededRand: createSeededRand,
    playbackTicks,
    playbackTicksDeterministic,
    simDt: SIM_DT
  });

  const run = manager.startRecording(seed);
  game.startRun();
  recorder.reset();
  const restoreRender = wrapRender(game, recorder.ops);

  const actionSchedule = getActionSchedule();
  let ticksProcessed = 0;
  let acc = 0;
  let lastTs = frameTimestamps[0] - frameMs;

  for (const ts of frameTimestamps) {
    if (ticksProcessed >= totalTicks || game.state === 2) break;
    const frameDt = Math.max(0, (ts - lastTs) / 1000);
    lastTs = ts;
    acc += frameDt;

    while (acc >= SIM_DT && ticksProcessed < totalTicks && game.state === 1) {
      applyInputPattern({ tick: ticksProcessed, moveRef, input });

      const actionsForTick = actionSchedule.get(ticksProcessed) || [];
      for (const action of actionsForTick) {
        manager.queueAction(action);
      }

      const snap = input.snapshot();
      const actions = manager.drainPendingActions();

      manager.recordTick(snap, actions);

      if (actions.length) {
        for (const action of actions) {
          if (action.cursor) {
            input.cursor.x = action.cursor.x;
            input.cursor.y = action.cursor.y;
            input.cursor.has = !!action.cursor.has;
          }
          game.handleAction(action.id);
        }
      }

      game.update(SIM_DT);
      acc -= SIM_DT;
      ticksProcessed += 1;
    }

    game.render();
  }

  manager.markEnded();
  restoreRender();

  return { run, ops: recorder.ops, frameTimestamps };
}

function makeFrameRequest(frameTimestamps) {
  let i = 0;
  return (cb) => {
    const ts = frameTimestamps[i] ?? frameTimestamps[frameTimestamps.length - 1];
    i += 1;
    cb(ts);
  };
}

async function runReplay({ run, playerImg, frameTimestamps }) {
  const recorder = createRecordingContext();
  const { input } = makeInput();
  const { game } = buildGame({ ctx: recorder.ctx, input, playerImg });
  const requestFrame = makeFrameRequest(frameTimestamps);

  const manager = createReplayManager({
    game,
    input,
    menu: { classList: makeClassList() },
    over: { classList: makeClassList() },
    stopMusic: vi.fn(),
    setRandSource,
    tapePlayer: createTapeRandPlayer,
    seededRand: createSeededRand,
    playbackTicks,
    playbackTicksDeterministic,
    simDt: SIM_DT,
    requestFrame
  });

  recorder.reset();
  const restoreRender = wrapRender(game, recorder.ops);
  await manager.play({ captureMode: "none", run: cloneReplayRun(run) });
  restoreRender();

  return recorder.ops;
}

beforeAll(() => {
  globalThis.OffscreenCanvas = class {
    constructor(w, h) {
      this.width = w;
      this.height = h;
    }

    getContext() {
      const recorder = createRecordingContext();
      return recorder.ctx;
    }
  };
});

beforeEach(() => {
  Object.defineProperty(window, "visualViewport", { value: { width: 320, height: 200 }, writable: true });
  Object.defineProperty(window, "devicePixelRatio", { value: 2, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  setRandSource(() => Math.random());
});

describe("replay determinism", () => {
  it("replays live runs with identical rendered output every time", async () => {
    const playerImg = { naturalWidth: 64, naturalHeight: 32, __assetId: "player" };
    const totalTicks = 36;

    const { run, ops: liveOps, frameTimestamps } = runLiveGame({
      totalTicks,
      seed: "deterministic-seed",
      playerImg
    });

    expect(run.ticks.length).toBeGreaterThan(0);
    expect(run.rngTape.length).toBeGreaterThan(0);
    expect(liveOps.length).toBeGreaterThan(0);

    const firstReplay = await runReplay({ run, playerImg, frameTimestamps });
    const secondReplay = await runReplay({ run, playerImg, frameTimestamps });
    const thirdReplay = await runReplay({ run, playerImg, frameTimestamps });

    expect(firstReplay).toEqual(liveOps);
    expect(secondReplay).toEqual(liveOps);
    expect(thirdReplay).toEqual(liveOps);
  });
});
