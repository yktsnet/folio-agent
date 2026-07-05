export type ChatRoute = "thoughts" | "works" | "inquiry" | "rate_limited";

export interface RateLimitConfig {
  shortWindowMinutes: number;
  shortWindowMax: number;
  dailyMax: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  shortWindowMinutes: 10,
  shortWindowMax: 3,
  dailyMax: 10,
};

export type RateLimitReason = "short_window" | "daily";

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
}
