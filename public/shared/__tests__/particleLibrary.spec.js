import { describe, expect, it } from "vitest";

import {
  BEST_PARTICLE_EFFECTS,
  ROUND_TABLE_AGENTS,
  getBestParticleEffects,
  getRoundTableAgents,
  normalizeParticleMix
} from "../particleLibrary.js";

describe("particle library", () => {
  it("exposes a 10-agent round table", () => {
    expect(ROUND_TABLE_AGENTS).toHaveLength(10);
    ROUND_TABLE_AGENTS.forEach((agent) => {
      expect(agent.suggestions).toHaveLength(3);
    });
  });

  it("returns defensive copies of agent and effect lists", () => {
    const agents = getRoundTableAgents();
    const effects = getBestParticleEffects();
    agents[0].suggestions.push("Extra");
    effects.push("Extra");
    expect(ROUND_TABLE_AGENTS[0].suggestions).toHaveLength(3);
    expect(BEST_PARTICLE_EFFECTS).toHaveLength(20);
  });

  it("normalizes particle mix weights to 100%", () => {
    const normalized = normalizeParticleMix([
      { id: "Hearts", weight: 10 },
      { id: "Sparkle", weight: 30 },
      { id: "Cartoon Smoke", weight: 60 }
    ]);
    expect(normalized).toEqual([
      { id: "Hearts", weight: 10 },
      { id: "Sparkle", weight: 30 },
      { id: "Cartoon Smoke", weight: 60 }
    ]);
  });

  it("filters invalid mix entries", () => {
    const normalized = normalizeParticleMix([
      { id: "Hearts", weight: "12" },
      { id: "", weight: 10 },
      { id: "Sparkle", weight: -4 },
      null
    ]);
    expect(normalized).toEqual([{ id: "Hearts", weight: 100 }]);
  });

  it("returns empty for non-array input", () => {
    expect(normalizeParticleMix(null)).toEqual([]);
  });
});
