import { AsyncEntry } from "@napi-rs/keyring";
import { z } from "zod";

import { CliError } from "../errors.js";

const KEYRING_SERVICE = "lumida-cli";

const accessTokenSchema = z.string().min(20).max(512);

export interface CredentialStore {
  read(): Promise<string | null>;
  write(accessToken: string): Promise<void>;
  delete(): Promise<boolean>;
}

export class KeyringCredentialStore implements CredentialStore {
  readonly #entry: AsyncEntry;

  constructor(baseUrl: URL) {
    this.#entry = new AsyncEntry(KEYRING_SERVICE, baseUrl.origin);
  }

  async read(): Promise<string | null> {
    try {
      const value = await this.#entry.getPassword();

      if (!value) {
        return null;
      }

      const parsed = accessTokenSchema.safeParse(value);

      if (!parsed.success) {
        await this.#entry.deleteCredential();

        throw new CliError(
          "The stored credentials were invalid and have been removed. Run lumida login to reconnect.",
        );
      }

      return parsed.data;
    } catch (error: unknown) {
      if (error instanceof CliError) {
        throw error;
      }

      throw new CliError(
        "Could not read the secure system credential store.",
      );
    }
  }

  async write(accessToken: string): Promise<void> {
    const parsed = accessTokenSchema.parse(accessToken);

    try {
      await this.#entry.setPassword(parsed);
    } catch {
      throw new CliError(
        "Could not save the session to the secure system credential store.",
      );
    }
  }

  async delete(): Promise<boolean> {
    try {
      return await this.#entry.deleteCredential();
    } catch {
      throw new CliError(
        "Could not remove the session from the secure system credential store.",
      );
    }
  }
}
