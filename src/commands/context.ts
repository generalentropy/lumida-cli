import type { ApiClient } from "../api/client.js";
import type { CredentialStore } from "../auth/credentials.js";

export interface CommandContext {
  api: ApiClient;
  credentials: CredentialStore;
}

export type CommandContextFactory = () => CommandContext;
