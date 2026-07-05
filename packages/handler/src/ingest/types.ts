export interface IngestConfig {
  /** Absolute or cwd-relative path to the built site (e.g. "dist"). */
  distDir: string;
  /** URL path globs to include, e.g. ["/", "/works/**", "/about"]. */
  include: string[];
  /** URL path globs to exclude, e.g. ["/works/draft-*"]. */
  exclude?: string[];
  /** Directory mirroring URL paths with supplementary Markdown, e.g. "knowledge". */
  knowledgeDir?: string;
  /** Zenn CLI articles/ ingestion. Omit to skip Zenn articles entirely. */
  zenn?: ZennIngestConfig;
  /** Token threshold above which the CLI warns that CAG may no longer fit. */
  tokenWarningThreshold?: number;
}

export interface ZennIngestConfig {
  /** Local path (absolute or cwd-relative) to the Zenn CLI articles/ directory. */
  articlesDir: string;
  /** Base used to build public article URLs, e.g. "https://zenn.dev/username/articles". No trailing slash. */
  baseUrl: string;
}

export type KnowledgeSource = "dist" | "knowledge" | "zenn";

export interface KnowledgePage {
  url: string;
  source: KnowledgeSource;
  title: string;
  text: string;
}

export interface KnowledgeDocument {
  generatedAt: string;
  pages: KnowledgePage[];
  estimatedTokens: number;
  warnings: string[];
}
