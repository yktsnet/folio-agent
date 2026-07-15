#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateKnowledge } from "./generate.js";
import type { IngestConfig } from "./types.js";

export async function main(): Promise<void> {
  const configPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!configPath || !outputPath) {
    console.error("usage: folio-agent-ingest <config.json> <output.json>");
    process.exitCode = 1;
    return;
  }

  const config = JSON.parse(await readFile(configPath, "utf-8")) as IngestConfig;
  const knowledge = await generateKnowledge(config);

  await writeFile(outputPath, JSON.stringify(knowledge, null, 2));

  console.log(`wrote ${knowledge.pages.length} page(s), ~${knowledge.estimatedTokens} tokens -> ${outputPath}`);
  for (const warning of knowledge.warnings) {
    console.warn(`warning: ${warning}`);
  }
}

// Only run when executed directly (e.g. `folio-agent-ingest ...`), not when imported by tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
