import { describe, expect, it } from "vitest";
import { formatKnowledge } from "../../src/ingest/format.js";

function doc(pages: { url: string; title: string; text: string }[]) {
  return { pages };
}

describe("formatKnowledge", () => {
  it("gives external pages their title and URL, and this site's pages only their name", () => {
    const text = formatKnowledge(
      doc([
        { url: "/about", title: "About", text: "about body" },
        { url: "https://zenn.dev/foo/articles/bar", title: "記事のタイトル", text: "article body" },
      ]),
    );

    expect(text).toBe(
      "# About（このサイトのページ）\n\nabout body\n\n# 記事のタイトル\nURL: https://zenn.dev/foo/articles/bar\n\narticle body",
    );
    expect(text).not.toContain("URL: /about");
  });

  it("drops the site-name suffix shared by this site's page titles", () => {
    const text = formatKnowledge(
      doc([
        { url: "/", title: "Works • ykts.net", text: "a" },
        { url: "/about", title: "About • ykts.net", text: "b" },
        { url: "https://zenn.dev/foo/articles/bar", title: "Claude Code - 設定の話", text: "c" },
      ]),
    );

    expect(text).toContain("# Works（このサイトのページ）");
    expect(text).toContain("# About（このサイトのページ）");
    expect(text).toContain("# Claude Code - 設定の話\nURL:");
  });

  it("keeps a suffix that appears on only one page, since it may be part of that title", () => {
    const text = formatKnowledge(
      doc([
        { url: "/", title: "Home", text: "a" },
        { url: "/tips", title: "Tips - Nix", text: "b" },
      ]),
    );

    expect(text).toContain("# Tips - Nix（このサイトのページ）");
  });

  it("labels this site's pages in English with language en", () => {
    expect(formatKnowledge(doc([{ url: "/about", title: "About", text: "b" }]), "en")).toBe("# About (a page on this site)\n\nb");
  });
});
