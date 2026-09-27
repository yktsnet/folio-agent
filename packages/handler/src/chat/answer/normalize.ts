import type { AnswerLink } from "./links.js";

// 回答の形式（handler と widget のあいだの決まり）:
//   プレーンテキスト。段落は空行で区切る。記法はリンクの [表示する文字](http(s)://…) だけ。
//   リンク先は answerLinks に含まれる URL だけ。
const MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /https?:\/\/[^\s<>"'（）「」『』【】、。]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;
const PLACEHOLDER = /\u0000(\d+)\u0000/g;

function linkKey(url: string): string {
  return url.replace(/\/+$/, "");
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1");
}

/**
 * Brings a generated answer into the answer format, whatever the model actually produced. The
 * prompt only asks for the format (prompt/answer-format.ts); this is where it is enforced, so the
 * widget can rely on it.
 */
export function normalizeAnswer(answer: string, links: AnswerLink[] = []): string {
  const allowed = new Map(links.map((link) => [linkKey(link.url), link]));
  const kept: string[] = [];
  const keep = (label: string, url: string): string => {
    kept.push(`[${stripInlineMarkdown(label)}](${url})`);
    return `\u0000${kept.length - 1}\u0000`;
  };

  let text = answer.replace(MARKDOWN_LINK, (_, label: string, url: string) => {
    const link = allowed.get(linkKey(url));
    return link ? keep(label, link.url) : label;
  });

  // URL をそのまま書かれた場合は、許可されたものだけタイトルのリンクに置き換え、それ以外は消す
  text = text.replace(BARE_URL, (match: string) => {
    const url = match.replace(TRAILING_PUNCTUATION, "");
    const rest = match.slice(url.length);
    const link = allowed.get(linkKey(url));
    return link ? keep(link.title, link.url) + rest : rest;
  });

  text = stripInlineMarkdown(text)
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[-*][ \t]+/gm, "・")
    .replace(/（\s*）|\(\s*\)/g, "")
    .replace(PLACEHOLDER, (_, index: string) => kept[Number(index)])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
