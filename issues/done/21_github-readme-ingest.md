## PR記録: feat: ingest READMEs of GitHub repos linked from site pages
issue: 21 (21_github-readme-ingest.md)
PR: https://github.com/yktsnet/folio-agent/pull/84

## 変更内容
`config.github` を設定したとき、ingest が include の対象ページ（exclude 適用後）の HTML から `https://github.com/<owner>/<repo>` へのリンクを拾い、各リポの README を GitHub REST API（`GET /repos/{owner}/{repo}/readme`、`Accept: application/vnd.github.raw`、`GITHUB_TOKEN` があれば認証）で取得して、`source: "github"`・`title: <owner>/<repo>` のページとして knowledge に入れる。取得に失敗したリポは `github.snapshotPath` の同じ URL のページで補い、無ければ飛ばして warnings に記録する。スナップショットを書き出す CLI `folio-agent-sync-github` を新設した。`config.github` が無ければ通信しない。usage（日英）・README（日英）・structure.md・保証台帳を更新した。

## 保証
- リポを重複なく集め、下位パスを正規化し、プロフィール等を除く → test/ingest/github.test.ts `collects repo links without duplicates, normalizing sub-paths to the repo` / `ignores profile links, reserved paths, and non-GitHub links`、test/ingest/generate.test.ts `collects repos only from included, non-excluded pages and adds their READMEs`
- README を url / source / title / text のページとして含める → github.test.ts `fetches the raw README and returns it as a github page`、generate.test.ts 同上
- 取得失敗時のスナップショットでの補い／スキップと警告 → generate.test.ts `uses the snapshot page for a repo whose README fetch failed` / `skips and warns when the fetch failed and the snapshot has no page for the repo`
- 未設定時は通信しない → generate.test.ts `never calls fetch when config.github is not set`
- GITHUB_TOKEN の付与 → github.test.ts `sends an Authorization header when GITHUB_TOKEN is set`
- README も見積もりトークンに含める → generate.test.ts `counts README text in the estimated tokens`
- sync CLI → test/sync/github-cli.test.ts の全3テスト
- 維持する保証 → 既存テストがすべて通る

## 静的確認結果
- npm run typecheck: 成功
- npm run test: 25 ファイル・218 テスト成功（build 後のため bin シンボリックリンクの試験も実行）
- git diff --name-only --cached: README.en.md README.md context/structure.md docs/guarantees.md docs/usage.en.md docs/usage.md packages/handler/package.json packages/handler/src/ingest/generate.ts packages/handler/src/ingest/github.ts packages/handler/src/ingest/types.ts packages/handler/src/sync/github-cli.ts packages/handler/test/ingest/generate.test.ts packages/handler/test/ingest/github.test.ts packages/handler/test/sync/github-cli.test.ts（Issue の対象と一致）

## 検証手順
1. portfolio-astro で config に `"github": {}` を足してビルドし、knowledge.json にリンク先のリポの README（`source: "github"`）が入ることを確かめる
2. dev ハーネスか本番で、リポについて尋ね、README の内容とリポへのリンクで答えることを確かめる

3. `npm run eval` は未実行（この環境に `.dev.vars` の Gemini キーが無い）。マージ前に `--knowledge` に 1 の knowledge.json を渡し、リポについての質問で実行する

## 補足
- `github.snapshotPath` のファイルが無いとき（sync を流す前の初回のビルド）は空のスナップショットとして扱い、各リポを warnings に記録して続ける（テスト `skips and warns without stopping when snapshotPath is unset or its file does not exist`）
- リポのリンクは `https://github.com/` に加え、`http://` と `www.github.com` も拾って `https://github.com/<owner>/<repo>` に正規化する（user 了承済み）

## 確認者の判定
| # | 項目（要約） | 判定 |
|---|---|---|
| 1 | include 対象ページのリンクからリポを集め、重複を除き、下位パスをまとめる | 合 |
| 2 | exclude・include 外のページのリンクは集めない | 合 |
| 3 | プロフィールや github.com 以外へのリンクは集めない | 合 |
| 4 | README が url / source / title / text で入る | 合 |
| 5 | 取得失敗時、スナップショットに同じ URL があれば使う | 合 |
| 6 | 取得失敗かつスナップショットに無ければ飛ばして warnings に記録 | 合 |
| 7 | `config.github` 未設定なら fetch を呼ばない | 合 |
| 8 | `GITHUB_TOKEN` があれば Authorization を付ける | 合 |
| 9 | sync CLI（成功分のみ書き出し・未設定で例外・bin 経由で動く） | 合 |
| - | 型・全テスト（218 件） | 合 |
| - | 保証・維持する保証・台帳 | 合 |

## 手戻り

| 何が起きたか | 失ったもの | 原因の分類 | 仕組みで防げたか |
|---|---|---|---|
| 確認者の「否」：`snapshotPath` のファイルが無いと ENOENT でビルドが止まり、「ビルドは止まらない」の保証に反した。既存の Zenn の読み方をそのまま写していた | 1回。約5分 | 実装者の不注意 | 防げない |

---

## ingest: サイトからリンクした GitHub リポの README を知識に取り込む
id: 21
branch-slug: github-readme-ingest
status: close
type: feat
対象: packages/handler/src/ingest/github.ts (新規), packages/handler/src/ingest/generate.ts, packages/handler/src/ingest/types.ts, packages/handler/src/sync/github-cli.ts (新規), packages/handler/package.json, packages/handler/test/ingest/github.test.ts (新規), packages/handler/test/ingest/generate.test.ts, packages/handler/test/sync/github-cli.test.ts (新規), docs/guarantees.md, docs/usage.md, docs/usage.en.md, context/structure.md, README.md, README.en.md
目的: 訪問者がサイトに載ったリポについて尋ねたとき、エージェントがサイト本文の1〜2行の説明しか持たず答えられない状態を変える。include の対象ページからリンクしたリポの README を知識に入れ、README の中身で答え、リポへのリンクを添えられるようにする。リポをサイトに足すだけで知識が追従し、別の設定を足さなくて済むようにする。
内容: `config.github` を設定したとき、ingest が include の対象ページの HTML から `https://github.com/<owner>/<repo>` へのリンクを拾い、ビルド時に各リポの README を取得して、外部ページ（URL とタイトル付き）として knowledge に入れる。取得に失敗したリポはスナップショットの同じリポで補う。スナップショットを書き出す CLI `folio-agent-sync-github` を新設する。
対象外: Zenn の取り込みの変更。README 以外のファイル（docs/・ソース）の取り込み。言語別 README（`README.en.md` など）の選び分け。private リポの取得。`folio-agent-init` への引数の追加。
仮定: README は GitHub REST API の `GET /repos/{owner}/{repo}/readme`（`Accept: application/vnd.github.raw`）で取る。リポの既定の README を返し、ファイル名の揺れを API が吸収するため。認証は任意で、環境変数 `GITHUB_TOKEN` があれば付ける（未認証でも 60 回/時で、ビルド1回には足りる）。opt-in にする（`config.github` が無ければ従来どおりネットワークに出ない）。Zenn は通信しない設計であり、既存の利用者のビルドに通信を持ち込まないため。ページのタイトルは `<owner>/<repo>` とする。
確認: npm run typecheck / npm run test。下の「確認の項目」をテストで確かめる。
人が見るもの: portfolio-astro で `config.github` を有効にしてビルドし、knowledge.json にリンク先のリポの README が入ること。dev ハーネスか本番で、リポについての質問に README の内容とリポへのリンクで答えること。

---

### 保証
- 新たに宣言する保証:
  - `config.github` 設定時、include の対象ページ（exclude 適用後）の HTML にある `https://github.com/<owner>/<repo>` 形式のリンクから、リポを重複なく集める。`/tree/...` などの下位パスはリポ単位に正規化し、`github.com/<owner>` のようなプロフィールへのリンクは集めない
  - 集めた各リポについて README を取得し、`url: https://github.com/<owner>/<repo>`、`source: "github"`、`title: <owner>/<repo>`、`text: README の本文` のページとして knowledge に含める
  - README の取得に失敗したリポは、`config.github.snapshotPath` のスナップショットに同じ URL のページがあればそれを使い、無ければそのリポを飛ばして warnings に記録する。どちらの場合もビルドは止まらない
  - `config.github` 未設定時は GitHub へ通信せず、出力は従来と変わらない
  - `folio-agent-sync-github <config.json> <output.json>` は ingest と同じ集め方・取り方で GitHub のページを `KnowledgePage[]` の JSON に書き出す。取得に失敗したリポは書き出さずに標準エラーへ出す。`config.github` 未設定時は例外を投げる。bin のシンボリックリンク経由でも main() が動く
- 維持する保証（`docs/guarantees.md` §6・§8・§10 から）:
  - distDir 配下を include/exclude glob でフィルタし、含まれるページのみ知識化する
  - knowledge/ 配下の Markdown を追加コンテキストとして結合する
  - 見積もりトークン数を算出し、閾値超過時に warnings へ記録する（README も見積もりに含まれる）
  - Zenn 記事の取り込みとスナップショットへのフォールバック、スナップショット未設定時のスキップと警告
  - folio-agent-ingest / folio-agent-sync-zenn の CLI の振る舞い

### 確認の項目
1. include 対象ページのリンクからリポを集め、重複を除き、下位パスをリポ単位にまとめる
2. exclude したページ・include 外のページのリンクは集めない
3. プロフィール（`github.com/<owner>`）や github.com 以外へのリンクは集めない
4. 取得した README が上記の url / source / title / text で knowledge に入る
5. 取得に失敗し、スナップショットに同じ URL があるときはスナップショットのページを使う
6. 取得に失敗し、スナップショットにも無いときは飛ばして warnings に記録する
7. `config.github` 未設定時は fetch を一度も呼ばない
8. `GITHUB_TOKEN` があれば Authorization ヘッダを付ける
9. sync CLI が成功したリポだけを JSON に書き出し、未設定時に例外を投げ、bin シンボリックリンク経由で動く

テストは fetch を差し替えて（`vi.stubGlobal` か引数で注入）行い、実ネットワークに出ない。

### packages/handler/src/ingest/github.ts (新規)
- HTML（文字列）から GitHub のリポを集める関数と、リポの README を取って `KnowledgePage` にする関数を置く。`generate.ts` と `sync/github-cli.ts` の両方がこれを使う
- リンクは `<a href>` から拾う。`htmlToText` は href を落とすので、`node-html-parser` で別に読む
- `github.com` の予約パス（`features`・`sponsors`・`orgs` など）はリポと見なさない。網羅は求めない。取りこぼしは 404 になって warnings に出るので害は小さい

### packages/handler/src/ingest/types.ts
- `KnowledgeSource` に `"github"` を足す
- `IngestConfig` に `github?: GithubIngestConfig` を足す。`GithubIngestConfig` は `snapshotPath?: string` を持つ（JSDoc: `folio-agent-sync-github` が書き出したスナップショット。取得に失敗したリポの代わりに使う）

### packages/handler/src/ingest/generate.ts
- dist のページを読むループで、対象ページの HTML からリポを集める（ファイルを二度読まない）
- Zenn の後に GitHub のページを足す。並びは既存どおり最後の url ソートに任せる

### packages/handler/src/sync/github-cli.ts (新規) / package.json
- `sync/cli.ts`（Zenn）と同じ流儀で、引数2つ・usage・bin ガードをそろえる
- `bin` に `"folio-agent-sync-github": "dist/sync/github-cli.js"` を足す
- dist を読むので、サイトのビルド後に実行する前提を usage とドキュメントに書く

### docs/guarantees.md
- §6 に GitHub の取り込みの保証と対応テストを足す。`ingest/github.ts` のテストと sync CLI のテストの節を新設する

### docs/usage.md / docs/usage.en.md / README.md / README.en.md / context/structure.md
- usage に `github` の設定例・取得の仕組み（API・`GITHUB_TOKEN`）・スナップショットの作り方を足す。「Zenn は通信しない」の記述とは別に、GitHub は opt-in で通信すると明記する
- README の「ビルド時」の1行に GitHub の README を足す
- structure.md の ingest/ と sync/ のツリーに新規ファイルを足す
