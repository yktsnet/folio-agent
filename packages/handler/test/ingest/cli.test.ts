import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "../../src/ingest/cli.js";

let root: string;
let configPath: string;
let outputPath: string;
let originalArgv: string[];
let originalExitCode: number | string | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "folio-agent-ingest-cli-"));
  configPath = join(root, "config.json");
  outputPath = join(root, "output.json");
  originalArgv = process.argv;
  originalExitCode = process.exitCode;
});

afterEach(async () => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  await rm(root, { recursive: true, force: true });
});

describe("folio-agent-ingest main", () => {
  it("reads config.json, generates knowledge, and writes it to output.json", async () => {
    const distDir = join(root, "dist");
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, "index.html"), "<html><head><title>Home</title></head><body><p>Welcome</p></body></html>");

    await writeFile(configPath, JSON.stringify({ distDir, include: ["/"] }));

    process.argv = ["node", "cli.js", configPath, outputPath];

    await main();

    const written = JSON.parse(await readFile(outputPath, "utf-8"));
    expect(written.pages).toEqual([{ url: "/", source: "dist", title: "Home", text: "Welcome" }]);
    expect(written.estimatedTokens).toBeGreaterThan(0);
    expect(written.warnings).toEqual([]);
  });

  it("sets process.exitCode to 1 and does not write output.json when arguments are missing", async () => {
    process.argv = ["node", "cli.js"];

    await main();

    expect(process.exitCode).toBe(1);
    await expect(readFile(outputPath, "utf-8")).rejects.toThrow();
  });
});
