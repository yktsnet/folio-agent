#!/usr/bin/env node
// 本物の Gemini に決まった質問を投げ、回答が回答の形式の決まりを守るかを確かめる。
// PR やリリースの前に、変更に関わる質問を選んで実行し、結果を PR に貼る（docs/release.md）。
// 質問は --question で自由に渡す。QUESTIONS は何も渡さなかったときの見本にすぎない。ビルド済みの dist を使う（npm run eval がビルドする）。
// キーは環境変数 GEMINI_API_KEY か、packages/handler/dev/.dev.vars から読む。
//
//   npm run eval -- --knowledge <knowledge.json> [--question "…"] [--models a,b] [--contact-url URL] [--lang ja|en]
//
// 評価の出力は訪問者の入力を含まないが、回答には知識の内容が入る。PR に貼る前に目を通す。
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { collectAnswerLinks, createGeminiGenerator, formatKnowledge } from "../packages/handler/dist/index.js";
import { buildChatGraph } from "../packages/handler/dist/chat/graph.js";
import { findAnswerFormatViolations } from "../packages/handler/dist/chat/answer/contract.js";

const QUESTIONS = {
  ja: [
    "どんな制作実績がありますか？",
    "どんな考え方で仕事をしていますか？",
    "仕事を依頼するには？",
    "技術的な記事は書いていますか？",
    "About ページには何が書いてありますか？",
    "連絡先を教えてください",
  ],
  en: [
    "What have you built?",
    "How do you approach your work?",
    "How can I request a project?",
    "Do you write technical articles?",
    "What's on the About page?",
    "How can I contact you?",
  ],
};

const { values } = parseArgs({
  options: {
    knowledge: { type: "string" },
    models: { type: "string", default: "gemini-3.5-flash-lite" },
    "contact-url": { type: "string" },
    lang: { type: "string", default: "ja" },
    // 無料枠は 1 分あたり 5〜15 回。既定の 13 秒間隔なら、作り直しで倍になっても 5 回の枠に収まる
    interval: { type: "string", default: "13" },
    limit: { type: "string" },
    question: { type: "string" },
    out: { type: "string" },
  },
});

// キーを会話やシェルの履歴に残さないよう、環境変数が無ければ dev ハーネスの .dev.vars（gitignore 済み）から読む
async function readDevVarsKey() {
  try {
    const text = await readFile(new URL("../packages/handler/dev/.dev.vars", import.meta.url), "utf-8");
    return /^GEMINI_API_KEY=(.+)$/m.exec(text)?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

const apiKey = process.env.GEMINI_API_KEY || (await readDevVarsKey());
if (!apiKey || !values.knowledge) {
  console.error("usage: GEMINI_API_KEY=… node scripts/eval.mjs --knowledge <knowledge.json> [--models a,b] [--contact-url URL] [--lang ja|en] [--limit N] [--out report.md]");
  process.exit(1);
}

const language = values.lang === "en" ? "en" : "ja";
const doc = JSON.parse(await readFile(values.knowledge, "utf-8"));
const knowledge = formatKnowledge(doc, language);
const answerLinks = collectAnswerLinks(doc, values["contact-url"], language);
const questions = values.question ? [values.question] : QUESTIONS[language].slice(0, values.limit ? Number(values.limit) : undefined);
const intervalMs = Number(values.interval) * 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const report = [`# folio-agent eval`, "", `- knowledge: ${doc.pages.length} pages`, `- language: ${language}`, `- questions: ${questions.length}`, ""];
let finalViolations = 0;
let failedCalls = 0;

for (const model of values.models.split(",").map((m) => m.trim()).filter(Boolean)) {
  const violations = [];
  const errors = [];
  const generate = createGeminiGenerator({ apiKey, knowledge, model, contactUrl: values["contact-url"], language });
  const graph = buildChatGraph({
    checkRateLimit: async () => ({ allowed: true }),
    // 呼び出しの失敗は、グラフが固定の文言に置き換えて「違反なし」に見えるので、ここで数える
    generateAnswer: async (...args) => {
      try {
        return await generate(...args);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
    logChat: async () => {},
    logAnswerViolation: async (entry) => violations.push(entry),
    rateLimitConfig: { shortWindowMinutes: 10, shortWindowMax: 999, longWindowHours: 12, longWindowMax: 999 },
    language,
    answerLinks,
  });

  const rows = [];
  for (const question of questions) {
    const before = violations.length;
    const errorsBefore = errors.length;
    const started = Date.now();
    const result = await graph.invoke({ input: question, ip: "eval" });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const mine = violations.slice(before);
    const remaining = findAnswerFormatViolations(result.answer, answerLinks);
    finalViolations += remaining.length;
    const failed = errors.slice(errorsBefore);
    failedCalls += failed.length;
    rows.push({ question, answer: result.answer, seconds, attempts: result.attempt, mine, remaining, failed });
    console.error(`${model}: ${question} (${seconds}s, attempts ${result.attempt}, violations ${mine.length})`);
    await sleep(intervalMs * result.attempt);
  }

  const firstFailed = rows.filter((row) => row.mine.some((v) => v.attempt === 1)).length;
  const fellBack = rows.filter((row) => row.mine.some((v) => v.attempt === 2)).length;
  report.push(
    `## ${model}`,
    "",
    `| 1回目で違反 | 作り直しでも違反（fallback） | 最終的な違反 | 呼び出しの失敗 | 平均の応答時間 |`,
    `|---|---|---|---|---|`,
    `| ${firstFailed} / ${rows.length} | ${fellBack} / ${rows.length} | ${rows.reduce((n, r) => n + r.remaining.length, 0)} | ${rows.filter((r) => r.failed.length > 0).length} / ${rows.length} | ${(rows.reduce((n, r) => n + Number(r.seconds), 0) / rows.length).toFixed(1)}s |`,
    "",
  );
  for (const row of rows) {
    const kinds = row.mine.map((v) => `${v.attempt}回目: ${v.kinds.join(", ")}`).join(" / ") || "なし";
    const failure = row.failed.length > 0 ? `、呼び出しの失敗: ${row.failed.join(" / ")}` : "";
    report.push(`### ${row.question}`, "", `- 試行 ${row.attempts} 回、${row.seconds}s、違反: ${kinds}${failure}`, "", "```text", row.answer, "```", "");
    // 違反した回答そのものを残す。どう間違えたかを推測でなく読んで確かめるため
    for (const violation of row.mine) {
      report.push(`<details><summary>${violation.attempt}回目の回答（${violation.kinds.join(", ")}）</summary>`, "", "```text", violation.answer, "```", "", "</details>", "");
    }
  }
}

const text = report.join("\n");
if (values.out) await writeFile(values.out, text);
console.log(text);
// 返す回答に違反が残るのは check_answer / fallback の不具合。呼び出しに失敗した質問は評価できていない。どちらもリリースを止める
if (finalViolations > 0 || failedCalls > 0) process.exitCode = 1;
