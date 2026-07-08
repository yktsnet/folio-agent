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
  generateAnswer: (input: string, route: ChatRoute) => Promise<string>;
  logChat: (entry: ChatLogEntry) => Promise<void>;
  rateLimitConfig: RateLimitConfig;
  language?: Language;
}
