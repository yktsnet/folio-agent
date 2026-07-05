CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  ip TEXT NOT NULL,
  route TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  over_limit INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_ip_created_at ON chat_logs (ip, created_at);
