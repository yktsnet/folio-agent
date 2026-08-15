## PR記録: fix: ingest/init CLI の bin シンボリックリンク判定を修正し、CI で symlink 回帰テストを実行する
issue: 20 (20_bin-guard-ingest-init.md)
PR: https://github.com/yktsnet/folio-agent/pull/40
Merged: 57d62008945b9644e225fb8f5e48807de27b96ef

## 変更内容
Issue 19 で `sync/cli.ts` に施した bin シンボリックリンク対応が `ingest/cli.ts` と `init/cli.ts` に未適用で、両者は壊れた判定式（`process.argv[1] === fileURLToPath(import.meta.url)`）のまま残っていた。この判定は v0.4.0 の後に入った未リリースのコードであり、次の publish で `folio-agent-ingest` / `folio-agent-init` が bin 経由で無言終了するリリースブロッカーだった。

- `ingest/cli.ts` / `init/cli.ts` の直接実行ガードを `sync/cli.ts` と同じ realpath 比較（`process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])`）に揃えた。共通ヘルパーへの切り出しは対象ファイル外への波及を避けるため見送り、各ファイルに直接記述した（説明コメントは重複を避け簡潔化）。
- `test/sync/cli.test.ts` の bin symlink 回帰テストと同方式で、`test/ingest/cli.test.ts` と `test/init/cli.test.ts` に symlink 経由実行の回帰テストを追加した。init は対話ウィザードのため、stdin を `/dev/null`（非TTY・即EOF）のまま起動し、`main()` が `runWizard()` の intro バナーを出力するところまで進むことを観測する方式とし、キー入力の逐次エミュレーションは避けた。
- `.github/workflows/ci.yml` の `npm test` → `npm run build` の順序を `npm run build` → `npm test` に変更し、symlink 回帰テスト（`describe.skipIf(!existsSync(distCliPath))`）が CI で実際に実行されるようにした。

## 保証
- 新規: `folio-agent-ingest` の bin シンボリックリンク経由 `main()` 実行 → `packages/handler/test/ingest/cli.test.ts` の `folio-agent-ingest CLI (bin symlink execution)` > `runs main() and writes the output file when invoked via a bin-style symlink`
- 新規: `folio-agent-init` の bin シンボリックリンク経由 `main()` 実行 → `packages/handler/test/init/cli.test.ts` の `folio-agent-init CLI (bin symlink execution)` > `runs main() and starts the wizard when invoked via a bin-style symlink`
- 維持: `folio-agent-sync-zenn` の bin シンボリックリンク経由実行（`docs/guarantees.md` §10）、`folio-agent-ingest` CLI の引数処理・書き出し挙動（同§8、既存テスト継続 pass）、`folio-agent-init` の既存 CLI 保証（同§11、既存テスト継続 pass）、テストからの import 時に `main()` が走らないこと（全既存テストが import 経由で pass）
- `docs/guarantees.md` の§8（ingest CLI）・§11（init CLI）に新保証を1件ずつ追記した

## 静的確認結果
- `npm run typecheck`: エラーなし
- `npm run build` → `npm run test`（CI と同順序）: 18 test files / 134 tests 全て pass。symlink 回帰テストは `dist/` 存在下で `skipIf` されずに実行されることを確認
- 追加した ingest の symlink 回帰テストについて、修正前の判定式（`===` 直接比較）に一時的に戻したビルド成果物で実行し、テストが red になる（`expected '' to contain 'wrote 1 page(s)'`）ことを確認したうえで正しいビルドに戻した → 回帰を実際に検出できることを確認済み
- caller/import整合性: `ingest/cli.ts` は既存の `readFile`/`writeFile`/`fileURLToPath` に加え `node:fs` から `realpathSync` を追加 import。`init/cli.ts` は既存の `node:fs` import 文に `realpathSync` を追加。いずれも `sync/cli.ts` と同一パターンで、他ファイルからの import（`test/ingest/cli.test.ts` の `main`、`test/init/cli.test.ts` の `main`/`planDevVarsAndGitignore`）に影響なし
- git diff --name-only --cached:
  .github/workflows/ci.yml
  docs/guarantees.md
  packages/handler/src/ingest/cli.ts
  packages/handler/src/init/cli.ts
  packages/handler/test/ingest/cli.test.ts
  packages/handler/test/init/cli.test.ts

## 検証手順
Agent側の `npm run typecheck` / `npm run build` / `npm run test` で完結。実行確認（D1 / Gemini 込み）は本 Issue の変更範囲外のため対象外。
