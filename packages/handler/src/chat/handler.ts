import { buildChatGraph } from "./graph.js";
import { logChat } from "./log.js";
import { checkRateLimit } from "./rate-limit.js";
import type { GenerateAnswerFn } from "./gemini.js";
import type { RateLimitConfig } from "./types.js";
import { DEFAULT_RATE_LIMIT_CONFIG } from "./types.js";

const MAX_INPUT_LENGTH = 1000;

export interface ChatHandlerConfig {
  db: D1Database;
  generateAnswer: GenerateAnswerFn;
  rateLimitConfig?: RateLimitConfig;
}

export function createChatHandler(config: ChatHandlerConfig): (request: Request) => Promise<Response> {
  const graph = buildChatGraph({
    checkRateLimit: (ip) => checkRateLimit(config.db, ip, new Date(), config.rateLimitConfig ?? DEFAULT_RATE_LIMIT_CONFIG),
    generateAnswer: config.generateAnswer,
    logChat: (entry) => logChat(config.db, entry),
  });

  return async (request: Request): Promise<Response> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const message = (body as { message?: unknown } | null)?.message;
    if (typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "message must be a non-empty string" }, { status: 400 });
    }
    if (message.length > MAX_INPUT_LENGTH) {
      return Response.json({ error: `message must be at most ${MAX_INPUT_LENGTH} characters` }, { status: 400 });
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const result = await graph.invoke({ input: message, ip });

    return Response.json({ answer: result.answer, route: result.route ?? "rate_limited" });
  };
}
