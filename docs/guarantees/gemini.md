# gemini

| 保証 | 対応テスト |
|---|---|
| `createGeminiGenerator` の生成関数は初回は訪問者の入力だけを送る | `sends the visitor's message alone on the first attempt` |
| `createGeminiGenerator` の生成関数は作り直しでは元の質問・直前の回答・指摘を会話として送る | `sends the question, the previous answer and the correction request as a conversation when correcting` |
