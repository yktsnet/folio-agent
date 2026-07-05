import { describe, expect, it } from "vitest";
import { WIDGET_STYLES } from "../src/styles.js";

const TOKENS = [
  "--folio-agent-surface",
  "--folio-agent-text",
  "--folio-agent-muted",
  "--folio-agent-accent",
  "--folio-agent-accent-contrast",
  "--folio-agent-font",
];

describe("WIDGET_STYLES", () => {
  it.each(TOKENS)("references %s via var() with a fallback", (token) => {
    const pattern = new RegExp(`var\\(${token},\\s*[^)]+\\)`);
    expect(WIDGET_STYLES).toMatch(pattern);
  });

  it("no longer hardcodes the themed colors without a var() fallback", () => {
    expect(WIDGET_STYLES).not.toContain("background: #1f2937;");
    expect(WIDGET_STYLES).not.toContain("color: #fff;");
    expect(WIDGET_STYLES).not.toContain("background: #fff;");
    expect(WIDGET_STYLES).not.toContain("color: #111827;");
    expect(WIDGET_STYLES).not.toContain("background: #f3f4f6;");
    expect(WIDGET_STYLES).not.toContain("color: #6b7280;");
    expect(WIDGET_STYLES).not.toContain("font-family: system-ui, sans-serif;");
  });
});
