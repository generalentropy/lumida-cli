import { CliError } from "./errors.js";

export const DEFAULT_SLEEP_DAYS = 7;
export const MAX_SLEEP_DAYS = 365;

export function parseSleepDays(value: unknown): number {
  const text = typeof value === "string" ? value.trim() : "";

  if (!/^\d+$/.test(text)) {
    throw invalidDaysError();
  }

  const days = Number(text);

  if (!Number.isSafeInteger(days) || days < 1 || days > MAX_SLEEP_DAYS) {
    throw invalidDaysError();
  }

  return days;
}

function invalidDaysError(): CliError {
  return new CliError(
    `--days must be an integer between 1 and ${MAX_SLEEP_DAYS}.`,
  );
}
