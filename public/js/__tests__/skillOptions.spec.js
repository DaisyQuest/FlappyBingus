import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { bindSkillOptionGroup, markSkillOptionSelection, readSkillOptionValue } from "../skillOptions.js";

let dom;
let container;
let buttons;
let document;

beforeEach(() => {
  dom = new JSDOM("<!doctype html><body></body>");
  document = dom.window.document;
  vi.stubGlobal("document", document);
  vi.stubGlobal("Element", dom.window.Element);

  container = document.createElement("div");
  container.className = "skill-option-grid";
  const values = ["ricochet", "destroy", "slow", "explosion"];
  buttons = values.map((value) => {
    const btn = document.createElement("button");
    btn.className = "skill-option";
    btn.dataset.value = value;
    btn.setAttribute("aria-pressed", "false");
    container.append(btn);
    return btn;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("markSkillOptionSelection", () => {
  it("sets aria-pressed and selected class on the matching button", () => {
    markSkillOptionSelection(container, "destroy");
    expect(buttons[1].classList.contains("selected")).toBe(true);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0].classList.contains("selected")).toBe(false);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("false");
  });

  it("no-ops safely when the container is missing", () => {
    expect(() => markSkillOptionSelection(null, "ricochet")).not.toThrow();
  });
});

describe("readSkillOptionValue", () => {
  it("extracts the dataset value when the target is inside the container", () => {
    const span = document.createElement("span");
    buttons[0].append(span);
    expect(readSkillOptionValue(container, span)).toBe("ricochet");
  });

  it("returns null for clicks outside the container or without data", () => {
    expect(readSkillOptionValue(container, document.createElement("button"))).toBeNull();
    expect(readSkillOptionValue(null, buttons[2])).toBeNull();
  });
});

describe("bindSkillOptionGroup", () => {
  it("invokes the callback for in-bounds clicks and cleans up after dispose", () => {
    const onSelect = vi.fn();
    const dispose = bindSkillOptionGroup(container, onSelect);

    buttons[3].click();
    expect(onSelect).toHaveBeenCalledWith("explosion");

    dispose();
    buttons[2].click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("returns a noop disposer when the container is missing", () => {
    const onSelect = vi.fn();
    const dispose = bindSkillOptionGroup(null, onSelect);
    expect(dispose).toBeTypeOf("function");
    expect(() => dispose()).not.toThrow();
  });
});
