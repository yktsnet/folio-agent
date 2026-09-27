import type { Language } from "../types.js";

// 回答の形式（handler と widget のあいだの決まり）。指示で頼む側で、守らせるのは answer/ の normalize。
export const ANSWER_FORMAT: Record<Language, string> = {
  ja:
    "Markdown記法（`**`・`#`・`-`のリストなど）は使わず、プレーンテキストで答えてください。" +
    "回答が長くなる場合は、2〜4文ごとに空行を挟んで段落を分けてください。\n\n" +
    "リンクを示すときだけは [表示する文字](URL) の形で書いてください。URLをそのまま書かず、" +
    "記事ならそのタイトル、Contactページなら「Contactページ」を表示する文字にします。" +
    "訪問者はいまこのサイトを見ているので、このサイト内のページはリンクにせず「Aboutページ」のようにページ名で案内してください。" +
    "リンクにしてよいのは、Contactページと、知識に「URL: https://…」として書かれたこのサイトの外のページだけです。",
  en:
    "Do not use Markdown formatting (such as `**`, `#`, or `-` lists) — answer in plain text. " +
    "If the answer runs long, insert a blank line every 2-4 sentences to break it into paragraphs.\n\n" +
    "The one exception is links: write them as [text to show](URL). Never show a bare URL; " +
    'use the article title for an article, and "Contact page" for the Contact page. ' +
    "The visitor is already on this site, so refer to this site's pages by name (e.g. \"the About page\") instead of linking them. " +
    'Only link the Contact page and pages outside this site that appear in the knowledge as "URL: https://…".',
};
