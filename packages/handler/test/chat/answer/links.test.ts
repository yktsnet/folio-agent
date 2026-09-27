import { describe, expect, it } from "vitest";
import { collectAnswerLinks } from "../../../src/chat/answer/links.js";
import type { KnowledgeDocument } from "../../../src/ingest/types.js";

const DOC: KnowledgeDocument = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  estimatedTokens: 0,
  warnings: [],
  pages: [
    { url: "/about", source: "dist", title: "About", text: "" },
    { url: "https://zenn.dev/foo/articles/bar", source: "zenn", title: "記事のタイトル", text: "" },
  ],
};

describe("collectAnswerLinks", () => {
  it("lists external pages from the knowledge and the Contact page, leaving this site's pages out", () => {
    expect(collectAnswerLinks(DOC, "https://example.com/contact/")).toEqual([
      { url: "https://zenn.dev/foo/articles/bar", title: "記事のタイトル" },
      { url: "https://example.com/contact/", title: "Contactページ" },
    ]);
  });

  it("titles the Contact page in English with language en, and omits it without a contactUrl", () => {
    expect(collectAnswerLinks(DOC, "https://example.com/contact/", "en").at(-1)?.title).toBe("Contact page");
    expect(collectAnswerLinks(DOC)).toHaveLength(1);
  });
});
