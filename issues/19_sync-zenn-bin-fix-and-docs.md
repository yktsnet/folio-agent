## folio-agent-sync-zenn が bin 経由で無言終了する不具合の修正とスナップショット機能の文書化
id: 19
branch-slug: sync-zenn-bin-fix-and-docs
github_issue:
status: open
type: fix
対象: `packages/handler/src/sync/cli.ts` / `packages/handler/test/sync/cli.test.ts` / `docs/guarantees.md` / `docs/usage.md` / `README.md` / `README.en.md`
内容: `folio-agent-sync-zenn` を npm が張る `node_modules/.bin/` 経由で実行すると、直接実行判定が一致せず `main()` が走らないまま exit code 0 で終了する。`ingest/cli.ts` と同じ判定式に揃えて修正する。あわせて 0.4.0 で追加された `zennSnapshotPath` フォールバックと `folio-agent-sync-zenn` が利用者向けドキュメントに一切記載されていないため、`docs/usage.md` と README 2本に追記する。
確認: `npm run typecheck` / `npm run test`

---

### 保証
- 新たに宣言する保証:
  - `folio-agent-sync-zenn` は npm が `node_modules/.bin/` に張るシンボリックリンク経由で実行された場合も `main()` を実行し、スナップショットを書き出す。
- 維持する保証（`docs/guarantees.md` §10）:
  - `syncZennSnapshot` は `config.zenn` から公開済み Zenn 記事のみを `KnowledgePage[]` として JSON 出力する
  - `syncZennSnapshot` は `config.zenn` 未設定時に例外を投げる
- 維持する保証（同 §6・§8）:
  - `generateKnowledge` は `articlesDir` 不在かつ `zennSnapshotPath` 設定時にスナップショットへフォールバックする
  - `folio-agent-ingest` の CLI 挙動（引数処理・書き出し）は変更しない

`docs/guarantees.md` §10 に新保証1件を追記する（対応テストは下記の通り本Issueで追加する）。

---

## 背景

利用者リポ（`yktsnet/portfolio-astro`）で `folio-agent-sync-zenn` を bin 名で叩いたところ、エラーも出力も無く exit code 0 で終わり、スナップショットが生成されなかった。利用者側は `node node_modules/@folio-agent/handler/dist/sync/cli.js ...` を直接呼ぶ形で回避しているが、README に bin 名を載せる以上こちらを直すのが筋である。

失敗が**無言**である点が特に悪い。`generateKnowledge` は `articlesDir` 不在時にスナップショットへ黙ってフォールバックする設計のため、sync が実行されていなくてもビルドは成功し、古い知識のまま配信され続ける。利用者はどこにも異常を観測できない。

## `packages/handler/src/sync/cli.ts`

直接実行判定を `ingest/cli.ts` と同じ形に揃える。

```ts
// 現状
if (import.meta.url === `file://${process.argv[1]}`) {

// 修正後（ingest/cli.ts と同一。fileURLToPath を node:url から import する）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
```

`ingest/cli.ts` はこの形で bin 経由の実行が実際に動作している（利用者リポの CI で `folio-agent-ingest` が正常動作していることを確認済み）。両ファイルで判定式が違う理由は無いので、動いているほうに寄せる。

## `packages/handler/test/sync/cli.test.ts`

bin 経由実行の回帰テストを追加する。単に関数を import して呼ぶだけでは今回の不具合を検出できない（不具合は「モジュールが実行された時に main が走るか」であり、テストからの import 時は走ってはいけない）ため、子プロセスで実行して観測する。

要件:

- 一時ディレクトリに config と articles を用意し、ビルド済み `dist/sync/cli.js` へのシンボリックリンクを別ディレクトリに張る
- そのシンボリックリンクのパスを `node` に渡して起動し、出力 JSON が書き出されること・exit code が 0 であることを確認する
- テスト実行時に `dist/` が存在しない場合の扱い（ビルド前提にするか、テスト内でスキップするか）は実装者が判断してよい。ビルド前提にする場合は CI のテストステップより前に build が走っているかを確認すること

既存の2テスト（公開済み記事のみ出力 / `config.zenn` 未設定時の例外）はそのまま維持する。

## `docs/usage.md`

§1 Knowledge Generation の `zenn` ブロックの説明に続けて、スナップショット機構を追記する。

- `articlesDir` に到達できない環境（CI が private リポの記事を読めない等）向けに、`zenn` の兄弟キーとして `zennSnapshotPath` を指定でき、`articlesDir` 不在時はそのスナップショットから取り込むこと
- スナップショットは `npx folio-agent-sync-zenn <config.json> <output.json>` で生成し、リポにコミットして使うこと
- **フォールバック時に警告は出ない**こと。`articlesDir` も `zennSnapshotPath` も無い場合のみ warning が出る。したがってスナップショットが古いまま放置されると、ビルドは成功し続けたまま知識だけが古くなる。CI 等で定期的に sync を回すか、古さを検知する手段を利用者側で持つこと

3点目は今回の実害そのものなので、注意書きとして明示的に書く（省略しない）。

## `README.md` / `README.en.md`

CLI 一覧・Zenn 連携に触れている箇所（`README.md` L27 / L49 / L79 / L97 相当）に `folio-agent-sync-zenn` を追加する。README は概要に留め、詳細は `docs/usage.md` へ誘導する。英語版は日本語版と同じ情報量に揃える。

## 実装順序

`sync/cli.ts` の修正 → 回帰テスト追加 → `docs/guarantees.md` §10 更新 → ドキュメント追記、の順で進める。
