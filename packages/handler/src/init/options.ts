import { parseArgs } from "node:util";
import type { ParseArgsConfig } from "node:util";
import { DEFAULT_LANGUAGE } from "../chat/types.js";
import type { Language } from "../chat/types.js";
import type { IngestConfig, ThemeColors, ZennIngestConfig } from "../ingest/types.js";

export interface InitAnswers {
  language: Language;
  distDir: string;
  include: string[];
  zenn?: ZennIngestConfig;
  contactUrl?: string;
  /** `undefined` means "auto": no theme CSS, the widget follows the host's colors. */
  theme?: ThemeColors;
  /** Taken from the `GEMINI_API_KEY` environment variable; `undefined` leaves `.dev.vars` untouched. */
  geminiApiKey?: string;
  /** `undefined` means "don't generate the API route scaffold". */
  apiRoutePath?: string;
}

export interface InitRun {
  answers: InitAnswers;
  dryRun: boolean;
}

export type ThemePreset = "auto" | "poimandres" | "custom";

export const DEFAULT_API_ROUTE_PATH = "functions/api/chat.ts";
const DEFAULT_DIST_DIR = "dist";
const DEFAULT_INCLUDE = ["/**"];

export const THEME_PRESETS: Record<Exclude<ThemePreset, "auto" | "custom">, ThemeColors> = {
  poimandres: { surface: "#1b1e28", text: "#e4f0fb", accent: "#5de4c7" },
};

export const USAGE = `Usage: folio-agent-init [options]

Writes folio-agent.config.json, the theme CSS, an API route scaffold, the ingest step in
package.json's build script, and .dev.vars. Re-running keeps every value you don't pass.

Options:
  --lang <ja|en>              UI and prompt language (default: ja)
  --dist <dir>                Built site directory (default: dist)
  --include <globs>           Comma-separated URL globs to ingest (default: /**)
  --zenn-dir <path>           Zenn CLI articles/ directory (with --zenn-user)
  --zenn-user <name|url>      Zenn username or articles base URL (with --zenn-dir)
  --no-zenn                   Stop ingesting Zenn articles
  --contact-url <url>         Contact page URL used in the API route scaffold
  --theme <preset>            auto | poimandres | custom (default: auto)
  --accent <hex>              Theme accent color (implies --theme custom)
  --surface <hex>             Theme surface color (implies --theme custom)
  --text <hex>                Theme text color (implies --theme custom)
  --api-route <path>          Generate the API route scaffold at this path
                              (default on a fresh setup: ${DEFAULT_API_ROUTE_PATH})
  --no-api-route              Don't generate the API route scaffold
  --dry-run                   Print what would be written, write nothing
  -h, --help                  Show this help

Environment:
  GEMINI_API_KEY              Written to .dev.vars when set. Never pass the key as an argument.
`;

export class InitArgsError extends Error {}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

/** Splits a comma-separated glob list into a trimmed, non-empty array. */
export function parseIncludeList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Normalizes a Zenn `baseUrl` answer. A bare username (no `http(s)://` prefix) is expanded to the
 * canonical Zenn articles URL; an already-fully-qualified URL passes through unchanged.
 */
export function normalizeZennBaseUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://zenn.dev/${trimmed}/articles`;
}

const OPTIONS = {
  lang: { type: "string" },
  dist: { type: "string" },
  include: { type: "string" },
  "zenn-dir": { type: "string" },
  "zenn-user": { type: "string" },
  "no-zenn": { type: "boolean" },
  "contact-url": { type: "string" },
  theme: { type: "string" },
  accent: { type: "string" },
  surface: { type: "string" },
  text: { type: "string" },
  "api-route": { type: "string" },
  "no-api-route": { type: "boolean" },
  "dry-run": { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const satisfies ParseArgsConfig["options"];

function parseInitArgs(argv: string[]) {
  try {
    return parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false }).values;
  } catch (error) {
    throw new InitArgsError(error instanceof Error ? error.message : String(error));
  }
}

/** Returns `undefined` when help was requested; throws `InitArgsError` on invalid input. */
export function resolveInitRun(
  argv: string[],
  previous: IngestConfig | undefined,
  env: Record<string, string | undefined>,
): InitRun | undefined {
  const values = parseInitArgs(argv);
  if (values.help) return undefined;

  const language = values.lang ?? previous?.language ?? DEFAULT_LANGUAGE;
  if (language !== "ja" && language !== "en") {
    throw new InitArgsError(`--lang must be "ja" or "en" (got "${language}")`);
  }

  const include = values.include !== undefined ? parseIncludeList(values.include) : (previous?.include ?? DEFAULT_INCLUDE);
  if (include.length === 0) throw new InitArgsError("--include needs at least one URL glob");

  const apiRoutePath = resolveApiRoutePath(values["api-route"], values["no-api-route"], previous !== undefined);
  const geminiApiKey = env.GEMINI_API_KEY?.trim() || undefined;

  return {
    dryRun: values["dry-run"] ?? false,
    answers: {
      language,
      distDir: values.dist ?? previous?.distDir ?? DEFAULT_DIST_DIR,
      include,
      zenn: resolveZenn(values["zenn-dir"], values["zenn-user"], values["no-zenn"], previous?.zenn),
      contactUrl: values["contact-url"]?.trim() || undefined,
      theme: resolveTheme(values, previous?.theme),
      geminiApiKey,
      apiRoutePath,
    },
  };
}

function resolveApiRoutePath(path: string | undefined, skip: boolean | undefined, hasPreviousConfig: boolean): string | undefined {
  if (path !== undefined && skip) throw new InitArgsError("--api-route and --no-api-route can't be combined");
  if (skip) return undefined;
  if (path !== undefined) return path;
  // 既存の設定がある再実行では、サイトが別の経路で handler を配線済みのことが多い
  return hasPreviousConfig ? undefined : DEFAULT_API_ROUTE_PATH;
}

function resolveZenn(
  dir: string | undefined,
  user: string | undefined,
  remove: boolean | undefined,
  previous: ZennIngestConfig | undefined,
): ZennIngestConfig | undefined {
  if (remove) {
    if (dir !== undefined || user !== undefined) throw new InitArgsError("--no-zenn can't be combined with --zenn-dir / --zenn-user");
    return undefined;
  }
  const articlesDir = dir ?? previous?.articlesDir;
  const baseUrl = user !== undefined ? normalizeZennBaseUrl(user) : previous?.baseUrl;
  if (articlesDir === undefined && baseUrl === undefined) return undefined;
  if (articlesDir === undefined || baseUrl === undefined) {
    throw new InitArgsError("Zenn ingest needs both --zenn-dir and --zenn-user");
  }
  return { articlesDir, baseUrl };
}

function resolveTheme(
  values: { theme?: string; accent?: string; surface?: string; text?: string },
  previous: ThemeColors | undefined,
): ThemeColors | undefined {
  const hasColor = values.accent !== undefined || values.surface !== undefined || values.text !== undefined;
  const preset = values.theme ?? (hasColor ? "custom" : undefined);

  if (preset === undefined) return previous;
  if (preset !== "custom" && hasColor) {
    throw new InitArgsError(`--accent / --surface / --text only apply to --theme custom (got --theme ${preset})`);
  }
  if (preset === "auto") return undefined;
  if (preset === "poimandres") return THEME_PRESETS.poimandres;
  if (preset !== "custom") throw new InitArgsError(`--theme must be auto, poimandres or custom (got "${preset}")`);

  const theme = {
    accent: values.accent ?? previous?.accent,
    surface: values.surface ?? previous?.surface,
    text: values.text ?? previous?.text,
  };
  for (const [key, value] of Object.entries(theme)) {
    if (value === undefined) throw new InitArgsError(`--theme custom needs --${key}`);
    if (!isValidHexColor(value)) throw new InitArgsError(`--${key} must be a hex color like #fff or #ffffff (got "${value}")`);
  }
  return { accent: theme.accent!.trim(), surface: theme.surface!.trim(), text: theme.text!.trim() };
}
