## 新規CLI `folio-agent-sync-zenn`: zenn記事をCI安全なスナップショットとして同期
id: 14
branch-slug: sync-zenn-snapshot-command
github_issue:
status: open
type: feat
対象: packages/handler/package.json, packages/handler/src/sync/cli.ts (新規), packages/handler/src/ingest/types.ts, packages/handler/src/ingest/generate.ts, packages/handler/test/sync/cli.test.ts (新規), packages/handler/test/ingest/generate.test.ts
内容: `config.zenn.articlesDir`（多くの場合ローカル限定・privateリポ由来）に依存せずCIでもzenn記事の知識を含められるよう、ローカルで一度スキャンした結果をリポにコミット可能なJSONスナップショットとして書き出す非対話コマンドを新設し、`generateKnowledge`がそのスナップショットを優先的に使えるようにする。
確認: npm run typecheck / npm run test

---

### 背景

`config.zenn.articlesDir`は多くの場合、利用者のローカル環境にだけ存在する外部ディレクトリ（別リポ・privateリポ由来を含む）を指す。CI環境ではこのディレクトリが存在しないのが前提であり、Issue #12でその場合にクラッシュせず警告してスキップする対応を予定している。

しかしIssue #12の対応だけでは、**CIでビルド・デプロイされる本番の知識ベースにzenn記事の内容が一切含まれない**（articlesDirが無いのでスキップされ続ける）という問題が残る。これは既存の`knowledgeDir`機構（`packages/handler/src/ingest/scan-dist.ts`の`scanKnowledgeDir`、URL はファイルの相対パスから`fileToUrlPath`で機械的に導出）でも代替できない。zennの記事はZenn上の公開URL（`baseUrl + slug`）を持つ必要があり、`knowledgeDir`のパス由来URL導出とは仕組みが合わない。

### 修正方針

**1. 新規CLI: `folio-agent-sync-zenn <config.json> <output.json>`**

- `packages/handler/src/sync/cli.ts` を新規作成。引数の受け方は既存の `packages/handler/src/ingest/cli.ts` と同じ流儀（`configPath`, `outputPath` の2引数、不足時は usage を表示して `exitCode = 1`）に揃える。
- 処理内容: `config.json` を読み、`config.zenn` が未設定ならエラーで終了（"config.zenn is not set" 等）。設定されていれば既存の `scanZennArticles(config.zenn)`（`packages/handler/src/ingest/zenn.ts`）をそのまま呼び出し、返ってきた `KnowledgePage[]` を `outputPath` にJSONとして書き出す（`JSON.stringify(pages, null, 2)`）。
- 対話プロンプトは一切なし（`init`と違い設定を聞き直さない）。既存の`config.json`の値をそのまま使う。
- `packages/handler/package.json` の `bin` に `"folio-agent-sync-zenn": "dist/sync/cli.js"` を追加。

**2. `generateKnowledge` がスナップショットを使えるようにする**

- `packages/handler/src/ingest/types.ts` の `IngestConfig` に `zennSnapshotPath?: string` を追加（JSDocコメント: 「`folio-agent-sync-zenn`が生成したスナップショットJSONへのパス。articlesDirが読めない環境（CI等）でのフォールバック用途」）。
- `packages/handler/src/ingest/generate.ts` の `if (config.zenn) { pages.push(...(await scanZennArticles(config.zenn))); }` 部分を、次の優先順位に変更する:
  1. `config.zenn.articlesDir` が存在し読み取れる場合はそちらを優先してライブスキャンする（ローカル開発時の実体験を優先）。
  2. articlesDirが存在しない場合、`config.zennSnapshotPath` が設定されていれば、そのJSONファイルを読み込んで `KnowledgePage[]` としてそのまま採用する。
  3. どちらも無ければ、Issue #12 の方針通り警告を出して0件スキップする。
- articlesDirの存在確認・エラー握りつぶしの実装はIssue #12の対応と重複するため、実装順序として **Issue #12を先に実装してからこのIssueに着手することを推奨**（本Issueの担当者はIssue #12のstatusを確認し、`open`のままなら先にそちらを終わらせるか、本Issue内でその分岐処理も合わせて実装してよい）。

### テスト

- `packages/handler/test/sync/cli.test.ts`（新規）: 一時ディレクトリにテスト用zenn記事を用意し、`folio-agent-sync-zenn`相当の処理（cli.tsのmain相当、または内部関数を直接呼ぶ形でも可）を実行して、published記事のみが期待通りのJSON（`KnowledgePage[]`）として出力されることを確認する。`packages/handler/test/ingest/zenn.test.ts`のセットアップ（`mkdtemp`ベース）を参考にする。
- `packages/handler/test/ingest/generate.test.ts`: `config.zenn.articlesDir`が存在せず`config.zennSnapshotPath`が設定されている場合に、スナップショットの内容が`generateKnowledge`の結果に反映されることを確認するケースを追加。
