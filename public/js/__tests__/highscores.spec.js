import { describe, it, expect, beforeEach } from "vitest";
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
});
