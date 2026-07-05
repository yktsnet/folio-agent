## PR記録: feat: システムプロンプト共通前文の再設計とウィジェットのテーマ変数受け口
issue: 01 (01_prompt-preamble-and-theming.md)
PR: https://github.com/yktsnet/folio-agent/pull/1
Merged: 87ad45fdec781ee9cd26c2c0cdb0614e799e7818

## 変更内容
dogfooding検証で見つかった回答品質の問題（無回答原則がthoughts経路にしか効いていない・Markdown記法が生で表示される・口調がオフィスライク）を解消するため、`buildSystemPrompt`（packages/handler/src/chat/gemini.ts）を再構成した。

- 共通前文（全経路）に以下を追加:
  - ペルソナ: 定型の前置き挨拶をしない、簡潔（3〜4文以内）な自然な口語
  - 無回答原則: 知識に書かれていることだけから答える。書かれていないことは推測・創作せず「その点はサイトに記載がない」と伝えてContactページを案内する。用語の展開形も創作しない
  - 出力形式: Markdown記法を使わずプレーンテキストで答える
- 経路別指示（ROUTE_INSTRUCTIONS）は差分のみに縮小（thoughts / works / inquiry）。thoughtsにあった無回答文言は共通前文へ移動
- `buildSystemPrompt(knowledge, route)` の公開シグネチャは変更なし

あわせて、ウィジェットのハードコード配色をCSSカスタムプロパティ経由に変更（packages/widget/src/styles.ts）。

- 6トークン: `--folio-agent-surface` / `--folio-agent-text` / `--folio-agent-muted` / `--folio-agent-accent` / `--folio-agent-accent-contrast` / `--folio-agent-font`
- フォールバック値は現行色を維持（テーマ未設定なら見た目は変わらない）
- assistant吹き出しの背景色はmutedトークンから派生（新規トークンは増やさない）
- ファイル冒頭に、利用側が `folio-agent-widget { --folio-agent-accent: ...; }` でテーマを注入できる旨のコメントを追加
- disclosureのリンク色・formの区切り線・box-shadowは装飾的な非ブランド色として据え置き（6トークンの対象外）

## 静的確認結果
- `npm run typecheck`: 成功（エラーなし）
- `npm run test`: 全12ファイル・49テスト成功
  - 新規 `packages/handler/test/chat/gemini.test.ts`: 全経路で無回答原則・プレーンテキスト指示が含まれること、経路別指示が経路ごとに切り替わることを検証
  - 新規 `packages/widget/test/styles.test.ts`: `WIDGET_STYLES` に6トークンすべての `var(--folio-agent-*` 参照とフォールバックが含まれ、テーマ化対象の生色が残っていないことを検証
- caller/import整合性: `buildSystemPrompt` / `createGeminiGenerator` は `packages/handler/src/index.ts` で再エクスポートされたまま、シグネチャ変更なし。`WIDGET_STYLES` の参照元（widget-element.ts）に変更なし

```
$ git diff --name-only HEAD~1
packages/handler/src/chat/gemini.ts
packages/handler/test/chat/gemini.test.ts
packages/widget/src/styles.ts
packages/widget/test/styles.test.ts
```

## 検証手順
- dev ハーネス（`packages/handler/dev/`）でGemini実応答を目視確認し、以下を確認する:
  - works経路で存在しない用語展開を創作しないこと
  - 回答にMarkdown記法（`**`・`#`・`-`等）が含まれないこと
  - 定型の前置き挨拶がなく簡潔な口調になっていること
- `folio-agent-widget { --folio-agent-accent: ...; }` 等をグローバルCSSに書いてテーマが反映されることをブラウザで目視確認する
