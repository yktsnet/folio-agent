## PR記録: feat: Zenn記事のローカル取り込みを実装
issue: 02 (02_zenn-ingest.md)
PR: https://github.com/yktsnet/folio-agent/pull/3
Merged: 0b8cf2819a54f38ed98bdb48a779815bea4e9ae5

## 変更内容

PLAN.md §4-3で「オプション」として未実装のまま残っていたZenn記事取り込みを実装した。ネットワーク経由でzenn.devから取得するのではなく、Zenn CLIの`articles/`ディレクトリ（ローカルパス）を`dist/`・`knowledge/`と同じ要領で読み込む方式。

- `types.ts`: `ZennIngestConfig`（`articlesDir` / `baseUrl`）を追加し、`IngestConfig`に`zenn?`を追加。
- `ingest/zenn.ts`（新規）: `articlesDir`直下の`*.md`を列挙し、frontmatterから`title`/`published`を正規表現で抽出。`published`が`false`または欠落しているファイルは除外。本文はfrontmatterを除いた残りを`trim()`。`url`は`${baseUrl}/${slug}`。
- `generate.ts`: `config.zenn`が指定されていれば`scanZennArticles`の結果をpagesに追加（include/exclude グロブの対象外、knowledgeDirと同じ「明示配置したものだけ入る」方式）。
- `index.ts`: `ZennIngestConfig`を型エクスポートに追加。
- Works記事とのマッピング機能は設計方針通り作っていない（CAGでは本文がそのまま知識に入るため不要）。

## 静的確認結果

- `npm run typecheck`: 成功
- `npm run test`: 52 tests passed（新規 zenn.test.ts 2件、generate.test.ts に zenn設定ケースを1件追加）
- `npm run build`: 成功
- caller/importの整合性: `generate.ts`から`scanZennArticles`をimportし`config.zenn`存在時のみ呼び出し。`index.ts`の型エクスポートに`ZennIngestConfig`を追加済み。既存の`scan-dist.ts`の`readTextFile`を`zenn.ts`から再利用。

```
$ git diff --name-only HEAD~1
packages/handler/src/index.ts
packages/handler/src/ingest/generate.ts
packages/handler/src/ingest/types.ts
packages/handler/src/ingest/zenn.ts
packages/handler/test/ingest/generate.test.ts
packages/handler/test/ingest/zenn.test.ts
```

## 検証手順

本Issueの範囲は取り込みロジック（Node実行のCLI処理）のみで、Workers実行時パスへの影響は無い。実機での目視確認は不要と判断（静的確認で完結）。portfolio-astro側でのZenn記事リポジトリの用意方法は別リポの作業（本Issueの制約に明記）。
