# conventions

## モジュール構成

- npm workspaces のモノレポ。`packages/handler`（チャットハンドラ + ingest CLI）と `packages/widget`（Web Component）の2パッケージ
- ESM（`"type": "module"`）+ TypeScript project references（`tsc -b`）。相対 import は **`.js` 拡張子付き**で書く（NodeNext 解決）
- 配布物は `dist/` のみ（`files: ["dist"]`）。`packages/handler/dev/` は npm に配布しない使い捨て検証ハーネス

## 依存性注入

- 外部依存（D1・Gemini）は直接 import せず、**関数を組み立てる factory に依存を渡す**（`createChatHandler(config)` / `buildChatGraph(deps)` / `createGeminiGenerator(config)`）
- テストは fake で差し替える（`test/chat/fake-d1.ts`）。実サービスへの接続はテストに書かない

## 命名規則

- ファイル: kebab-case（`rate-limit.ts` / `html-to-text.ts`）
- 関数・変数: camelCase。factory は `create*` / `build*`、Web Component 登録は `define*`
- 定数: UPPER_SNAKE_CASE（`MAX_INPUT_LENGTH` / `DEFAULT_RATE_LIMIT_CONFIG` / `WIDGET_STYLES`）
- 型はモジュールごとの `types.ts` に interface / union で集約。クラスは Web Component のみ（プライベートは `#` フィールド）

## 公開 API

- パッケージの公開面は `src/index.ts` の再エクスポートがすべて。内部モジュールを利用側から直接 import させない

## 文言

- 訪問者向けメッセージ（エラー文・開示文・上限通知）は日本語でコード内に定数として持つ

## テスト

- Vitest。`test/` が `src/` をミラーする配置（`src/chat/graph.ts` ↔ `test/chat/graph.test.ts`）
- 時刻依存のロジック（レート制限・ログ）は `now: Date` を引数で受け、テストから固定値を注入する
