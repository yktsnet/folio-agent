## PR記録: feat: 新規CLI folio-agent-sync-zenn によるzenn記事スナップショット同期
issue: 14 (14_sync-zenn-snapshot-command.md)
PR: https://github.com/yktsnet/folio-agent/pull/25
Merged: 029ee00d90302a4f283046c85e7adf29674be984

## 変更内容

`config.zenn.articlesDir`（多くの場合ローカル限定・privateリポ由来）に依存せずCIでもzenn記事の知識を含められるよう、以下を実装した。

**1. 新規CLI `folio-agent-sync-zenn <config.json> <output.json>`**（`packages/handler/src/sync/cli.ts`）

- 既存 `ingest/cli.ts` と同じ流儀で `configPath` / `outputPath` を受け取り、不足時は usage を表示して `exitCode = 1`。
- `config.zenn` が未設定ならエラーで終了（"config.zenn is not set"）。設定されていれば既存の `scanZennArticles(config.zenn)` を呼び出し、結果の `KnowledgePage[]` を `outputPath` にJSONとして書き出す。
- テストから内部処理を直接呼べるよう `syncZennSnapshot(configPath, outputPath)` を export し、CLIエントリポイント（`main()`）は `import.meta.url` チェックで直接実行時のみ起動するようにした（インポート時に副作用が走らないようにするため）。
- `packages/handler/package.json` の `bin` に `"folio-agent-sync-zenn": "dist/sync/cli.js"` を追加。

**2. `generateKnowledge` がスナップショットを使えるようにする**

- `IngestConfig` に `zennSnapshotPath?: string` を追加（`packages/handler/src/ingest/types.ts`）。
- `packages/handler/src/ingest/generate.ts` の zenn 分岐を次の優先順位に変更:
  1. `config.zenn.articlesDir` が存在すれば従来通りライブスキャン（`scanZennArticles`）。
  2. articlesDir が存在せず `config.zennSnapshotPath` が設定されていれば、そのJSONを読み込んで `KnowledgePage[]` として採用。
  3. どちらも無ければ `articlesDir not found: <path> — skipping zenn ingest` という warning を出して0件スキップ（Issue #12 の要件を統合）。
  - 存在確認は `stat` を使い、ENOENT以外のエラー（権限エラー等）はそのまま投げる。

Issue #12（articlesDir不在時のクラッシュ対応）は本Issueの第3分岐にそのまま含まれるため、Issue側の合意通り本PRで統合実装した。

## 静的確認結果

- `npm run typecheck`: 成功（エラー無し）
- `npm run test`: 17ファイル / 124テスト すべて成功
- caller/import整合性: `generateKnowledge` の呼び出し元（`ingest/cli.ts` 等）はシグネチャ不変のため影響なし。`sync/cli.ts` は `index.ts` の再エクスポート対象外（既存の `ingest/cli.ts` / `init/cli.ts` と同じくbinエントリのみ）で整合。

```
$ git diff --name-only HEAD~1
packages/handler/package.json
packages/handler/src/ingest/generate.ts
packages/handler/src/ingest/types.ts
packages/handler/src/sync/cli.ts
packages/handler/test/ingest/generate.test.ts
packages/handler/test/sync/cli.test.ts
```

## 検証手順

型チェック・ユニットテストは上記で完了。実際のzenn記事ディレクトリを使った動作確認（`folio-agent-sync-zenn` の実行、生成されたスナップショットを使ったビルド確認）はuser側で実施してください。
