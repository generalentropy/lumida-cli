import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client.js";

describe("LumidaApiClient", () => {
  it("sends the token in the Authorization header only", async () => {
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchMock = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedUrl = input;
      capturedInit = init;

      return Response.json({
        account: { email: "eddy@example.com" },
        session: { expiresAt: "2030-01-01T00:00:00.000Z" },
        googleHealth: {
          connected: true,
          accessStatus: "approved",
        },
      });
    };
    const api = createApiClient(
      new URL("https://lumida.app"),
      fetchMock as typeof fetch,
    );

    await api.getStatus("secret-session-token");

    expect(String(capturedUrl)).toBe("https://lumida.app/api/cli/status");
    expect(capturedInit?.headers).toMatchObject({
      Authorization: "Bearer secret-session-token",
    });
    expect(String(capturedUrl)).not.toContain("secret-session-token");
  });

  it("returns temporary polling states without treating them as network errors", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        {
          error: "authorization_pending",
          error_description: "Pending",
        },
        { status: 400 },
      ),
    );
    const api = createApiClient(
      new URL("https://lumida.app"),
      fetchMock as typeof fetch,
    );

    await expect(api.requestDeviceToken("d".repeat(40))).resolves.toEqual({
      ok: false,
      error: {
        error: "authorization_pending",
        error_description: "Pending",
      },
    });
  });

  it("requests the selected sleep period without putting the token in the URL", async () => {
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchMock = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedUrl = input;
      capturedInit = init;

      return Response.json({
        generatedAt: "2030-01-08T12:00:00.000Z",
        range: {
          from: "2030-01-01T12:00:00.000Z",
          to: "2030-01-08T12:00:00.000Z",
          days: 7,
        },
        partial: false,
        sessions: [],
      });
    };
    const api = createApiClient(
      new URL("https://lumida.app"),
      fetchMock as typeof fetch,
    );

    await api.getSleep("secret-session-token", 7);

    expect(String(capturedUrl)).toBe(
      "https://lumida.app/api/cli/sleep?days=7",
    );
    expect(capturedInit?.headers).toMatchObject({
      Authorization: "Bearer secret-session-token",
    });
    expect(String(capturedUrl)).not.toContain("secret-session-token");
  });

  it("requests a dated summary with explicit local-day boundaries", async () => {
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchMock = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedUrl = input;
      capturedInit = init;

      return Response.json({
        generatedAt: "2026-07-24T12:00:00.000Z",
        range: {
          from: "2026-06-30T22:00:00.000Z",
          to: "2026-07-01T22:00:00.000Z",
          days: 1,
        },
        partial: false,
        steps: 8_000,
        sleepMinutes: 450,
        averageHeartRate: 65,
        restingHeartRate: 52,
        heartRateVariabilityMilliseconds: 60,
        oxygenSaturationPercent: 97,
      });
    };
    const api = createApiClient(
      new URL("https://lumida.app"),
      fetchMock as typeof fetch,
    );

    await api.getSummary("secret-session-token", {
      kind: "date",
      range: {
        date: "2026-07-01",
        from: "2026-07-01T00:00:00+02:00",
        to: "2026-07-02T00:00:00+02:00",
        timeZone: "Europe/Paris",
      },
    });

    const url = new URL(String(capturedUrl));

    expect(url.pathname).toBe("/api/cli/summary");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      date: "2026-07-01",
      from: "2026-07-01T00:00:00+02:00",
      to: "2026-07-02T00:00:00+02:00",
      time_zone: "Europe/Paris",
    });
    expect(capturedInit?.headers).toMatchObject({
      Authorization: "Bearer secret-session-token",
    });
    expect(String(capturedUrl)).not.toContain("secret-session-token");
  });

  it("rejects a server response for a different day", async () => {
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () =>
        Response.json({
          generatedAt: "2026-07-24T12:00:00.000Z",
          range: {
            from: "2026-07-23T12:00:00.000Z",
            to: "2026-07-24T12:00:00.000Z",
            days: 1,
          },
          partial: false,
          steps: 7_437,
          sleepMinutes: 513,
          averageHeartRate: 65,
          restingHeartRate: 52,
          heartRateVariabilityMilliseconds: 60,
          oxygenSaturationPercent: 97,
        }),
      ) as typeof fetch,
    );

    await expect(
      api.getSummary("secret-session-token", {
        kind: "date",
        range: {
          date: "2026-07-01",
          from: "2026-07-01T00:00:00+02:00",
          to: "2026-07-02T00:00:00+02:00",
          timeZone: "Europe/Paris",
        },
      }),
    ).rejects.toThrow(/requested calendar day/);
  });

  it("requests a rolling summary window without other parameters", async () => {
    let capturedUrl: string | URL | Request | undefined;
    const api = createApiClient(
      new URL("https://lumida.app"),
      (async (input: string | URL | Request) => {
        capturedUrl = input;

        return Response.json({
          generatedAt: "2026-07-24T12:00:00.000Z",
          range: {
            from: "2026-07-17T12:00:00.000Z",
            to: "2026-07-24T12:00:00.000Z",
            days: 7,
          },
          partial: false,
          steps: 52_000,
          sleepMinutes: 3_100,
          averageHeartRate: 64,
          restingHeartRate: 51,
          heartRateVariabilityMilliseconds: 62,
          oxygenSaturationPercent: 97,
        });
      }) as typeof fetch,
    );

    await api.getSummary("secret-session-token", { kind: "days", days: 7 });

    const url = new URL(String(capturedUrl));

    expect(url.pathname).toBe("/api/cli/summary");
    expect(Object.fromEntries(url.searchParams)).toEqual({ days: "7" });
  });

  it("rejects a summary covering a different period than requested", async () => {
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () =>
        Response.json({
          generatedAt: "2026-07-24T12:00:00.000Z",
          range: {
            from: "2026-07-23T12:00:00.000Z",
            to: "2026-07-24T12:00:00.000Z",
            days: 1,
          },
          partial: false,
          steps: 7_437,
          sleepMinutes: 513,
          averageHeartRate: 65,
          restingHeartRate: 52,
          heartRateVariabilityMilliseconds: 60,
          oxygenSaturationPercent: 97,
        }),
      ) as typeof fetch,
    );

    await expect(
      api.getSummary("secret-session-token", { kind: "days", days: 7 }),
    ).rejects.toThrow(/requested period/);
  });

  it("rejects a server response with an unexpected shape", async () => {
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () => Response.json({ connected: true })) as typeof fetch,
    );

    await expect(api.getStatus("secret-session-token")).rejects.toThrow(
      /unexpected response/,
    );
  });

  it("rejects a verification URL from another domain", async () => {
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () =>
        Response.json({
          device_code: "device-code-with-enough-characters",
          user_code: "ABCD2345",
          verification_uri: "https://example.org/device",
          verification_uri_complete:
            "https://example.org/device?user_code=ABCD2345",
          expires_in: 600,
          interval: 5,
        }),
      ) as typeof fetch,
    );

    await expect(api.requestDeviceAuthorization()).rejects.toThrow(
      /unexpected domain/,
    );
  });

  it("strips terminal escape sequences from a server error message", async () => {
    const escape = String.fromCodePoint(0x1b);
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () =>
        Response.json(
          {
            error: "INVALID_DAYS",
            error_description: `${escape}[2Jdays must be an integer`,
          },
          { status: 400 },
        ),
      ) as typeof fetch,
    );

    await expect(api.getSleep("secret-session-token", 7)).rejects.toThrow(
      /days must be an integer/,
    );
    await expect(
      api.getSleep("secret-session-token", 7),
    ).rejects.not.toThrow(new RegExp(escape));
  });

  it("normalizes a verification URL carrying control characters", async () => {
    const escape = String.fromCodePoint(0x1b);
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () =>
        Response.json({
          device_code: "device-code-with-enough-characters",
          user_code: "ABCD2345",
          verification_uri: "https://lumida.app/device",
          verification_uri_complete: `https://lumida.app/device?user_code=${escape}[2J`,
          expires_in: 600,
          interval: 5,
        }),
      ) as typeof fetch,
    );

    const authorization = await api.requestDeviceAuthorization();

    expect(authorization.verification_uri_complete).not.toContain(escape);
    expect(authorization.verification_uri_complete).toContain("%1B");
  });

  it("rejects a user code outside the server alphabet", async () => {
    const escape = String.fromCodePoint(0x1b);
    const api = createApiClient(
      new URL("https://lumida.app"),
      vi.fn(async () =>
        Response.json({
          device_code: "device-code-with-enough-characters",
          user_code: `AB${escape}[31mCD1234`,
          verification_uri: "https://lumida.app/device",
          verification_uri_complete:
            "https://lumida.app/device?user_code=ABCD2345",
          expires_in: 600,
          interval: 5,
        }),
      ) as typeof fetch,
    );

    await expect(api.requestDeviceAuthorization()).rejects.toThrow(
      /unexpected response/,
    );
  });
});
