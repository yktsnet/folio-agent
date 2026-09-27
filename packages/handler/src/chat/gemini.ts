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

export type GenerateAnswerFn = (input: string, route: ChatRoute) => Promise<string>;

export function createGeminiGenerator(config: GeminiGeneratorConfig): GenerateAnswerFn {
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model ?? "gemini-3.1-flash-lite";
  const language = config.language ?? DEFAULT_LANGUAGE;

  return async (input, route) => {
    if (route === "rate_limited") {
      throw new Error("generateAnswer should not be called for a rate-limited route");
    }

    const response = await client.models.generateContent({
      model,
      contents: input,
      config: { systemInstruction: buildSystemPrompt(config.knowledge, route, config.contactUrl, language) },
    });

    return response.text ?? "";
  };
}
