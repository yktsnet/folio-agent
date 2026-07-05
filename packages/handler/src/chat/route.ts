import type { ChatRoute } from "./types.js";

const INQUIRY_KEYWORDS = ["依頼", "相談", "見積", "発注", "案件", "お願いしたい"];
const WORKS_KEYWORDS = ["works", "作品", "実績", "zenn", "記事"];

export function classifyRoute(input: string): Exclude<ChatRoute, "rate_limited"> {
  const lower = input.toLowerCase();

  if (INQUIRY_KEYWORDS.some((keyword) => input.includes(keyword))) {
    return "inquiry";
  }

  if (WORKS_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "works";
  }

  return "thoughts";
}
