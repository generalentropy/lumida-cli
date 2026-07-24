import { describe, expect, it } from "vitest";

import { parseSleepDays } from "./sleep-days.js";

describe("parseSleepDays", () => {
  it("accepts whole days within the supported range", () => {
    expect(parseSleepDays("1")).toBe(1);
    expect(parseSleepDays("7")).toBe(7);
    expect(parseSleepDays("365")).toBe(365);
  });

  it.each(["0", "366", "-1", "1.5", "seven", ""])(
    "rejects invalid value %j",
    (value) => {
      expect(() => parseSleepDays(value)).toThrow(/between 1 and 365/);
    },
  );
});
