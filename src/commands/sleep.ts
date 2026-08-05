import type { Command } from "commander";
import ora from "ora";
import pc from "picocolors";

import { isUnauthorizedError, type CliSleepHistory } from "../api/client.js";
import { barScale, renderBar } from "../bar.js";
import { DEFAULT_SLEEP_DAYS, MAX_SLEEP_DAYS, parseSleepDays } from "../days.js";
import { CliError } from "../errors.js";
import type { CommandContextFactory } from "./context.js";
import { mapHealthApiError } from "./health-error.js";
import { indent, printJson, printSectionHeader } from "./output.js";

type SleepOptions = {
  days: string;
  json?: boolean;
};

export function registerSleepCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("sleep")
    .description("Show your sleep history")
    .option(
      "-d, --days <number>",
      `Number of days to retrieve, from 1 to ${MAX_SLEEP_DAYS}`,
      String(DEFAULT_SLEEP_DAYS),
    )
    .option("--json", "Print the raw response as JSON")
    .action(async (options: SleepOptions) => {
      const days = parseSleepDays(options.days);
      const { api, credentials } = getContext();
      const accessToken = await credentials.read();

      if (!accessToken) {
        throw new CliError("You are not connected. Run lumida login first.");
      }

      const spinner = options.json
        ? null
        : ora(`Fetching ${days} days of sleep history…`).start();

      try {
        const history = await api.getSleep(accessToken, days);

        spinner?.stop();

        if (options.json) {
          printJson(history);
          return;
        }

        printSleepHistory(history);
      } catch (error: unknown) {
        spinner?.fail("Could not retrieve sleep history.");

        if (isUnauthorizedError(error)) {
          await credentials.delete();
          throw new CliError(
            "The session expired. Run lumida login to reconnect.",
          );
        }

        throw mapHealthApiError(error);
      }
    });
}

function printSleepHistory(history: CliSleepHistory): void {
  printSectionHeader("LUMIDA SLEEP", `Last ${history.range.days} days`);

  if (history.sessions.length === 0) {
    console.log(indent("No sleep sessions found for this period."));
    return;
  }

  // Échelle commune à toute la période : chaque barre se lit directement,
  // et les longueurs restent comparables d'une ligne à l'autre.
  const scale = barScale(
    history.sessions.map((session) => session.minutesAsleep),
  );

  console.log(
    indent(
      `${pc.dim("Date".padEnd(14))}${pc.dim("Type".padEnd(8))}${pc.dim(
        "Duration".padEnd(12),
      )}${pc.dim("Time".padEnd(20))}${pc.dim("Trend")}`,
    ),
  );

  for (const session of history.sessions) {
    const date = formatDate(session.endTime).padEnd(14);
    const type = (session.isNap ? "Nap" : "Sleep").padEnd(8);
    const duration = formatDuration(session.minutesAsleep).padEnd(12);
    const interval = `${formatTime(session.startTime)} – ${formatTime(
      session.endTime,
    )}`.padEnd(20);
    const trend = renderBar(session.minutesAsleep, scale);

    console.log(indent(`${date}${type}${duration}${interval}${trend}`));
  }

  if (history.partial) {
    console.log();
    console.warn(
      indent(
        pc.yellow(
          "The history is incomplete because the upstream result limit was reached.",
        ),
      ),
    );
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(totalMinutes: number | null): string {
  if (totalMinutes === null) {
    return "—";
  }

  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
}
