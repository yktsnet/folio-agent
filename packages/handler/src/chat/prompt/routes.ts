import type { ChatRoute, Language } from "../types.js";

export const ROUTE_INSTRUCTIONS: Record<Language, Record<Exclude<ChatRoute, "rate_limited">, string>> = {
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

export function buildInquiryInstruction(language: Language, contactUrl?: string): string {
  if (contactUrl) {
    return language === "en"
      ? `The visitor wants to discuss hiring or a project request. Respond briefly, then guide them to contact via the Contact page (${contactUrl}).`
      : `訪問者は仕事の依頼・相談をしようとしています。簡潔に応じたうえで、Contactページ（${contactUrl}）への問い合わせを案内してください。`;
  }
  return ROUTE_INSTRUCTIONS[language].inquiry;
}
