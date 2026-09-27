import type { KnowledgePagesLike } from "../../ingest/types.js";
import type { Language } from "../types.js";
import { DEFAULT_LANGUAGE } from "../types.js";

/** A destination an answer may link to, and the text to show when the model wrote the bare URL. */
export interface AnswerLink {
  url: string;
  title: string;
}

const CONTACT_TITLE: Record<Language, string> = {
  ja: "Contactページ",
  en: "Contact page",
};

/**
 * Lists what an answer may link to: pages outside this site that are in the knowledge (such as
 * Zenn articles) and the Contact page. This site's own pages are left out on purpose; the visitor
 * is already on the site, so answers name them instead of linking them.
 */
export function collectAnswerLinks(
  doc: KnowledgePagesLike,
  contactUrl?: string,
  language: Language = DEFAULT_LANGUAGE,
): AnswerLink[] {
  const links = doc.pages
    .filter((page) => /^https?:\/\//i.test(page.url))
    .map((page) => ({ url: page.url, title: page.title }));
  if (contactUrl) links.push({ url: contactUrl, title: CONTACT_TITLE[language] });
  return links;
}
