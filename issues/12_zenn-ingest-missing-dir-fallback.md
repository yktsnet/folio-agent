## zenn ingest: articlesDir 不在時に例外で落ちる問題を修正
id: 12
branch-slug: zenn-ingest-missing-dir-fallback
github_issue:
status: close
type: fix
対象: packages/handler/src/ingest/zenn.ts, packages/handler/src/ingest/generate.ts, packages/handler/test/ingest/zenn.test.ts, packages/handler/test/ingest/generate.test.ts
内容: `config.zenn` を設定した利用者サイトを CI（GitHub Actions 等）でビルドすると、zenn 記事ディレクトリ（多くの場合 private リポ由来でランナー上に存在しない）が無いだけで `folio-agent-ingest` 全体が ENOENT 例外で失敗する。articlesDir 不在時は warning を出して zenn ページを 0 件扱いにし、ビルドを継続できるようにする。
確認: npm run typecheck / npm run test

---

**close理由**: Issue #14（`folio-agent-sync-zenn`スナップショット機構）の3段階フォールバック（articlesDirライブスキャン → スナップショット → 警告してスキップ）の第3分岐がこのIssueの要件をそのまま含む。別々に実装すると`generate.ts`の同じ箇所を二重に触ることになるため、本Issueは実装せずクローズし、#14に統合する。

### 現状の問題

`scanZennArticles`（`packages/handler/src/ingest/zenn.ts:16`）は `readdir(config.articlesDir, ...)` を try/catch なしで呼んでおり、ディレクトリが存在しない場合はそのまま例外を投げて `generateKnowledge`（`packages/handler/src/ingest/generate.ts:27`）ごと落ちる。

`config.zenn` を設定している利用者は、articlesDir が実在するローカル環境ではビルドできるが、CI 環境（articlesDir が private リポなど別リポジトリ由来でチェックアウトされていない）ではビルドが必ず失敗する。npm 公開済みの 0.3.0 / 0.3.1 いずれも未対応であることを確認済み。

### 修正方針

- articlesDir が存在しない場合、`scanZennArticles` は例外を投げず空配列を返す（またはそれと等価な形で `generateKnowledge` 側が吸収する）。
  - ENOENT（ディレクトリが存在しない）以外のエラー（権限エラー等）は握りつぶさず、そのまま投げる。`readdir` が投げるエラーの `code` プロパティで判別する。
- `generateKnowledge`（`packages/handler/src/ingest/generate.ts:27`）の `if (config.zenn)` ブロックで articlesDir 不在を検知したら、既存の `warnings: string[]`（`generate.ts` 内、token 閾値超過と同じ配列）に `articlesDir not found: <path> — skipping zenn ingest` 相当のメッセージを追加する。
  - 実装の都合で `scanZennArticles` の返り値型を変える場合（例: `{ pages, warning? }` にする等）は `packages/handler/src/ingest/types.ts` の `KnowledgePage` / 関連型との整合性を保つこと。関数シグネチャを変えない形（内部で ENOENT を握って `[]` を返すだけ）でも要件は満たせるので、既存呼び出し側 `generate.ts:27` の変更が最小になる方を優先してよい。
- `config.zenn` が未設定（zenn 機能自体を使っていない）の既存の扱い（zenn ページを含めない）と、今回追加する「設定はあるがディレクトリが無い」ケースを区別できるようにする。後者は warning を出す。前者は現状通り無言でスキップ。

### テスト

- `packages/handler/test/ingest/zenn.test.ts`: 存在しない articlesDir を渡した場合に例外を投げず空配列を返すケースを追加。
- `packages/handler/test/ingest/generate.test.ts`（無ければ既存のgenerate系テストファイルを確認）: `config.zenn.articlesDir` が存在しないとき `generateKnowledge` が例外を投げず、`warnings` に articlesDir 不在を示すメッセージが含まれることを確認するケースを追加。
