// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createRebindController, renderBindUI } from "../rebindControls.js";

const ACTIONS = [
  { id: "jump", label: "Jump" },
  { id: "dash", label: "Dash" }
];

describe("renderBindUI", () => {
  it("renders binds and listening state", () => {
    const bindWrap = document.createElement("div");
    renderBindUI({
      bindWrap,
      binds: { jump: "Space", dash: "KeyD" },
      actions: ACTIONS,
      listeningActionId: "jump",
      humanizeBind: (bind) => `(${bind})`
    });

    const rows = bindWrap.querySelectorAll(".bindRow");
    expect(rows).toHaveLength(2);
    const listeningRow = bindWrap.querySelector(".bindRow.listen");
    expect(listeningRow?.dataset.action).toBe("jump");
    expect(listeningRow?.querySelector(".bindKey")?.textContent).toBe("(Space)");
    const button = listeningRow?.querySelector("button.bindBtn");
    expect(button?.textContent).toBe("Listening…");
    expect(button?.disabled).toBe(true);
  });

  it("no-ops when the bind wrapper is missing", () => {
    expect(() => renderBindUI({
      bindWrap: null,
      binds: {},
      actions: ACTIONS,
      humanizeBind: (bind) => String(bind)
    })).not.toThrow();
  });
});

describe("createRebindController", () => {
  const setup = () => {
    const bindWrap = document.createElement("div");
    const bindHint = document.createElement("div");
    let binds = { jump: "Space", dash: "KeyD" };
    const setBinds = vi.fn((next) => { binds = next; });
    const getBinds = vi.fn(() => binds);
    const renderSpy = vi.fn();
    return { bindWrap, bindHint, bindsRef: () => binds, setBinds, getBinds, renderSpy };
  };

  it("cancels on escape and resets the hint", async () => {
    const { bindWrap, bindHint, getBinds, setBinds, renderSpy } = setup();
    const controller = createRebindController({
      bindWrap,
      bindHint,
      actions: ACTIONS,
      getBinds,
      setBinds,
      getNetUser: () => null,
      apiSetKeybinds: vi.fn(),
      saveGuestBinds: vi.fn(),
      setNetUser: vi.fn(),
      applyRebindWithSwap: vi.fn(),
      humanizeBind: (bind) => bind,
      keyEventToBind: (event) => event.code,
      pointerEventToBind: (event) => event.button,
      renderBindUI: renderSpy
    });

    controller.beginRebind("jump");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(bindHint.className).toBe("hint");
    expect(bindHint.textContent).toBe("Rebind cancelled.");
    expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ listeningActionId: null }));
  });

  it("persists keybinds for signed-in users", async () => {
    const { bindWrap, bindHint, getBinds, setBinds, renderSpy, bindsRef } = setup();
    const apiSetKeybinds = vi.fn(async () => ({ ok: true, user: { id: "user" } }));
    const setNetUser = vi.fn();
    const controller = createRebindController({
      bindWrap,
      bindHint,
      actions: ACTIONS,
      getBinds,
      setBinds,
      getNetUser: () => ({ id: "user" }),
      apiSetKeybinds,
      saveGuestBinds: vi.fn(),
      setNetUser,
      applyRebindWithSwap: vi.fn(() => ({
        binds: { jump: "KeyZ", dash: "KeyD" },
        swappedWith: null
      })),
      humanizeBind: (bind) => bind,
      keyEventToBind: (event) => event.code,
      pointerEventToBind: (event) => event.button,
      renderBindUI: renderSpy
    });

    controller.beginRebind("jump");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiSetKeybinds).toHaveBeenCalledWith({ jump: "KeyZ", dash: "KeyD" });
    expect(setNetUser).toHaveBeenCalledWith({ id: "user" });
    expect(bindsRef()).toEqual({ jump: "KeyZ", dash: "KeyD" });
    expect(bindHint.className).toBe("hint good");
    expect(bindHint.textContent).toBe("Keybind updated.");
  });

  it("reverts when the server rejects keybinds", async () => {
    const { bindWrap, bindHint, getBinds, setBinds, renderSpy, bindsRef } = setup();
    const apiSetKeybinds = vi.fn(async () => ({ ok: false }));
    const controller = createRebindController({
      bindWrap,
      bindHint,
      actions: ACTIONS,
      getBinds,
      setBinds,
      getNetUser: () => ({ id: "user" }),
      apiSetKeybinds,
      saveGuestBinds: vi.fn(),
      setNetUser: vi.fn(),
      applyRebindWithSwap: vi.fn(() => ({
        binds: { jump: "KeyZ", dash: "KeyD" },
        swappedWith: null
      })),
      humanizeBind: (bind) => bind,
      keyEventToBind: (event) => event.code,
      pointerEventToBind: (event) => event.button,
      renderBindUI: renderSpy
    });

    controller.beginRebind("jump");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(bindsRef()).toEqual({ jump: "Space", dash: "KeyD" });
    expect(bindHint.className).toBe("hint bad");
    expect(bindHint.textContent).toBe("Server rejected keybinds (conflict/invalid). Reverted.");
  });

  it("saves guest binds and reports swaps", async () => {
    const { bindWrap, bindHint, getBinds, setBinds, renderSpy } = setup();
    const saveGuestBinds = vi.fn();
    const controller = createRebindController({
      bindWrap,
      bindHint,
      actions: ACTIONS,
      getBinds,
      setBinds,
      getNetUser: () => null,
      apiSetKeybinds: vi.fn(),
      saveGuestBinds,
      setNetUser: vi.fn(),
      applyRebindWithSwap: vi.fn(() => ({
        binds: { jump: "KeyD", dash: "Space" },
        swappedWith: "dash"
      })),
      humanizeBind: (bind) => bind,
      keyEventToBind: (event) => event.code,
      pointerEventToBind: (event) => event.button,
      renderBindUI: renderSpy
    });

    controller.beginRebind("jump");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveGuestBinds).toHaveBeenCalledWith({ jump: "KeyD", dash: "Space" });
    expect(bindHint.className).toBe("hint warn");
    expect(bindHint.textContent).toBe("That input was already in use; swapped bindings with Dash.");
  });

  it("ignores click events without a valid button", () => {
    const { bindWrap, bindHint, getBinds, setBinds, renderSpy } = setup();
    const controller = createRebindController({
      bindWrap,
      bindHint,
      actions: ACTIONS,
      getBinds,
      setBinds,
      getNetUser: () => null,
      apiSetKeybinds: vi.fn(),
      saveGuestBinds: vi.fn(),
      setNetUser: vi.fn(),
      applyRebindWithSwap: vi.fn(),
      humanizeBind: (bind) => bind,
      keyEventToBind: (event) => event.code,
      pointerEventToBind: (event) => event.button,
      renderBindUI: renderSpy
    });

    const event = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(event, "target", { value: document.createElement("div") });
    expect(() => controller.handleClick(event)).not.toThrow();
  });

  it("removes listeners when reset is called", async () => {
    const { bindWrap, bindHint, getBinds, setBinds, renderSpy } = setup();
    const applyRebindWithSwap = vi.fn(() => ({
      binds: { jump: "KeyZ", dash: "KeyD" },
      swappedWith: null
    }));
    const controller = createRebindController({
      bindWrap,
      bindHint,
      actions: ACTIONS,
      getBinds,
      setBinds,
      getNetUser: () => null,
      apiSetKeybinds: vi.fn(),
      saveGuestBinds: vi.fn(),
      setNetUser: vi.fn(),
      applyRebindWithSwap,
      humanizeBind: (bind) => bind,
      keyEventToBind: (event) => event.code,
      pointerEventToBind: (event) => event.button,
      renderBindUI: renderSpy
    });

    controller.beginRebind("jump");
    controller.reset();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(applyRebindWithSwap).not.toHaveBeenCalled();
  });
});
