import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeGain {
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    };
  }
  connect() {}
}

class FakeBufferSource {
  constructor() {
    this.playbackRate = { value: 1 };
    this.connect = vi.fn();
    this.start = vi.fn();
    this.stop = vi.fn();
    this.onended = null;
    this.loop = false;
  }
}

class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.destination = {};
    this.decodeAudioData = vi.fn(async (arr) => arr);
    this.createdSources = [];
    this.createdOscillators = [];
    (globalThis.__audioContexts || []).push(this);
  }
  createGain() { return new FakeGain(); }
  createBufferSource() {
    const src = new FakeBufferSource();
    this.createdSources.push(src);
    return src;
  }
  createOscillator() {
    const osc = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    this.createdOscillators.push(osc);
    return osc;
  }
  async resume() { this.state = "running"; }
}

const installAudioContext = () => {
  globalThis.__audioContexts = [];
  globalThis.window = globalThis;
  globalThis.AudioContext = FakeAudioContext;
  globalThis.webkitAudioContext = undefined;
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
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
  delete globalThis.__audioContexts;
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

  it("loads buffers lazily and resumes suspended contexts once", async () => {
    class SuspendedAudioContext extends FakeAudioContext {
      constructor() {
        super();
        this.state = "suspended";
      }
      resume = vi.fn(async () => { this.state = "running"; });
    }

    globalThis.AudioContext = SuspendedAudioContext;
    const { audioInit } = await import("../audio.js");

    await audioInit({
      musicUrl: "m",
      boopUrl: "b",
      niceUrl: "n",
      bounceUrl: "d",
      shatterUrl: "s",
      slowFieldUrl: "sf",
      slowExplosionUrl: "se",
      dashStartUrl: "ds",
      dashBreakUrl: "db",
      teleportUrl: "tp",
      phaseUrl: "ph",
      explosionUrl: "ex",
      gameOverUrl: "go"
    });
    await audioInit({
      musicUrl: "m",
      boopUrl: "b",
      niceUrl: "n",
      bounceUrl: "d",
      shatterUrl: "s",
      slowFieldUrl: "sf",
      slowExplosionUrl: "se",
      dashStartUrl: "ds",
      dashBreakUrl: "db",
      teleportUrl: "tp",
      phaseUrl: "ph",
      explosionUrl: "ex",
      gameOverUrl: "go"
    }); // cached

    expect(globalThis.fetch).toHaveBeenCalledTimes(13); // only first init loads
    const ctx = globalThis.__audioContexts.at(-1);
    expect(ctx?.resume).toHaveBeenCalled();
  });

  it("starts and stops the music loop while honoring onended cleanup", async () => {
    const { audioInit, musicStartLoop, musicStop } = await import("../audio.js");
    await audioInit({ musicUrl: "m" });

    musicStartLoop();
    const ctx = globalThis.__audioContexts.at(-1);
    const src = ctx.createdSources[0];
    expect(src.start).toHaveBeenCalled();
    expect(src.loop).toBe(true);

    // trigger onended to ensure state resets
    src.onended?.();
    musicStop(); // should no-op safely after onended cleanup
  });

  it("plays SFX with combo scaling and bounce speed clamping", async () => {
    const {
      audioInit,
      sfxOrbBoop,
      sfxPerfectNice,
      sfxDashStart,
      sfxDashBounce,
      sfxDashDestroy,
      sfxDashBreak,
      sfxTeleport,
      sfxPhase,
      sfxExplosion,
      sfxGameOver,
      sfxSlowField,
      sfxSlowExplosion,
      sfxAchievementUnlock
    } = await import("../audio.js");
    await audioInit({
      boopUrl: "boop",
      niceUrl: "nice",
      bounceUrl: "bounce",
      shatterUrl: "shatter",
      slowFieldUrl: "slowField",
      slowExplosionUrl: "slowExplosion",
      dashStartUrl: "dashStart",
      dashBreakUrl: "dashBreak",
      teleportUrl: "teleport",
      phaseUrl: "phase",
      explosionUrl: "explosion",
      gameOverUrl: "gameOver"
    });

    sfxDashStart();
    sfxOrbBoop(10);
    sfxPerfectNice();
    const speed = 8;
    sfxDashBounce(speed); // should run clamp helper with provided speed
    sfxDashDestroy();
    sfxDashBreak();
    sfxTeleport();
    sfxPhase();
    sfxExplosion();
    sfxGameOver();
    sfxSlowField();
    sfxSlowExplosion();
    sfxAchievementUnlock();

    const ctx = globalThis.__audioContexts.at(-1);
    const [
      dashStart,
      boop,
      nice,
      bounce,
      destroy,
      dashBreak,
      teleport,
      phase,
      explosion,
      gameOver,
      slowField,
      slowExplosion
    ] = ctx.createdSources.slice(-12);
    expect(dashStart.playbackRate.value).toBe(1);
    expect(boop.playbackRate.value).toBeGreaterThan(1);
    expect(nice.playbackRate.value).toBe(1); // untouched
    // Follows clamp invocation order in audio.js (min,value,max)
    const expectedBounce = Math.max(speed * 0.25 + 1, Math.min(1.35, 0.85));
    expect(bounce.playbackRate.value).toBeCloseTo(expectedBounce);
    expect(destroy.playbackRate.value).toBe(1);
    expect(dashBreak.playbackRate.value).toBe(1);
    expect(teleport.playbackRate.value).toBeGreaterThan(1);
    expect(phase.playbackRate.value).toBe(1);
    expect(explosion.playbackRate.value).toBe(1);
    expect(gameOver.playbackRate.value).toBe(1);
    expect(slowField.playbackRate.value).toBe(1);
    expect(slowExplosion.playbackRate.value).toBe(1);
    expect(ctx.createdOscillators.at(-1)?.start).toHaveBeenCalled();
  });
});
