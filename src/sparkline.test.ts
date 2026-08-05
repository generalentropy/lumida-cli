import { describe, expect, it } from "vitest";

import { SPARK_PLACEHOLDER, sparkBar, sparkScale } from "./sparkline.js";

describe("sparkScale", () => {
  it("returns the largest usable value of the series", () => {
    expect(sparkScale([120, 480, 300])).toBe(480);
  });

  it("ignores missing values", () => {
    expect(sparkScale([null, 300, null])).toBe(300);
  });

  it("returns zero for a series without any value", () => {
    expect(sparkScale([])).toBe(0);
    expect(sparkScale([null, null])).toBe(0);
  });
});

describe("sparkBar", () => {
  it("scales the block height to the series maximum", () => {
    expect(sparkBar(480, 480)).toBe("█");
    expect(sparkBar(240, 480)).toBe("▄");
    expect(sparkBar(60, 480)).toBe("▁");
  });

  it("keeps the column aligned when a value is missing", () => {
    expect(sparkBar(null, 480)).toBe(SPARK_PLACEHOLDER);
    expect(SPARK_PLACEHOLDER).toHaveLength(1);
  });

  it("keeps the column aligned when the scale is unusable", () => {
    expect(sparkBar(300, 0)).toBe(SPARK_PLACEHOLDER);
    expect(sparkBar(300, Number.NaN)).toBe(SPARK_PLACEHOLDER);
  });

  it("never exceeds the block range, whatever the value", () => {
    expect(sparkBar(1_000, 480)).toBe("█");
    expect(sparkBar(-50, 480)).toBe("▁");
    expect(sparkBar(0, 480)).toBe("▁");
  });

  it("renders every bar as a single character", () => {
    for (const minutes of [0, 30, 90, 240, 400, 480]) {
      expect(sparkBar(minutes, 480)).toHaveLength(1);
    }
  });
});
