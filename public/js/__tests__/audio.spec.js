import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeGain {
  constructor() {
    this.gain = { value: 1 };
  }
  connect() {}
}

class FakeBufferSource {
  constructor() {
    this.playbackRate = { value: 1 };
  }
  connect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.destination = {};
    this.decodeAudioData = vi.fn(async (arr) => arr);
  }
  createGain() { return new FakeGain(); }
  createBufferSource() { return new FakeBufferSource(); }
  async resume() { this.state = "running"; }
}

const installAudioContext = () => {
  globalThis.window = globalThis;
  globalThis.AudioContext = FakeAudioContext;
  globalThis.webkitAudioContext = undefined;
  globalThis.fetch = vi.fn(async () => ({
    arrayBuffer: async () => new ArrayBuffer(1)
  }));
};

beforeEach(() => {
  vi.resetModules();
  installAudioContext();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  delete globalThis.window;
  delete globalThis.fetch;
});

describe("audio volume controls", () => {
  it("applies pre-init slider choices and mute state once the context exists", async () => {
    const { audioInit, setMusicVolume, setSfxVolume, setMuted, getVolumeState } = await import("../audio.js");

    setMusicVolume(0.25);
    setSfxVolume(0.4);
    setMuted(true);

    expect(getVolumeState()).toMatchObject({
      music: 0.25,
      sfx: 0.4,
      muted: true,
      applied: { music: null, sfx: null }
    });

    await audioInit(); // creates gains and applies the stored values + mute

    expect(getVolumeState().applied).toMatchObject({ music: 0, sfx: 0 });

    setMuted(false);
    expect(getVolumeState().applied).toMatchObject({ music: 0.25, sfx: 0.4 });
  });

  it("clamps requested volumes into [0,1]", async () => {
    const { setMusicVolume, setSfxVolume, getVolumeState } = await import("../audio.js");

    setMusicVolume(2);
    setSfxVolume(-1);

    expect(getVolumeState()).toMatchObject({ music: 1, sfx: 0 });
  });
});
