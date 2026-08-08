import { describe, expect, it } from "vitest";

import { EXPIRY_WARNING_MS, formatSessionExpiry } from "./status.js";

/**
 * Les assertions portent sur le texte, pas sur les codes ANSI : picocolors se
 * désactive hors TTY, donc la couleur n'est pas observable sous vitest.
 */
describe("formatSessionExpiry", () => {
  const now = new Date(2026, 7, 7, 9, 0, 0).getTime();

  function inMs(offset: number): string {
    return new Date(now + offset).toISOString();
  }

  it("states the expiry plainly when it is far away", () => {
    const label = formatSessionExpiry(inMs(7 * EXPIRY_WARNING_MS), now);

    expect(label).toContain("valid until");
    expect(label).not.toContain("expiring soon");
  });

  it("warns under twenty-four hours", () => {
    const label = formatSessionExpiry(inMs(EXPIRY_WARNING_MS - 60_000), now);

    expect(label).toContain("valid until");
    expect(label).toContain("expiring soon");
    expect(label).toContain("lumida login");
  });

  it("still warns once the expiry has passed", () => {
    expect(formatSessionExpiry(inMs(-60_000), now)).toContain("expiring soon");
  });

  it("does not warn exactly one minute above the threshold", () => {
    expect(
      formatSessionExpiry(inMs(EXPIRY_WARNING_MS + 60_000), now),
    ).not.toContain("expiring soon");
  });
});
