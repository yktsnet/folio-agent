## PR記録: feat: handler/widgetのJP・EN言語対応
issue: 09 (09_jp-en-language-support.md)
PR: https://github.com/yktsnet/folio-agent/pull/17
Merged: 75d4fe6391daf65b7ce2c387511f8ae6e6583c24

## 変更内容

handler のシステムプロンプト・ルーティングキーワード・定型メッセージ、および widget の UI 文言を `ja` / `en` で切り替えられるようにした。既定は `ja`（既存挙動と完全互換）。

1. **handler 側: `language` オプションの追加**
   - `types.ts` に `Language = "ja" | "en"` と `DEFAULT_LANGUAGE = "ja"` を追加。
   - `ChatHandlerConfig` / `ChatGraphDeps` / `GeminiGeneratorConfig` に `language?: Language` を追加。
   - `gemini.ts`: `COMMON_PREAMBLE` / `ROUTE_INSTRUCTIONS` / `buildInquiryInstruction` / 知識ラベルを言語別テーブル化し、`buildSystemPrompt(knowledge, route, contactUrl?, language?)` で受ける。`createGeminiGenerator` から一貫して流す。
   - `graph.ts`: レート制限理由文・上限到達メッセージ・生成失敗時の定型応答を言語別テーブル化。`deps.language` を解決して `classifyRoute` にも渡す。
   - `handler.ts`: `ChatHandlerConfig.language` を `buildChatGraph` の deps に橋渡し。

2. **handler 側: ルーティングキーワードの言語対応**
   - `route.ts`: `INQUIRY_KEYWORDS` / `WORKS_KEYWORDS` を言語別に持ち、`classifyRoute(input, language = "ja")` に変更。
   - EN inquiry キーワード: `hire` / `quote` / `estimate` / `commission` / `inquiry` / `work with you` / `project request`。EN works キーワード: `works` / `portfolio` / `article` / `zenn` / `project`。
   - 全体で小文字化した入力に対して照合するよう統一（日本語キーワードは大文字小文字の概念がないため既存挙動に影響なし）。

3. **widget 側: `lang` 属性の追加**
   - `widget-element.ts` に文言テーブル（`WIDGET_TEXT: Record<Language, WidgetText>`）を1箇所に集約。
   - `lang` 属性（`ja` / `en`、既定・不正値は `ja` にフォールバック）で入力プレースホルダ・送信ボタン・開示文・ポリシーリンク文言・各エラー文言（endpoint未設定／回答取得失敗／通信エラー）を切り替え。

4. **規約の更新**
   - `context/conventions.md` の「文言」節を、言語別テーブルで持つ設計に合わせて改訂。

5. **互換性**
   - `language` / `lang` 未指定時の出力は既存と一字一句同一。既存テストは無修正で全通過。

## 静的確認結果

- `npm run typecheck`: 成功
- `npm run test`: 82 tests / 13 files すべて成功
- caller・import 整合性: `handler.ts` → `buildChatGraph` への `language` 橋渡し、`gemini.ts` の `createGeminiGenerator` → `buildSystemPrompt` への `language` 橋渡し、`graph.ts` の `classifyRoute` 呼び出しへの `language` 橋渡しを確認済み
- `git diff --name-only HEAD~1`:
  ```
  context/conventions.md
  packages/handler/src/chat/gemini.ts
  packages/handler/src/chat/graph.ts
  packages/handler/src/chat/handler.ts
  packages/handler/src/chat/route.ts
  packages/handler/src/chat/types.ts
  packages/handler/test/chat/gemini.test.ts
  packages/handler/test/chat/graph.test.ts
  packages/handler/test/chat/route.test.ts
  packages/widget/src/widget-element.ts
  packages/widget/test/widget-element.test.ts
  ```

## 検証手順

本 Issue の範囲は型・ロジック検証（上記）で完結。dev ハーネスでの実行確認は不要(Gemini 呼び出し自体は変更していない）。
