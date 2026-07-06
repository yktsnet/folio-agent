#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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
  upsertDevVar,
} from "./writers.js";

const CONFIG_PATH = "folio-agent.config.json";
const THEME_CSS_PATH = "folio-agent.theme.css";
const PACKAGE_JSON_PATH = "package.json";
const DEV_VARS_PATH = ".dev.vars";
const KNOWLEDGE_OUTPUT_PATH = "dist/knowledge.json";

interface PackageJsonLike {
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

interface CliText {
  summaryTitle: string;
  summaryConfigLine: string;
  summaryThemeLine: string;
  summaryApiRouteLine: (path: string) => string;
  summaryApiRouteSkippedLine: (path: string) => string;
  summaryBuildScriptLine: string;
  summaryBuildScriptUnchangedLine: string;
  summaryDevVarsLine: string;
  confirmMessage: string;
  writeCancelledMessage: string;
  outroTitle: string;
  snippetIntro: string;
  d1Note: string;
}

const CLI_TEXT: Record<Language, CliText> = {
  ja: {
    summaryTitle: "以下の内容で書き込みます:",
    summaryConfigLine: `${CONFIG_PATH} を生成・更新`,
    summaryThemeLine: `${THEME_CSS_PATH} を生成・更新（再実行時はこのファイルの書き換えだけで dev サーバーの HMR に反映されます）`,
    summaryApiRouteLine: (path) => `${path} を新規生成`,
    summaryApiRouteSkippedLine: (path) => `${path} は既に存在するためスキップします`,
    summaryBuildScriptLine: `${PACKAGE_JSON_PATH} の build スクリプトに ingest コマンドを追記`,
    summaryBuildScriptUnchangedLine: `${PACKAGE_JSON_PATH} の build スクリプトは変更なし（既に含まれています）`,
    summaryDevVarsLine: `${DEV_VARS_PATH} に GEMINI_API_KEY を書き込み`,
    confirmMessage: "この内容で書き込みますか？",
    writeCancelledMessage: "書き込みを中止しました。",
    outroTitle: "セットアップが完了しました。",
    snippetIntro: "レイアウトに以下を1回だけ貼り付けてください（再実行時は不要です）:",
    d1Note:
      "D1 が未設定でも widget の表示とテーマ確認はローカルで動きます。チャット応答には D1 のセットアップと Gemini API キーが必要です。",
  },
  en: {
    summaryTitle: "The following will be written:",
    summaryConfigLine: `Generate/update ${CONFIG_PATH}`,
    summaryThemeLine: `Generate/update ${THEME_CSS_PATH} (re-running the wizard only rewrites this file, and your dev server's HMR picks it up)`,
    summaryApiRouteLine: (path) => `Generate ${path}`,
    summaryApiRouteSkippedLine: (path) => `Skip ${path} (already exists)`,
    summaryBuildScriptLine: `Append the ingest command to ${PACKAGE_JSON_PATH}'s build script`,
    summaryBuildScriptUnchangedLine: `No change to ${PACKAGE_JSON_PATH}'s build script (already present)`,
    summaryDevVarsLine: `Write GEMINI_API_KEY to ${DEV_VARS_PATH}`,
    confirmMessage: "Proceed with writing these files?",
    writeCancelledMessage: "Write cancelled.",
    outroTitle: "Setup complete.",
    snippetIntro: "Paste the following into your layout once (not needed again on re-runs):",
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

function seedDefaults(previous: IngestConfig | undefined): WizardAnswers {
  if (!previous) return DEFAULT_WIZARD_ANSWERS;
  return {
    ...DEFAULT_WIZARD_ANSWERS,
    language: previous.language ?? DEFAULT_WIZARD_ANSWERS.language,
    distDir: previous.distDir ?? DEFAULT_WIZARD_ANSWERS.distDir,
    include: previous.include ?? DEFAULT_WIZARD_ANSWERS.include,
    zenn: previous.zenn,
    theme: previous.theme ?? DEFAULT_WIZARD_ANSWERS.theme,
  };
}

async function main(): Promise<void> {
  const previousConfig = await readJson<IngestConfig>(CONFIG_PATH);
  const answers = await runWizard(seedDefaults(previousConfig));
  const text = CLI_TEXT[answers.language];

  const configJson = buildConfigJson(answers, previousConfig);
  const themeCss = buildThemeCss(answers.theme);

  const apiRouteExists = existsSync(answers.apiRoutePath);
  const apiRouteContent = apiRouteExists
    ? undefined
    : buildApiRouteTemplate({
        apiRoutePath: answers.apiRoutePath,
        distDir: answers.distDir,
        contactUrl: answers.contactUrl,
        language: answers.language,
      });

  const pkg = (await readJson<PackageJsonLike>(PACKAGE_JSON_PATH)) ?? {};
  const scripts = pkg.scripts ?? {};
  const nextBuildScript = appendIngestToBuildScript(scripts.build, CONFIG_PATH, KNOWLEDGE_OUTPUT_PATH);
  const buildScriptChanged = nextBuildScript !== (scripts.build ?? "");

  const nextDevVars = answers.geminiApiKey
    ? upsertDevVar(await readTextOrEmpty(DEV_VARS_PATH), "GEMINI_API_KEY", answers.geminiApiKey)
    : undefined;

  const summaryLines = [
    text.summaryConfigLine,
    text.summaryThemeLine,
    apiRouteExists ? text.summaryApiRouteSkippedLine(answers.apiRoutePath) : text.summaryApiRouteLine(answers.apiRoutePath),
    buildScriptChanged ? text.summaryBuildScriptLine : text.summaryBuildScriptUnchangedLine,
  ];
  if (nextDevVars !== undefined) {
    summaryLines.push(text.summaryDevVarsLine);
  }
  clack.note(summaryLines.join("\n"), text.summaryTitle);

  const shouldWrite = await clack.confirm({ message: text.confirmMessage, initialValue: true });
  if (clack.isCancel(shouldWrite) || !shouldWrite) {
    clack.cancel(text.writeCancelledMessage);
    return;
  }

  await writeFile(CONFIG_PATH, `${JSON.stringify(configJson, null, 2)}\n`);
  await writeFile(THEME_CSS_PATH, themeCss);

  if (apiRouteContent) {
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

  const endpoint = deriveEndpointPath(answers.apiRoutePath);
  const snippet = [
    `<link rel="stylesheet" href="/${THEME_CSS_PATH}">`,
    `<folio-agent-widget endpoint="${endpoint}" policy-href="/data-policy" lang="${answers.language}"></folio-agent-widget>`,
    '<script type="module">',
    '  import { defineFolioAgentWidget } from "@folio-agent/widget";',
    "  defineFolioAgentWidget();",
    "</script>",
  ].join("\n");

  clack.note(snippet, text.snippetIntro);
  clack.note(text.d1Note);
  clack.outro(text.outroTitle);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
