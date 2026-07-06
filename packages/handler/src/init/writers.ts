import { posix } from "node:path";
import { DEFAULT_LANGUAGE } from "../chat/types.js";
import type { Language } from "../chat/types.js";
import type { IngestConfig, ThemeColors, ZennIngestConfig } from "../ingest/types.js";
import type { WizardAnswers } from "./questions.js";

const INGEST_COMMAND_PREFIX = "folio-agent-ingest";

export const THEME_CSS_FILENAME = "folio-agent.theme.css";
export const PUBLIC_DIR_NAME = "public";

/** Builds `folio-agent.config.json` content, preserving fields the wizard never asks about. */
export function buildConfigJson(answers: WizardAnswers, previous?: IngestConfig): IngestConfig {
  const config: IngestConfig = {
    distDir: answers.distDir,
    include: answers.include,
    language: answers.language,
    theme: answers.theme,
  };

  if (previous?.exclude) {
    config.exclude = previous.exclude;
  }
  if (previous?.knowledgeDir) {
    config.knowledgeDir = previous.knowledgeDir;
  }
  if (previous?.tokenWarningThreshold !== undefined) {
    config.tokenWarningThreshold = previous.tokenWarningThreshold;
  }
  if (answers.zenn) {
    config.zenn = answers.zenn satisfies ZennIngestConfig;
  }

  return config;
}

/** Builds `folio-agent.theme.css` content. Re-running the wizard only rewrites this file, which HMR picks up. */
export function buildThemeCss(theme: ThemeColors): string {
  return [
    "folio-agent-widget {",
    `  --folio-agent-accent: ${theme.accent};`,
    `  --folio-agent-surface: ${theme.surface};`,
    `  --folio-agent-text: ${theme.text};`,
    "}",
    "",
  ].join("\n");
}

/**
 * Decides where `folio-agent.theme.css` should be written. A file outside `public/` (or its
 * framework equivalent) isn't served by most static-site pipelines (Astro, Next, etc.), so a
 * `public/` directory is preferred when present. Re-runs reuse whichever location already holds
 * the file, so switching `public/` in and out of existence mid-project doesn't orphan a stale copy.
 */
export function resolveThemeCssPath(hasPublicDir: boolean, existingPublicFile: boolean, existingRootFile: boolean): string {
  if (existingPublicFile) return `${PUBLIC_DIR_NAME}/${THEME_CSS_FILENAME}`;
  if (existingRootFile) return THEME_CSS_FILENAME;
  return hasPublicDir ? `${PUBLIC_DIR_NAME}/${THEME_CSS_FILENAME}` : THEME_CSS_FILENAME;
}

/**
 * Computes the relative import specifier from the API route file to `<distDir>/knowledge.json`,
 * independent of the OS path separator (config values are always POSIX-style project-relative paths).
 */
export function buildKnowledgeImportPath(apiRoutePath: string, distDir: string): string {
  const fromDir = posix.dirname(apiRoutePath);
  const target = posix.join(distDir, "knowledge.json");
  const relative = posix.relative(fromDir, target);
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/** Derives the widget `endpoint` URL path from a Pages Functions file path, e.g. "functions/api/chat.ts" -> "/api/chat". */
export function deriveEndpointPath(apiRoutePath: string): string {
  const withoutExt = apiRoutePath.replace(/\.tsx?$/, "");
  const withoutFunctionsPrefix = withoutExt.replace(/^functions\//, "");
  return `/${withoutFunctionsPrefix}`;
}

export interface ApiRouteAnswers {
  apiRoutePath: string;
  distDir: string;
  contactUrl?: string;
  language: Language;
}

/** Builds a minimal Cloudflare Pages Function that wires up `createChatHandler`. */
export function buildApiRouteTemplate(answers: ApiRouteAnswers): string {
  const knowledgeImportPath = buildKnowledgeImportPath(answers.apiRoutePath, answers.distDir);

  const languageLine = answers.language === DEFAULT_LANGUAGE ? "" : `\n    language: ${JSON.stringify(answers.language)},`;
  const contactUrlLine = answers.contactUrl ? `\n      contactUrl: ${JSON.stringify(answers.contactUrl)},` : "";

  return [
    'import { createChatHandler, createGeminiGenerator } from "@folio-agent/handler";',
    `import knowledgeDoc from "${knowledgeImportPath}";`,
    "",
    'const knowledge = knowledgeDoc.pages.map((page) => `# ${page.url}\\n\\n${page.text}`).join("\\n\\n");',
    "",
    "interface Env {",
    "  DB: D1Database;",
    "  GEMINI_API_KEY: string;",
    "}",
    "",
    "export const onRequestPost: PagesFunction<Env> = async (context) => {",
    "  const handle = createChatHandler({",
    `    db: context.env.DB,${languageLine}`,
    "    generateAnswer: createGeminiGenerator({",
    "      apiKey: context.env.GEMINI_API_KEY,",
    `      knowledge,${contactUrlLine}`,
    "    }),",
    "  });",
    "  return handle(context.request);",
    "};",
    "",
  ].join("\n");
}

/** Appends the ingest command to a `build` script if it isn't already present; otherwise returns it unchanged. */
export function appendIngestToBuildScript(buildScript: string | undefined, configPath: string, knowledgeOutputPath: string): string {
  const ingestCommand = `${INGEST_COMMAND_PREFIX} ${configPath} ${knowledgeOutputPath}`;
  const base = (buildScript ?? "").trim();

  if (base.includes(ingestCommand)) {
    return base;
  }

  return base.length > 0 ? `${base} && ${ingestCommand}` : ingestCommand;
}

/** Adds or replaces a single `KEY=value` line in `.dev.vars` content, leaving other lines untouched. */
export function upsertDevVar(content: string, key: string, value: string): string {
  const trimmed = content.replace(/\n+$/, "");
  const lines = trimmed.length > 0 ? trimmed.split("\n") : [];
  const prefix = `${key}=`;
  const newLine = `${prefix}${value}`;
  const index = lines.findIndex((line) => line.startsWith(prefix));

  if (index >= 0) {
    lines[index] = newLine;
  } else {
    lines.push(newLine);
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Ensures `entry` appears as its own line in `.gitignore` content, appending it if no existing
 * line starts with it. Intentionally doesn't interpret comments or wider patterns (e.g. `*.vars`);
 * a duplicate append is harmless, so a plain line-start check is enough.
 */
export function ensureGitignoreEntry(content: string, entry: string): { content: string; changed: boolean } {
  const lines = content.length > 0 ? content.split("\n") : [];
  const alreadyPresent = lines.some((line) => line.startsWith(entry));
  if (alreadyPresent) {
    return { content, changed: false };
  }

  const trimmed = content.replace(/\n+$/, "");
  const nextContent = trimmed.length > 0 ? `${trimmed}\n${entry}\n` : `${entry}\n`;
  return { content: nextContent, changed: true };
}
