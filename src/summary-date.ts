import { CliError } from "./errors.js";

export interface SummaryDateRange {
  date: string;
  from: string;
  to: string;
  timeZone: string;
}

export function createSummaryDateRange(
  value: string,
  now = new Date(),
): SummaryDateRange {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw invalidDateError();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const from = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    from.getFullYear() !== year ||
    from.getMonth() !== month - 1 ||
    from.getDate() !== day ||
    from.getTime() > now.getTime()
  ) {
    throw invalidDateError();
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!timeZone) {
    throw new CliError("Could not determine the system time zone.");
  }

  const to = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  return {
    date: value,
    from: toIsoWithLocalOffset(from),
    to: toIsoWithLocalOffset(to),
    timeZone,
  };
}

function toIsoWithLocalOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60)
    .toString()
    .padStart(2, "0");
  const offsetRemainder = (absoluteOffset % 60).toString().padStart(2, "0");
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 19);

  return `${localTime}${sign}${offsetHours}:${offsetRemainder}`;
}

function invalidDateError(): CliError {
  return new CliError(
    "--date must be a valid, non-future date in YYYY-MM-DD format.",
  );
}
