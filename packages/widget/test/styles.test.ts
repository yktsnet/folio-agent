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

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return WIDGET_STYLES.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*{[^}]*}`))?.[0] ?? "";
}

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
    expect(WIDGET_STYLES).toMatch(/\.message,\s*\.greeting\s*{[^}]*white-space:\s*pre-wrap;/);
  });

  it("makes :host adopt the host's color and color-scheme so system colors adapt", () => {
    expect(WIDGET_STYLES).toMatch(/:host\s*{[^}]*color:\s*inherit;/);
    expect(WIDGET_STYLES).toMatch(/:host\s*{[^}]*color-scheme:\s*inherit;/);
  });

  it("derives surface and text defaults from CSS system colors, and accent from text", () => {
    expect(WIDGET_STYLES).toContain("var(--folio-agent-surface, Canvas)");
    expect(WIDGET_STYLES).toContain("var(--folio-agent-text, CanvasText)");
    expect(WIDGET_STYLES).toContain("var(--folio-agent-accent, var(--_text))");
    expect(WIDGET_STYLES).toContain("var(--folio-agent-accent-contrast, var(--_surface))");
  });

  it("derives the user bubble from accent and surface via color-mix, and gives assistant text no fill", () => {
    const userBlock = block(".message.user");
    expect(userBlock).toContain("color-mix(in srgb, var(--_accent) 14%, var(--_surface))");
    expect(userBlock).toContain("color-mix(in srgb, var(--_accent) 28%, var(--_surface))");
    expect(userBlock).not.toContain("--_muted");

    const assistantBlock = block(".message.assistant,");
    expect(assistantBlock).not.toContain("background");
  });

  it("keeps muted scoped to supplementary text only, not bubble backgrounds", () => {
    expect(block(".disclosure")).toContain("var(--_muted)");
    expect(block(".subheading")).toContain("var(--_muted)");
  });

  it("keeps the input at 16px so iOS Safari does not zoom on focus", () => {
    expect(WIDGET_STYLES).toMatch(/textarea\s*{[^}]*font-size:\s*16px;/);
  });

  it("goes full screen on narrow viewports, sized from the visual viewport", () => {
    const mobile = WIDGET_STYLES.match(/@media \(max-width: 640px\)\s*{[\s\S]*?\n  }\n/)?.[0] ?? "";
    expect(mobile).toContain("height: var(--vv-height, 100dvh);");
    expect(mobile).toContain("top: var(--vv-top, 0px);");
    expect(mobile).toContain("width: 100%;");
  });
});
