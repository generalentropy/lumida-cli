import { describe, expect, it } from "vitest";

import { BAR_MAX_CELLS, BAR_MIN_CELLS, barScale, renderBar } from "./bar.js";

describe("barScale", () => {
  it("returns the largest usable value of the series", () => {
    expect(barScale([120, 480, 300])).toBe(480);
  });

  it("ignores missing values", () => {
    expect(barScale([null, 300, null])).toBe(300);
  });

  it("returns zero for a series without any value", () => {
    expect(barScale([])).toBe(0);
    expect(barScale([null, null])).toBe(0);
  });
});

describe("renderBar", () => {
  it("reaches the full length at the series maximum", () => {
    expect(renderBar(480, 480)).toHaveLength(BAR_MAX_CELLS);
  });

  it("halves the length at half the maximum", () => {
    expect(renderBar(240, 480)).toHaveLength(BAR_MAX_CELLS / 2);
  });

  it("keeps a small value readable through the minimum length", () => {
    expect(renderBar(1, 480)).toHaveLength(BAR_MIN_CELLS);
    expect(renderBar(45, 480)).toHaveLength(BAR_MIN_CELLS);
  });

  it("draws nothing without a usable measurement", () => {
    expect(renderBar(null, 480)).toBe("");
    expect(renderBar(0, 480)).toBe("");
    expect(renderBar(-30, 480)).toBe("");
    expect(renderBar(Number.NaN, 480)).toBe("");
  });

  it("draws nothing when the scale is unusable", () => {
    expect(renderBar(300, 0)).toBe("");
    expect(renderBar(300, Number.NaN)).toBe("");
  });

  it("never exceeds the maximum length, whatever the value", () => {
    for (const minutes of [480, 10_000, Number.MAX_SAFE_INTEGER]) {
      expect(renderBar(minutes, 480).length).toBeLessThanOrEqual(
        BAR_MAX_CELLS,
      );
    }
  });

  it("honours a custom maximum length", () => {
    expect(renderBar(480, 480, 8)).toHaveLength(8);
    expect(renderBar(240, 480, 8)).toHaveLength(4);
  });

  it("keeps the minimum below the maximum when the column is narrow", () => {
    expect(renderBar(1, 480, 2)).toHaveLength(2);
    expect(renderBar(1, 480, 1)).toHaveLength(1);
    expect(renderBar(1, 480, 0)).toBe("");
  });

  it("grows monotonically with the value", () => {
    let previous = 0;

    for (const minutes of [1, 60, 120, 240, 360, 480]) {
      const current = renderBar(minutes, 480).length;

      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it("uses a mark that leaves a vertical gap between rows", () => {
    // Un bloc pleine hauteur collerait les lignes entre elles.
    expect(renderBar(480, 480)).not.toContain("█");
    expect(new Set(renderBar(480, 480)).size).toBe(1);
  });
});
