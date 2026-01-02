"use strict";

import { describe, expect, it } from "vitest";
import { formatReplayMeta, renderPlayerCardJpeg, __testables } from "../services/playerCard.cjs";

describe("playerCard renderer", () => {
  it("formats replay meta values for card display", () => {
    const meta = formatReplayMeta({
      bestScore: 1234,
      durationMs: 61_000,
      recordedAt: Date.UTC(2024, 0, 2, 3, 4),
      ticksLength: 90,
      replayBytes: 2048
    });

    expect(meta).toEqual({
      score: 1234,
      duration: "1:01",
      recordedAt: "2024-01-02 03:04",
      ticks: 90,
      bytes: "2.0 KB"
    });
  });

  it("covers formatting edge cases for durations, bytes, and dates", () => {
    expect(__testables.formatRunDuration(-5)).toBe("0:00");
    expect(__testables.formatRunDuration(59)).toBe("0:59");
    expect(__testables.formatRunDuration(3600)).toBe("1:00:00");

    expect(__testables.formatBytes(0)).toBe("0 B");
    expect(__testables.formatBytes(512)).toBe("512 B");
    expect(__testables.formatBytes(2048)).toBe("2.0 KB");
    expect(__testables.formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");

    expect(__testables.formatDate(Number.NaN)).toBe("—");
    expect(__testables.formatDate(0)).toBe("—");
  });

  it("builds replay detail rows with optional run stats", () => {
    const { rows, stats } = __testables.buildReplayDetailsRows(
      {
        bestScore: 2000,
        durationMs: 30_000,
        recordedAt: Date.UTC(2024, 5, 10, 12, 30),
        ticksLength: 90,
        replayBytes: 1024
      },
      {
        runStats: {
          orbsCollected: 0,
          perfects: 4,
          pipesDodged: 12
        }
      }
    );

    expect(rows).toEqual([
      { label: "BEST SCORE", value: "2,000" },
      { label: "DURATION", value: "0:30" },
      { label: "RECORDED", value: "2024-06-10 12:30" },
      { label: "TICKS", value: "90" },
      { label: "REPLAY SIZE", value: "1.0 KB" }
    ]);
    expect(stats).toEqual([
      { label: "ORBS", value: "0" },
      { label: "PERFECTS", value: "4" },
      { label: "PIPES DODGED", value: "12" }
    ]);
  });

  it("measures and draws text using the bitmap font", () => {
    expect(__testables.measureTextWidth("", 2)).toBe(0);
    expect(__testables.measureTextWidth("A", 2)).toBeGreaterThan(0);
    expect(__testables.getGlyph("$")).toEqual(__testables.getGlyph("?"));
  });

  it("positions the footer url within the panel bounds", () => {
    const layout = __testables.getFooterLayout(24, 24, 800 - 48, 450 - 48);
    expect(layout.text).toBe(__testables.FOOTER_TEXT);
    expect(layout.scale).toBe(__testables.FOOTER_SCALE);
    expect(layout.x).toBeGreaterThanOrEqual(24 + 32);
    expect(layout.y).toBeGreaterThanOrEqual(24 + 32);
  });

  it("clamps the footer url when the text is too wide", () => {
    const layout = __testables.getFooterLayout(24, 24, 120, 200, "https://flappybing.us/overflows", 2);
    expect(layout.x).toBe(24 + 32);
    expect(layout.textWidth).toBeGreaterThan(120 - 64);
  });

  it("renders a JPEG buffer for player cards", () => {
    const buffer = renderPlayerCardJpeg({
      entry: {
        username: "PlayerOne",
        bestScore: 3210,
        durationMs: 65_000,
        recordedAt: Date.UTC(2024, 1, 12, 9, 15),
        ticksLength: 120,
        replayBytes: 4096
      },
      run: { runStats: { orbsCollected: 2, perfects: 1, pipesDodged: 12, abilitiesUsed: 3 } }
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(5000);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });

  it("throws when entry data is missing", () => {
    expect(() => renderPlayerCardJpeg()).toThrow("missing_entry");
  });
});
