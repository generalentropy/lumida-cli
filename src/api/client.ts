import { z } from "zod";

import { CliError } from "../errors.js";
import type { SummaryDateRange } from "../summary-date.js";

const REQUEST_TIMEOUT_MS = 15_000;

const apiErrorSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const deviceAuthorizationSchema = z.object({
  device_code: z.string().min(20).max(512),
  user_code: z.string().min(8).max(16),
  verification_uri: z.url(),
  verification_uri_complete: z.url(),
  expires_in: z.number().int().positive().max(3_600),
  interval: z.number().int().min(1).max(60),
});

const deviceTokenSchema = z.object({
  access_token: z.string().min(20).max(512),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  scope: z.string(),
});

const deviceTokenErrorSchema = z.object({
  error: z.enum([
    "authorization_pending",
    "slow_down",
    "expired_token",
    "access_denied",
    "invalid_request",
    "invalid_grant",
  ]),
  error_description: z.string().optional(),
});

const googleHealthStatusSchema = z.object({
  connected: z.boolean(),
  accessStatus: z.enum(["not_requested", "pending", "approved"]),
});

const cliStatusSchema = z.object({
  account: z.object({
    email: z.email(),
  }),
  session: z.object({
    expiresAt: z.iso.datetime(),
  }),
  googleHealth: googleHealthStatusSchema,
});

const cliSummarySchema = z.object({
  generatedAt: z.iso.datetime(),
  range: z.object({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    days: z.number().int().positive(),
  }),
  partial: z.boolean(),
  steps: z.number().nonnegative(),
  sleepMinutes: z.number().nonnegative().nullable(),
  averageHeartRate: z.number().nonnegative().nullable(),
  restingHeartRate: z.number().nonnegative().nullable(),
  heartRateVariabilityMilliseconds: z.number().nonnegative().nullable(),
  oxygenSaturationPercent: z.number().nonnegative().nullable(),
});

const cliSleepHistorySchema = z.object({
  generatedAt: z.iso.datetime(),
  range: z.object({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    days: z.number().int().positive().max(365),
  }),
  partial: z.boolean(),
  sessions: z
    .array(
      z.object({
        startTime: z.iso.datetime({ offset: true }),
        endTime: z.iso.datetime({ offset: true }),
        isNap: z.boolean(),
        minutesAsleep: z.number().nonnegative().nullable(),
      }),
    )
    .max(400),
});

export type DeviceAuthorization = z.infer<
  typeof deviceAuthorizationSchema
>;
export type DeviceToken = z.infer<typeof deviceTokenSchema>;
export type DeviceTokenError = z.infer<typeof deviceTokenErrorSchema>;
export type CliStatus = z.infer<typeof cliStatusSchema>;
export type CliSummary = z.infer<typeof cliSummarySchema>;
export type CliSleepHistory = z.infer<typeof cliSleepHistorySchema>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type DeviceTokenResult =
  | { ok: true; token: DeviceToken }
  | { ok: false; error: DeviceTokenError };

export interface ApiClient {
  requestDeviceAuthorization(): Promise<DeviceAuthorization>;
  requestDeviceToken(
    deviceCode: string,
    signal?: AbortSignal,
  ): Promise<DeviceTokenResult>;
  getStatus(accessToken: string): Promise<CliStatus>;
  getSummary(
    accessToken: string,
    dateRange?: SummaryDateRange,
  ): Promise<CliSummary>;
  getSleep(accessToken: string, days: number): Promise<CliSleepHistory>;
  logout(accessToken: string): Promise<void>;
}

type Fetch = typeof globalThis.fetch;

class LumidaApiClient implements ApiClient {
  readonly #baseUrl: URL;
  readonly #fetch: Fetch;

  constructor(baseUrl: URL, fetchImplementation: Fetch) {
    this.#baseUrl = baseUrl;
    this.#fetch = fetchImplementation;
  }

  async requestDeviceAuthorization(): Promise<DeviceAuthorization> {
    const authorization = await this.#requestJson(
      "/api/auth/device/code",
      {
        method: "POST",
        body: JSON.stringify({ client_id: "lumida-cli" }),
      },
      deviceAuthorizationSchema,
    );

    assertTrustedVerificationUrl(
      authorization.verification_uri,
      this.#baseUrl,
    );
    assertTrustedVerificationUrl(
      authorization.verification_uri_complete,
      this.#baseUrl,
    );

    return authorization;
  }

  async requestDeviceToken(
    deviceCode: string,
    signal?: AbortSignal,
  ): Promise<DeviceTokenResult> {
    const response = await this.#request("/api/auth/device/token", {
      method: "POST",
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: "lumida-cli",
      }),
      signal,
    });
    const body = await readJson(response);

    if (response.ok) {
      return { ok: true, token: parseResponse(deviceTokenSchema, body) };
    }

    const parsedError = deviceTokenErrorSchema.safeParse(body);

    if (parsedError.success) {
      return { ok: false, error: parsedError.data };
    }

    throw toApiError(response, body);
  }

  getStatus(accessToken: string): Promise<CliStatus> {
    return this.#requestJson(
      "/api/cli/status",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      cliStatusSchema,
    );
  }

  async getSummary(
    accessToken: string,
    dateRange?: SummaryDateRange,
  ): Promise<CliSummary> {
    const searchParams = dateRange
      ? new URLSearchParams({
          date: dateRange.date,
          from: dateRange.from,
          to: dateRange.to,
          time_zone: dateRange.timeZone,
        })
      : null;
    const path = searchParams
      ? `/api/cli/summary?${searchParams.toString()}`
      : "/api/cli/summary";

    const summary = await this.#requestJson(
      path,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      cliSummarySchema,
    );

    if (dateRange && !matchesRequestedDateRange(summary, dateRange)) {
      throw new CliError(
        "Lumida did not return the requested calendar day. The server may need to be updated.",
      );
    }

    return summary;
  }

  getSleep(accessToken: string, days: number): Promise<CliSleepHistory> {
    const searchParams = new URLSearchParams({ days: String(days) });

    return this.#requestJson(
      `/api/cli/sleep?${searchParams.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      cliSleepHistorySchema,
    );
  }

  async logout(accessToken: string): Promise<void> {
    const response = await this.#request("/api/cli/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 401) {
      throw toApiError(response, await readJson(response));
    }
  }

  async #requestJson<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const response = await this.#request(path, init);
    const body = await readJson(response);

    if (!response.ok) {
      throw toApiError(response, body);
    }

    return parseResponse(schema, body);
  }

  async #request(path: string, init: RequestInit): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = init.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;

    try {
      return await this.#fetch(new URL(path, this.#baseUrl), {
        ...init,
        signal,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          "User-Agent": "lumida-cli",
          ...init.headers,
        },
      });
    } catch (error: unknown) {
      if (init.signal?.aborted) {
        throw error;
      }

      throw new CliError(
        "Could not reach Lumida. Check your network connection.",
      );
    }
  }
}

export function createApiClient(
  baseUrl: URL,
  fetchImplementation: Fetch = globalThis.fetch,
): ApiClient {
  return new LumidaApiClient(baseUrl, fetchImplementation);
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new CliError("Lumida returned an unreadable response.");
  }
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new CliError(
      "Lumida returned an unexpected response. Update the CLI and try again.",
    );
  }

  return parsed.data;
}

function assertTrustedVerificationUrl(value: string, baseUrl: URL): void {
  const verificationUrl = new URL(value);

  if (verificationUrl.origin !== baseUrl.origin) {
    throw new CliError(
      "Lumida returned a sign-in URL from an unexpected domain.",
    );
  }
}

function matchesRequestedDateRange(
  summary: CliSummary,
  requested: SummaryDateRange,
): boolean {
  const actualFrom = Date.parse(summary.range.from);
  const actualTo = Date.parse(summary.range.to);
  const requestedFrom = Date.parse(requested.from);
  const requestedTo = Date.parse(requested.to);
  const requestedDayIsComplete = requestedTo <= Date.now();

  if (
    actualFrom !== requestedFrom ||
    actualTo <= actualFrom ||
    actualTo > requestedTo
  ) {
    return false;
  }

  return !requestedDayIsComplete || actualTo === requestedTo;
}

function toApiError(response: Response, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  const code = parsed.success ? parsed.data.error : undefined;
  const description = parsed.success
    ? parsed.data.error_description
    : undefined;

  return new ApiError(
    description || code || `Lumida returned HTTP error ${response.status}.`,
    response.status,
    code,
  );
}
