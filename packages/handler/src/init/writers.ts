import { posix } from "node:path";
import { DEFAULT_LANGUAGE } from "../chat/types.js";
import type { Language } from "../chat/types.js";
import type { IngestConfig, ThemeColors, ZennIngestConfig } from "../ingest/types.js";
import type { InitAnswers } from "./options.js";

const INGEST_COMMAND_PREFIX = "folio-agent-ingest";

export const THEME_CSS_FILENAME = "folio-agent.theme.css";
export const PUBLIC_DIR_NAME = "public";

/** Builds `folio-agent.config.json` content, keeping every previous field that init doesn't manage. */
export function buildConfigJson(answers: InitAnswers, previous?: IngestConfig): IngestConfig {
  const config: IngestConfig = {
    ...previous,
    distDir: answers.distDir,
    include: answers.include,
    language: answers.language,
  };
  delete config.theme;
  delete config.zenn;

  if (answers.theme) {
    config.theme = answers.theme;
  }
  if (answers.zenn) {
    config.zenn = answers.zenn satisfies ZennIngestConfig;
  }

  return config;
}

/** Builds `folio-agent.theme.css` content. Re-running init only rewrites this file, which HMR picks up. */
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

  const nonDefaultLanguage = answers.language === DEFAULT_LANGUAGE ? undefined : JSON.stringify(answers.language);
  const languageLine = nonDefaultLanguage ? `\n    language: ${nonDefaultLanguage},` : "";
  const generatorLanguageLine = nonDefaultLanguage ? `\n      language: ${nonDefaultLanguage},` : "";
  const contactUrlConst = answers.contactUrl ? [`const CONTACT_URL = ${JSON.stringify(answers.contactUrl)};`, ""] : [];
  const contactUrlLine = answers.contactUrl ? "\n      contactUrl: CONTACT_URL," : "";
  const linkArgs = [
    "knowledgeDoc",
    ...(answers.contactUrl || nonDefaultLanguage ? [answers.contactUrl ? "CONTACT_URL" : "undefined"] : []),
    ...(nonDefaultLanguage ? [nonDefaultLanguage] : []),
  ].join(", ");

  return [
    'import { collectAnswerLinks, createChatHandler, createGeminiGenerator, formatKnowledge } from "@folio-agent/handler";',
    `import knowledgeDoc from "${knowledgeImportPath}";`,
    "",
    ...contactUrlConst,
    "const knowledge = formatKnowledge(knowledgeDoc);",
    `const answerLinks = collectAnswerLinks(${linkArgs});`,
    "",
    "interface Env {",
    "  DB: D1Database;",
    "  GEMINI_API_KEY: string;",
    "}",
    "",
    "export const onRequestPost: PagesFunction<Env> = async (context) => {",
    "  const handle = createChatHandler({",
    `    db: context.env.DB,${languageLine}`,
    "    answerLinks,",
    "    generateAnswer: createGeminiGenerator({",
    "      apiKey: context.env.GEMINI_API_KEY,",
    `      knowledge,${contactUrlLine}${generatorLanguageLine}`,
    "    }),",
    "  });",
    "  return handle(context.request);",
    "};",
    "",
  ].join("\n");
}

/**
 * Appends the ingest command to a `build` script unless it already runs ingest. Any existing
 * `folio-agent-ingest` counts, whatever its arguments: sites often write to a different output
 * path than the default, and appending a second run would ingest twice.
 */
export function appendIngestToBuildScript(buildScript: string | undefined, configPath: string, knowledgeOutputPath: string): string {
  const ingestCommand = `${INGEST_COMMAND_PREFIX} ${configPath} ${knowledgeOutputPath}`;
  const base = (buildScript ?? "").trim();

  if (base.includes(INGEST_COMMAND_PREFIX)) {
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
