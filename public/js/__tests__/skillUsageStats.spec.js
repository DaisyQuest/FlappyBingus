import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import { renderSkillUsageStats } from "../skillUsageStats.js";

describe("skill usage stats renderer", () => {
  it("renders rows for every skill with clamped counts", () => {
    const dom = new JSDOM(`<!doctype html><body><div id="list"></div></body>`);
    const list = dom.window.document.getElementById("list");

    renderSkillUsageStats(list, { dash: 3.7, phase: -2, teleport: 1, slowField: 0 });

    const rows = list.querySelectorAll(".skill-usage-item");
    expect(rows).toHaveLength(4);
    expect(rows[0].querySelector(".skill-usage-count")?.textContent).toBe("3");
    expect(rows[1].querySelector(".skill-usage-count")?.textContent).toBe("0");
    expect(rows[2].querySelector(".skill-usage-count")?.textContent).toBe("1");
    expect(rows[3].querySelector(".skill-usage-count")?.textContent).toBe("0");
  });
});
