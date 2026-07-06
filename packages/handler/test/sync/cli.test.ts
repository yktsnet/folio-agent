import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncZennSnapshot } from "../../src/sync/cli.js";

let root: string;
let articlesDir: string;
let configPath: string;
let outputPath: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "folio-agent-sync-zenn-"));
  articlesDir = join(root, "articles");
  configPath = join(root, "config.json");
  outputPath = join(root, "zenn-snapshot.json");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("syncZennSnapshot", () => {
  it("writes only published articles to the output JSON as KnowledgePage[]", async () => {
    await mkdir(articlesDir, { recursive: true });

    await writeFile(
      join(articlesDir, "published-post.md"),
      ["---", 'title: "公開済みの記事"', "published: true", "---", "", "本文の内容です。"].join("\n"),
    );
    await writeFile(
      join(articlesDir, "draft-post.md"),
      ["---", 'title: "下書き"', "published: false", "---", "", "非公開本文"].join("\n"),
    );

    await writeFile(
      configPath,
      JSON.stringify({
        distDir: "dist",
        include: ["/"],
        zenn: {
          articlesDir,
          baseUrl: "https://zenn.dev/username/articles",
        },
      }),
    );

    const pages = await syncZennSnapshot(configPath, outputPath);

    expect(pages).toEqual([
      {
        url: "https://zenn.dev/username/articles/published-post",
        source: "zenn",
        title: "公開済みの記事",
        text: "本文の内容です。",
      },
    ]);

    const written = JSON.parse(await readFile(outputPath, "utf-8"));
    expect(written).toEqual(pages);
  });

  it("throws when config.zenn is not set", async () => {
    await writeFile(configPath, JSON.stringify({ distDir: "dist", include: ["/"] }));

    await expect(syncZennSnapshot(configPath, outputPath)).rejects.toThrow("config.zenn is not set");
  });
});
