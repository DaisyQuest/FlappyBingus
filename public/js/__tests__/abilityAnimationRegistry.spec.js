import { describe, expect, it } from "vitest";
import {
  buildTriggeredAnimationLayer,
  resolveAbilityEffectForEvent
} from "../abilityAnimationRegistry.js";

const defaultEffect = {
  effect: { type: "radialRipple", params: { alpha: 0.7 } },
  animation: { type: "radialRipple", timing: { durationMs: 200 }, target: "effects[].params.progress" }
};

const dashOverride = {
  effect: { type: "sparkBloom", params: { alpha: 0.6 } },
  animation: { type: "sparkBloom", timing: { durationMs: 180 }, target: "effects[].params.progress" }
};

describe("ability animation registry", () => {
  it("resolves default ability effects when no override is defined", () => {
    const effect = resolveAbilityEffectForEvent("anim:dash", {
      defaultAbilityEffect: defaultEffect,
      abilityEffects: {}
    });
    expect(effect).toBe(defaultEffect);
  });

  it("resolves skill-specific overrides when provided", () => {
    const effect = resolveAbilityEffectForEvent("anim:dash", {
      defaultAbilityEffect: defaultEffect,
      abilityEffects: { dash: dashOverride }
    });
    expect(effect).toBe(dashOverride);
  });

  it("returns null when no default or override is available", () => {
    const effect = resolveAbilityEffectForEvent("anim:dash", { abilityEffects: {} });
    expect(effect).toBeNull();
  });

  it("builds triggered animation layers with resolved targets", () => {
    const layer = buildTriggeredAnimationLayer({ "anim:dash": defaultEffect });
    expect(layer.effects).toHaveLength(1);
    expect(layer.animations).toHaveLength(1);
    expect(layer.animations[0]).toMatchObject({
      type: "radialRipple",
      target: "effects[0].params.progress",
      triggeredBy: "anim:dash",
      params: { eventType: "anim:dash" }
    });
  });
});
