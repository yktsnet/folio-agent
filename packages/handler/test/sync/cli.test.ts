import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncZennSnapshot } from "../../src/sync/cli.js";

// The compiled bin entry point. Only present after `npm run build`; the
// bin-symlink regression test below is skipped when it's missing (this repo's
// CI runs `npm test` before `npm run build`).
const distCliPath = join(import.meta.dirname, "../../dist/sync/cli.js");

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

describe.skipIf(!existsSync(distCliPath))("folio-agent-sync-zenn CLI (bin symlink execution)", () => {
  // Importing syncZennSnapshot (as the tests above do) can never catch a
  // regression in the "am I being run directly?" guard, since import never
  // triggers it. npm's node_modules/.bin/ entries are symlinks to the real
  // file, so this spawns the compiled CLI through a symlink — mirroring how
  // `folio-agent-sync-zenn` actually gets invoked once installed — to prove
  // main() runs and the output file gets written.
  it("runs main() and writes the output file when invoked via a bin-style symlink", async () => {
    await mkdir(articlesDir, { recursive: true });
    await writeFile(
      join(articlesDir, "published-post.md"),
      ["---", 'title: "公開済みの記事"', "published: true", "---", "", "本文の内容です。"].join("\n"),
    );
    await writeFile(
      configPath,
      JSON.stringify({
        distDir: "dist",
        include: ["/"],
        zenn: { articlesDir, baseUrl: "https://zenn.dev/username/articles" },
      }),
    );

    const binDir = join(root, "bin");
    await mkdir(binDir, { recursive: true });
    const binPath = join(binDir, "folio-agent-sync-zenn");
    await symlink(distCliPath, binPath);

    const result = execFileSync("node", [binPath, configPath, outputPath], { encoding: "utf-8" });

    expect(result).toContain("wrote 1 zenn page(s)");
    const written = JSON.parse(await readFile(outputPath, "utf-8"));
    expect(written).toEqual([
      {
        url: "https://zenn.dev/username/articles/published-post",
        source: "zenn",
        title: "公開済みの記事",
        text: "本文の内容です。",
      },
    ]);
  });
});
