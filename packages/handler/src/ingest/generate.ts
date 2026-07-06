import { readFile, stat } from "node:fs/promises";
import { createUrlMatcher } from "./glob.js";
import { htmlToText } from "./html-to-text.js";
import { readTextFile, scanDist, scanKnowledgeDir } from "./scan-dist.js";
import { DEFAULT_TOKEN_WARNING_THRESHOLD, estimateTokens } from "./token-count.js";
import type { IngestConfig, KnowledgeDocument, KnowledgePage } from "./types.js";
import { scanZennArticles } from "./zenn.js";

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function generateKnowledge(config: IngestConfig): Promise<KnowledgeDocument> {
  const matchesUrl = createUrlMatcher(config);
  const pages: KnowledgePage[] = [];
  const warnings: string[] = [];

  const distFiles = await scanDist(config.distDir);
  for (const file of distFiles.filter((f) => matchesUrl(f.urlPath))) {
    const html = await readTextFile(file.absolutePath);
    const { title, text } = htmlToText(html);
    pages.push({ url: file.urlPath, source: "dist", title, text });
  }

  if (config.knowledgeDir) {
    const knowledgeFiles = await scanKnowledgeDir(config.knowledgeDir);
    for (const file of knowledgeFiles) {
      const text = (await readTextFile(file.absolutePath)).trim();
      pages.push({ url: file.urlPath, source: "knowledge", title: file.urlPath, text });
    }
  }

  if (config.zenn) {
    if (await pathExists(config.zenn.articlesDir)) {
      pages.push(...(await scanZennArticles(config.zenn)));
    } else if (config.zennSnapshotPath) {
      const snapshot = JSON.parse(await readFile(config.zennSnapshotPath, "utf-8")) as KnowledgePage[];
      pages.push(...snapshot);
    } else {
      warnings.push(`articlesDir not found: ${config.zenn.articlesDir} — skipping zenn ingest`);
    }
  }

  pages.sort((a, b) => a.url.localeCompare(b.url));

  const estimatedTokens = estimateTokens(pages.map((p) => p.text).join("\n"));
  const threshold = config.tokenWarningThreshold ?? DEFAULT_TOKEN_WARNING_THRESHOLD;
  if (estimatedTokens > threshold) {
    warnings.push(
      `estimated knowledge size (${estimatedTokens} tokens) exceeds the warning threshold (${threshold}). ` +
        "Consider narrowing include globs, or switching to a RAG-based approach.",
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    pages,
    estimatedTokens,
    warnings,
  };
}
