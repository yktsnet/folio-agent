import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { readTextFile } from "./scan-dist.js";
import type { KnowledgePage, ZennIngestConfig } from "./types.js";

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const TITLE_PATTERN = /^title:\s*"?(.*?)"?\s*$/m;
const PUBLISHED_PATTERN = /^published:\s*(true|false)\s*$/m;

/**
 * Reads published Zenn CLI articles from a local articles/ directory (no
 * subdirectories expected) and maps them to KnowledgePage entries. Drafts
 * (published: false) and files without a published field are excluded.
 */
export async function scanZennArticles(config: ZennIngestConfig): Promise<KnowledgePage[]> {
  const entries = await readdir(config.articlesDir, { withFileTypes: true });
  const pages: KnowledgePage[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const absolutePath = join(config.articlesDir, entry.name);
    const content = await readTextFile(absolutePath);

    const frontmatterMatch = content.match(FRONTMATTER_PATTERN);
    if (!frontmatterMatch) continue;

    const frontmatter = frontmatterMatch[1];
    const publishedMatch = frontmatter.match(PUBLISHED_PATTERN);
    if (publishedMatch?.[1] !== "true") continue;

    const slug = basename(entry.name, extname(entry.name));
    const titleMatch = frontmatter.match(TITLE_PATTERN);
    const title = titleMatch ? titleMatch[1] : slug;
    const text = content.slice(frontmatterMatch[0].length).trim();

    pages.push({
      url: `${config.baseUrl}/${slug}`,
      source: "zenn",
      title,
      text,
    });
  }

  return pages;
}
