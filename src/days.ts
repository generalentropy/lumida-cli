import { CliError } from "./errors.js";

export const DEFAULT_SLEEP_DAYS = 7;
export const MAX_SLEEP_DAYS = 365;

// Un résumé agrège des rollups bornés côté Google : une plage longue devient
// une série d'appels chaînés. Le plafond est donc plus bas que celui du
// sommeil, qui ne demande qu'une liste de sessions.
export const MAX_SUMMARY_DAYS = 90;

function parseBoundedDays(
  value: unknown,
  maximum: number,
  option: string,
): number {
  const text = typeof value === "string" ? value.trim() : "";

  if (!/^\d+$/.test(text)) {
    throw invalidDaysError(maximum, option);
  }

  const days = Number(text);

  if (!Number.isSafeInteger(days) || days < 1 || days > maximum) {
    throw invalidDaysError(maximum, option);
  }

  return days;
}

export function parseSleepDays(value: unknown): number {
  return parseBoundedDays(value, MAX_SLEEP_DAYS, "--days");
}

export function parseSummaryDays(value: unknown): number {
  return parseBoundedDays(value, MAX_SUMMARY_DAYS, "--days");
}

function invalidDaysError(maximum: number, option: string): CliError {
  return new CliError(
    `${option} must be an integer between 1 and ${maximum}.`,
  );
}
