## PR記録: feat: 対話式セットアップCLI（folio-agent-init）の追加
issue: 10 (10_init-wizard-cli.md)
PR: https://github.com/yktsnet/folio-agent/pull/19
Merged: e5a63e3689b832e8c1a16a5eb257f35ad9eab9dc

## 変更内容

`npx folio-agent-init` で対話ウィザードを起動し、config・テーマCSS・APIルート雛形・build スクリプト・.dev.vars を自動生成する。利用者の手作業はレイアウトへの5行スニペット貼り付け（初回のみ）に圧縮する。Issue 08（プレイグラウンド）を supersede する。

- `packages/handler/package.json` の `bin` に `folio-agent-init: dist/init/cli.js` を追加し、対話 UI に `@clack/prompts` を依存追加。
- `src/init/questions.ts`: 質問フロー（言語→distDir→include→Zenn有無→ContactURL→テーマ3色→Gemini APIキー→APIルート出力先の1本道、全問デフォルト持ち）と、純粋なバリデーション/パース関数（`isValidHexColor` / `parseIncludeList`）を分離してエクスポート。
- `src/init/writers.ts`: 回答オブジェクトから `folio-agent.config.json` / `folio-agent.theme.css` / API ルート雛形（Cloudflare Pages Functions の `onRequestPost`）を生成する純粋関数、`build` スクリプトへの追記判定、`.dev.vars` の追記・更新をすべて副作用なしの関数として実装。
- `src/init/cli.ts`: 上記を束ね、既存 `folio-agent.config.json` があれば読み込んで全質問のデフォルトに反映（毎回全問聞き直す）、書き込み前に変更ファイル一覧を提示して最終確認、完了後に回答値を埋めた埋め込みスニペットとD1未設定時の案内を表示する。
- `src/ingest/types.ts`: `IngestConfig` に `language`（`chat/types.ts` の `Language` を再利用）と `theme`（`ThemeColors`: accent/surface/text の3色）を追加。ingest 側のロジックはこれらを参照しないため無害に無視される。

## 静的確認結果

- `npm run typecheck` — 成功
- `npm run test` — 成功（103 tests、新規21件を含む）
- caller/import の整合性を確認済み: `package.json` の `bin` パスが `tsc -b` 実行後の `dist/init/cli.js` と一致すること、`writers.ts` が生成する API ルート雛形を実際に `node` で評価し出力内容が意図通りの TypeScript になることを確認した。
- `git diff --name-only HEAD~1`:
  ```
  package-lock.json
  packages/handler/package.json
  packages/handler/src/ingest/types.ts
  packages/handler/src/init/cli.ts
  packages/handler/src/init/questions.ts
  packages/handler/src/init/writers.ts
  packages/handler/test/init/questions.test.ts
  packages/handler/test/init/writers.test.ts
  ```
  `package-lock.json` は Issue の「対象」には明記が無いが、`@clack/prompts` を依存追加したことに伴う機械的な更新（`npm ci` で再現可能）として含めている。

## 検証手順

対話フロー自体（`@clack/prompts` 呼び出し）は自動テスト対象外のため、以下を手動で確認する:

```bash
npm run build
cd /path/to/scratch-dir   # 適当な空ディレクトリ（package.json を用意）
node /path/to/folio-agent/packages/handler/dist/init/cli.js
```

- 全問 Enter 連打で完走し、`folio-agent.config.json` / `folio-agent.theme.css` / `functions/api/chat.ts` / `package.json` の `build` スクリプト追記 / （Gemini キーを入力した場合のみ）`.dev.vars` が生成・更新されること。
- 生成済みの `folio-agent.config.json` がある状態で再実行し、各質問のデフォルトが前回値になっていること。
- 既存の API ルートファイルがある場合、上書きされずスキップ通知が出ること。
- 完了メッセージのスニペットに回答値（endpoint・lang・テーマCSSのimport）が正しく埋まっていること。
