import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../../src/chat/prompt/index.js";
import type { ChatRoute } from "../../../src/chat/types.js";

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

  it.each(ROUTES)("asks for [text](URL) links and names this site's pages instead of linking them, for %s", (route) => {
    const prompt = buildSystemPrompt("knowledge body", route);
    expect(prompt).toContain("[表示する文字](URL) の形");
    expect(prompt).toContain("（このサイトのページ）」と付いたページはリンクにせず");
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

  it.each(ROUTES)("gives the Contact link as an example to copy on every route when contactUrl is provided, for %s", (route) => {
    const prompt = buildSystemPrompt("knowledge body", route, "https://example.com/contact");
    expect(prompt).toContain("次の書き方をそのまま使ってください: [Contactページ](https://example.com/contact)");
    expect(buildSystemPrompt("knowledge body", route)).not.toContain("[Contactページ](");
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

    it.each(ROUTES)("asks for [text](URL) links in English for %s", (route) => {
      const prompt = buildSystemPrompt("knowledge body", route, undefined, "en");
      expect(prompt).toContain("write them as [text to show](URL)");
      expect(prompt).toContain('pages marked "(a page on this site)" in the knowledge by name');
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

    it("gives the Contact link example in English", () => {
      const prompt = buildSystemPrompt("knowledge body", "thoughts", "https://example.com/contact", "en");
      expect(prompt).toContain("write it exactly like this: [Contact page](https://example.com/contact)");
    });

    it("does not leak Japanese wording into English prompts", () => {
      const prompt = buildSystemPrompt("knowledge body", "inquiry", undefined, "en");
      expect(prompt).not.toContain("知識");
      expect(prompt).not.toContain("訪問者");
    });
  });
});
