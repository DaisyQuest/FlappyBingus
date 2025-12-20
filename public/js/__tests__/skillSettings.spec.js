import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config.js";
import {
  DASH_BEHAVIORS,
  SLOW_BEHAVIORS,
  DEFAULT_SKILL_SETTINGS,
  dashBounceLimit,
  normalizeSkillSettings,
  resolveSkillSlots
} from "../skillSettings.js";

describe("skillSettings", () => {
  it("normalizes skill settings and rejects invalid behaviors", () => {
    const normalized = normalizeSkillSettings(
      { dashBehavior: "unknown", slowFieldBehavior: SLOW_BEHAVIORS.EXPLOSION },
      { skills: DEFAULT_CONFIG.skills }
    );

    expect(normalized.dashBehavior).toBe(DEFAULT_SKILL_SETTINGS.dashBehavior);
    expect(normalized.slowFieldBehavior).toBe(SLOW_BEHAVIORS.EXPLOSION);
  });

  it("resolves skill slots using loadout fallbacks", () => {
    const cfg = {
      skills: {
        ...DEFAULT_CONFIG.skills,
        loadout: { dashBehavior: DASH_BEHAVIORS.DESTROY, slowFieldBehavior: SLOW_BEHAVIORS.EXPLOSION }
      }
    };
    const slots = resolveSkillSlots(cfg, cfg.skills.loadout);

    expect(slots.dash.id).toBe(DASH_BEHAVIORS.DESTROY);
    expect(slots.slowField.id).toBe(SLOW_BEHAVIORS.EXPLOSION);
    expect(slots.phase.id).toBe("phase");
  });

  it("computes bounce limits for the active dash slot", () => {
    const ricochetSlot = { id: DASH_BEHAVIORS.RICOCHET, config: { maxBounces: -1 } };
    const destroySlot = { id: DASH_BEHAVIORS.DESTROY, config: { maxBounces: 1 } };

    expect(dashBounceLimit(ricochetSlot)).toBe(Number.POSITIVE_INFINITY);
    expect(dashBounceLimit(destroySlot)).toBe(1);
  });
});
