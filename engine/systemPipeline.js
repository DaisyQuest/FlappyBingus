const DEFAULT_NAME_PREFIX = "system";

function getSystemName(name, run, index) {
  if (typeof name === "string" && name.trim()) return name;
  if (typeof run?.name === "string" && run.name.trim()) return run.name;
  return `${DEFAULT_NAME_PREFIX}:${index}`;
}

function getSystemOrder(order, index) {
  return Number.isFinite(order) ? order : index;
}

function resolveMode(entry, fallback) {
  if (entry?.legacy === true) return "legacy";
  if (typeof entry?.mode === "string") return entry.mode;
  return fallback;
}

function createRunner(run, mode) {
  if (mode === "legacy") {
    return (context) => run(context.world, context.dt, context.events);
  }
  if (mode === "context") {
    return (context) => run(context);
  }
  throw new Error(`Unsupported system mode "${mode}".`);
}

function normalizeSystem(entry, index) {
  if (!entry) return null;

  if (typeof entry === "function") {
    const mode = resolveMode(entry, "legacy");
    const wrapped = createRunner(entry, mode);
    return {
      name: getSystemName(null, entry, index),
      run: wrapped,
      order: getSystemOrder(undefined, index),
      mode,
      enabled: true,
      index
    };
  }

  if (typeof entry === "object") {
    const run = entry.run ?? entry.update;
    if (typeof run !== "function") {
      throw new Error("System entry must provide a run/update function.");
    }
    const mode = resolveMode(entry, "context");
    const wrapped = createRunner(run, mode);
    return {
      name: getSystemName(entry.name, run, index),
      run: wrapped,
      order: getSystemOrder(entry.order, index),
      mode,
      enabled: entry.enabled !== false,
      index
    };
  }

  return null;
}

export function createSystemPipeline(systems = []) {
  if (!Array.isArray(systems)) throw new Error("Systems must be an array.");

  const normalized = systems
    .map((entry, index) => normalizeSystem(entry, index))
    .filter(Boolean)
    .filter((system) => system.enabled);

  const ordered = normalized
    .slice()
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.index - b.index;
    })
    .map((system) => ({ ...system }));

  const run = (context) => {
    for (const system of ordered) {
      system.run(context);
    }
  };

  return {
    run,
    systems: ordered
  };
}

export function listSystemNames(pipeline) {
  if (!pipeline?.systems) return [];
  return pipeline.systems.map((system) => system.name);
}
