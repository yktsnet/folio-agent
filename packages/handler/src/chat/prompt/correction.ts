import type { AnswerViolation, AnswerViolationKind } from "../answer/contract.js";
import type { Language } from "../types.js";

// check_answer が違反を見つけたとき、LLM に作り直させるための指摘文。
const KIND_TEXT: Record<Language, Record<AnswerViolationKind, string>> = {
  ja: {
    disallowed_link:
      "リンクにしてはいけない先へのリンクがあります。このサイト内のページはリンクにせずページ名で案内し、" +
      "リンクはContactページと知識に「URL: https://…」として書かれたページだけにしてください",
    bare_url: "URLがそのまま書かれています。[表示する文字](URL) の形にし、記事ならタイトルを表示する文字にしてください",
    markdown: "リンク以外のMarkdown記法（**・#・- のリスト・`）が使われています。プレーンテキストにしてください",
  },
  en: {
    disallowed_link:
      "It links to a destination that must not be linked. Refer to this site's pages by name, and only link the " +
      'Contact page and pages that appear in the knowledge as "URL: https://…"',
    bare_url: "It shows a bare URL. Write it as [text to show](URL), using the title for an article",
    markdown: "It uses Markdown other than links (**, #, - lists, `). Use plain text",
  },
};

const INTRO: Record<Language, string> = {
  ja: "直前の回答は、回答の形式の決まりに次の点で合っていません。内容は変えずに、決まりに合わせて回答だけを書き直してください。",
  en: "Your previous answer breaks the answer format in the following ways. Keep the content and rewrite only the answer so it complies.",
};

export function buildCorrectionRequest(violations: AnswerViolation[], language: Language): string {
  const lines = violations.map((violation) => `- ${KIND_TEXT[language][violation.kind]}: ${violation.excerpt}`);
  return [INTRO[language], ...lines].join("\n");
}
