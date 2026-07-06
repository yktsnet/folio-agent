import type { ChatRoute, Language } from "./types.js";
import { DEFAULT_LANGUAGE } from "./types.js";

const INQUIRY_KEYWORDS: Record<Language, string[]> = {
  ja: ["依頼", "相談", "見積", "発注", "案件", "お願いしたい"],
  en: ["hire", "quote", "estimate", "commission", "inquiry", "work with you", "project request"],
};

const WORKS_KEYWORDS: Record<Language, string[]> = {
  ja: ["works", "作品", "実績", "zenn", "記事"],
  en: ["works", "portfolio", "article", "zenn", "project"],
};

export function classifyRoute(input: string, language: Language = DEFAULT_LANGUAGE): Exclude<ChatRoute, "rate_limited"> {
  const lower = input.toLowerCase();
  const inquiryKeywords = INQUIRY_KEYWORDS[language];
  const worksKeywords = WORKS_KEYWORDS[language];

  if (inquiryKeywords.some((keyword) => lower.includes(keyword))) {
    return "inquiry";
  }

  if (worksKeywords.some((keyword) => lower.includes(keyword))) {
    return "works";
  }

  return "thoughts";
}
