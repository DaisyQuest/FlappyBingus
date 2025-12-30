import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let createReplayViewerApp;
let mapGameDriverState;

beforeEach(async () => {
  vi.resetModules();
  globalThis.window = { devicePixelRatio: 1 };
  ({ createReplayViewerApp } = await import("../replayViewerApp.js"));
  ({ mapGameDriverState } = await import("../gameDriverState.js"));
});

afterEach(() => {
  delete globalThis.window;
});

const makeUi = () => {
  const makeEl = (extras = {}) => ({
    disabled: false,
    dataset: {},
    textContent: "",
    value: "",
    addEventListener: vi.fn(),
    ...extras
  });
  const canvas = {
    style: {},
    getContext: vi.fn(() => ({})),
    getBoundingClientRect: () => ({ width: 320, height: 180 })
  };
  return {
    canvas,
    usernameInput: makeEl(),
    loadButton: makeEl(),
    playPause: makeEl(),
    restart: makeEl(),
    status: makeEl()
  };
};

const makeDocumentRef = (ui) => ({
  getElementById: (id) => {
    const map = {
      replayCanvas: ui.canvas,
      replayUsername: ui.usernameInput,
      loadReplay: ui.loadButton,
      playPause: ui.playPause,
      restartReplay: ui.restart,
      replayStatus: ui.status
    };
    return map[id] || null;
  }
});

const makeWindowRef = () => ({
  addEventListener: vi.fn(),
  visualViewport: { addEventListener: vi.fn() },
  requestAnimationFrame: vi.fn()
});

const makeInputClass = () => {
  return class FakeInput {
    constructor() {
      this.cursor = { x: 0, y: 0, has: false };
      this.install = vi.fn();
      this.reset = vi.fn();
    }
  };
};

const makeGameClass = () => {
  return class FakeGame {
    constructor({ input }) {
      this.input = input;
      this.state = 0;
      this.resizeToRect = vi.fn();
      this.render = vi.fn();
      this.setSkillSettings = vi.fn();
      this.startRun = vi.fn(() => {
        this.state = 1;
      });
      this.handleAction = vi.fn();
      this.update = vi.fn();
    }
  };
};

const makeGameDriverClass = (capture) => {
  return class FakeDriver {
    constructor(options) {
      capture.options = options;
      this.step = vi.fn();
    }
  };
};

describe("createReplayViewerApp", () => {
  it("initializes replay manager wiring with the game driver map state", async () => {
    const ui = makeUi();
    const capture = {};
    const createReplayManagerFn = vi.fn(() => ({ play: vi.fn(), queueAction: vi.fn() }));
    const InputClass = makeInputClass();

    const app = createReplayViewerApp({
      documentRef: makeDocumentRef(ui),
      windowRef: makeWindowRef(),
      loadConfigFn: vi.fn(async () => ({ config: {} })),
      createPlayerIconSpriteFn: vi.fn(() => ({})),
      createReplayManagerFn,
      apiGetBestRunFn: vi.fn(),
      hydrateBestRunPayloadFn: vi.fn(),
      GameClass: makeGameClass(),
      GameDriverClass: makeGameDriverClass(capture),
      InputClass,
      requestFrame: vi.fn()
    });

    await app.init();

    expect(createReplayManagerFn).toHaveBeenCalledTimes(1);
    const inputInstance = createReplayManagerFn.mock.calls[0][0].input;
    expect(inputInstance).toBeInstanceOf(InputClass);
    expect(inputInstance.install).toHaveBeenCalled();
    expect(capture.options.mapState).toBe(mapGameDriverState);
  });

  it("handles empty usernames by disabling controls and warning", async () => {
    const ui = makeUi();
    const app = createReplayViewerApp({
      documentRef: makeDocumentRef(ui),
      windowRef: makeWindowRef(),
      loadConfigFn: vi.fn(async () => ({ config: {} })),
      createPlayerIconSpriteFn: vi.fn(() => ({})),
      createReplayManagerFn: vi.fn(() => ({ play: vi.fn(), queueAction: vi.fn() })),
      apiGetBestRunFn: vi.fn(),
      hydrateBestRunPayloadFn: vi.fn(),
      GameClass: makeGameClass(),
      GameDriverClass: makeGameDriverClass({}),
      InputClass: makeInputClass(),
      requestFrame: vi.fn()
    });

    await app.init();
    ui.usernameInput.value = "";

    await app.loadReplay();

    expect(ui.status.textContent).toBe("Enter a username to load a replay.");
    expect(ui.playPause.disabled).toBe(true);
    expect(ui.restart.disabled).toBe(true);
  });

  it("reports missing replay data and invalid payloads", async () => {
    const ui = makeUi();
    const apiGetBestRunFn = vi.fn(async () => ({ ok: false }));
    const hydrateBestRunPayloadFn = vi.fn(() => null);
    const app = createReplayViewerApp({
      documentRef: makeDocumentRef(ui),
      windowRef: makeWindowRef(),
      loadConfigFn: vi.fn(async () => ({ config: {} })),
      createPlayerIconSpriteFn: vi.fn(() => ({})),
      createReplayManagerFn: vi.fn(() => ({ play: vi.fn(), queueAction: vi.fn() })),
      apiGetBestRunFn,
      hydrateBestRunPayloadFn,
      GameClass: makeGameClass(),
      GameDriverClass: makeGameDriverClass({}),
      InputClass: makeInputClass(),
      requestFrame: vi.fn()
    });

    await app.init();
    ui.usernameInput.value = "tester";

    await app.loadReplay();
    expect(ui.status.textContent).toBe("Replay not available for this player.");
    expect(ui.playPause.disabled).toBe(true);

    apiGetBestRunFn.mockResolvedValueOnce({ ok: true, run: { replayJson: "{}" } });
    await app.loadReplay();

    expect(hydrateBestRunPayloadFn).toHaveBeenCalled();
    expect(ui.status.textContent).toBe("Replay data is invalid.");
  });

  it("loads a replay and plays it, reporting completion and failures", async () => {
    const ui = makeUi();
    const play = vi.fn().mockResolvedValue(true);
    const createReplayManagerFn = vi.fn(() => ({ play, queueAction: vi.fn() }));
    const apiGetBestRunFn = vi.fn(async () => ({ ok: true, run: { replayJson: "{}" } }));
    const hydrateBestRunPayloadFn = vi.fn(() => ({ ended: true, ticks: [{}] }));

    const app = createReplayViewerApp({
      documentRef: makeDocumentRef(ui),
      windowRef: makeWindowRef(),
      loadConfigFn: vi.fn(async () => ({ config: {} })),
      createPlayerIconSpriteFn: vi.fn(() => ({})),
      createReplayManagerFn,
      apiGetBestRunFn,
      hydrateBestRunPayloadFn,
      GameClass: makeGameClass(),
      GameDriverClass: makeGameDriverClass({}),
      InputClass: makeInputClass(),
      requestFrame: vi.fn()
    });

    await app.init();
    ui.usernameInput.value = "tester";
    await app.loadReplay();
    await app.playReplay();

    expect(play).toHaveBeenCalled();
    expect(ui.status.textContent).toBe("Replay finished.");
    expect(ui.playPause.textContent).toBe("Play");

    play.mockRejectedValueOnce(new Error("nope"));
    await app.playReplay();
    expect(ui.status.textContent).toBe("Unable to play replay.");
  });

  it("applies recorded skill settings when loading a replay", async () => {
    const ui = makeUi();
    const createReplayManagerFn = vi.fn(() => ({ play: vi.fn(), queueAction: vi.fn() }));
    const apiGetBestRunFn = vi.fn(async () => ({ ok: true, run: { replayJson: "{}" } }));
    const hydrateBestRunPayloadFn = vi.fn(() => ({
      ended: true,
      ticks: [{}],
      settings: {
        dashBehavior: "destroy",
        slowFieldBehavior: "slow",
        teleportBehavior: "normal",
        invulnBehavior: "short"
      }
    }));

    const app = createReplayViewerApp({
      documentRef: makeDocumentRef(ui),
      windowRef: makeWindowRef(),
      loadConfigFn: vi.fn(async () => ({ config: {} })),
      createPlayerIconSpriteFn: vi.fn(() => ({})),
      createReplayManagerFn,
      apiGetBestRunFn,
      hydrateBestRunPayloadFn,
      GameClass: makeGameClass(),
      GameDriverClass: makeGameDriverClass({}),
      InputClass: makeInputClass(),
      requestFrame: vi.fn()
    });

    await app.init();
    ui.usernameInput.value = "tester";
    await app.loadReplay();

    const { game } = app.getState();
    expect(game.setSkillSettings).toHaveBeenCalledWith({
      dashBehavior: "destroy",
      slowFieldBehavior: "slow",
      teleportBehavior: "normal",
      invulnBehavior: "short"
    });
  });
});
