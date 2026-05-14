import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import { createIconCard, wireAdvancedPanel } from "../public/icon/modules/editor.js";

const buildCard = () => {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
  global.document = dom.window.document;
  global.window = dom.window;
  global.Event = dom.window.Event;

  const card = createIconCard({ icon: { id: "starter", name: "Starter" } });
  dom.window.document.body.appendChild(card);
  wireAdvancedPanel(card);

  return { dom, card };
};

describe("icon editor apply JSON", () => {
  it("applies JSON across basics, pattern, effects, and animations", () => {
    const { card } = buildCard();
    const jsonArea = card.querySelector("[data-field='advancedJson']");
    const applyBtn = card.querySelector("[data-apply-json]");

    const payload = {
      id: "glimmer",
      name: "Glimmer",
      imageSrc: "/assets/icons/glimmer.png",
      schemaVersion: 2,
      unlock: {
        type: "score",
        label: "Score 500",
        minScore: 500
      },
      style: {
        palette: {
          fill: "#111111",
          core: "#222222",
          rim: "#333333",
          glow: "#444444",
          accent: "#555555"
        },
        shadow: {
          enabled: false,
          blur: 4,
          spread: 1,
          color: "#666666",
          alpha: 0.5,
          offsetX: 0.2,
          offsetY: -0.2
        },
        pattern: {
          type: "zigzag",
          scale: 1.5,
          rotationDeg: 45,
          alpha: 0.5,
          radialBias: 0.2,
          centerOffset: { x: 0.1, y: -0.1 },
          primaryColor: "#123456",
          secondaryColor: "#abcdef",
          blendMode: "screen",
          colors: ["#ff0000", "#00ff00"]
        },
        effects: [
          {
            type: "outline",
            enabled: false,
            params: { width: 4, alpha: 0.8, color: "#ff00ff" }
          }
        ],
        animations: [
          {
            id: "pulse",
            type: "pulseUniform",
            enabled: true,
            target: "preview.scale",
            timing: {
              mode: "loop",
              durationMs: 1400,
              delayMs: 150,
              easing: "easeOut",
              phaseOffset: 0.2
            },
            seed: 42,
            params: { amplitude: 0.3 }
          }
        ]
      }
    };

    jsonArea.value = JSON.stringify(payload, null, 2);
    applyBtn.click();

    expect(card.querySelector("[data-field='id']").value).toBe("glimmer");
    expect(card.querySelector("[data-field='name']").value).toBe("Glimmer");
    expect(card.querySelector("[data-field='imageSrc']").value).toBe("/assets/icons/glimmer.png");
    expect(card.querySelector("[data-field='schemaVersion']").value).toBe("2");
    expect(card.querySelector("[data-field='unlockType']").value).toBe("score");
    expect(card.querySelector("[data-field='unlockLabel']").value).toBe("Score 500");
    expect(card.querySelector("[data-field='unlockScore']").value).toBe("500");

    expect(card.querySelector("[data-field='style.pattern.type']").value).toBe("zigzag");
    expect(card.querySelector("[data-field='style.pattern.scale']").value).toBe("1.5");
    expect(card.querySelector("[data-field='style.pattern.rotationDeg']").value).toBe("45");
    expect(card.querySelector("[data-field='style.pattern.alpha']").value).toBe("0.5");
    expect(card.querySelector("[data-field='style.pattern.radialBias']").value).toBe("0.2");
    expect(card.querySelector("[data-field='style.pattern.centerOffset.x']").value).toBe("0.1");
    expect(card.querySelector("[data-field='style.pattern.centerOffset.y']").value).toBe("-0.1");
    expect(card.querySelector("[data-field='style.pattern.primaryColor']").value).toBe("#123456");
    expect(card.querySelector("[data-field='style.pattern.secondaryColor']").value).toBe("#abcdef");
    expect(card.querySelector("[data-field='style.pattern.blendMode']").value).toBe("screen");
    expect(card.querySelector("[data-field='style.pattern.colors']").value)
      .toBe(JSON.stringify(["#ff0000", "#00ff00"], null, 2));

    expect(card.querySelector("[data-field='style.shadow.enabled']").checked).toBe(false);

    const effectRows = card.querySelectorAll("[data-effect-row]");
    expect(effectRows).toHaveLength(1);
    expect(card.querySelector("[data-field='style.effects[0].type']").value).toBe("outline");
    expect(card.querySelector("[data-field='style.effects[0].enabled']").checked).toBe(false);
    expect(card.querySelector("[data-field='style.effects[0].params']").value)
      .toBe(JSON.stringify({ width: 4, alpha: 0.8, color: "#ff00ff" }, null, 2));

    const idleSlot = card.querySelector("[data-animation-slot][data-animation-label='Idle']");
    expect(idleSlot).not.toBeNull();
    expect(idleSlot.querySelector("[data-anim-field='id']").value).toBe("pulse");
    expect(idleSlot.querySelector("[data-anim-field='type']").value).toBe("pulseUniform");
    expect(idleSlot.querySelector("[data-anim-field='enabled']").checked).toBe(true);
    expect(idleSlot.querySelector("[data-anim-field='target']").value).toBe("preview.scale");
    expect(idleSlot.querySelector("[data-anim-field='timing.mode']").value).toBe("loop");
    expect(idleSlot.querySelector("[data-anim-field='timing.durationMs']").value).toBe("1400");
    expect(idleSlot.querySelector("[data-anim-field='timing.delayMs']").value).toBe("150");
    expect(idleSlot.querySelector("[data-anim-field='timing.easing']").value).toBe("easeOut");
    expect(idleSlot.querySelector("[data-anim-field='timing.phaseOffset']").value).toBe("0.2");
    expect(idleSlot.querySelector("[data-anim-field='seed']").value).toBe("42");
    expect(idleSlot.querySelector("[data-anim-field='params']").value)
      .toBe(JSON.stringify({ amplitude: 0.3 }, null, 2));
  });

  it("shows an error for invalid JSON", () => {
    const { card } = buildCard();
    const jsonArea = card.querySelector("[data-field='advancedJson']");
    const applyBtn = card.querySelector("[data-apply-json]");
    const errorBox = card.querySelector("[data-validation-errors]");

    jsonArea.value = "{invalid-json";
    applyBtn.click();

    expect(errorBox.textContent).toMatch(/Invalid JSON/);
  });

  it("blocks updates when validation fails", () => {
    const { card } = buildCard();
    const jsonArea = card.querySelector("[data-field='advancedJson']");
    const applyBtn = card.querySelector("[data-apply-json]");
    const errorBox = card.querySelector("[data-validation-errors]");

    jsonArea.value = JSON.stringify({
      id: "bad-icon",
      style: {
        pattern: {
          type: "zigzag",
          scale: 10
        }
      }
    });

    applyBtn.click();

    expect(card.querySelector("[data-field='id']").value).toBe("starter");
    expect(errorBox.innerHTML).toMatch(/pattern\.scale/);
  });
});
