#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as clack from "@clack/prompts";
import type { Language } from "../chat/types.js";
import type { IngestConfig } from "../ingest/types.js";
import { DEFAULT_WIZARD_ANSWERS, runWizard } from "./questions.js";
import type { WizardAnswers } from "./questions.js";
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

interface CliText {
  summaryTitle: string;
  summaryConfigLine: string;
  summaryThemeLine: (path: string) => string;
  summaryApiRouteLine: (path: string) => string;
  summaryApiRouteSkippedLine: (path: string) => string;
  summaryApiRouteNotGeneratedLine: string;
  summaryBuildScriptLine: string;
  summaryBuildScriptUnchangedLine: string;
  summaryDevVarsLine: string;
  summaryGitignoreAppendedLine: string;
  summaryGitignoreAlreadyPresentLine: string;
  confirmMessage: string;
  writeCancelledMessage: string;
  outroTitle: string;
  snippetIntro: string;
  snippetIntroExistingConfigNote: string;
  themeImportGuidanceNote: string;
  apiRouteNotGeneratedSnippetNote: string;
  gitignoreAppendedNote: string;
  gitignoreAlreadyPresentNote: string;
  d1Note: string;
}

const CLI_TEXT: Record<Language, CliText> = {
  ja: {
    summaryTitle: "以下の内容で書き込みます:",
    summaryConfigLine: `${CONFIG_PATH} を生成・更新`,
    summaryThemeLine: (path) =>
      `${path} を生成・更新（再実行時はこのファイルの書き換えだけで dev サーバーの HMR に反映されます）`,
    summaryApiRouteLine: (path) => `${path} を新規生成`,
    summaryApiRouteSkippedLine: (path) => `${path} は既に存在するためスキップします`,
    summaryApiRouteNotGeneratedLine: "API ルート雛形は生成しません（既存の配線を利用する設定）",
    summaryBuildScriptLine: `${PACKAGE_JSON_PATH} の build スクリプトに ingest コマンドを追記`,
    summaryBuildScriptUnchangedLine: `${PACKAGE_JSON_PATH} の build スクリプトは変更なし（既に含まれています）`,
    summaryDevVarsLine: `${DEV_VARS_PATH} に GEMINI_API_KEY を書き込み`,
    summaryGitignoreAppendedLine: `${GITIGNORE_PATH} に ${DEV_VARS_PATH} を追記`,
    summaryGitignoreAlreadyPresentLine: `${GITIGNORE_PATH} には ${DEV_VARS_PATH} が既に含まれています（追記不要）`,
    confirmMessage: "この内容で書き込みますか？",
    writeCancelledMessage: "書き込みを中止しました。",
    outroTitle: "セットアップが完了しました。",
    snippetIntro:
      "サイトの全ページで読み込まれる共通テンプレート（Astro なら `src/layouts/` のレイアウト、素の HTML なら `</body>` の直前）に、以下を1回だけ貼り付けてください（再実行時は不要です）:",
    snippetIntroExistingConfigNote:
      "既に <folio-agent-widget> を導入済みの場合は、theme.css の読み込み（`<link>` または `import`）だけ追加すれば十分です。",
    themeImportGuidanceNote:
      'バンドラを使っているサイトでは、レイアウトのスクリプトで `import "./folio-agent.theme.css";` を読み込んでください（相対パスは配置に合わせて調整してください）。',
    apiRouteNotGeneratedSnippetNote:
      "API ルート雛形は生成していません。endpoint は実際の配線パスに合わせて書き換えてください。",
    gitignoreAppendedNote: `${GITIGNORE_PATH} に ${DEV_VARS_PATH} を追記しました。`,
    gitignoreAlreadyPresentNote: `${GITIGNORE_PATH} には ${DEV_VARS_PATH} が既に含まれていました。`,
    d1Note:
      "D1 が未設定でも widget の表示とテーマ確認はローカルで動きます。チャット応答には D1 のセットアップと Gemini API キーが必要です。",
  },
  en: {
    summaryTitle: "The following will be written:",
    summaryConfigLine: `Generate/update ${CONFIG_PATH}`,
    summaryThemeLine: (path) =>
      `Generate/update ${path} (re-running the wizard only rewrites this file, and your dev server's HMR picks it up)`,
    summaryApiRouteLine: (path) => `Generate ${path}`,
    summaryApiRouteSkippedLine: (path) => `Skip ${path} (already exists)`,
    summaryApiRouteNotGeneratedLine: "Skip generating the API route scaffold (site already wires the handler up)",
    summaryBuildScriptLine: `Append the ingest command to ${PACKAGE_JSON_PATH}'s build script`,
    summaryBuildScriptUnchangedLine: `No change to ${PACKAGE_JSON_PATH}'s build script (already present)`,
    summaryDevVarsLine: `Write GEMINI_API_KEY to ${DEV_VARS_PATH}`,
    summaryGitignoreAppendedLine: `Append ${DEV_VARS_PATH} to ${GITIGNORE_PATH}`,
    summaryGitignoreAlreadyPresentLine: `${GITIGNORE_PATH} already contains ${DEV_VARS_PATH} (no change needed)`,
    confirmMessage: "Proceed with writing these files?",
    writeCancelledMessage: "Write cancelled.",
    outroTitle: "Setup complete.",
    snippetIntro:
      "Paste the following once into the common template shared by every page (an Astro layout under `src/layouts/`, or right before `</body>` for plain HTML) — not needed again on re-runs:",
    snippetIntroExistingConfigNote:
      "If <folio-agent-widget> is already set up, you only need to add the theme.css load (`<link>` or `import`).",
    themeImportGuidanceNote:
      'If your site uses a bundler, load it from your layout script with `import "./folio-agent.theme.css";` (adjust the relative path to your layout).',
    apiRouteNotGeneratedSnippetNote:
      "The API route scaffold wasn't generated. Update the endpoint to match your actual routing.",
    gitignoreAppendedNote: `Appended ${DEV_VARS_PATH} to ${GITIGNORE_PATH}.`,
    gitignoreAlreadyPresentNote: `${GITIGNORE_PATH} already contained ${DEV_VARS_PATH}.`,
    d1Note:
      "Without D1 set up, the widget still renders and the theme can be checked locally. Chat responses require D1 and a Gemini API key.",
  },
};

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
 * `.dev.vars` is unconditional — independent of whether a Gemini API key was entered this run —
 * because a skipped key is commonly filled in by hand afterward per the wizard's own guidance
 * (see `geminiApiKeySkipNote`), and by then the file must already be gitignored.
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

function seedDefaults(previous: IngestConfig | undefined): WizardAnswers {
  if (!previous) return DEFAULT_WIZARD_ANSWERS;
  return {
    ...DEFAULT_WIZARD_ANSWERS,
    language: previous.language ?? DEFAULT_WIZARD_ANSWERS.language,
    distDir: previous.distDir ?? DEFAULT_WIZARD_ANSWERS.distDir,
    include: previous.include ?? DEFAULT_WIZARD_ANSWERS.include,
    zenn: previous.zenn,
    theme: previous.theme ?? DEFAULT_WIZARD_ANSWERS.theme,
    apiRoutePath: undefined,
  };
}

async function main(): Promise<void> {
  const previousConfig = await readJson<IngestConfig>(CONFIG_PATH);
  const answers = await runWizard(seedDefaults(previousConfig));
  const text = CLI_TEXT[answers.language];

  const configJson = buildConfigJson(answers, previousConfig);
  const themeCss = buildThemeCss(answers.theme);

  const hasPublicDir = existsSync(PUBLIC_DIR_NAME) && statSync(PUBLIC_DIR_NAME).isDirectory();
  const publicThemeCssPath = `${PUBLIC_DIR_NAME}/${THEME_CSS_FILENAME}`;
  const themeCssPath = resolveThemeCssPath(hasPublicDir, existsSync(publicThemeCssPath), existsSync(THEME_CSS_FILENAME));
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

  const summaryLines = [
    text.summaryConfigLine,
    text.summaryThemeLine(themeCssPath),
    answers.apiRoutePath !== undefined
      ? apiRouteExists
        ? text.summaryApiRouteSkippedLine(answers.apiRoutePath)
        : text.summaryApiRouteLine(answers.apiRoutePath)
      : text.summaryApiRouteNotGeneratedLine,
    buildScriptChanged ? text.summaryBuildScriptLine : text.summaryBuildScriptUnchangedLine,
  ];
  if (nextDevVars !== undefined) {
    summaryLines.push(text.summaryDevVarsLine);
  }
  summaryLines.push(
    gitignoreResult.changed ? text.summaryGitignoreAppendedLine : text.summaryGitignoreAlreadyPresentLine,
  );
  clack.note(summaryLines.join("\n"), text.summaryTitle);

  const shouldWrite = await clack.confirm({ message: text.confirmMessage, initialValue: true });
  if (clack.isCancel(shouldWrite) || !shouldWrite) {
    clack.cancel(text.writeCancelledMessage);
    return;
  }

  await writeFile(CONFIG_PATH, `${JSON.stringify(configJson, null, 2)}\n`);
  await writeFile(themeCssPath, themeCss);

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

  const endpoint = deriveEndpointPath(answers.apiRoutePath ?? DEFAULT_WIZARD_ANSWERS.apiRoutePath ?? "functions/api/chat.ts");
  const snippetLines = [
    ...(usesPublicDirForTheme ? [`<link rel="stylesheet" href="/${THEME_CSS_FILENAME}">`] : []),
    `<folio-agent-widget endpoint="${endpoint}" policy-href="/data-policy" lang="${answers.language}"></folio-agent-widget>`,
    '<script type="module">',
    '  import { defineFolioAgentWidget } from "@folio-agent/widget";',
    "  defineFolioAgentWidget();",
    "</script>",
  ];
  const snippet = snippetLines.join("\n");

  const introNotes = [text.snippetIntro];
  if (previousConfig) {
    introNotes.push(text.snippetIntroExistingConfigNote);
  }
  if (!usesPublicDirForTheme) {
    introNotes.push(text.themeImportGuidanceNote);
  }
  if (answers.apiRoutePath === undefined) {
    introNotes.push(text.apiRouteNotGeneratedSnippetNote);
  }
  clack.note(introNotes.join("\n\n"));
  console.log(`\n${snippet}\n`);

  clack.note(gitignoreResult.changed ? text.gitignoreAppendedNote : text.gitignoreAlreadyPresentNote);
  clack.note(text.d1Note);
  clack.outro(text.outroTitle);
}

// Only run the wizard when executed directly (the bin entry point); importing this module for
// unit tests (e.g. `planDevVarsAndGitignore`) must not trigger the interactive CLI as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
