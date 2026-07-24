import type { Command } from "commander";
import ora from "ora";
import pc from "picocolors";

import { isUnauthorizedError } from "../api/client.js";
import { CliError } from "../errors.js";
import { createSummaryDateRange } from "../summary-date.js";
import type { CommandContextFactory } from "./context.js";
import { mapHealthApiError } from "./health-error.js";

type SummaryOptions = {
  date?: string;
};

const CONTENT_INDENT = "  ";
const SUMMARY_SEPARATOR = "─".repeat(38);

export function registerSummaryCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("summary")
    .description("Show a health summary")
    .option("--date <date>", "Calendar date in YYYY-MM-DD format")
    .action(async (options: SummaryOptions) => {
      const dateRange = options.date
        ? createSummaryDateRange(options.date)
        : undefined;
      const { api, credentials } = getContext();
      const accessToken = await credentials.read();

      if (!accessToken) {
        throw new CliError("You are not connected. Run lumida login first.");
      }

      const spinner = ora("Fetching your health summary…").start();

      try {
        const summary = await api.getSummary(accessToken, dateRange);

        spinner.stop();
        printSummary(summary, dateRange?.date);
      } catch (error: unknown) {
        spinner.fail("Could not retrieve the health summary.");

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
  summary: {
    generatedAt: string;
    partial: boolean;
    steps: number;
    sleepMinutes: number | null;
    averageHeartRate: number | null;
    restingHeartRate: number | null;
    heartRateVariabilityMilliseconds: number | null;
    oxygenSaturationPercent: number | null;
  },
  selectedDate?: string,
): void {
  console.log();
  console.log(`${CONTENT_INDENT}${pc.bold(pc.cyan("LUMIDA"))}`);
  console.log(
    `${CONTENT_INDENT}${pc.dim(
      selectedDate
        ? formatCivilDate(selectedDate)
        : new Intl.DateTimeFormat("en", {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(summary.generatedAt)),
    )}`,
  );
  console.log(`${CONTENT_INDENT}${pc.dim(SUMMARY_SEPARATOR)}`);

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
    console.warn(pc.yellow("Some data is incomplete for this period."));
  }
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
