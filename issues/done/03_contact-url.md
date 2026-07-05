## PR記録: feat: Contact誘導へのURL直接指定
issue: 03 (03_contact-url.md)
PR: https://github.com/yktsnet/folio-agent/pull/5
Merged: ec6176cb5bfe641664af0b65e39681f48a77f8f3

## 変更内容
PLAN.md §3の「Contactページへ誘導（オプションでオン/オフ）」を、真偽値のトグルではなく`contactUrl`の値の有無で切り替える形で実装した。

- `buildSystemPrompt`のシグネチャに第3引数`contactUrl?: string`を追加。
- `inquiry`経路の指示文を`contactUrl`の有無で出し分け（あり: URLを埋め込んだ文言 / 無し: 既存文言のまま）。
- `GeminiGeneratorConfig`に`contactUrl?: string`を追加し、`createGeminiGenerator`内の`buildSystemPrompt`呼び出しに伝播。
- 「オフ」という概念は作らず、ON時の解像度を上げるだけの変更にとどめた。

## 静的確認結果
- `npm run typecheck`: 成功
- `npm run test`: 55 tests passed（`gemini.test.ts`に3件追加: contactUrlありでURLが含まれる / contactUrlなしで既存文言を維持 / thoughts・works経路には影響しない）
- `packages/handler/src/index.ts`: 既存の`GeminiGeneratorConfig`型エクスポートがそのまま拡張されるため変更不要（Issue記載通り確認のみ）
- `dev/worker.ts`など既存呼び出し元との整合性を確認（`contactUrl`はオプショナルのため後方互換）

```
$ git diff --name-only HEAD~1
packages/handler/src/chat/gemini.ts
packages/handler/test/chat/gemini.test.ts
```

## 検証手順
ロジック変更のみで型・テストで完結するため、追加の実行確認は不要。
