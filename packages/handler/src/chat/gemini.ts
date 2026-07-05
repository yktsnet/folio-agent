import { GoogleGenAI } from "@google/genai";
import type { ChatRoute } from "./types.js";

const COMMON_PREAMBLE =
  "あなたはポートフォリオサイト作者の代理として応対する受付エージェントです。" +
  "丁寧だが簡潔で自然な口語で話し、「お問い合わせいただきありがとうございます」のような定型の前置き挨拶はしません。" +
  "回答は原則3〜4文以内にまとめてください。\n\n" +
  "以下の知識に書かれていることだけから答えてください。書かれていないことは推測・創作せず、" +
  "「その点はサイトに記載がない」と伝えたうえでContactページを案内してください。" +
  "用語の正式名称・展開形も、知識に書かれていなければ創作しないでください。\n\n" +
  "Markdown記法（`**`・`#`・`-`のリストなど）は使わず、プレーンテキストで答えてください。";

const ROUTE_INSTRUCTIONS: Record<Exclude<ChatRoute, "rate_limited">, string> = {
  thoughts: "訪問者は作者の考え方について質問しています。知識の内容に沿って考え方を説明してください。",
  works:
    "訪問者はWorks（作品）について質問しています。知識に書かれた内容から解説し、" +
    "対応するZenn記事へのリンクが知識中にあれば案内してください。",
  inquiry: "訪問者は仕事の依頼・相談をしようとしています。簡潔に応じたうえで、Contactページへの問い合わせを案内してください。",
};

export function buildSystemPrompt(knowledge: string, route: Exclude<ChatRoute, "rate_limited">): string {
  return [COMMON_PREAMBLE, ROUTE_INSTRUCTIONS[route], "---- 知識 ----", knowledge].join("\n\n");
}

export interface GeminiGeneratorConfig {
  apiKey: string;
  knowledge: string;
  model?: string;
}

export type GenerateAnswerFn = (input: string, route: ChatRoute) => Promise<string>;

export function createGeminiGenerator(config: GeminiGeneratorConfig): GenerateAnswerFn {
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model ?? "gemini-3.1-flash-lite";

  return async (input, route) => {
    if (route === "rate_limited") {
      throw new Error("generateAnswer should not be called for a rate-limited route");
    }

    const response = await client.models.generateContent({
      model,
      contents: input,
      config: { systemInstruction: buildSystemPrompt(config.knowledge, route) },
    });

    return response.text ?? "";
  };
}
