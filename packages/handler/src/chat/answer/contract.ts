import type { AnswerLink } from "./links.js";

// 回答の形式（handler と widget のあいだの決まり）を、検査できる形で書いたもの。
//   - プレーンテキスト。段落は空行1つで区切る
//   - 記法はリンクの [表示する文字](URL) だけ。URL は answerLinks にあるものだけ
//   - URL をそのまま見せない
// check_answer がこれで違反を探し、違反があれば LLM に指摘して作り直させる。
export const LINK_SYNTAX = /\[([^\]\n]+)\]\(([^)\n]*)\)/g;
export const BARE_URL = /https?:\/\/[^\s<>"'（）「」『』【】、。]+/g;

export type AnswerViolationKind = "disallowed_link" | "bare_url" | "markdown";

export interface AnswerViolation {
  kind: AnswerViolationKind;
  /** The offending part of the answer, quoted back to the model when asking it to correct. */
  excerpt: string;
}

function linkKey(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function findAllowedLink(url: string, links: AnswerLink[]): AnswerLink | undefined {
  return links.find((link) => linkKey(link.url) === linkKey(url));
}

/**
 * Deterministic cleanups too trivial to send back to the model: surrounding whitespace, trailing
 * spaces on lines, and runs of blank lines.
 */
export function tidyAnswer(answer: string): string {
  return answer.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Returns what in `answer` breaks the answer format; an empty list means it complies. */
export function findAnswerFormatViolations(answer: string, links: AnswerLink[]): AnswerViolation[] {
  const violations: AnswerViolation[] = [];
  // リンクは表示する文字に置き換えてから残りを調べる（空にすると、後ろの文字が行頭にあるように見える）
  const rest = answer.replace(LINK_SYNTAX, (whole: string, label: string, url: string) => {
    if (!findAllowedLink(url, links)) violations.push({ kind: "disallowed_link", excerpt: whole });
    return label;
  });
  for (const match of rest.matchAll(BARE_URL)) violations.push({ kind: "bare_url", excerpt: match[0] });
  for (const line of rest.split("\n")) {
    if (/\*\*|__|`|^[ \t]*#{1,6}[ \t]|^[ \t]*[-*][ \t]/.test(line)) violations.push({ kind: "markdown", excerpt: line.trim() });
  }
  return violations;
}
