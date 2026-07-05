## npm publish 前のスコープ変更とパッケージメタデータ整備
id: 04
branch-slug: npm-publish-prep
github_issue:
status: open
type: cleanup
対象: |
  packages/handler/package.json
  packages/widget/package.json
  packages/handler/README.md (新規)
  packages/widget/README.md (新規)
  README.md（スコープ表記の一括更新 + 「npm 未公開」注記の書き換え）
  context/structure.md（パッケージ名コメント2箇所）
内容: |
  npm 上で folio-agent という org 名が取得済みだったため、公開スコープを
  user 個人の @yktsnet に変更する。@folio-agent/handler → @yktsnet/folio-agent-handler、
  @folio-agent/widget → @yktsnet/folio-agent-widget にリネームした上で、
  npm に公開できる状態にメタデータを整える。
  公開作業（npm publish の実行）は user が行い、本 Issue はリポ側の準備のみを扱う。
確認: |
  npm run typecheck / npm test / npm run build が通ること。
  リポ内に @folio-agent/ の残存参照が無いことを grep で確認する。
  各パッケージで npm publish --dry-run を実行し、同梱物一覧に dist（handler は
  migrations も）と README が含まれ、余計なファイルが無いことを確認する。

---

### スコープ変更（@folio-agent → @yktsnet）

- `packages/handler/package.json` と `packages/widget/package.json` の `name` を変更する。2パッケージは相互依存していないため、依存関係の書き換えは発生しない。
- 参照の一括更新: README.md の4箇所（install コマンド・型の出所・import 例2つ）、context/structure.md のコメント2箇所。
- リポ名・`<folio-agent-widget>` のタグ名・`folio-agent-ingest` の bin 名・CSS カスタムプロパティの `--folio-agent-` プレフィックスは変更しない（npm のスコープ問題とは無関係で、変えると利用側の破壊になるだけ）。

### package.json（両パッケージ共通）

- `version` を `0.1.0` に上げる。
- `repository`（`git+https://github.com/yktsnet/folio-agent.git` + `directory` で各パッケージを指す）、`homepage`、`bugs`、`keywords` を追加する。
- `publishConfig: { "access": "public" }` を追加する（スコープ付きパッケージは既定が private 扱いで publish に失敗するため。@yktsnet スコープでも同様に必要）。

### handler 固有

- `files` が `["dist"]` のみで、ルート README が適用を案内している `migrations/0001_init.sql` が npm 配布物に含まれない。`files` に `migrations` を追加する。

### 各パッケージの README（新規）

- npm のパッケージページには**パッケージディレクトリ直下の README** が表示される（ルート README は出ない）。各パッケージに短い README を新規作成する: 1〜2段落の説明 + 最小の使用例 + 詳細はリポの README への誘導。内容の正はルート README で、重複を最小にする。

### ルート README

- 冒頭の「npm 未公開。公開までは本リポを clone し…」の blockquote を、公開済み前提の記述（npm install で導入できる旨）に書き換える。本 Issue の PR マージ直後に user が publish する運用のため、PR に含めてよい。
