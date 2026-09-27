import type { AnswerViolationKind } from "./answer/contract.js";
import type { AnswerLink } from "./answer/links.js";
import type { AnswerCorrection } from "./gemini.js";

export type ChatRoute = "thoughts" | "works" | "inquiry" | "rate_limited";

export type Language = "ja" | "en";

export const DEFAULT_LANGUAGE: Language = "ja";

export interface RateLimitConfig {
  shortWindowMinutes: number;
  shortWindowMax: number;
  longWindowHours: number;
  longWindowMax: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  shortWindowMinutes: 10,
  shortWindowMax: 6,
  longWindowHours: 12,
  longWindowMax: 12,
};

export type RateLimitReason = "short_window" | "long_window";

export interface RateLimitResult {
  allowed: boolean;
  reason?: RateLimitReason;
}

export interface ChatLogEntry {
  ip: string;
  route: ChatRoute;
  message: string;
  response: string;
  overLimit: boolean;
}

export interface ChatGraphDeps {
  checkRateLimit: (ip: string) => Promise<RateLimitResult>;
  generateAnswer: (input: string, route: ChatRoute, correction?: AnswerCorrection) => Promise<string>;
  logChat: (entry: ChatLogEntry) => Promise<void>;
  rateLimitConfig: RateLimitConfig;
  language?: Language;
  /** What answers may link to. Links to anything else are reduced to their text. */
  answerLinks?: AnswerLink[];
  /** Records answers that broke the answer format, to see which mistakes are common. */
  logAnswerViolation?: (entry: AnswerViolationLogEntry) => Promise<void>;
}

export interface AnswerViolationLogEntry {
  route: ChatRoute;
  /** 1 for the first answer, 2 for the answer after one correction. */
  attempt: number;
  kinds: AnswerViolationKind[];
  answer: string;
}
