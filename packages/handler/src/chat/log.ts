import type { ChatLogEntry } from "./types.js";

export async function logChat(db: D1Database, entry: ChatLogEntry, now: Date = new Date()): Promise<void> {
  await db
    .prepare(
      "INSERT INTO chat_logs (created_at, ip, route, message, response, over_limit) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(now.toISOString(), entry.ip, entry.route, entry.message, entry.response, entry.overLimit ? 1 : 0)
    .run();
}
