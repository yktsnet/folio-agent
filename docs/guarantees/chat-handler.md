# chat-handler

| 保証 | 対応テスト |
|---|---|
| `createChatHandler` のハンドラは正しいメッセージに 200 と `{answer, route}` を返す | `returns a generated answer for a valid message` |
| `createChatHandler` のハンドラは空白だけのメッセージに 400 を返す | `rejects an empty message with 400` |
| `createChatHandler` のハンドラはJSON でないボディに 400 を返す | `rejects a non-JSON body with 400` |
| `createChatHandler` のハンドラは1000字を超える `message` に 400 を返す | `rejects a message over 1000 characters with 400` |
| `createChatHandler` のハンドラは同じ IP からの連続したリクエストにレート制限をかけ、超えたら 200 のまま `route: "rate_limited"` を返す | `enforces the rate limit across requests from the same IP` |
| `createChatHandler` のハンドラは `CF-Connecting-IP` ヘッダが無くても例外を投げずに答える | `treats a request without CF-Connecting-IP as ip "unknown" without throwing` |
| `createChatHandler` のハンドラは回答の形式に違反した回答を D1 の `answer_violations` に記録する | `records answers that broke the answer format in answer_violations, without the visitor's message` |
| `createChatHandler` のハンドラは `answer_violations` に訪問者の入力を記録しない | `records answers that broke the answer format in answer_violations, without the visitor's message` |
