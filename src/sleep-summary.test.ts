import { describe, expect, it } from "vitest";

import { summarizeSleep, type SleepSessionLike } from "./sleep-summary.js";

/**
 * Construit un `endTime` à partir d'une heure locale. Le décalage porté par la
 * chaîne est donc celui du runner, ce qui est précisément le cas que le
 * découpage naïf d'une chaîne ISO échouerait à traiter.
 */
function endingAt(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes = 0,
): string {
  return new Date(year, monthIndex, day, hours, minutes).toISOString();
}

function night(endTime: string, minutesAsleep: number | null): SleepSessionLike {
  return { endTime, isNap: false, minutesAsleep };
}

function nap(endTime: string, minutesAsleep: number): SleepSessionLike {
  return { endTime, isNap: true, minutesAsleep };
}

describe("summarizeSleep", () => {
  it("averages the measured nights", () => {
    const aggregates = summarizeSleep([
      night(endingAt(2026, 7, 7, 6, 42), 450),
      night(endingAt(2026, 7, 6, 6, 15), 370),
    ]);

    expect(aggregates.averageMinutes).toBe(410);
    expect(aggregates.recordedNights).toBe(2);
    expect(aggregates.naps).toBe(0);
  });

  it("keeps naps out of the average and counts them apart", () => {
    const aggregates = summarizeSleep([
      night(endingAt(2026, 7, 7, 6, 42), 480),
      nap(endingAt(2026, 7, 6, 15, 15), 30),
      night(endingAt(2026, 7, 6, 6, 15), 420),
    ]);

    expect(aggregates.averageMinutes).toBe(450);
    expect(aggregates.naps).toBe(1);
    expect(aggregates.recordedNights).toBe(2);
  });

  it("counts two nights ending on the same local day as one", () => {
    const aggregates = summarizeSleep([
      night(endingAt(2026, 7, 7, 8, 10), 60),
      night(endingAt(2026, 7, 7, 6, 42), 420),
    ]);

    expect(aggregates.recordedNights).toBe(1);
    expect(aggregates.averageMinutes).toBe(240);
  });

  it("ignores a night without a measured duration, but still counts it", () => {
    const aggregates = summarizeSleep([
      night(endingAt(2026, 7, 7, 6, 42), 420),
      night(endingAt(2026, 7, 6, 6, 30), null),
    ]);

    expect(aggregates.averageMinutes).toBe(420);
    expect(aggregates.recordedNights).toBe(2);
  });

  it("reports no average when nothing was measured", () => {
    const aggregates = summarizeSleep([
      night(endingAt(2026, 7, 7, 6, 42), null),
      nap(endingAt(2026, 7, 6, 15, 0), 30),
    ]);

    expect(aggregates.averageMinutes).toBeNull();
    expect(aggregates.recordedNights).toBe(1);
    expect(aggregates.naps).toBe(1);
  });

  it("returns neutral aggregates for an empty period", () => {
    expect(summarizeSleep([])).toEqual({
      averageMinutes: null,
      recordedNights: 0,
      naps: 0,
    });
  });
});
