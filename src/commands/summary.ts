import type { Command } from "commander";
import ora from "ora";
import pc from "picocolors";

import type { CliSummary, SummarySelection } from "../api/client.js";
import { isUnauthorizedError } from "../api/client.js";
import { MAX_SUMMARY_DAYS, parseSummaryDays } from "../days.js";
import { CliError } from "../errors.js";
import { createSummaryDateRange } from "../summary-date.js";
import type { CommandContextFactory } from "./context.js";
import { mapHealthApiError } from "./health-error.js";
import {
  CONTENT_INDENT,
  indent,
  printJson,
  printSectionHeader,
} from "./output.js";

type SummaryOptions = {
  date?: string;
  days?: string;
  json?: boolean;
};

function resolveSelection(
  options: SummaryOptions,
): SummarySelection | undefined {
  if (options.date !== undefined && options.days !== undefined) {
    throw new CliError("--date and --days cannot be combined.");
  }

  if (options.date !== undefined) {
    return { kind: "date", range: createSummaryDateRange(options.date) };
  }

  if (options.days !== undefined) {
    return { kind: "days", days: parseSummaryDays(options.days) };
  }

  return undefined;
}

export function registerSummaryCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("summary")
    .description("Show a health summary")
    .option(
      "--date <date>",
      "Calendar date in YYYY-MM-DD format, or today or yesterday",
    )
    .option(
      "-d, --days <number>",
      `Number of days to summarize, from 1 to ${MAX_SUMMARY_DAYS}`,
    )
    .option("--json", "Print the raw response as JSON")
    .action(async (options: SummaryOptions) => {
      const selection = resolveSelection(options);
      const { api, credentials } = getContext();
      const accessToken = await credentials.read();

      if (!accessToken) {
        throw new CliError("You are not connected. Run lumida login first.");
      }

      const spinner = options.json
        ? null
        : ora("Fetching your health summary…").start();

      try {
        const summary = await api.getSummary(accessToken, selection);

        spinner?.stop();

        if (options.json) {
          printJson(summary);
          return;
        }

        printSummary(summary, selection);
      } catch (error: unknown) {
        spinner?.fail("Could not retrieve the health summary.");

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

function printSummary(
  summary: CliSummary,
  selection: SummarySelection | undefined,
): void {
  printSectionHeader("LUMIDA", formatPeriod(summary, selection));

  printRow("Steps", formatNumber(summary.steps));
  printRow("Sleep", formatDuration(summary.sleepMinutes));
  printRow("Average heart rate", formatMetric(summary.averageHeartRate, "bpm"));
  printRow("Resting heart rate", formatMetric(summary.restingHeartRate, "bpm"));
  printRow(
    "Heart rate variability",
    formatMetric(summary.heartRateVariabilityMilliseconds, "ms"),
  );
  printRow(
    "Blood oxygen",
    formatMetric(summary.oxygenSaturationPercent, "%"),
  );

  if (summary.partial) {
    console.log();
    console.warn(
      indent(pc.yellow("Some data is incomplete for this period.")),
    );
  }
}

function formatPeriod(
  summary: CliSummary,
  selection: SummarySelection | undefined,
): string {
  if (selection?.kind === "date") {
    return formatCivilDate(selection.range.date);
  }

  if (selection?.kind === "days") {
    return `Last ${selection.days} days`;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(summary.generatedAt));
}

function formatCivilDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
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

function formatMetric(value: number | null, unit: string): string {
  return value === null
    ? "—"
    : `${new Intl.NumberFormat("en", {
        maximumFractionDigits: 1,
      }).format(value)} ${unit}`;
}

function printRow(label: string, value: string): void {
  console.log(
    `${CONTENT_INDENT}${pc.dim(label.padEnd(24))}${pc.bold(value)}`,
  );
}
