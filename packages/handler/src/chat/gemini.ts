import { GoogleGenAI } from "@google/genai";
import type { ChatRoute } from "./types.js";

const ROUTE_INSTRUCTIONS: Record<Exclude<ChatRoute, "rate_limited">, string> = {
  thoughts:
    "訪問者は作者の考え方について質問しています。以下の知識に書かれていることだけから答えてください。" +
    "書かれていないことは推測せず、「その点はサイトに記載がないため、Contactページからお問い合わせください」と案内してください。",
  works:
    "訪問者はWorks（作品）について質問しています。知識に書かれた内容から解説し、" +
    "対応するZenn記事へのリンクが知識中にあれば案内してください。",
  inquiry:
    "訪問者は仕事の依頼・相談をしようとしています。簡潔に応じたうえで、Contactページへの問い合わせを案内してください。",
};

export function buildSystemPrompt(knowledge: string, route: Exclude<ChatRoute, "rate_limited">): string {
  return [
    "あなたはポートフォリオサイトの受付エージェントです。",
    ROUTE_INSTRUCTIONS[route],
    "---- 知識 ----",
    knowledge,
  ].join("\n\n");
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
