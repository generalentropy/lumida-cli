import type { Command } from "commander";
import pc from "picocolors";

import { isUnauthorizedError } from "../api/client.js";
import { CliError } from "../errors.js";
import type { CommandContextFactory } from "./context.js";

export function registerStatusCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("status")
    .description("Show the Lumida connection status")
    .action(async () => {
      const { api, credentials } = getContext();
      const accessToken = await credentials.read();

      if (!accessToken) {
        console.log("Not connected. Run lumida login.");
        return;
      }

      try {
        const status = await api.getStatus(accessToken);

        console.log();
        console.log(pc.bold(pc.cyan("LUMIDA")));
        printRow("Account", status.account.email);
        printRow(
          "CLI session",
          `valid until ${formatDateTime(status.session.expiresAt)}`,
        );
        printRow(
          "Google Health",
          formatGoogleHealthStatus(status.googleHealth),
        );
      } catch (error: unknown) {
        if (isUnauthorizedError(error)) {
          await credentials.delete();
          throw new CliError(
            "The session expired. Run lumida login to reconnect.",
          );
        }

        throw error;
      }
    });
}

function formatGoogleHealthStatus(status: {
  connected: boolean;
  accessStatus: "not_requested" | "pending" | "approved";
}): string {
  if (status.connected) {
    return pc.green("connected");
  }

  if (status.accessStatus === "pending") {
    return pc.yellow("access pending approval");
  }

  if (status.accessStatus === "not_requested") {
    return pc.yellow("access not requested");
  }

  return pc.yellow("not connected");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function printRow(label: string, value: string): void {
  console.log(`  ${pc.dim(label.padEnd(18))}${value}`);
}
