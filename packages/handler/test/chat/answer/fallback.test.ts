import { describe, expect, it } from "vitest";
import { findAnswerFormatViolations } from "../../../src/chat/answer/contract.js";
import { toPlainAnswer } from "../../../src/chat/answer/fallback.js";
import { REAL_ANSWER_LINKS, REAL_ANSWERS } from "./fixtures/real-answers.js";

const ARTICLE = { url: "https://zenn.dev/foo/articles/bar", title: "記事のタイトル" };
const CONTACT = { url: "https://example.com/contact/", title: "Contactページ" };
const LINKS = [ARTICLE, CONTACT];

describe("toPlainAnswer", () => {
  it("keeps links to allowed destinations as [text](url)", () => {
    expect(toPlainAnswer(`詳しくは[記事のタイトル](${ARTICLE.url})へ。`, LINKS)).toBe(`詳しくは[記事のタイトル](${ARTICLE.url})へ。`);
  });

  it("matches allowed URLs regardless of a trailing slash", () => {
    expect(toPlainAnswer("[Contactページ](https://example.com/contact)へ", LINKS)).toBe(`[Contactページ](${CONTACT.url})へ`);
  });

  it("reduces links to anything else, such as this site's pages or invented URLs, to their text", () => {
    expect(toPlainAnswer("[Aboutページ](https://example.com/about)と[謎の記事](https://zenn.dev/foo/articles/nope)", LINKS)).toBe(
      "Aboutページと謎の記事",
    );
  });

  it("turns an allowed bare URL into a link titled from answerLinks, and drops other bare URLs", () => {
    expect(toPlainAnswer(`記事（${ARTICLE.url}）とトップ（https://example.com/）です。`, LINKS)).toBe(
      `記事（[記事のタイトル](${ARTICLE.url})）とトップです。`,
    );
  });

  it("reduces every link to text when no answerLinks are given", () => {
    expect(toPlainAnswer(`[記事のタイトル](${ARTICLE.url}) ${ARTICLE.url}`)).toBe("記事のタイトル");
  });

  it("strips Markdown other than links, turns list markers into ・, and tidies blank lines", () => {
    const raw = "## 見出し\n**太字**と`code`\n\n\n\n- 一つ目\n* 二つ目  \n";
    expect(toPlainAnswer(raw, LINKS)).toBe("見出し\n太字とcode\n\n・一つ目\n・二つ目");
  });

  it("leaves an answer that already follows the format unchanged", () => {
    const answer = `主な実績は3件です。\n\n詳しくは[記事のタイトル](${ARTICLE.url})にまとめています。`;
    expect(toPlainAnswer(answer, LINKS)).toBe(answer);
  });
});

describe("answers the model actually returned", () => {
  it.each(REAL_ANSWERS.map((c) => [c.found, c.answer] as const))("leaves no format violations: %s", (_found, answer) => {
    expect(findAnswerFormatViolations(toPlainAnswer(answer, REAL_ANSWER_LINKS), REAL_ANSWER_LINKS)).toEqual([]);
  });

  it.each(REAL_ANSWERS.map((c) => [c.found, c.answer] as const))("the checker does flag the raw answer: %s", (_found, answer) => {
    expect(findAnswerFormatViolations(answer, REAL_ANSWER_LINKS)).not.toEqual([]);
  });

  it.each(REAL_ANSWERS.map((c) => [c.found, c.answer] as const))("the checker flags the raw answer: %s", (_found, answer) => {
    expect(findAnswerFormatViolations(answer, REAL_ANSWER_LINKS).map((v) => v.kind)).toContain("disallowed_link");
  });

  it("reduces relative-path and other non-allowed link syntax to its text", () => {
    expect(toPlainAnswer("[Works](/) と [About](/about) と [メール](mailto:a@example.com) と [空]()", LINKS)).toBe(
      "Works と About と メール と 空",
    );
  });
});

// 決まった入力の例では、想定していない形の崩れを見落とす。部品を無作為に組み合わせた回答で、
// 「直した後に違反が残らない」「2回直しても変わらない」を確かめる。
const FRAGMENTS = [
  "実績は3件です。",
  "Works",
  "\n",
  "\n\n",
  "\n\n\n\n",
  "  ",
  "**太字**",
  "__強調__",
  "`code`",
  "# 見出し ",
  "## 見出し ",
  "- 項目",
  "* 項目",
  "[Works](/)",
  "[About • ykts.net](/about)",
  "[メール](mailto:a@example.com)",
  "[外部](https://evil.example.com/x)",
  "[空]()",
  `[記事のタイトル](${ARTICLE.url})`,
  `[Contactページ](${CONTACT.url.replace(/\/$/, "")})`,
  ARTICLE.url,
  `（${ARTICLE.url}）`,
  "https://example.com/about",
  "（https://example.com/）",
  "https://evil.example.com/x.",
  "[入れ子 [x]](https://example.com)",
  "[閉じない](https://example.com",
];

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

describe("toPlainAnswer on generated broken answers (the fallback must always comply)", () => {
  const random = seededRandom(20260927);
  const answers = Array.from({ length: 3000 }, () =>
    Array.from({ length: 1 + Math.floor(random() * 12) }, () => FRAGMENTS[Math.floor(random() * FRAGMENTS.length)]).join(
      random() < 0.5 ? "" : " ",
    ),
  );

  it("never leaves a format violation", () => {
    const failures = answers
      .map((answer) => ({ answer, violations: findAnswerFormatViolations(toPlainAnswer(answer, LINKS), LINKS) }))
      .filter((result) => result.violations.length > 0);
    expect(failures).toEqual([]);
  });

  it("is idempotent", () => {
    for (const answer of answers) {
      const once = toPlainAnswer(answer, LINKS);
      expect(toPlainAnswer(once, LINKS)).toBe(once);
    }
  });
});
