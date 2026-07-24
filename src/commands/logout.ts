import type { Command } from "commander";
import pc from "picocolors";

import type { CommandContextFactory } from "./context.js";

export function registerLogoutCommand(
  program: Command,
  getContext: CommandContextFactory,
): void {
  program
    .command("logout")
    .description("Revoke the CLI session")
    .action(async () => {
      const { api, credentials } = getContext();
      const credential = await credentials.read();

      if (!credential) {
        console.log("No Lumida session is stored.");
        return;
      }

      // Revoke the server session before removing the local credential.
      // Keeping the credential on failure lets the user safely retry.
      await api.logout(credential);
      await credentials.delete();

      console.log(pc.green("CLI session revoked."));
    });
}
