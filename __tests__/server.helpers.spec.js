import { beforeAll, describe, expect, it } from "vitest";

let server;

beforeAll(async () => {
  server = await import("../server.cjs");
});

const baseUser = () => ({
  username: "champ",
  key: "champ",
  bestScore: 5000,
  selectedTrail: "world_record",
  selectedIcon: "hi_vis_red",
  selectedPipeTexture: "basic",
  pipeTextureMode: "NORMAL",
  ownedIcons: [],
  ownedUnlockables: [],
  keybinds: {},
  runs: 10,
  totalScore: 42_000,
  longestRun: 0,
  totalTimePlayed: 0,
  bustercoins: 120,
  currencies: { bustercoin: 120 }
});

describe("server helpers (trails)", () => {
  it("strips record-holder trails when the user is not the record holder", () => {
    const u = baseUser();
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.selectedTrail).toBe("classic");
    expect(server.unlockedTrails({ achievements: u.achievements, bestScore: u.bestScore }, { recordHolder: false })).not.toContain("world_record");
  });

  it("preserves record-holder trails when flagged as record holder", () => {
    const u = baseUser();
    server.ensureUserSchema(u, { recordHolder: true });
    expect(u.selectedTrail).toBe("world_record");
    expect(server.unlockedTrails({ achievements: u.achievements, bestScore: u.bestScore }, { recordHolder: true })).toContain("world_record");
  });

  it("exposes the correct unlock list via publicUser with record-holder status", () => {
    const u = baseUser();
    server.ensureUserSchema(u, { recordHolder: true });
    const publicRecordHolder = server.publicUser(u, { recordHolder: true });
    const publicGuest = server.publicUser(u, { recordHolder: false });

    expect(publicRecordHolder.isRecordHolder).toBe(true);
    expect(publicRecordHolder.unlockedTrails).toContain("world_record");
    expect(publicGuest.isRecordHolder).toBe(false);
    expect(publicGuest.unlockedTrails).not.toContain("world_record");
  });

  it("applies default skill settings when missing", () => {
    const u = baseUser();
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.settings).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "normal",
      invulnBehavior: "long"
    });
  });

  it("normalizes icon selection to an unlocked default", () => {
    const u = { ...baseUser(), selectedIcon: "missing", ownedIcons: ["hi_vis_orange"] };
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.selectedIcon).toBe("hi_vis_orange");
    const pub = server.publicUser(u, { recordHolder: false });
    expect(pub.selectedIcon).toBe("hi_vis_orange");
    expect(pub.unlockedIcons).toContain("hi_vis_orange");
  });

  it("normalizes pipe texture selection to an unlocked default", () => {
    const u = { ...baseUser(), selectedPipeTexture: "digital", bestScore: 0 };
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.selectedPipeTexture).toBe("basic");
    const pub = server.publicUser(u, { recordHolder: false });
    expect(pub.selectedPipeTexture).toBe("basic");
    expect(pub.unlockedPipeTextures).toContain("basic");
  });

  it("seeds achievement progress defaults when absent", () => {
    const u = baseUser();
    u.achievements = null;
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.achievements.progress).toMatchObject({
      bestScore: u.bestScore,
      maxScoreNoOrbs: 0,
      maxScoreNoAbilities: 0,
      maxPerfectsInRun: 0,
      totalPerfects: 0,
      maxOrbsInRun: 0,
      totalOrbsCollected: 0,
      maxOrbComboInRun: 0,
      maxPerfectComboInRun: 0,
      maxPipesDodgedInRun: 0,
      totalPipesDodged: 0,
      totalScore: 0,
      maxRunTime: 0,
      totalRunTime: 0,
      totalRuns: u.runs,
      skillTotals: { dash: 0, phase: 0, teleport: 0, slowField: 0 }
    });
    expect(Object.keys(u.achievements.unlocked || {})).toEqual(expect.arrayContaining(["trail_classic_1", "play_10_games"]));
    expect(Object.keys(u.achievements.unlocked || {})).not.toEqual(expect.arrayContaining(["run_time_60", "pipes_broken_explosion_10"]));
    expect(u.skillTotals).toEqual({ dash: 0, phase: 0, teleport: 0, slowField: 0 });
  });

  it("requires explicit achievements for non-score trails even with a high best score", () => {
    const unlocked = server.unlockedTrails(
      { achievements: { unlocked: {}, progress: {} }, bestScore: 5000 },
      { recordHolder: false }
    );

    expect(unlocked).not.toContain("rainbow");
    expect(unlocked).not.toContain("lemon_slice");
    expect(unlocked).not.toContain("honeycomb");
  });

  it("locks purchasable trails until the user owns them", () => {
    const u = { ...baseUser(), selectedTrail: "starlight_pop", ownedUnlockables: [] };
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.selectedTrail).toBe("classic");

    const locked = server.unlockedTrails(
      { achievements: u.achievements, bestScore: u.bestScore, ownedIds: [] },
      { recordHolder: false }
    );
    expect(locked).not.toContain("starlight_pop");

    const unlocked = server.unlockedTrails(
      { achievements: u.achievements, bestScore: u.bestScore, ownedIds: ["starlight_pop"] },
      { recordHolder: false }
    );
    expect(unlocked).toContain("starlight_pop");
  });

  it("normalizes invalid binds/settings and clamps counters", () => {
    const u = {
      username: "champ",
      key: "champ",
      bestScore: 42,
      selectedTrail: "classic",
      keybinds: {
        dash: { type: "key", code: "KeyF" },
        phase: { type: "mouse", button: 2 },
        teleport: { type: "mouse", button: 9 }, // invalid button -> default
        slowField: { type: "key", code: "Slow Field" } // invalid code -> default
      },
      settings: { dashBehavior: "laser", slowFieldBehavior: "plasma", teleportBehavior: "storm", invulnBehavior: "forever" },
      runs: -10,
      totalScore: -99,
      longestRun: -5,
      totalTimePlayed: -20
    };

    server.ensureUserSchema(u, { recordHolder: false });

    expect(u.keybinds.teleport).toEqual({ type: "mouse", button: 0 });
    expect(u.keybinds.phase).toEqual({ type: "mouse", button: 2 });
    expect(u.keybinds.slowField).toEqual({ type: "key", code: "KeyE" });
    expect(u.settings).toEqual({
      dashBehavior: "destroy",
      slowFieldBehavior: "explosion",
      teleportBehavior: "normal",
      invulnBehavior: "long"
    });
    expect(u.runs).toBe(0);
    expect(u.totalScore).toBe(0);
    expect(u.longestRun).toBe(0);
    expect(u.totalTimePlayed).toBe(0);
    expect(u.bustercoins).toBe(0);
  });
});
