import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt } from "./prompt/index.js";
import type { ChatRoute, Language } from "./types.js";
import { DEFAULT_LANGUAGE } from "./types.js";

export interface GeminiGeneratorConfig {
  apiKey: string;
  knowledge: string;
  model?: string;
  contactUrl?: string;
  language?: Language;
}

/** Passed when check_answer found the previous answer breaking the answer format. */
export interface AnswerCorrection {
  previousAnswer: string;
  /** What to fix, written for the model (see prompt/correction.ts). */
  request: string;
}

export type GenerateAnswerFn = (input: string, route: ChatRoute, correction?: AnswerCorrection) => Promise<string>;

export function createGeminiGenerator(config: GeminiGeneratorConfig): GenerateAnswerFn {
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model ?? "gemini-3.1-flash-lite";
  const language = config.language ?? DEFAULT_LANGUAGE;

  return async (input, route, correction) => {
    if (route === "rate_limited") {
      throw new Error("generateAnswer should not be called for a rate-limited route");
    }

    const response = await client.models.generateContent({
      model,
      // 作り直しでは、元の質問・直前の回答・指摘を会話として渡し、同じ質問への答え直しであることを伝える
      contents: correction
        ? [
            { role: "user", parts: [{ text: input }] },
            { role: "model", parts: [{ text: correction.previousAnswer }] },
            { role: "user", parts: [{ text: correction.request }] },
          ]
        : input,
      config: { systemInstruction: buildSystemPrompt(config.knowledge, route, config.contactUrl, language) },
    });

    return response.text ?? "";
  };
}
