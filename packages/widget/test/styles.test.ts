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

  it("preserves newlines in message bubbles", () => {
    expect(WIDGET_STYLES).toMatch(/\.message\s*{[^}]*white-space:\s*pre-wrap;/);
  });

  it("makes :host adopt the host's color and color-scheme so system colors adapt", () => {
    expect(WIDGET_STYLES).toMatch(/:host\s*{[^}]*color:\s*inherit;/);
    expect(WIDGET_STYLES).toMatch(/:host\s*{[^}]*color-scheme:\s*inherit;/);
  });

  it("derives panel and text defaults from CSS system colors instead of fixed hex", () => {
    expect(WIDGET_STYLES).toContain("var(--folio-agent-surface, Canvas)");
    expect(WIDGET_STYLES).toContain("var(--folio-agent-text, CanvasText)");
  });

  it("derives bubble background/border via color-mix instead of the muted token", () => {
    const assistantBlock = WIDGET_STYLES.match(/\.message\.assistant\s*{[^}]*}/)?.[0] ?? "";
    const userBlock = WIDGET_STYLES.match(/\.message\.user\s*{[^}]*}/)?.[0] ?? "";

    expect(assistantBlock).toContain("color-mix(in srgb, CanvasText");
    expect(userBlock).toContain("color-mix(in srgb, CanvasText");
    expect(assistantBlock).not.toContain("--folio-agent-muted");
    expect(userBlock).not.toContain("--folio-agent-accent");
  });

  it("keeps muted scoped to supplementary text only, not bubble backgrounds", () => {
    const disclosureBlock = WIDGET_STYLES.match(/\.disclosure\s*{[^}]*}/)?.[0] ?? "";
    expect(disclosureBlock).toContain("var(--folio-agent-muted,");
  });
});
