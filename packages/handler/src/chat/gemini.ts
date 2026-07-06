import { GoogleGenAI } from "@google/genai";
import type { ChatRoute, Language } from "./types.js";
import { DEFAULT_LANGUAGE } from "./types.js";

const COMMON_PREAMBLE: Record<Language, string> = {
  ja:
    "あなたはポートフォリオサイト作者の代理として応対する受付エージェントです。" +
    "丁寧だが簡潔で自然な口語で話し、「お問い合わせいただきありがとうございます」のような定型の前置き挨拶はしません。" +
    "回答は原則3〜4文以内にまとめてください。\n\n" +
    "以下の知識に書かれていることだけから答えてください。書かれていないことは推測・創作せず、" +
    "「その点はサイトに記載がない」と伝えたうえでContactページを案内してください。" +
    "用語の正式名称・展開形も、知識に書かれていなければ創作しないでください。\n\n" +
    "Markdown記法（`**`・`#`・`-`のリストなど）は使わず、プレーンテキストで答えてください。" +
    "回答が長くなる場合は、2〜4文ごとに空行を挟んで段落を分けてください。",
  en:
    "You are a receptionist agent responding on behalf of the portfolio site's author. " +
    'Speak politely but concisely and naturally, without formulaic openers such as "Thank you for reaching out." ' +
    "Keep your answers to about 3-4 sentences.\n\n" +
    "Only answer based on the knowledge provided below. Do not guess or invent anything that isn't written there — " +
    "say that the site doesn't cover that point, then guide the visitor to the Contact page. " +
    "Do not invent official names or expansions of terms that aren't in the knowledge either.\n\n" +
    "Do not use Markdown formatting (such as `**`, `#`, or `-` lists) — answer in plain text. " +
    "If the answer runs long, insert a blank line every 2-4 sentences to break it into paragraphs.",
};

const ROUTE_INSTRUCTIONS: Record<Language, Record<Exclude<ChatRoute, "rate_limited">, string>> = {
  ja: {
    thoughts: "訪問者は作者の考え方について質問しています。知識の内容に沿って考え方を説明してください。",
    works:
      "訪問者はWorks（作品）について質問しています。知識に書かれた内容から解説し、" +
      "対応するZenn記事へのリンクが知識中にあれば案内してください。",
    inquiry: "訪問者は仕事の依頼・相談をしようとしています。簡潔に応じたうえで、Contactページへの問い合わせを案内してください。",
  },
  en: {
    thoughts: "The visitor is asking about the author's thinking. Explain it based on the knowledge provided.",
    works:
      "The visitor is asking about Works (projects). Explain based on the knowledge, and if a link to the " +
      "corresponding Zenn article is included in the knowledge, share it.",
    inquiry:
      "The visitor wants to discuss hiring or a project request. Respond briefly, then guide them to contact via the Contact page.",
  },
};

const KNOWLEDGE_LABEL: Record<Language, string> = {
  ja: "---- 知識 ----",
  en: "---- Knowledge ----",
};

function buildInquiryInstruction(language: Language, contactUrl?: string): string {
  if (contactUrl) {
    return language === "en"
      ? `The visitor wants to discuss hiring or a project request. Respond briefly, then guide them to contact via the Contact page (${contactUrl}).`
      : `訪問者は仕事の依頼・相談をしようとしています。簡潔に応じたうえで、Contactページ（${contactUrl}）への問い合わせを案内してください。`;
  }
  return ROUTE_INSTRUCTIONS[language].inquiry;
}

export function buildSystemPrompt(
  knowledge: string,
  route: Exclude<ChatRoute, "rate_limited">,
  contactUrl?: string,
  language: Language = DEFAULT_LANGUAGE,
): string {
  const routeInstruction = route === "inquiry" ? buildInquiryInstruction(language, contactUrl) : ROUTE_INSTRUCTIONS[language][route];
  return [COMMON_PREAMBLE[language], routeInstruction, KNOWLEDGE_LABEL[language], knowledge].join("\n\n");
}

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
