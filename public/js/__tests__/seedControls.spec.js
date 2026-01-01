// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initSeedControls } from "../seedControls.js";

describe("seedControls", () => {
  let seedInput;
  let seedRandomBtn;
  let seedHint;

  beforeEach(() => {
    seedInput = document.createElement("input");
    seedRandomBtn = document.createElement("button");
    seedHint = document.createElement("div");
  });

  it("returns early when no seed input exists", () => {
    const result = initSeedControls({
      seedInput: null,
      readSeed: () => "ignored"
    });
    expect(result).toEqual({ seed: "" });
  });

  it("initializes the input value using the persisted seed", () => {
    const readSeed = vi.fn(() => "persisted-seed");
    const result = initSeedControls({
      seedInput,
      seedRandomBtn,
      seedHint,
      readSeed,
      writeSeed: vi.fn(),
      genRandomSeed: vi.fn(() => "new-seed")
    });

    expect(seedInput.value).toBe("persisted-seed");
    expect(result.seed).toBe("persisted-seed");
    expect(readSeed).toHaveBeenCalledTimes(1);
  });

  it("generates a new seed, writes it, and updates the hint", () => {
    const writeSeed = vi.fn();
    const genRandomSeed = vi.fn(() => "generated-seed");
    initSeedControls({
      seedInput,
      seedRandomBtn,
      seedHint,
      readSeed: vi.fn(),
      writeSeed,
      genRandomSeed
    });

    seedRandomBtn.click();

    expect(genRandomSeed).toHaveBeenCalledTimes(1);
    expect(writeSeed).toHaveBeenCalledWith("generated-seed");
    expect(seedInput.value).toBe("generated-seed");
    expect(seedHint.className).toBe("hint good");
    expect(seedHint.textContent).toBe("Generated seed: generated-seed");
  });

  it("does nothing on randomize click when dependencies are missing", () => {
    initSeedControls({
      seedInput,
      seedRandomBtn,
      seedHint,
      readSeed: vi.fn()
    });

    seedRandomBtn.click();

    expect(seedInput.value).toBe("");
    expect(seedHint.textContent).toBe("");
  });

  it("writes trimmed seed input and resets hint on change", () => {
    const writeSeed = vi.fn();
    initSeedControls({
      seedInput,
      seedRandomBtn,
      seedHint,
      readSeed: vi.fn(),
      writeSeed,
      genRandomSeed: vi.fn()
    });

    seedInput.value = "  abc123  ";
    seedInput.dispatchEvent(new Event("change"));

    expect(writeSeed).toHaveBeenCalledWith("abc123");
    expect(seedHint.className).toBe("hint");
    expect(seedHint.textContent).toBe("If two players use the same seed, pipe/orb spawns will match.");
  });

  it("skips hint updates when no hint element is provided", () => {
    const writeSeed = vi.fn();
    initSeedControls({
      seedInput,
      seedRandomBtn,
      seedHint: null,
      readSeed: vi.fn(),
      writeSeed,
      genRandomSeed: vi.fn(() => "seed")
    });

    seedRandomBtn.click();
    seedInput.value = "seed";
    seedInput.dispatchEvent(new Event("change"));

    expect(writeSeed).toHaveBeenCalledWith("seed");
  });
});
