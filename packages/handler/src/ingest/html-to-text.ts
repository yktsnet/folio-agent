import { parse } from "node-html-parser";

const NON_CONTENT_TAGS = ["script", "style", "noscript", "template"];

export interface ExtractedHtml {
  title: string;
  text: string;
}

export function htmlToText(html: string): ExtractedHtml {
  const root = parse(html);

  for (const tag of NON_CONTENT_TAGS) {
    for (const el of root.querySelectorAll(tag)) {
      el.remove();
    }
  }

  const title = root.querySelector("title")?.text.trim() ?? "";
  const bodyText = root.querySelector("body")?.text ?? root.text;
  const text = bodyText
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return { title, text };
}
