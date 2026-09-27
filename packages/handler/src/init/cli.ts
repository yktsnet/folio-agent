#!/usr/bin/env node
import { existsSync, realpathSync, statSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { IngestConfig } from "../ingest/types.js";
import { DEFAULT_API_ROUTE_PATH, InitArgsError, resolveInitRun, USAGE } from "./options.js";
import {
  appendIngestToBuildScript,
  buildApiRouteTemplate,
  buildConfigJson,
  buildThemeCss,
  deriveEndpointPath,
  ensureGitignoreEntry,
  PUBLIC_DIR_NAME,
  resolveThemeCssPath,
  THEME_CSS_FILENAME,
  upsertDevVar,
} from "./writers.js";

const CONFIG_PATH = "folio-agent.config.json";
const PACKAGE_JSON_PATH = "package.json";
const DEV_VARS_PATH = ".dev.vars";
const GITIGNORE_PATH = ".gitignore";
const KNOWLEDGE_OUTPUT_PATH = "dist/knowledge.json";

interface PackageJsonLike {
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

async function readTextOrEmpty(path: string): Promise<string> {
  return existsSync(path) ? readFile(path, "utf-8") : "";
}

export interface DevVarsAndGitignorePlan {
  nextDevVars: string | undefined;
  gitignoreResult: { content: string; changed: boolean };
}

/**
 * Computes what to write to `.dev.vars` and `.gitignore`. `.gitignore` protection for
 * `.dev.vars` is unconditional — independent of whether `GEMINI_API_KEY` was set this run —
 * because a missing key is commonly filled in by hand afterward, and by then the file must
 * already be gitignored.
 */
export function planDevVarsAndGitignore(
  geminiApiKey: string | undefined,
  devVarsContent: string,
  gitignoreContent: string,
): DevVarsAndGitignorePlan {
  const nextDevVars = geminiApiKey ? upsertDevVar(devVarsContent, "GEMINI_API_KEY", geminiApiKey) : undefined;
  const gitignoreResult = ensureGitignoreEntry(gitignoreContent, DEV_VARS_PATH);
  return { nextDevVars, gitignoreResult };
}

export async function main(
  argv: string[] = process.argv.slice(2),
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const previousConfig = await readJson<IngestConfig>(CONFIG_PATH);

  let run;
  try {
    run = resolveInitRun(argv, previousConfig, env);
  } catch (error) {
    if (!(error instanceof InitArgsError)) throw error;
    console.error(`folio-agent-init: ${error.message}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  if (!run) {
    console.log(USAGE);
    return;
  }
  const { answers, dryRun } = run;

  const configJson = buildConfigJson(answers, previousConfig);

  const hasPublicDir = existsSync(PUBLIC_DIR_NAME) && statSync(PUBLIC_DIR_NAME).isDirectory();
  const publicThemeCssPath = `${PUBLIC_DIR_NAME}/${THEME_CSS_FILENAME}`;
  const themeCssPath = resolveThemeCssPath(hasPublicDir, existsSync(publicThemeCssPath), existsSync(THEME_CSS_FILENAME));
  const themeCssExists = existsSync(themeCssPath);
  const usesPublicDirForTheme = themeCssPath === publicThemeCssPath;

  const apiRouteExists = answers.apiRoutePath !== undefined && existsSync(answers.apiRoutePath);
  const apiRouteContent =
    answers.apiRoutePath !== undefined && !apiRouteExists
      ? buildApiRouteTemplate({
          apiRoutePath: answers.apiRoutePath,
          distDir: answers.distDir,
          contactUrl: answers.contactUrl,
          language: answers.language,
        })
      : undefined;

  const pkg = (await readJson<PackageJsonLike>(PACKAGE_JSON_PATH)) ?? {};
  const scripts = pkg.scripts ?? {};
  const nextBuildScript = appendIngestToBuildScript(scripts.build, CONFIG_PATH, KNOWLEDGE_OUTPUT_PATH);
  const buildScriptChanged = nextBuildScript !== (scripts.build ?? "");

  const { nextDevVars, gitignoreResult } = planDevVarsAndGitignore(
    answers.geminiApiKey,
    await readTextOrEmpty(DEV_VARS_PATH),
    await readTextOrEmpty(GITIGNORE_PATH),
  );

  const plan = [
    `write   ${CONFIG_PATH}`,
    answers.theme
      ? `write   ${themeCssPath}`
      : themeCssExists
        ? `remove  ${themeCssPath} (theme: auto)`
        : "skip    theme CSS (theme: auto, the widget follows the site's colors)",
    answers.apiRoutePath === undefined
      ? "skip    API route scaffold"
      : apiRouteExists
        ? `skip    ${answers.apiRoutePath} (already exists)`
        : `create  ${answers.apiRoutePath}`,
    buildScriptChanged ? `update  ${PACKAGE_JSON_PATH} (append ingest to the build script)` : `keep    ${PACKAGE_JSON_PATH}`,
    nextDevVars !== undefined ? `write   ${DEV_VARS_PATH} (GEMINI_API_KEY)` : `skip    ${DEV_VARS_PATH} (GEMINI_API_KEY is not set)`,
    gitignoreResult.changed ? `update  ${GITIGNORE_PATH} (add ${DEV_VARS_PATH})` : `keep    ${GITIGNORE_PATH}`,
  ];
  console.log(`folio-agent-init${dryRun ? " (dry run)" : ""}\n${plan.map((line) => `  ${line}`).join("\n")}\n`);

  if (!dryRun) {
    await writeFile(CONFIG_PATH, `${JSON.stringify(configJson, null, 2)}\n`);
    if (answers.theme) {
      await writeFile(themeCssPath, buildThemeCss(answers.theme));
    } else if (themeCssExists) {
      await rm(themeCssPath);
    }
    if (apiRouteContent !== undefined && answers.apiRoutePath !== undefined) {
      await mkdir(dirname(answers.apiRoutePath), { recursive: true });
      await writeFile(answers.apiRoutePath, apiRouteContent);
    }
    if (buildScriptChanged) {
      const nextPkg = { ...pkg, scripts: { ...scripts, build: nextBuildScript } };
      await writeFile(PACKAGE_JSON_PATH, `${JSON.stringify(nextPkg, null, 2)}\n`);
    }
    if (nextDevVars !== undefined) {
      await writeFile(DEV_VARS_PATH, nextDevVars);
    }
    if (gitignoreResult.changed) {
      await writeFile(GITIGNORE_PATH, gitignoreResult.content);
    }
  }

  const endpoint = deriveEndpointPath(answers.apiRoutePath ?? DEFAULT_API_ROUTE_PATH);
  const snippet = [
    ...(answers.theme && usesPublicDirForTheme ? [`<link rel="stylesheet" href="/${THEME_CSS_FILENAME}">`] : []),
    `<folio-agent-widget endpoint="${endpoint}" policy-href="/data-policy" lang="${answers.language}"></folio-agent-widget>`,
    '<script type="module">',
    '  import { defineFolioAgentWidget } from "@folio-agent/widget";',
    "  defineFolioAgentWidget();",
    "</script>",
  ].join("\n");

  const notes = [
    "Add this once to the layout shared by every page (an Astro layout, or just before </body>). Not needed again on re-runs:",
    "",
    snippet,
  ];
  if (answers.theme && !usesPublicDirForTheme) {
    notes.push("", `With a bundler, load the theme from the layout script: import "./${THEME_CSS_FILENAME}"; (adjust the path).`);
  }
  if (answers.apiRoutePath === undefined) {
    notes.push("", "No API route scaffold was generated. Point endpoint at your actual route.");
  }
  if (nextDevVars === undefined) {
    notes.push("", `Chat answers need GEMINI_API_KEY in ${DEV_VARS_PATH} (re-run with the variable set, or add it by hand) and a D1 database.`);
  }
  console.log(notes.join("\n"));
}

// Only run when executed directly (the bin entry point); importing this module for unit tests
// (e.g. `planDevVarsAndGitignore`) must not run the CLI as a side effect.
// Compares realpaths, not raw paths: npm's node_modules/.bin/ entries are symlinks, so
// process.argv[1] stays the symlink path while import.meta.url is already the resolved target
// (see sync/cli.ts for the fuller rationale).
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
