import type { AnswerViolationLogEntry, ChatLogEntry } from "./types.js";

export async function logChat(db: D1Database, entry: ChatLogEntry, now: Date = new Date()): Promise<void> {
  await db
    .prepare(
      "INSERT INTO chat_logs (created_at, ip, route, message, response, over_limit) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(now.toISOString(), entry.ip, entry.route, entry.message, entry.response, entry.overLimit ? 1 : 0)
    .run();
}

// 訪問者の入力は残さない。集計したいのは LLM がどう間違えたかで、誰が何を聞いたかではない
export async function logAnswerViolation(
  db: D1Database,
  entry: AnswerViolationLogEntry,
  now: Date = new Date(),
): Promise<void> {
  await db
    .prepare("INSERT INTO answer_violations (created_at, route, attempt, kinds, answer) VALUES (?, ?, ?, ?, ?)")
    .bind(now.toISOString(), entry.route, entry.attempt, JSON.stringify(entry.kinds), entry.answer)
    .run();
}
