import type { KnowledgePagesLike } from "./types.js";

/**
 * Turns a knowledge document into the text handed to the system prompt. Each page carries its
 * title and URL so answers can point to an article by its title instead of a bare URL.
 */
export function formatKnowledge(doc: KnowledgePagesLike): string {
  return doc.pages.map((page) => `# ${page.title}\nURL: ${page.url}\n\n${page.text}`).join("\n\n");
}
