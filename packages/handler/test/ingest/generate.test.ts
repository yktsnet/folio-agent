import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKnowledge } from "../../src/ingest/generate.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "folio-agent-ingest-"));
});

afterEach(async () => {
  vi.unstubAllGlobals();
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

  it("falls back to zennSnapshotPath when articlesDir does not exist", async () => {
    await writeDistPage(root, "index.html", "Home", "<p>Welcome</p>");

    const zennSnapshotPath = join(root, "zenn-snapshot.json");
    const snapshotPages = [
      {
        url: "https://zenn.dev/username/articles/my-post",
        source: "zenn",
        title: "Zenn記事",
        text: "Zenn本文。",
      },
    ];
    await writeFile(zennSnapshotPath, JSON.stringify(snapshotPages, null, 2));

    const knowledge = await generateKnowledge({
      distDir: join(root, "dist"),
      include: ["/"],
      zenn: {
        articlesDir: join(root, "articles-not-checked-out"),
        baseUrl: "https://zenn.dev/username/articles",
      },
      zennSnapshotPath,
    });

    const zennPage = knowledge.pages.find((p) => p.source === "zenn");
    expect(zennPage).toEqual(snapshotPages[0]);
  });

  it("warns and skips zenn ingest when articlesDir does not exist and no snapshot is configured", async () => {
    await writeDistPage(root, "index.html", "Home", "<p>Welcome</p>");

    const articlesDir = join(root, "articles-not-checked-out");
    const knowledge = await generateKnowledge({
      distDir: join(root, "dist"),
      include: ["/"],
      zenn: {
        articlesDir,
        baseUrl: "https://zenn.dev/username/articles",
      },
    });

    expect(knowledge.pages.find((p) => p.source === "zenn")).toBeUndefined();
    expect(knowledge.warnings).toEqual([`articlesDir not found: ${articlesDir} — skipping zenn ingest`]);
  });

  describe("github", () => {
    // README の本文を URL ごとに返す fetch。表に無いリポは 404
    function stubReadmes(readmes: Record<string, string>) {
      const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const slug = String(input).match(/repos\/([^/]+\/[^/]+)\/readme$/)?.[1] ?? "";
        const body = readmes[slug];
        return body === undefined ? new Response("Not Found", { status: 404 }) : new Response(body);
      });
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    it("collects repos only from included, non-excluded pages and adds their READMEs", async () => {
      await writeDistPage(
        root,
        "index.html",
        "Home",
        '<a href="https://github.com/alice/foo">foo</a><a href="https://github.com/alice/foo/tree/main/src">src</a><a href="https://github.com/alice">me</a>',
      );
      await writeDistPage(root, "works/draft-x/index.html", "Draft", '<a href="https://github.com/alice/draft">d</a>');
      await writeDistPage(root, "contact.html", "Contact", '<a href="https://github.com/alice/contact">c</a>');
      const fetchMock = stubReadmes({ "alice/foo": "Foo README" });

      const knowledge = await generateKnowledge({
        distDir: join(root, "dist"),
        include: ["/", "/works/**"],
        exclude: ["/works/draft-*"],
        github: {},
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(knowledge.pages.filter((p) => p.source === "github")).toEqual([
        { url: "https://github.com/alice/foo", source: "github", title: "alice/foo", text: "Foo README" },
      ]);
      expect(knowledge.warnings).toEqual([]);
    });

    it("uses the snapshot page for a repo whose README fetch failed", async () => {
      await writeDistPage(root, "index.html", "Home", '<a href="https://github.com/alice/foo">foo</a>');
      stubReadmes({});
      const snapshotPath = join(root, "github-snapshot.json");
      const snapshotPage = { url: "https://github.com/alice/foo", source: "github", title: "alice/foo", text: "Old" };
      await writeFile(snapshotPath, JSON.stringify([snapshotPage]));

      const knowledge = await generateKnowledge({ distDir: join(root, "dist"), include: ["/"], github: { snapshotPath } });

      expect(knowledge.pages.filter((p) => p.source === "github")).toEqual([snapshotPage]);
      expect(knowledge.warnings).toEqual([]);
    });

    it("skips and warns when the fetch failed and the snapshot has no page for the repo", async () => {
      await writeDistPage(
        root,
        "index.html",
        "Home",
        '<a href="https://github.com/alice/foo">foo</a><a href="https://github.com/alice/bar">bar</a>',
      );
      stubReadmes({ "alice/bar": "Bar README" });
      const snapshotPath = join(root, "github-snapshot.json");
      await writeFile(snapshotPath, JSON.stringify([]));

      const knowledge = await generateKnowledge({ distDir: join(root, "dist"), include: ["/"], github: { snapshotPath } });

      expect(knowledge.pages.filter((p) => p.source === "github").map((p) => p.url)).toEqual([
        "https://github.com/alice/bar",
      ]);
      expect(knowledge.warnings).toHaveLength(1);
      expect(knowledge.warnings[0]).toContain("https://github.com/alice/foo");
    });

    it("skips and warns without stopping when snapshotPath is unset or its file does not exist", async () => {
      await writeDistPage(root, "index.html", "Home", '<a href="https://github.com/alice/foo">foo</a>');
      stubReadmes({});

      for (const github of [{}, { snapshotPath: join(root, "missing.json") }]) {
        const knowledge = await generateKnowledge({ distDir: join(root, "dist"), include: ["/"], github });

        expect(knowledge.pages.map((p) => p.source)).toEqual(["dist"]);
        expect(knowledge.warnings).toHaveLength(1);
        expect(knowledge.warnings[0]).toContain("https://github.com/alice/foo");
      }
    });

    it("counts README text in the estimated tokens", async () => {
      await writeDistPage(root, "index.html", "Home", '<a href="https://github.com/alice/foo">foo</a>');
      stubReadmes({ "alice/foo": "x".repeat(1000) });

      const knowledge = await generateKnowledge({
        distDir: join(root, "dist"),
        include: ["/"],
        github: {},
        tokenWarningThreshold: 100,
      });

      expect(knowledge.warnings.some((w) => /exceeds the warning threshold/.test(w))).toBe(true);
    });

    it("never calls fetch when config.github is not set", async () => {
      await writeDistPage(root, "index.html", "Home", '<a href="https://github.com/alice/foo">foo</a>');
      const fetchMock = stubReadmes({ "alice/foo": "Foo README" });

      const knowledge = await generateKnowledge({ distDir: join(root, "dist"), include: ["/"] });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(knowledge.pages.map((p) => p.source)).toEqual(["dist"]);
    });
  });
});
