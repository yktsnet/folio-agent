import { describe, expect, it } from "vitest";
import { formatKnowledge } from "../../src/ingest/format.js";

describe("formatKnowledge", () => {
  it("writes each page's title, URL and text, separated by blank lines", () => {
    const text = formatKnowledge({
      generatedAt: "2026-01-01T00:00:00.000Z",
      estimatedTokens: 0,
      warnings: [],
      pages: [
        { url: "/about", source: "dist", title: "About", text: "about body" },
        { url: "https://zenn.dev/foo/articles/bar", source: "zenn", title: "記事のタイトル", text: "article body" },
      ],
    });

    expect(text).toBe(
      "# About\nURL: /about\n\nabout body\n\n# 記事のタイトル\nURL: https://zenn.dev/foo/articles/bar\n\narticle body",
    );
  });
});
