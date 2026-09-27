import type { Language } from "../types.js";

// 知識に書いてあることだけで答え、創作しない。
export const GROUNDING: Record<Language, string> = {
  ja:
    "以下の知識に書かれていることだけから答えてください。書かれていないことは推測・創作せず、" +
    "「その点はサイトに記載がない」と伝えたうえでContactページを案内してください。" +
    "用語の正式名称・展開形も、知識に書かれていなければ創作しないでください。",
  en:
    "Only answer based on the knowledge provided below. Do not guess or invent anything that isn't written there — " +
    "say that the site doesn't cover that point, then guide the visitor to the Contact page. " +
    "Do not invent official names or expansions of terms that aren't in the knowledge either.",
};
