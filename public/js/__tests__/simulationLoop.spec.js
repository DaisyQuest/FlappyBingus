import { describe, expect, it, vi } from "vitest";
import { createFixedStepLoop } from "../simulationLoop.js";

describe("createFixedStepLoop", () => {
  it("advances ticks based on accumulated time", () => {
    const onTick = vi.fn();
    const onFrameStart = vi.fn();
    const onFrameEnd = vi.fn();

    const loop = createFixedStepLoop({
      simDt: 0.1,
      maxFrame: 0.5,
      onFrameStart,
      onTick,
      onFrameEnd
    });

    loop.advance(1000);
    expect(onTick).not.toHaveBeenCalled();

    loop.advance(1100);
    expect(onFrameStart).toHaveBeenCalledWith(0.1);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onFrameEnd).toHaveBeenCalledWith(0.1);

    loop.advance(1300);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("clamps large frames and stops when requested", () => {
    const onTick = vi.fn(() => false);

    const loop = createFixedStepLoop({
      simDt: 0.1,
      maxFrame: 0.2,
      onTick
    });

    loop.advance(1000);
    loop.advance(2000);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(loop.getAccumulator()).toBe(0);
  });

  it("resets internal time tracking", () => {
    const onTick = vi.fn();
    const loop = createFixedStepLoop({ simDt: 0.05, onTick });

    loop.advance(1000);
    loop.advance(1050);
    expect(onTick).toHaveBeenCalledTimes(1);

    loop.reset();
    loop.advance(2000);
    loop.advance(2050);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid simDt values", () => {
    expect(() => createFixedStepLoop({ simDt: 0 })).toThrow("createFixedStepLoop requires a positive simDt.");
    expect(() => createFixedStepLoop({ simDt: NaN })).toThrow("createFixedStepLoop requires a positive simDt.");
  });
});
