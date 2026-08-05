import { describe, expect, it } from "vitest";

import { parseSleepDays, parseSummaryDays } from "./days.js";

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

describe("parseSummaryDays", () => {
  it("accepts whole days within the supported range", () => {
    expect(parseSummaryDays("1")).toBe(1);
    expect(parseSummaryDays("30")).toBe(30);
    expect(parseSummaryDays("90")).toBe(90);
  });

  it("rejects a range the summary endpoint would refuse", () => {
    expect(() => parseSummaryDays("91")).toThrow(/between 1 and 90/);
    expect(() => parseSummaryDays("365")).toThrow(/between 1 and 90/);
  });

  it.each(["0", "-1", "1.5", "seven", ""])(
    "rejects invalid value %j",
    (value) => {
      expect(() => parseSummaryDays(value)).toThrow(/between 1 and 90/);
    },
  );
});
