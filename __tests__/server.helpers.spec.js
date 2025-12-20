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
  settings: { dashBehavior: "dashDestroy", slowFieldBehavior: "slowExplosion" },
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

  it("normalizes skill settings for public users", () => {
    const u = baseUser();
    u.settings = { dashBehavior: "unknown", slowFieldBehavior: "slowField" };
    server.ensureUserSchema(u, { recordHolder: false });

    const publicUser = server.publicUser(u, { recordHolder: false });
    expect(publicUser.settings.dashBehavior).toBe("dashRicochet");
    expect(publicUser.settings.slowFieldBehavior).toBe("slowField");
  });
});
