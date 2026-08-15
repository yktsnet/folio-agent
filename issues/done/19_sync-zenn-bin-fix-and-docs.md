## PR記録: fix: folio-agent-sync-zenn の bin 経由無言終了を修正し、スナップショット機構を文書化
issue: 19 (19_sync-zenn-bin-fix-and-docs.md)
PR: https://github.com/yktsnet/folio-agent/pull/38
Merged: 7d0b485d9a1e7e2202aad6d602aa08b83641e5fe

## 変更内容

`folio-agent-sync-zenn` を npm が張る `node_modules/.bin/` 経由で実行すると、直接実行判定が一致せず `main()` が走らないまま exit code 0 で終了する不具合を修正した。あわせて 0.4.0 で追加された `zennSnapshotPath` フォールバックと `folio-agent-sync-zenn` を `docs/usage.md` と README 2本に追記した。

- `packages/handler/src/sync/cli.ts`: 直接実行判定を修正
- `packages/handler/test/sync/cli.test.ts`: bin シンボリックリンク経由実行の回帰テストを追加
- `docs/guarantees.md` §10: 新保証1件を追記
- `docs/usage.md` / `README.md` / `README.en.md`: `zennSnapshotPath` フォールバックと `folio-agent-sync-zenn` を追記

### Issue の修正案からの逸脱について（要確認）

Issue は「`ingest/cli.ts` と同じ判定式（`process.argv[1] === fileURLToPath(import.meta.url)`）に揃える」よう指示していたが、実装前に実機検証したところ、**この判定式では bin シンボリックリンク経由の実行を検出できない**ことが分かった（`ingest/cli.ts` 自身も同じ欠陥を抱えている）。

検証手順: `npm ci && npm run build && npm install`（workspace bin を実体化）→ `node node_modules/.bin/folio-agent-ingest <config> <output>` を実行 → exit code 0 だが `<output>` が書き出されない。原因は、npm の bin シンボリックリンク経由実行時、`process.argv[1]` はシンボリックリンクのパスのままである一方、`import.meta.url`（および `fileURLToPath` した値）は Node がすでに解決済みの実体パスであり、両者を単純な文字列/URL比較しても一致しないため。

対応として、`process.argv[1]` 側を `fs.realpathSync` で実体パスに解決してから比較する方式に変更した（`process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])`）。この方式で実際に `node node_modules/.bin/folio-agent-sync-zenn <config> <output>` が正しく `main()` を実行し、スナップショットを書き出すことを実機確認済み（逆に、Issue記載どおりの式に戻すと新設の回帰テストが red になることも確認済み）。

`ingest/cli.ts` は本 Issue の対象外（対象ファイルに含まれていない）のため未修正。同じ欠陥が残っているので、別 Issue での対応要否を判断してほしい。

## 保証

- 新たに宣言する保証（`docs/guarantees.md` §10 に追記）:
  - `folio-agent-sync-zenn` は npm が `node_modules/.bin/` に張るシンボリックリンク経由で実行された場合も `main()` を実行し、スナップショットを書き出す
    → `packages/handler/test/sync/cli.test.ts` の `describe("folio-agent-sync-zenn CLI (bin symlink execution)")` > `runs main() and writes the output file when invoked via a bin-style symlink`（実際にビルド済み `dist/sync/cli.js` へのシンボリックリンクを子プロセスで実行して検証。修正前のコードに戻すと red になることを確認済み）
- 維持する保証（`docs/guarantees.md` §10・既存2テストは無変更）:
  - `syncZennSnapshot` は `config.zenn` から公開済み Zenn 記事のみを `KnowledgePage[]` として JSON 出力する
  - `syncZennSnapshot` は `config.zenn` 未設定時に例外を投げる
- 維持する保証（同 §6・§8、テスト無変更・非対象）:
  - `generateKnowledge` は `articlesDir` 不在かつ `zennSnapshotPath` 設定時にスナップショットへフォールバックする
  - `folio-agent-ingest` の CLI 挙動（引数処理・書き出し）は変更しない

## 静的確認結果

- `npm run typecheck`: pass（エラーなし）
- `npm run test`: pass（18 test files / 132 tests、新規回帰テスト含む）
- caller・import整合性: `sync/cli.ts` の新規 import（`node:fs` の `realpathSync`）は同ファイル内でのみ使用。`test/sync/cli.test.ts` の新規 import（`node:child_process` の `execFileSync`、`node:fs` の `existsSync`、`node:fs/promises` の `symlink`）も同様。既存 export（`syncZennSnapshot`）のシグネチャ・呼び出し元（`packages/handler/src/ingest/generate.ts` 等）は無変更
- `git diff --name-only --cached`:
  ```
  README.en.md
  README.md
  docs/guarantees.md
  docs/usage.md
  packages/handler/src/sync/cli.ts
  packages/handler/test/sync/cli.test.ts
  ```
  Issue の「対象」フィールドと完全一致

## 検証手順

Agent側の検証（typecheck / test / 実機での bin シンボリックリンク実行確認）で完結。追加のユーザー実施事項なし。
