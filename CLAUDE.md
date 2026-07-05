# CLAUDE.md

@context/conventions.md
@context/structure.md

Claude Code は本ファイルを最優先の指示として実行すること。

## 動作フロー

- 起動時に `issues/` 内の対象 Issue（`status: open`）を確認する。
- 実装開始前に `context/conventions.md` と `context/structure.md` を読み、規約と構造を把握する。
- 実装・検証・PR 作成はグローバルの `pr-workflow` スキル（`~/.claude/skills/pr-workflow/SKILL.md`）の手順に従う。
- 実行者は Issue を読んで実装し PR を出すまでが担当。npm publish・デプロイ・マージは user が実施する。

## コマンド

```bash
npm ci             # セットアップ
npm run typecheck  # 型チェック（tsc -b --force）
npm run test       # Vitest 一括実行
npm run build      # 全パッケージビルド（tsc -b）
```

単一テスト:

```bash
npx vitest run packages/handler/test/chat/graph.test.ts
```

手動検証（dev ハーネス。手順詳細は `packages/handler/dev/README.md`）:

```bash
cd packages/handler/dev
npx wrangler dev --config "$(pwd)/wrangler.jsonc" --port 8799
```

Gemini API キーは `packages/handler/dev/.dev.vars`（gitignore 済・`.dev.vars.example` 参照）。

## アーキテクチャの要点

- 知識は**ビルド時に全量生成**（full-context/CAG。検索なし）: `folio-agent-ingest` が利用者サイトの `dist/` + `knowledge/` から knowledge.json を作る。
- 実行時は LangGraph StateGraph 1本: `input_guard →（レート制限内なら）route → generate → log`。外部依存（D1 / Gemini）はすべて factory への注入で受ける。
- D1 の `chat_logs` がログとレート制限カウンタを兼ねる（テーブルは1つだけ）。
- 設計判断は `PLAN.md` / `JUDGE.md` が正。実装がこれらと食い違う場合は指摘する。

## 検証手段

| 対象 | コマンド |
|---|---|
| 型 | `npm run typecheck` |
| ロジック | `npm run test` |
| 実行確認（D1 / Gemini 込み） | dev ハーネス（user が実施。PR の `## 検証手順` に記載） |
