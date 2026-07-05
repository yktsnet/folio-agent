import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateKnowledge } from "../../src/ingest/generate.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "folio-agent-ingest-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeDistPage(root: string, relPath: string, title: string, body: string) {
  const path = join(root, "dist", relPath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `<html><head><title>${title}</title></head><body>${body}</body></html>`);
}

describe("generateKnowledge", () => {
  it("combines included dist pages and knowledge/ markdown, skipping excluded/unmatched pages", async () => {
    await writeDistPage(root, "index.html", "Home", "<p>Welcome</p>");
    await writeDistPage(root, "works/foo/index.html", "Foo", "<p>Foo details</p>");
    await writeDistPage(root, "works/draft-bar/index.html", "Draft Bar", "<p>Not ready</p>");
    await writeDistPage(root, "contact.html", "Contact", "<p>Get in touch</p>");

    const knowledgeDir = join(root, "knowledge", "works");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(join(knowledgeDir, "foo.md"), "Extra context about Foo.");

    const knowledge = await generateKnowledge({
      distDir: join(root, "dist"),
      include: ["/", "/works/**"],
      exclude: ["/works/draft-*"],
      knowledgeDir: join(root, "knowledge"),
    });

    const urls = knowledge.pages.map((p) => p.url);
    expect(urls).toEqual(["/", "/works/foo", "/works/foo"]);
    expect(urls).not.toContain("/works/draft-bar");
    expect(urls).not.toContain("/contact");

    const knowledgePage = knowledge.pages.find((p) => p.source === "knowledge");
    expect(knowledgePage?.text).toBe("Extra context about Foo.");

    expect(knowledge.estimatedTokens).toBeGreaterThan(0);
    expect(knowledge.warnings).toEqual([]);
  });

  it("warns when estimated tokens exceed the threshold", async () => {
    await writeDistPage(root, "index.html", "Home", `<p>${"x".repeat(100)}</p>`);

    const knowledge = await generateKnowledge({
      distDir: join(root, "dist"),
      include: ["/"],
      tokenWarningThreshold: 10,
    });

    expect(knowledge.warnings).toHaveLength(1);
    expect(knowledge.warnings[0]).toMatch(/exceeds the warning threshold/);
  });

  it("includes published Zenn articles when zenn config is set", async () => {
    await writeDistPage(root, "index.html", "Home", "<p>Welcome</p>");

    const articlesDir = join(root, "articles");
    await mkdir(articlesDir, { recursive: true });
    await writeFile(
      join(articlesDir, "my-post.md"),
      ["---", 'title: "Zenn記事"', "published: true", "---", "", "Zenn本文。"].join("\n"),
    );

    const knowledge = await generateKnowledge({
      distDir: join(root, "dist"),
      include: ["/"],
      zenn: {
        articlesDir,
        baseUrl: "https://zenn.dev/username/articles",
      },
    });

    const zennPage = knowledge.pages.find((p) => p.source === "zenn");
    expect(zennPage).toEqual({
      url: "https://zenn.dev/username/articles/my-post",
      source: "zenn",
      title: "Zenn記事",
      text: "Zenn本文。",
    });
  });
});
