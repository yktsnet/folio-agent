import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../src/chat/gemini.js";
import type { ChatRoute } from "../../src/chat/types.js";

const ROUTES: Exclude<ChatRoute, "rate_limited">[] = ["thoughts", "works", "inquiry"];

describe("buildSystemPrompt", () => {
  it.each(ROUTES)("includes the no-fabrication principle for %s", (route) => {
    const prompt = buildSystemPrompt("knowledge body", route);
    expect(prompt).toContain("推測・創作せず");
    expect(prompt).toContain("サイトに記載がない");
  });

  it.each(ROUTES)("includes the plain-text output instruction for %s", (route) => {
    const prompt = buildSystemPrompt("knowledge body", route);
    expect(prompt).toContain("Markdown記法");
    expect(prompt).toContain("プレーンテキスト");
  });

  it.each(ROUTES)("embeds the knowledge for %s", (route) => {
    const prompt = buildSystemPrompt("knowledge body", route);
    expect(prompt).toContain("knowledge body");
  });

  it("switches route-specific instructions per route", () => {
    const thoughts = buildSystemPrompt("knowledge body", "thoughts");
    const works = buildSystemPrompt("knowledge body", "works");
    const inquiry = buildSystemPrompt("knowledge body", "inquiry");

    expect(thoughts).toContain("考え方");
    expect(works).toContain("Works");
    expect(works).toContain("Zenn");
    expect(inquiry).toContain("Contact");

    expect(thoughts).not.toContain("Zenn");
    expect(works).not.toBe(inquiry);
  });
});
