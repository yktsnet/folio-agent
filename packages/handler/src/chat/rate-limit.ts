import type { RateLimitConfig, RateLimitResult } from "./types.js";
import { DEFAULT_RATE_LIMIT_CONFIG } from "./types.js";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

async function countSince(db: D1Database, ip: string, sinceIso: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM chat_logs WHERE ip = ? AND created_at >= ? AND over_limit = 0")
    .bind(ip, sinceIso)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function checkRateLimit(
  db: D1Database,
  ip: string,
  now: Date = new Date(),
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG,
): Promise<RateLimitResult> {
  const shortWindowStart = new Date(now.getTime() - config.shortWindowMinutes * MINUTE_MS).toISOString();
  const shortCount = await countSince(db, ip, shortWindowStart);
  if (shortCount >= config.shortWindowMax) {
    return { allowed: false, reason: "short_window" };
  }

  const dailyStart = new Date(now.getTime() - DAY_MS).toISOString();
  const dailyCount = await countSince(db, ip, dailyStart);
  if (dailyCount >= config.dailyMax) {
    return { allowed: false, reason: "daily" };
  }

  return { allowed: true };
}
