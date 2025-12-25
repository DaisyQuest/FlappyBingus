import { describe, expect, it } from "vitest";
import { applyBustercoinEarnings, _testables } from "../bustercoins.js";

describe("bustercoin helpers", () => {
  const { normalizeCount } = _testables();

  it("normalizes and clamps coin counts", () => {
    expect(normalizeCount(5.7)).toBe(5);
    expect(normalizeCount(-4)).toBe(0);
    expect(normalizeCount("8")).toBe(8);
    expect(normalizeCount(NaN)).toBe(0);
  });

  it("applies earned coins to the user model and UI", () => {
    const net = { user: { username: "bingus", bustercoins: 2, currencies: { bustercoin: 2 } } };
    const badge = { textContent: "" };

    const res = applyBustercoinEarnings(net, 3.9, badge);

    expect(res).toEqual({ applied: true, total: 5 });
    expect(net.user.bustercoins).toBe(5);
    expect(net.user.currencies).toEqual({ bustercoin: 5 });
    expect(badge.textContent).toBe("5");
  });

  it("no-ops when no user is present", () => {
    const net = { user: null };
    const badge = { textContent: "stale" };

    const res = applyBustercoinEarnings(net, 10, badge);

    expect(res).toEqual({ applied: false, total: null });
    expect(badge.textContent).toBe("stale");
  });
});
