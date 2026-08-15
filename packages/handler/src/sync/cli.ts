#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { scanZennArticles } from "../ingest/zenn.js";
import type { IngestConfig, KnowledgePage } from "../ingest/types.js";

/**
 * Reads `config.zenn` from `configPath`, scans the configured articles/
 * directory, and writes the resulting `KnowledgePage[]` to `outputPath` as
 * JSON. Throws if `config.zenn` is not set.
 */
export async function syncZennSnapshot(configPath: string, outputPath: string): Promise<KnowledgePage[]> {
  const config = JSON.parse(await readFile(configPath, "utf-8")) as IngestConfig;

  if (!config.zenn) {
    throw new Error("config.zenn is not set");
  }

  const pages = await scanZennArticles(config.zenn);

  await writeFile(outputPath, JSON.stringify(pages, null, 2));

  return pages;
}

async function main(): Promise<void> {
  const configPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!configPath || !outputPath) {
    console.error("usage: folio-agent-sync-zenn <config.json> <output.json>");
    process.exitCode = 1;
    return;
  }

  const pages = await syncZennSnapshot(configPath, outputPath);

  console.log(`wrote ${pages.length} zenn page(s) -> ${outputPath}`);
}

// Only run when executed directly (e.g. `folio-agent-sync-zenn ...`), not
// when imported by tests. Compares realpaths: npm's node_modules/.bin/
// entries are symlinks, so process.argv[1] stays the symlink path while
// import.meta.url is already the resolved target — a plain string/URL
// comparison of the two (matching ingest/cli.ts as-is) never matches, and
// main() silently never runs when invoked via the published bin name.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
