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
  const resolved = resolveRelativeDate(value, now);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(resolved);

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
    date: resolved,
    from: toIsoWithLocalOffset(from),
    to: toIsoWithLocalOffset(to),
    timeZone,
  };
}

/** Décalage en jours de chaque forme relative acceptée, avant résolution. */
const RELATIVE_DAYS_AGO = new Map([
  ["today", 0],
  ["yesterday", 1],
]);

/**
 * Résout `today` et `yesterday` en jour civil local, et laisse passer tout le
 * reste vers la validation habituelle.
 *
 * Un script planifié n'a ainsi plus à calculer la veille lui-même : `date`
 * l'écrit `-d yesterday` sur GNU et `-v-1d` sur BSD, donc la seule commande
 * dont une tâche cron a besoin tous les jours n'était pas portable.
 *
 * Aucune forme préfixée d'un tiret, `-3d` par exemple : commander la lirait
 * comme une option plutôt que comme la valeur de `--date`.
 */
function resolveRelativeDate(value: string, now: Date): string {
  const daysAgo = RELATIVE_DAYS_AGO.get(value.trim().toLowerCase());

  if (daysAgo === undefined) {
    return value;
  }

  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
  );

  const year = target.getFullYear().toString().padStart(4, "0");
  const month = (target.getMonth() + 1).toString().padStart(2, "0");
  const day = target.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
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
    "--date must be today, yesterday, or a valid, non-future date in YYYY-MM-DD format.",
  );
}
