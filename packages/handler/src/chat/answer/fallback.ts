import { BARE_URL, findAllowedLink, LINK_SYNTAX, tidyAnswer } from "./contract.js";
import type { AnswerLink } from "./links.js";

const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;
const PLACEHOLDER = /\u0000(\d+)\u0000/g;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*|__|`/g, "");
}

/**
 * The last resort when the model still breaks the answer format after being asked to correct it.
 * Keeps only allowed links, reduces every other link to its text, drops bare URLs and Markdown
 * markers. It never asks the model again, so its output always complies.
 */
export function toPlainAnswer(answer: string, links: AnswerLink[] = []): string {
  const kept: string[] = [];
  const keep = (label: string, url: string): string => {
    kept.push(`[${stripInlineMarkdown(label)}](${url})`);
    return `\u0000${kept.length - 1}\u0000`;
  };

  // リンク先の形は問わず、すべてのリンク記法を拾う。許可されたもの以外（相対パス・mailto: なども）は文字だけにする
  let text = answer.replace(LINK_SYNTAX, (_, label: string, url: string) => {
    const link = findAllowedLink(url.trim(), links);
    return link ? keep(label, link.url) : label;
  });

  // URL をそのまま書かれた場合は、許可されたものだけタイトルのリンクに置き換え、それ以外は消す
  text = text.replace(BARE_URL, (match: string) => {
    const url = match.replace(TRAILING_PUNCTUATION, "");
    const rest = match.slice(url.length);
    const link = findAllowedLink(url, links);
    return link ? keep(link.title, link.url) + rest : rest;
  });

  // 消した URL の跡の空括弧を先に取る。後に回すと、括弧の後ろにあった見出しやリストの記号が行頭に出てくる
  text = stripInlineMarkdown(text.replace(/（\s*）|\(\s*\)/g, ""))
    .replace(/^[ \t]*(?:#{1,6}[ \t]+)+/gm, "")
    .replace(/^[ \t]*(?:[-*][ \t]+)+/gm, "・")
    // この時点で残る "](" は、閉じていないリンク記法などの切れ端。残すと、戻したリンクとつながって
    // 許可していないリンク記法ができてしまう
    .replace(/\]\(/g, "] (")
    .replace(PLACEHOLDER, (_, index: string) => kept[Number(index)]);

  return tidyAnswer(text);
}
