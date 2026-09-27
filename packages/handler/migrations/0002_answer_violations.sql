-- LLM の回答が回答の形式の決まりを破った記録。どの間違いが多いかを集計し、
-- 多いものだけをプロンプトやコードで手当てするために使う。訪問者の入力は持たない。
CREATE TABLE IF NOT EXISTS answer_violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  route TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  kinds TEXT NOT NULL,
  answer TEXT NOT NULL
);
