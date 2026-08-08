import type { Command } from "commander";
import pc from "picocolors";

import { isUnauthorizedError } from "../api/client.js";
import { CliError } from "../errors.js";
import type { CommandContextFactory } from "./context.js";
import { printJson } from "./output.js";

type StatusOptions = {
  json?: boolean;
};

export function registerStatusCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("status")
    .description("Show the Lumida connection status")
    .option("--json", "Print the raw response as JSON")
    .action(async (options: StatusOptions) => {
      const { api, credentials } = getContext();
      const accessToken = await credentials.read();

      if (!accessToken) {
        if (options.json) {
          printJson({ connected: false });
          return;
        }

        console.log("Not connected. Run lumida login.");
        return;
      }

      try {
        const status = await api.getStatus(accessToken);

        if (options.json) {
          printJson({ connected: true, ...status });
          return;
        }

        console.log();
        console.log(pc.bold(pc.cyan("LUMIDA")));
        printRow("Account", status.account.email);
        printRow("CLI session", formatSessionExpiry(status.session.expiresAt));
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

/**
 * Seuil à partir duquel l'expiration cesse d'être une information neutre. Une
 * session CLI dure sept jours : passer sous les vingt-quatre heures, c'est la
 * dernière fois où `status` peut prévenir avant qu'un script planifié échoue.
 */
export const EXPIRY_WARNING_MS = 24 * 60 * 60 * 1_000;

export function formatSessionExpiry(
  expiresAt: string,
  now = Date.now(),
): string {
  const label = `valid until ${formatDateTime(expiresAt)}`;
  const remaining = new Date(expiresAt).getTime() - now;

  if (!Number.isFinite(remaining) || remaining > EXPIRY_WARNING_MS) {
    return label;
  }

  return pc.yellow(`${label} (expiring soon, run lumida login to renew)`);
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
