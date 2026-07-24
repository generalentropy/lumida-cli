import { setTimeout as wait } from "node:timers/promises";

import type { Command } from "commander";
import open from "open";
import ora from "ora";
import pc from "picocolors";

import type {
  ApiClient,
  DeviceAuthorization,
  DeviceToken,
} from "../api/client.js";
import { isUnauthorizedError } from "../api/client.js";
import { CliError } from "../errors.js";
import type { CommandContextFactory } from "./context.js";

const SLOW_DOWN_SECONDS = 5;

export function registerLoginCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("login")
    .description("Connect the CLI to your Lumida account")
    .action(async () => {
      const { api, credentials } = getContext();
      const existingAccessToken = await credentials.read();

      if (existingAccessToken) {
        try {
          const status = await api.getStatus(existingAccessToken);
          console.log(
            pc.green(`Already connected to Lumida as ${status.account.email}.`),
          );
          return;
        } catch (error: unknown) {
          if (!isUnauthorizedError(error)) {
            throw error;
          }

          await credentials.delete();
        }
      }

      const spinner = ora("Preparing secure sign-in…").start();
      const authorization = await api.requestDeviceAuthorization();

      spinner.stop();
      console.log();
      console.log(pc.bold("Authorize Lumida CLI in your browser."));
      console.log(`Code: ${pc.bold(formatUserCode(authorization.user_code))}`);
      console.log(`URL: ${authorization.verification_uri}`);
      console.log();

      try {
        await open(authorization.verification_uri_complete);
      } catch {
        console.warn(
          pc.yellow(
            "The browser could not be opened automatically. Use the URL above.",
          ),
        );
      }

      const waitingSpinner = ora(
        "Waiting for authorization in your browser…",
      ).start();
      const controller = new AbortController();
      const interrupt = () => controller.abort();

      process.once("SIGINT", interrupt);

      try {
        const token = await waitForDeviceToken(
          api,
          authorization,
          controller.signal,
        );

        try {
          await credentials.write(token.access_token);
        } catch (error: unknown) {
          await api.logout(token.access_token).catch(() => undefined);
          throw error;
        }

        waitingSpinner.succeed(pc.green("CLI connected to Lumida."));
      } catch (error: unknown) {
        waitingSpinner.fail("Sign-in was not completed.");

        if (controller.signal.aborted) {
          throw new CliError("Sign-in cancelled.");
        }

        throw error;
      } finally {
        process.off("SIGINT", interrupt);
      }
    });
}

async function waitForDeviceToken(
  api: ApiClient,
  authorization: DeviceAuthorization,
  signal: AbortSignal,
): Promise<DeviceToken> {
  const expiresAt = Date.now() + authorization.expires_in * 1_000;
  let intervalSeconds = authorization.interval;

  while (Date.now() < expiresAt) {
    await wait(intervalSeconds * 1_000, undefined, { signal });

    const result = await api.requestDeviceToken(
      authorization.device_code,
      signal,
    );

    if (result.ok) {
      return result.token;
    }

    switch (result.error.error) {
      case "authorization_pending":
        break;
      case "slow_down":
        intervalSeconds += SLOW_DOWN_SECONDS;
        break;
      case "access_denied":
        throw new CliError("The request was denied in the browser.");
      case "expired_token":
        throw new CliError("The sign-in code expired. Run lumida login again.");
      default:
        throw new CliError(
          "The server rejected the sign-in code. Run lumida login again.",
        );
    }
  }

  throw new CliError("The sign-in code expired. Run lumida login again.");
}

function formatUserCode(value: string): string {
  const compact = value.replaceAll("-", "");

  return compact.length === 8
    ? `${compact.slice(0, 4)}-${compact.slice(4)}`
    : value;
}
