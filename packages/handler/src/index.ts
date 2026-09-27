export { generateKnowledge } from "./ingest/generate.js";
export { createUrlMatcher } from "./ingest/glob.js";
export { htmlToText } from "./ingest/html-to-text.js";
export { formatKnowledge } from "./ingest/format.js";
export type {
  IngestConfig,
  KnowledgeDocument,
  KnowledgePage,
  KnowledgePagesLike,
  KnowledgeSource,
  ZennIngestConfig,
} from "./ingest/types.js";

export { createChatHandler } from "./chat/handler.js";
export type { ChatHandlerConfig } from "./chat/handler.js";
export { buildChatGraph } from "./chat/graph.js";
export { checkRateLimit } from "./chat/rate-limit.js";
export { createGeminiGenerator } from "./chat/gemini.js";
export { buildSystemPrompt } from "./chat/prompt/index.js";
export { collectAnswerLinks } from "./chat/answer/links.js";
export type { AnswerLink } from "./chat/answer/links.js";
export type { AnswerCorrection, GenerateAnswerFn, GeminiGeneratorConfig } from "./chat/gemini.js";
export { classifyRoute } from "./chat/route.js";
export { logAnswerViolation, logChat } from "./chat/log.js";
export type {
  ChatRoute,
  ChatGraphDeps,
  AnswerViolationLogEntry,
  ChatLogEntry,
  RateLimitConfig,
  RateLimitResult,
  RateLimitReason,
} from "./chat/types.js";
export { DEFAULT_RATE_LIMIT_CONFIG } from "./chat/types.js";
