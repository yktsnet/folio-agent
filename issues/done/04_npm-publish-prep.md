## PR記録: cleanup: npm publish 前のパッケージメタデータ整備
issue: 04 (04_npm-publish-prep.md)
PR: https://github.com/yktsnet/folio-agent/pull/7
Merged: 955b71034d625d7bc827817bf44aaa2cfdd33d77

## 変更内容
@folio-agent/handler と @folio-agent/widget を npm に公開できる状態に整えた（npm の folio-agent org は user がオーナーであることを確認済み、スコープ変更は不要）。公開作業（npm publish の実行）は user が行う前提で、本PRはリポ側の準備のみを扱う。

- 両パッケージ `package.json`: `version` を `0.1.0` に、`repository`（`directory` で各パッケージを指す）/ `homepage` / `bugs` / `keywords` / `publishConfig: { access: "public" }` を追加。
- handler `package.json`: `files` に `migrations` を追加（`migrations/0001_init.sql` が npm 配布物に含まれるように）。
- `packages/handler/README.md`, `packages/widget/README.md` を新規作成（npmパッケージページに表示される、パッケージ直下README）。1〜2段落の説明 + 最小の使用例 + リポジトリREADMEへの誘導。
- ルート `README.md`: 冒頭の「npm 未公開」blockquoteを、公開済み前提（`npm install` で導入できる旨）に書き換え。

## 静的確認結果
- `npm run typecheck` 通過
- `npm test` 通過（13 test files / 55 tests）
- `npm run build` 通過
- `npm pack --dry-run` を両パッケージで実行し、同梱物を確認:
  - handler: `dist/**`, `migrations/0001_init.sql`, `README.md`, `package.json` のみ（余計なファイルなし）
  - widget: `dist/**`, `README.md`, `package.json` のみ（余計なファイルなし）

```
$ git diff --name-only HEAD~1
README.md
packages/handler/README.md
packages/handler/package.json
packages/widget/README.md
packages/widget/package.json
```

## 検証手順
実際の `npm publish`（dry-runではなく本番）は user が実施。本PRのマージ後、以下を user 側で行う想定:

```bash
cd packages/handler && npm publish
cd packages/widget && npm publish
```
