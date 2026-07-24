import { describe, expect, it } from "vitest";

import { parseApiBaseUrl } from "./config.js";

describe("parseApiBaseUrl", () => {
  it("accepts an HTTPS origin", () => {
    expect(parseApiBaseUrl("https://lumida.app").origin).toBe(
      "https://lumida.app",
    );
  });

  it("allows HTTP for local development only", () => {
    expect(parseApiBaseUrl("http://localhost:3000").origin).toBe(
      "http://localhost:3000",
    );
    expect(() => parseApiBaseUrl("http://lumida.app")).toThrow(/HTTPS/);
  });

  it("rejects credentials, paths, and parameters in the URL", () => {
    expect(() => parseApiBaseUrl("https://user:secret@lumida.app")).toThrow(
      /credentials/,
    );
    expect(() => parseApiBaseUrl("https://lumida.app/api")).toThrow(
      /protocol and host/,
    );
    expect(() => parseApiBaseUrl("https://lumida.app?token=secret")).toThrow(
      /protocol and host/,
    );
  });
});
