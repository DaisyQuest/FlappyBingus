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
  keybinds: {},
  runs: 10,
  totalScore: 42_000
});

describe("server helpers (trails)", () => {
  it("strips record-holder trails when the user is not the record holder", () => {
    const u = baseUser();
    server.ensureUserSchema(u, { recordHolder: false });
    expect(u.selectedTrail).toBe("classic");
    expect(server.unlockedTrails(u.bestScore, { recordHolder: false })).not.toContain("world_record");
  });

  it("preserves record-holder trails when flagged as record holder", () => {
    const u = baseUser();
    server.ensureUserSchema(u, { recordHolder: true });
    expect(u.selectedTrail).toBe("world_record");
    expect(server.unlockedTrails(u.bestScore, { recordHolder: true })).toContain("world_record");
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
});

describe("server helpers (replays)", () => {
  it("rejects invalid replay payloads", () => {
    const result = server.sanitizeReplayPayload(null, { score: 10 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_replay");
  });

  it("sanitizes replay payloads into bounded, playable shapes", () => {
    const payload = {
      seed: "abc",
      rngTape: [0.1, 0.2],
      ticks: [
        {
          move: { dx: 5, dy: -5 },
          cursor: { x: 99999, y: -999, has: true },
          actions: [{ id: "dash", cursor: { x: 2, y: 3, has: false } }, { id: "noop" }]
        }
      ]
    };
    const result = server.sanitizeReplayPayload(payload, { score: 77 });
    expect(result.ok).toBe(true);
    expect(result.replay.tickCount).toBe(1);
    expect(result.replay.actionCount).toBe(1);
    expect(result.replay.rngTape[0]).toBeGreaterThanOrEqual(0);

    const shaped = server.shapeReplayForClient(result.replay);
    expect(shaped.tickCount).toBe(1);
    expect(shaped.ticks[0].actions[0].id).toBe("dash");
  });
});
