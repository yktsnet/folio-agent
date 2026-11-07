import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncGithubSnapshot } from "../../src/sync/github-cli.js";

// npm run build の後にだけある。CI は build 前に test を流すので、無ければ bin の試験は飛ばす
const distCliPath = join(import.meta.dirname, "../../dist/sync/github-cli.js");

let root: string;
let configPath: string;
let outputPath: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "folio-agent-sync-github-"));
  configPath = join(root, "config.json");
  outputPath = join(root, "github-snapshot.json");
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function writeDist(html: string) {
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(join(root, "dist", "index.html"), `<html><body>${html}</body></html>`);
}

describe("syncGithubSnapshot", () => {
  it("writes only repos whose README was fetched, and reports failures on stderr", async () => {
    await writeDist('<a href="https://github.com/alice/foo">foo</a><a href="https://github.com/alice/gone">gone</a>');
    await writeFile(configPath, JSON.stringify({ distDir: join(root, "dist"), include: ["/"], github: {} }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) =>
        String(input).includes("alice/foo") ? new Response("Foo README") : new Response("", { status: 404 }),
      ),
    );
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

    const pages = await syncGithubSnapshot(configPath, outputPath);

    expect(pages).toEqual([
      { url: "https://github.com/alice/foo", source: "github", title: "alice/foo", text: "Foo README" },
    ]);
    expect(JSON.parse(await readFile(outputPath, "utf-8"))).toEqual(pages);
    expect(stderr.mock.calls.flat().join("\n")).toContain("https://github.com/alice/gone");
  });

  it("throws when config.github is not set", async () => {
    await writeFile(configPath, JSON.stringify({ distDir: "dist", include: ["/"] }));

    await expect(syncGithubSnapshot(configPath, outputPath)).rejects.toThrow("config.github is not set");
  });
});

describe.skipIf(!existsSync(distCliPath))("folio-agent-sync-github CLI (bin symlink execution)", () => {
  // 子プロセスでは fetch を差し替えられないので、リンクの無いサイトで main() が出力を書くことだけを見る
  it("runs main() and writes the output file when invoked via a bin-style symlink", async () => {
    await writeDist("<p>no repos</p>");
    await writeFile(configPath, JSON.stringify({ distDir: join(root, "dist"), include: ["/"], github: {} }));

    const binDir = join(root, "bin");
    await mkdir(binDir, { recursive: true });
    const binPath = join(binDir, "folio-agent-sync-github");
    await symlink(distCliPath, binPath);

    const result = execFileSync("node", [binPath, configPath, outputPath], { encoding: "utf-8" });

    expect(result).toContain("wrote 0 github page(s)");
    expect(JSON.parse(await readFile(outputPath, "utf-8"))).toEqual([]);
  });
});
