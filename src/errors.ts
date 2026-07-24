export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unknown error occurred.";
}
