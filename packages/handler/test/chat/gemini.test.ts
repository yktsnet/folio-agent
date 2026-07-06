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

  it.each(ROUTES)("includes the paragraph-break instruction for %s", (route) => {
    const prompt = buildSystemPrompt("knowledge body", route);
    expect(prompt).toContain("2〜4文ごとに空行");
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

  it("embeds contactUrl into the inquiry instruction when provided", () => {
    const inquiry = buildSystemPrompt("knowledge body", "inquiry", "https://example.com/contact");
    expect(inquiry).toContain("https://example.com/contact");
  });

  it("keeps the existing inquiry wording when contactUrl is not provided", () => {
    const inquiry = buildSystemPrompt("knowledge body", "inquiry");
    expect(inquiry).toContain("Contactページへの問い合わせを案内してください。");
  });

  it("ignores contactUrl for thoughts and works routes", () => {
    const contactUrl = "https://example.com/contact";
    const thoughts = buildSystemPrompt("knowledge body", "thoughts", contactUrl);
    const works = buildSystemPrompt("knowledge body", "works", contactUrl);

    expect(thoughts).not.toContain(contactUrl);
    expect(works).not.toContain(contactUrl);
  });

  describe("language: en", () => {
    it.each(ROUTES)("includes the no-fabrication principle in English for %s", (route) => {
      const prompt = buildSystemPrompt("knowledge body", route, undefined, "en");
      expect(prompt).toContain("Do not guess or invent");
      expect(prompt).toContain("doesn't cover that point");
    });

    it.each(ROUTES)("includes the plain-text output instruction in English for %s", (route) => {
      const prompt = buildSystemPrompt("knowledge body", route, undefined, "en");
      expect(prompt).toContain("Markdown formatting");
      expect(prompt).toContain("plain text");
    });

    it("switches route-specific instructions per route in English", () => {
      const thoughts = buildSystemPrompt("knowledge body", "thoughts", undefined, "en");
      const works = buildSystemPrompt("knowledge body", "works", undefined, "en");
      const inquiry = buildSystemPrompt("knowledge body", "inquiry", undefined, "en");

      expect(thoughts).toContain("thinking");
      expect(works).toContain("Works");
      expect(works).toContain("Zenn");
      expect(inquiry).toContain("Contact page");
      expect(works).not.toBe(inquiry);
    });

    it("embeds contactUrl into the English inquiry instruction when provided", () => {
      const inquiry = buildSystemPrompt("knowledge body", "inquiry", "https://example.com/contact", "en");
      expect(inquiry).toContain("https://example.com/contact");
      expect(inquiry).toContain("Contact page");
    });

    it("does not leak Japanese wording into English prompts", () => {
      const prompt = buildSystemPrompt("knowledge body", "inquiry", undefined, "en");
      expect(prompt).not.toContain("知識");
      expect(prompt).not.toContain("訪問者");
    });
  });
});
