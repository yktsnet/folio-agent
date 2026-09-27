import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "../../../src/chat/answer/normalize.js";

const ARTICLE = { url: "https://zenn.dev/foo/articles/bar", title: "記事のタイトル" };
const CONTACT = { url: "https://example.com/contact/", title: "Contactページ" };
const LINKS = [ARTICLE, CONTACT];

describe("normalizeAnswer", () => {
  it("keeps links to allowed destinations as [text](url)", () => {
    expect(normalizeAnswer(`詳しくは[記事のタイトル](${ARTICLE.url})へ。`, LINKS)).toBe(`詳しくは[記事のタイトル](${ARTICLE.url})へ。`);
  });

  it("matches allowed URLs regardless of a trailing slash", () => {
    expect(normalizeAnswer("[Contactページ](https://example.com/contact)へ", LINKS)).toBe(`[Contactページ](${CONTACT.url})へ`);
  });

  it("reduces links to anything else, such as this site's pages or invented URLs, to their text", () => {
    expect(normalizeAnswer("[Aboutページ](https://example.com/about)と[謎の記事](https://zenn.dev/foo/articles/nope)", LINKS)).toBe(
      "Aboutページと謎の記事",
    );
  });

  it("turns an allowed bare URL into a link titled from answerLinks, and drops other bare URLs", () => {
    expect(normalizeAnswer(`記事（${ARTICLE.url}）とトップ（https://example.com/）です。`, LINKS)).toBe(
      `記事（[記事のタイトル](${ARTICLE.url})）とトップです。`,
    );
  });

  it("reduces every link to text when no answerLinks are given", () => {
    expect(normalizeAnswer(`[記事のタイトル](${ARTICLE.url}) ${ARTICLE.url}`)).toBe("記事のタイトル");
  });

  it("strips Markdown other than links, turns list markers into ・, and tidies blank lines", () => {
    const raw = "## 見出し\n**太字**と`code`\n\n\n\n- 一つ目\n* 二つ目  \n";
    expect(normalizeAnswer(raw, LINKS)).toBe("見出し\n太字とcode\n\n・一つ目\n・二つ目");
  });

  it("leaves an answer that already follows the format unchanged", () => {
    const answer = `主な実績は3件です。\n\n詳しくは[記事のタイトル](${ARTICLE.url})にまとめています。`;
    expect(normalizeAnswer(answer, LINKS)).toBe(answer);
  });
});
