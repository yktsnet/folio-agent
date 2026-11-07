#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { collectGithubReposFromDist, fetchGithubReadmes } from "../ingest/github.js";
import type { IngestConfig, KnowledgePage } from "../ingest/types.js";

/**
 * Reads `configPath`, collects GitHub repos linked from the included pages of `distDir`,
 * fetches their READMEs, and writes the successful ones to `outputPath` as `KnowledgePage[]`.
 * Failed repos are reported on stderr and left out. Throws if `config.github` is not set.
 */
export async function syncGithubSnapshot(configPath: string, outputPath: string): Promise<KnowledgePage[]> {
  const config = JSON.parse(await readFile(configPath, "utf-8")) as IngestConfig;

  if (!config.github) {
    throw new Error("config.github is not set");
  }

  const repos = await collectGithubReposFromDist(config);
  const { pages, failures } = await fetchGithubReadmes(repos);
  for (const failure of failures) {
    console.error(`skipped ${failure.repoUrl}: ${failure.error}`);
  }

  await writeFile(outputPath, JSON.stringify(pages, null, 2));

  return pages;
}

async function main(): Promise<void> {
  const configPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!configPath || !outputPath) {
    console.error("usage: folio-agent-sync-github <config.json> <output.json>");
    console.error("Run after building the site: repos are collected from links in distDir.");
    process.exitCode = 1;
    return;
  }

  const pages = await syncGithubSnapshot(configPath, outputPath);

  console.log(`wrote ${pages.length} github page(s) -> ${outputPath}`);
}

// node_modules/.bin のシンボリックリンク経由でも動くよう realpath で比べる（sync/cli.ts と同じ理由）
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
