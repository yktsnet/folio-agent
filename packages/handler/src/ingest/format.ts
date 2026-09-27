import type { Language } from "../chat/types.js";
import { DEFAULT_LANGUAGE } from "../chat/types.js";
import type { KnowledgePagesLike } from "./types.js";

const SITE_PAGE_LABEL: Record<Language, string> = {
  ja: "（このサイトのページ）",
  en: " (a page on this site)",
};

const TITLE_WITH_SUFFIX = /^(.+?)\s+[•|｜\-–—:]\s+(.+)$/;

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Finds the site-name suffix that this site's page titles share ("Works • ykts.net" and
 * "About • ykts.net" share " • ykts.net"). A suffix seen on only one page isn't treated as the
 * site name, since it may be part of that page's own title.
 */
function sharedTitleSuffix(titles: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const suffix = TITLE_WITH_SUFFIX.exec(title)?.[2];
    if (suffix) counts.set(suffix, (counts.get(suffix) ?? 0) + 1);
  }
  let best: string | undefined;
  for (const [suffix, count] of counts) {
    if (count >= 2 && count > (best ? (counts.get(best) ?? 0) : 0)) best = suffix;
  }
  return best;
}

/**
 * Turns a knowledge document into the text handed to the system prompt. Pages outside this site
 * (such as Zenn articles) carry their title and URL, so answers can link them by title. This
 * site's pages carry only their name, without the site-name suffix and without a URL: the visitor
 * is already on the site, and handing the model a URL invites it to link the page anyway.
 */
export function formatKnowledge(doc: KnowledgePagesLike, language: Language = DEFAULT_LANGUAGE): string {
  const suffix = sharedTitleSuffix(doc.pages.filter((page) => !isExternal(page.url)).map((page) => page.title));
  return doc.pages
    .map((page) => {
      if (isExternal(page.url)) return `# ${page.title}\nURL: ${page.url}\n\n${page.text}`;
      const match = TITLE_WITH_SUFFIX.exec(page.title);
      const name = suffix && match?.[2] === suffix ? match[1] : page.title;
      return `# ${name}${SITE_PAGE_LABEL[language]}\n\n${page.text}`;
    })
    .join("\n\n");
}
