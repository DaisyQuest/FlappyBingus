import { describe, expect, it, vi } from "vitest";
import { createSystemPipeline, listSystemNames } from "../systemPipeline.js";

describe("systemPipeline", () => {
  it("runs systems in deterministic order", () => {
    const tracker = [];
    const pipeline = createSystemPipeline([
      {
        name: "third",
        order: 2,
        run: () => tracker.push("third")
      },
      {
        name: "first",
        order: 0,
        run: () => tracker.push("first")
      },
      {
        name: "second",
        order: 1,
        run: () => tracker.push("second")
      }
    ]);

    pipeline.run({});

    expect(tracker).toEqual(["first", "second", "third"]);
    expect(listSystemNames(pipeline)).toEqual(["first", "second", "third"]);
  });

  it("filters disabled systems and clones metadata", () => {
    const run = vi.fn();
    const pipeline = createSystemPipeline([
      {
        name: "active",
        order: 1,
        run
      },
      {
        name: "disabled",
        enabled: false,
        order: 0,
        run: vi.fn()
      }
    ]);

    pipeline.run({});

    expect(pipeline.systems).toHaveLength(1);
    expect(pipeline.systems[0].name).toBe("active");
    expect(pipeline.systems[0].run).not.toBe(run);
    expect(pipeline.systems[0]).not.toBe(run);
  });

  it("defaults function systems to legacy mode", () => {
    const run = vi.fn();
    const pipeline = createSystemPipeline([run]);
    const world = { state: {} };
    const events = { emit: vi.fn() };
    const context = { world, dt: 0.1, events };

    pipeline.run(context);

    expect(run).toHaveBeenCalledWith(world, 0.1, events);
    expect(listSystemNames(pipeline)[0]).toBe(run.name);
  });

  it("ignores null and undefined entries", () => {
    const run = vi.fn();
    const pipeline = createSystemPipeline([null, run, undefined]);

    pipeline.run({});

    expect(run).toHaveBeenCalledTimes(1);
    expect(pipeline.systems).toHaveLength(1);
  });

  it("throws for invalid system entries", () => {
    expect(() => createSystemPipeline("bad"))
      .toThrow("Systems must be an array");
    expect(() => createSystemPipeline([{ name: "bad" }]))
      .toThrow("System entry must provide a run/update function");
  });

  it("prefers explicit names over function names", () => {
    const namedRun = () => {};
    const pipeline = createSystemPipeline([
      { name: "custom", run: namedRun },
      namedRun
    ]);

    expect(listSystemNames(pipeline)[0]).toBe("custom");
    expect(listSystemNames(pipeline)[1]).toBe("namedRun");
  });

  it("wraps legacy-style systems expecting world and dt", () => {
    const legacy = vi.fn((world, dt, events) => {
      void events;
      world.state.tick += dt;
    });
    const pipeline = createSystemPipeline([legacy]);
    const world = { state: { tick: 0 } };
    const events = { emit: vi.fn() };

    pipeline.run({ world, dt: 0.25, events });

    expect(legacy).toHaveBeenCalledWith(world, 0.25, events);
  });

  it("routes context systems by default for object entries", () => {
    const contextRun = vi.fn();
    const pipeline = createSystemPipeline([{ name: "context", run: contextRun }]);
    const world = { state: { tick: 0 } };
    const events = { emit: vi.fn() };
    const context = { world, dt: 0.5, events };

    pipeline.run(context);

    expect(contextRun).toHaveBeenCalledWith(context);
  });

  it("supports explicit legacy mode for object entries", () => {
    const legacy = vi.fn((world, dt, events) => {
      void events;
      world.state.tick += dt;
    });
    const pipeline = createSystemPipeline([{ name: "legacy", run: legacy, mode: "legacy" }]);
    const world = { state: { tick: 0 } };
    const events = { emit: vi.fn() };

    pipeline.run({ world, dt: 0.5, events });

    expect(legacy).toHaveBeenCalledWith(world, 0.5, events);
  });

  it("throws for unsupported system modes", () => {
    expect(() => createSystemPipeline([{ name: "bad", run: () => {}, mode: "weird" }]))
      .toThrow("Unsupported system mode");
  });
});
