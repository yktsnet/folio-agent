export { generateKnowledge } from "./ingest/generate.js";
export { createUrlMatcher } from "./ingest/glob.js";
export { htmlToText } from "./ingest/html-to-text.js";
export type {
  IngestConfig,
  KnowledgeDocument,
  KnowledgePage,
  KnowledgeSource,
  ZennIngestConfig,
} from "./ingest/types.js";

export { createChatHandler } from "./chat/handler.js";
export type { ChatHandlerConfig } from "./chat/handler.js";
export { buildChatGraph } from "./chat/graph.js";
export { checkRateLimit } from "./chat/rate-limit.js";
export { createGeminiGenerator, buildSystemPrompt } from "./chat/gemini.js";
export type { GenerateAnswerFn, GeminiGeneratorConfig } from "./chat/gemini.js";
export { classifyRoute } from "./chat/route.js";
export { logChat } from "./chat/log.js";
export type {
  ChatRoute,
  ChatGraphDeps,
  ChatLogEntry,
  RateLimitConfig,
  RateLimitResult,
  RateLimitReason,
} from "./chat/types.js";
export { DEFAULT_RATE_LIMIT_CONFIG } from "./chat/types.js";
