import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { UNLOCKABLE_TYPES } from "../unlockables.js";
import { getPurchasableUnlockablesByType, renderShopItems } from "../shopMenu.js";

describe("shop menu helpers", () => {
  it("filters and sorts purchasable unlockables by type", () => {
    const unlockables = [
      { id: "a", type: UNLOCKABLE_TYPES.playerTexture, name: "A", unlock: { type: "purchase", cost: 20 } },
      { id: "b", type: UNLOCKABLE_TYPES.playerTexture, name: "B", unlock: { type: "purchase", cost: 10 } },
      { id: "c", type: UNLOCKABLE_TYPES.trail, name: "C", unlock: { type: "purchase", cost: 5 } },
      { id: "d", type: UNLOCKABLE_TYPES.playerTexture, name: "D", unlock: { type: "score", minScore: 10 } }
    ];

    const icons = getPurchasableUnlockablesByType(unlockables, UNLOCKABLE_TYPES.playerTexture);
    expect(icons.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("renders an empty hint when no items are present", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const container = dom.window.document.getElementById("root");
    const { rendered } = renderShopItems({ container, items: [] });
    expect(rendered).toBe(0);
    expect(container?.textContent).toContain("No purchasable items");
  });

  it("renders purchasable items with purchase hooks", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const container = dom.window.document.getElementById("root");
    const onPurchase = vi.fn();
    const items = [
      { id: "spark", type: UNLOCKABLE_TYPES.playerTexture, name: "Spark", unlock: { type: "purchase", cost: 15 } }
    ];

    const { rendered } = renderShopItems({
      container,
      items,
      context: { ownedIds: [] },
      onPurchase
    });

    expect(rendered).toBe(1);
    const button = container?.querySelector("button.shop-item");
    expect(button?.dataset.unlockableId).toBe("spark");
    expect(button?.dataset.unlockableType).toBe(UNLOCKABLE_TYPES.playerTexture);
    button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: "spark" }));
  });

  it("marks owned shop items as already owned and disables purchases", () => {
    const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
    const container = dom.window.document.getElementById("root");
    const onPurchase = vi.fn();
    const items = [
      { id: "trail-1", type: UNLOCKABLE_TYPES.trail, name: "Trail One", unlock: { type: "purchase", cost: 25 } }
    ];

    renderShopItems({
      container,
      items,
      context: { ownedIds: ["trail-1"] },
      onPurchase
    });

    const button = container?.querySelector("button.shop-item");
    expect(button?.classList.contains("owned")).toBe(true);
    expect(button?.getAttribute("aria-disabled")).toBe("true");
    expect(button?.dataset.owned).toBe("true");
    expect(button?.querySelector(".shop-item-cost")?.textContent).toBe("Already Owned");
    expect(button?.querySelector(".shop-item-owned")?.textContent).toBe("Already Owned");
    button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(onPurchase).not.toHaveBeenCalled();
  });
});
