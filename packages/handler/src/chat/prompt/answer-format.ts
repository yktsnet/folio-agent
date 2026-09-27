import type { Language } from "../types.js";

// 回答の形式（handler と widget のあいだの決まり）。指示で頼む側で、守らせるのは answer/ の normalize。
export const ANSWER_FORMAT: Record<Language, string> = {
  ja:
    "Markdown記法（`**`・`#`・`-`のリストなど）は使わず、プレーンテキストで答えてください。" +
    "回答が長くなる場合は、2〜4文ごとに空行を挟んで段落を分けてください。",
  en:
    "Do not use Markdown formatting (such as `**`, `#`, or `-` lists) — answer in plain text. " +
    "If the answer runs long, insert a blank line every 2-4 sentences to break it into paragraphs.",
};
