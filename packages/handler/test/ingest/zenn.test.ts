import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanZennArticles } from "../../src/ingest/zenn.js";

let articlesDir: string;

beforeEach(async () => {
  articlesDir = await mkdtemp(join(tmpdir(), "folio-agent-zenn-"));
});

afterEach(async () => {
  await rm(articlesDir, { recursive: true, force: true });
});

describe("scanZennArticles", () => {
  it("includes only published articles, extracting title and building the public URL", async () => {
    await writeFile(
      join(articlesDir, "published-post.md"),
      [
        "---",
        'title: "公開済みの記事"',
        "published: true",
        "---",
        "",
        "本文の内容です。",
      ].join("\n"),
    );
    await writeFile(
      join(articlesDir, "draft-post.md"),
      ["---", 'title: "下書き"', "published: false", "---", "", "非公開本文"].join("\n"),
    );
    await writeFile(
      join(articlesDir, "no-published-field.md"),
      ["---", 'title: "フィールド無し"', "---", "", "本文"].join("\n"),
    );

    const pages = await scanZennArticles({
      articlesDir,
      baseUrl: "https://zenn.dev/username/articles",
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({
      url: "https://zenn.dev/username/articles/published-post",
      source: "zenn",
      title: "公開済みの記事",
      text: "本文の内容です。",
    });
  });

  it("falls back to the slug as title when title cannot be extracted", async () => {
    await writeFile(
      join(articlesDir, "no-title.md"),
      ["---", "published: true", "---", "", "本文のみ"].join("\n"),
    );

    const pages = await scanZennArticles({
      articlesDir,
      baseUrl: "https://zenn.dev/username/articles",
    });

    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe("no-title");
  });
});
