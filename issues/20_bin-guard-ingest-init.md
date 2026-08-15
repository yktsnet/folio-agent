## ingest / init CLI の bin 判定を修正し、回帰テストを CI で実際に走らせる
id: 20
branch-slug: bin-guard-ingest-init
github_issue:
status: open
type: fix
対象: `packages/handler/src/ingest/cli.ts` / `packages/handler/src/init/cli.ts` / `packages/handler/test/ingest/cli.test.ts` / `packages/handler/test/init/cli.test.ts` / `.github/workflows/ci.yml` / `docs/guarantees.md`
内容: Issue 19 で `sync/cli.ts` に施した bin シンボリックリンク対応が `ingest/cli.ts` と `init/cli.ts` に未適用で、両者は壊れた判定式のまま残っている。この判定は v0.4.0 の**後**に入ったため未リリースであり、次の publish で `folio-agent-ingest` / `folio-agent-init` が bin 経由で無言終了するようになる。判定式を揃え、symlink 回帰テストを両 CLI に追加する。あわせて CI が `npm test` を `npm run build` より前に実行しているため symlink 回帰テストが常にスキップされている問題を解消する。
確認: `npm run typecheck` / `npm run test`（`npm run build` 後に実行し、symlink 回帰テストがスキップされず通ることを確認する）

---

### 保証
- 新たに宣言する保証:
  - `folio-agent-ingest` は npm が `node_modules/.bin/` に張るシンボリックリンク経由で実行された場合も `main()` を実行し、`knowledge.json` を書き出す。
  - `folio-agent-init` は同様にシンボリックリンク経由で実行された場合も `main()` を実行する。
- 維持する保証:
  - `folio-agent-sync-zenn` の bin シンボリックリンク経由実行（`docs/guarantees.md` §10、Issue 19 で追加）
  - `folio-agent-ingest` CLI の引数処理・書き出し挙動（同 §8）
  - `folio-agent-init` の既存 CLI 保証（該当セクション）
  - テストからの import 時に `main()` が走らないこと（判定ガードの本来の目的）

`docs/guarantees.md` の ingest CLI・init CLI の各セクションに新保証を1件ずつ追記する。

---

## 背景

Issue 19 の実装者の報告どおり、`process.argv[1] === fileURLToPath(import.meta.url)` は bin シンボリックリンク経由の実行を検出できない。symlink 経由では `process.argv[1]` がリンクパスのまま残る一方、`import.meta.url` は Node が解決した実体パスになるため、常に不一致になる（実機で再現確認済み）。

**Issue 19 で「ingest は動いているので、そちらに揃える」と書いたのは誤りだった。** 公開済み v0.4.0 の `dist/ingest/cli.js` にはガードが存在せず `main()` を無条件で呼んでいたため動いていただけで、現行 src のガードは v0.4.0 タグの後（PR #29）に入った未リリースのコードである。

したがってこれは任意の追随作業ではなく**リリースブロッカー**である。この状態で次のバージョンを publish すると、利用者のビルドで `folio-agent-ingest` が無言終了し、`knowledge.json` が生成されないまま処理が進む。利用者側では `/api/chat` が `knowledge_unavailable` で 500 を返す状態が配信される。`folio-agent-init` はウィザードが何もせずに終了する。

## `packages/handler/src/ingest/cli.ts` / `packages/handler/src/init/cli.ts`

判定を `sync/cli.ts`（Issue 19 で修正済み）と同じ形に揃える。

```ts
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
```

`realpathSync` は `node:fs` から import する。`sync/cli.ts` のガード上部にある説明コメント（なぜ realpath 比較が必要か）と同趣旨のコメントを重複して3ファイルに書く必要は無い。共通のヘルパー関数として切り出して3ファイルから呼ぶ形にしてよい（切り出す場合は配置場所を実装者が判断し、公開 API として export しないこと）。

## `packages/handler/test/ingest/cli.test.ts` / `packages/handler/test/init/cli.test.ts`

`packages/handler/test/sync/cli.test.ts` の `folio-agent-sync-zenn CLI (bin symlink execution)` ブロックと同じ方式で、両 CLI に symlink 回帰テストを追加する。

- 一時ディレクトリにビルド済み `dist/{ingest,init}/cli.js` へのシンボリックリンクを張り、`execFileSync("node", [binPath, ...])` で起動する
- `main()` が走ったことを観測可能な形で確認する（ingest は出力 JSON の書き出し、init は引数不足時の usage 出力など、実装者が最小の手段を選んでよい。init は対話ウィザードなので標準入力を必要としない経路を使うこと）
- 既存テストはすべて維持する

## `.github/workflows/ci.yml`

現状 `npm test` → `npm run build` の順で、テスト実行時点で `dist/` が存在しない。そのため sync の symlink 回帰テストは `describe.skipIf(!existsSync(distCliPath))` により CI で常にスキップされており、`docs/guarantees.md` §10 に載っている保証が実際には CI で検証されていない。

`npm run build` を `npm test` の前に移動し、symlink 回帰テストが CI で実行されるようにする。`skipIf` 自体はローカルでビルド前にテストを回す場合のために残してよい。

## 実装順序

`ci.yml` の順序変更 → `ingest/cli.ts` / `init/cli.ts` の判定修正 → 回帰テスト追加 → `docs/guarantees.md` 更新、の順で進める。CI の順序を先に直すことで、追加したテストが実際に走ることを PR 上で確認できる。
