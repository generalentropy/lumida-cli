import type { Command } from "commander";
import ora from "ora";
import pc from "picocolors";

import { isUnauthorizedError, type CliSleepHistory } from "../api/client.js";
import { CliError } from "../errors.js";
import { DEFAULT_SLEEP_DAYS, parseSleepDays } from "../sleep-days.js";
import type { CommandContextFactory } from "./context.js";
import { mapHealthApiError } from "./health-error.js";

type SleepOptions = {
  days: string;
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
      "Number of days to retrieve, from 1 to 365",
      String(DEFAULT_SLEEP_DAYS),
    )
    .action(async (options: SleepOptions) => {
      const days = parseSleepDays(options.days);
      const { api, credentials } = getContext();
      const accessToken = await credentials.read();

      if (!accessToken) {
        throw new CliError("You are not connected. Run lumida login first.");
      }

      const spinner = ora(`Fetching ${days} days of sleep history…`).start();

      try {
        const history = await api.getSleep(accessToken, days);

        spinner.succeed("Sleep history retrieved.");
        printSleepHistory(history);
      } catch (error: unknown) {
        spinner.fail("Could not retrieve sleep history.");

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
  console.log();
  console.log(pc.bold(pc.cyan("LUMIDA SLEEP")));
  console.log(pc.dim(`Last ${history.range.days} days`));
  console.log();

  if (history.sessions.length === 0) {
    console.log("No sleep sessions found for this period.");
    return;
  }

  console.log(
    `${pc.dim("Date".padEnd(14))}${pc.dim("Type".padEnd(8))}${pc.dim(
      "Duration".padEnd(12),
    )}${pc.dim("Time")}`,
  );

  for (const session of history.sessions) {
    const date = formatDate(session.endTime).padEnd(14);
    const type = (session.isNap ? "Nap" : "Sleep").padEnd(8);
    const duration = formatDuration(session.minutesAsleep).padEnd(12);
    const interval = `${formatTime(session.startTime)} – ${formatTime(
      session.endTime,
    )}`;

    console.log(`${date}${type}${duration}${interval}`);
  }

  if (history.partial) {
    console.log();
    console.warn(
      pc.yellow(
        "The history is incomplete because the upstream result limit was reached.",
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
