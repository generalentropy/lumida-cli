import { ApiError } from "../api/client.js";
import { CliError } from "../errors.js";

export function mapHealthApiError(error: unknown): unknown {
  if (!(error instanceof ApiError)) {
    return error;
  }

  switch (error.code) {
    case "GOOGLE_HEALTH_ACCESS_NOT_APPROVED":
      return new CliError(
        "Your Google Health access has not been approved in Lumida yet.",
      );
    case "GOOGLE_HEALTH_REAUTH_REQUIRED":
      return new CliError(
        "Reconnect Google Health in Lumida before trying again.",
      );
    case "Not connected":
      return new CliError(
        "Google Health is not connected to your Lumida account.",
      );
    default:
      if (error.status === 429) {
        return new CliError(
          "Google Health is temporarily limiting requests. Try again later.",
        );
      }

      return error;
  }
}
