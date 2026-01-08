import { describe, expect, it, vi } from "vitest";

import { createSystemPipeline, listSystemNames } from "../engine/systemPipeline.js";

describe("system pipeline", () => {
  it("requires an array of systems", () => {
    expect(() => createSystemPipeline("nope")).toThrow("Systems must be an array.");
  });

  it("wraps function systems in legacy mode by default", () => {
    const legacyRunner = vi.fn();
    const pipeline = createSystemPipeline([legacyRunner]);
    const context = { world: { id: "world" }, dt: 0.16, events: { id: "events" } };

    pipeline.run(context);

    expect(legacyRunner).toHaveBeenCalledWith(context.world, context.dt, context.events);
    expect(pipeline.systems[0].name).toBe(legacyRunner.name);
    expect(pipeline.systems[0].mode).toBe("legacy");
  });

  it("supports function systems configured for context mode", () => {
    const contextRunner = vi.fn();
    contextRunner.mode = "context";
    const pipeline = createSystemPipeline([contextRunner]);
    const context = { world: { id: "world" }, dt: 0.2, events: null };

    pipeline.run(context);

    expect(contextRunner).toHaveBeenCalledWith(context);
    expect(pipeline.systems[0].mode).toBe("context");
  });

  it("uses update handlers for object systems and respects enable flags", () => {
    const updateSystem = { name: "updateSystem", update: vi.fn() };
    const disabledSystem = { name: "disabledSystem", run: vi.fn(), enabled: false };
    const pipeline = createSystemPipeline([updateSystem, disabledSystem]);
    const context = { world: {}, dt: 0.1, events: {} };

    pipeline.run(context);

    expect(updateSystem.update).toHaveBeenCalledWith(context);
    expect(listSystemNames(pipeline)).toEqual(["updateSystem"]);
  });

  it("supports legacy mode on object systems", () => {
    const legacyRun = vi.fn();
    const pipeline = createSystemPipeline([
      {
        name: "legacyObject",
        run: legacyRun,
        legacy: true
      }
    ]);
    const context = { world: { ok: true }, dt: 0.5, events: { ok: true } };

    pipeline.run(context);

    expect(legacyRun).toHaveBeenCalledWith(context.world, context.dt, context.events);
    expect(pipeline.systems[0].mode).toBe("legacy");
  });

  it("rejects object systems missing run or update", () => {
    expect(() => createSystemPipeline([{ name: "bad" }])).toThrow(
      "System entry must provide a run/update function."
    );
  });

  it("sorts systems by order, name, and index", () => {
    const pipeline = createSystemPipeline([
      { name: "beta", order: 1, run: vi.fn() },
      { name: "alpha", order: 1, run: vi.fn() },
      { name: "gamma", order: 0, run: vi.fn() },
      { name: "alpha", order: 1, run: vi.fn() }
    ]);

    expect(listSystemNames(pipeline)).toEqual(["gamma", "alpha", "alpha", "beta"]);
  });

  it("throws for unsupported system modes", () => {
    const badMode = { name: "badMode", run: vi.fn(), mode: "mystery" };

    expect(() => createSystemPipeline([badMode])).toThrow('Unsupported system mode "mystery".');
  });

  it("handles listSystemNames with missing pipelines", () => {
    expect(listSystemNames(null)).toEqual([]);
  });
});
