import { describe, expect, it } from "vitest";

import { GameEngine } from "../gameEngine.js";
import { applyAnimationsToStyle } from "../../public/js/iconAnimationEngine.js";

describe("headless icon animation simulation", () => {
  it("plays skill-triggered animations for the expected duration", () => {
    const engine = new GameEngine({ config: { gravity: 0, dashDuration: 0.1 } });
    engine.command("dash", { direction: "right" });

    const style = {
      effects: [{ type: "radialRipple", params: { progress: 0 } }],
      animations: [
        {
          type: "radialRipple",
          target: "effects[0].params.progress",
          timing: { durationMs: 200 },
          triggeredBy: "anim:dash"
        }
      ]
    };

    const events = engine.events.events;
    const active = applyAnimationsToStyle(style, style.animations, { timeMs: 100, events });
    const expired = applyAnimationsToStyle(style, style.animations, { timeMs: 250, events });

    expect(active.style.effects[0].params.progress).toBeCloseTo(0.5, 4);
    expect(expired.style.effects[0].params.progress).toBe(0);
  });
});
