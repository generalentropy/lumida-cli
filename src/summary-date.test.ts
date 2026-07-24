import { describe, expect, it } from "vitest";

import { createSummaryDateRange } from "./summary-date.js";

describe("createSummaryDateRange", () => {
  const now = new Date(2026, 6, 24, 12, 0, 0);

  it("builds the local calendar-day boundaries", () => {
    const range = createSummaryDateRange("2026-07-01", now);
    const duration =
      new Date(range.to).getTime() - new Date(range.from).getTime();

    expect(range.date).toBe("2026-07-01");
    expect(range.from).toMatch(/^2026-07-01T00:00:00[+-]\d{2}:\d{2}$/);
    expect(range.to).toMatch(/^2026-07-02T00:00:00[+-]\d{2}:\d{2}$/);
    expect(duration).toBeGreaterThanOrEqual(23 * 60 * 60 * 1_000);
    expect(duration).toBeLessThanOrEqual(25 * 60 * 60 * 1_000);
    expect(range.timeZone.length).toBeGreaterThan(0);
  });

  it.each(["2026/07/01", "2026-02-30", "not-a-date", ""])(
    "rejects invalid date %j",
    (value) => {
      expect(() => createSummaryDateRange(value, now)).toThrow(
        /YYYY-MM-DD/,
      );
    },
  );

  it("rejects a future date", () => {
    expect(() => createSummaryDateRange("2026-07-25", now)).toThrow(
      /non-future/,
    );
  });
});
