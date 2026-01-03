import { describe, expect, it } from "vitest";

import {
  applyUnlockableOverrides,
  normalizeUnlockableOverrides
} from "../unlockableOverrides.cjs";

describe("unlockable overrides", () => {
  it("normalizes valid overrides and rejects unknown ids", () => {
    const allowedIdsByType = {
      trail: new Set(["classic"]),
      player_texture: new Set(["icon-a"]),
      pipe_texture: new Set([])
    };
    const result = normalizeUnlockableOverrides(
      {
        trail: { classic: { type: "achievement", id: "trail_classic_1" }, bad: { type: "free" } },
        player_texture: { "icon-a": { type: "score", minScore: 50 } }
      },
      { allowedIdsByType }
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.error === "unknown_unlockable_id")).toBe(true);
  });

  it("applies overrides to unlockable definitions", () => {
    const base = {
      trails: [{ id: "classic", name: "Classic" }],
      icons: [{ id: "icon-a", name: "Icon A" }],
      pipeTextures: [{ id: "pipe-a", name: "Pipe A" }]
    };
    const overrides = {
      trail: { classic: { type: "achievement", id: "trail_classic_1", label: "Achievement" } },
      player_texture: { "icon-a": { type: "score", minScore: 100 } },
      pipe_texture: { "pipe-a": { type: "free" } }
    };
    const resolved = applyUnlockableOverrides(base, overrides);
    expect(resolved.trails[0].unlock.type).toBe("achievement");
    expect(resolved.icons[0].unlock.type).toBe("score");
    expect(resolved.pipeTextures[0].unlock.type).toBe("free");
  });

  it("rejects overrides with invalid unlock types", () => {
    const result = normalizeUnlockableOverrides(
      { trail: { classic: { type: "mystery" } } },
      { allowedIdsByType: { trail: new Set(["classic"]), player_texture: new Set([]), pipe_texture: new Set([]) } }
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.error === "invalid_unlock_type")).toBe(true);
  });
});
