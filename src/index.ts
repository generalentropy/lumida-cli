#!/usr/bin/env node

import { Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { createApiClient } from "./api/client.js";
import { KeyringCredentialStore } from "./auth/credentials.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerLogoutCommand } from "./commands/logout.js";
import { registerSleepCommand } from "./commands/sleep.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerSummaryCommand } from "./commands/summary.js";
import { getApiBaseUrl } from "./config.js";
import { CliError, toErrorMessage } from "./errors.js";
import { sanitizeServerText } from "./sanitize.js";

function createProgram(): Command {
  const program = new Command();

  program
    .name("lumida")
    .description("Read your Lumida health data from the terminal")
    .version(packageJson.version)
    .showHelpAfterError();

  const getContext = () => {
    const baseUrl = getApiBaseUrl();

    return {
      api: createApiClient(baseUrl),
      credentials: new KeyringCredentialStore(baseUrl),
    };
  };

  registerLoginCommand(program, getContext);
  registerLogoutCommand(program, getContext);
  registerStatusCommand(program, getContext);
  registerSummaryCommand(program, getContext);
  registerSleepCommand(program, getContext);

  return program;
}

async function main(): Promise<void> {
  const program = createProgram();

  if (process.argv.length <= 2) {
    program.help();
  }

  try {
    await program.parseAsync();
  } catch (error: unknown) {
    const message =
      error instanceof CliError ? error.message : toErrorMessage(error);

    // Dernière barrière avant le terminal : les messages construits par le CLI
    // sont sûrs, mais une erreur peut aussi venir du serveur ou d'une
    // dépendance.
    console.error(`Error: ${sanitizeServerText(message)}`);
    process.exitCode = 1;
  }
}

await main();
