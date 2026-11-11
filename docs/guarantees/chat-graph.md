# chat-graph

## 回答の生成と作り直し

| 保証 | 対応テスト |
|---|---|
| `buildChatGraph` のグラフはレート制限内なら経路を分類し、回答を生成して、`logChat` に記録する | `routes, generates, and logs when under the rate limit` |
| `buildChatGraph` のグラフは回答の形式に合う回答を、生成1回でそのまま返す | `returns a compliant answer as is, generating only once` |
| `buildChatGraph` のグラフは回答の形式に違反した回答を、違反の箇所を添えて1回だけ作り直させる | `points out a format violation and has the model correct it once` |
| `buildChatGraph` のグラフは作り直した回答を返す | `points out a format violation and has the model correct it once` |
| `buildChatGraph` のグラフは作り直した回答を `logChat` に記録する | `points out a format violation and has the model correct it once` |
| `buildChatGraph` のグラフは回答の形式の違反を `logAnswerViolation` に記録する | `points out a format violation and has the model correct it once` |
| `buildChatGraph` のグラフは作り直しても違反した回答を、3回目を呼ばずにプレーンテキストにして返す | `falls back to plain text when the corrected answer still breaks the format, without asking a third time` |
| `buildChatGraph` のグラフがプレーンテキストにした回答は、回答の形式に合う | `falls back to plain text when the corrected answer still breaks the format, without asking a third time` |
| `buildChatGraph` のグラフは違反の記録に失敗しても回答を返す | `still answers when recording a violation fails` |

## 生成の失敗とレート制限の超過

| 保証 | 対応テスト |
|---|---|
| `buildChatGraph` のグラフは生成に失敗しても生の例外を出さない | `falls back to a canned answer (never a raw error) when generation fails` |
| `buildChatGraph` のグラフは生成に失敗したら固定のフォールバックの文言を返す | `falls back to a canned answer (never a raw error) when generation fails` |
| `buildChatGraph` のグラフは生成に失敗したときのフォールバックの文言を `logChat` に記録する | `falls back to a canned answer (never a raw error) when generation fails` |
| `buildChatGraph` のグラフはレート制限を超えたら生成を呼ばず、固定の上限の文言を返す | `short-circuits to a canned answer and skips generation when rate-limited` |
| `buildChatGraph` のグラフはレート制限を超えたリクエストを `route: "rate_limited"`・`overLimit: true` で `logChat` に記録する | `short-circuits to a canned answer and skips generation when rate-limited` |

## 英語の会話

| 保証 | 対応テスト |
|---|---|
| `buildChatGraph` のグラフは `language` が `"en"` なら、英語の入力を経路に分類して生成に渡す | `language: en > routes an English message to inquiry and generates in English mode` |
| `buildChatGraph` のグラフは `language` が `"en"` なら、生成に失敗したときのフォールバックの文言を英語で返す | `language: en > falls back to an English canned answer when generation fails` |
| `buildChatGraph` のグラフは `language` が `"en"` なら、上限の文言を英語で返す | `language: en > short-circuits to an English canned answer when rate-limited` |
