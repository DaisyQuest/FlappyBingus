import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { renderHighscores, __testables } from "../highscores.js";

describe("renderHighscores", () => {
  let document;
  let container;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body><div id='wrap'></div></body>");
    document = dom.window.document;
    container = document.createElement("div");
    container.id = "hsWrap";
    document.getElementById("wrap").appendChild(container);
  });

  it("shows offline hint and preserves hsWrap class", () => {
    renderHighscores({ container, online: false, highscores: [] });

    expect(container.className.split(" ")).toEqual(expect.arrayContaining(["hsWrap", "hint", "bad"]));
    expect(container.textContent).toContain("Leaderboard unavailable");
  });

  it("handles empty highscores list with a friendly message", () => {
    renderHighscores({ container, online: true, highscores: [] });

    expect(container.className.split(" ")).toEqual(expect.arrayContaining(["hsWrap", "hint"]));
    expect(container.textContent).toContain("No scores yet");
  });

  it("renders every entry with numbering, scroll wrapper, and user highlight", () => {
    const highscores = Array.from({ length: 12 }, (_, i) => ({ username: `user${i + 1}`, bestScore: 100 - i }));
    highscores[5].username = "me";

    renderHighscores({ container, online: true, highscores, currentUser: { username: "me" } });

    expect(container.className).toBe("hsWrap");
    const scroll = container.querySelector(".hsTableWrap");
    expect(scroll).toBeTruthy();
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(12);
    expect(rows[0].querySelector("td")?.textContent).toBe("1");
    expect(rows[11].querySelector("td")?.textContent).toBe("12");
    expect(rows[5].textContent).toContain("(you)");
  });

  it("escapes usernames to prevent HTML injection", () => {
    renderHighscores({ container, online: true, highscores: [{ username: "<b>bad</b>", bestScore: 1 }] });

    expect(container.innerHTML).not.toContain("<b>bad</b>");
    expect(container.textContent).toContain("<b>bad</b>");
  });

  it("setWrapState composes hsWrap with provided classes", () => {
    __testables.setWrapState(container, ["hint", "warn"], "hello");

    expect(container.className).toContain("hsWrap");
    expect(container.className).toContain("warn");
    expect(container.textContent).toBe("hello");
  });

  it("caps the visible leaderboard height to the first 10 entries", () => {
    const highscores = Array.from({ length: 14 }, (_, i) => ({ username: `user${i + 1}`, bestScore: 200 - i }));
    renderHighscores({ container, online: true, highscores });

    const scroll = container.querySelector(".hsTableWrap");
    expect(scroll?.style.maxHeight).toBe("376px"); // 36 header + 10 * 34px rows (fallbacks)
  });

  it("applies real DOM measurements when available", () => {
    const scroll = document.createElement("div");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.getBoundingClientRect = () => ({ height: 20, width: 0, x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0 });
    thead.append(headerRow);

    const tbody = document.createElement("tbody");
    for (let i = 0; i < 3; i += 1) {
      const row = document.createElement("tr");
      row.getBoundingClientRect = () => ({
        height: 18,
        width: 0,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      });
      tbody.append(row);
    }

    const maxHeight = __testables.applyLeaderboardHeight(scroll, thead, tbody);
    expect(maxHeight).toBe(20 + 3 * 18);
    expect(scroll.style.maxHeight).toBe("74px");
  });

  it("measureHeight falls back when measurements are missing", () => {
    expect(__testables.measureHeight(null, 10)).toBe(10);
    expect(__testables.measureHeight({}, 12)).toBe(12);
    expect(__testables.measureHeight({ getBoundingClientRect: () => ({ height: 0 }) }, 4)).toBe(4);
    expect(__testables.measureHeight({ getBoundingClientRect: () => ({ height: 5 }) }, 9)).toBe(5);
  });

  it("adds play controls when a replay handler is provided", () => {
    const highscores = [{ username: "alice", bestScore: 42 }];
    const onPlayRun = vi.fn();

    renderHighscores({ container, online: true, highscores, onPlayRun });

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Play");
    button?.click();
    expect(onPlayRun).toHaveBeenCalledWith("alice");
  });

  it("adds details controls when a details handler is provided", () => {
    const highscores = [{ username: "alice", bestScore: 42 }];
    const onPlayRun = vi.fn();
    const onShowDetails = vi.fn();

    renderHighscores({ container, online: true, highscores, onPlayRun, onShowDetails });

    const buttons = container.querySelectorAll("button");
    expect(Array.from(buttons).map((btn) => btn.textContent)).toEqual(["Play", "Details"]);
    buttons[1].click();
    expect(onShowDetails).toHaveBeenCalledWith(highscores[0]);
  });

  it("renders details-only actions when no replay handler is provided", () => {
    const highscores = [{ username: "solo", bestScore: 12 }];
    const onShowDetails = vi.fn();

    renderHighscores({ container, online: true, highscores, onShowDetails });

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("Details");
    buttons[0].click();
    expect(onShowDetails).toHaveBeenCalledWith(highscores[0]);
  });
});
