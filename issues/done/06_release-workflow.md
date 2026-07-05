## PR記録: feat: タグ連動のnpm publishワークフロー（Trusted Publishing）
issue: 06 (06_release-workflow.md)
PR: https://github.com/yktsnet/folio-agent/pull/13
Merged: 478bd821baf658f31ca28502755a8913aa82ff29

## 変更内容

現状 npm publish はローカル手動（2FA 入力・古いチェックアウトから publish する事故リスクあり）。`v*` タグの push をトリガーに GitHub Actions が typecheck / test / build を通した上で両パッケージを publish するワークフローを追加した。認証は npm の Trusted Publishing（OIDC）を使い、トークンを secrets に置かない。

- `.github/workflows/release.yml`（新規）
  - トリガー: `v*` タグの push のみ（main への通常 push では動かない）
  - `permissions: id-token: write` を付与し、`NPM_TOKEN` 等の secret は使わない
  - ジョブ冒頭でタグと `packages/handler`・`packages/widget` の `package.json` バージョンの一致を検証し、不一致なら fail させる
  - `npm ci` → `npm run typecheck` → `npm test` → `npm run build` → `npm publish --provenance -w @folio-agent/handler -w @folio-agent/widget`
- `README.md`: Development に「リリース手順」の節を追記（`npm version` → タグ push → CI publish の3手順、および npmjs.com での Trusted Publisher 初回登録の案内）
- `CLAUDE.md`: npm publish の担い手の記述を「タグ push を契機に CI が実施」に更新

## 静的確認結果

- `npm run typecheck`: 成功（エラーなし）
- `npm test`: 63 tests passed（13 files）。既存の `graph.test.ts` の stderr ログは意図的なエラーケースの出力で失敗ではない
- ワークフロー YAML: `ruby -ryaml` でパース可能なことを確認済み（actionlint は環境に未導入のため代替確認）

```
$ git diff --name-only HEAD~1
.github/workflows/release.yml
CLAUDE.md
README.md
```

## 検証手順

Agent 側では実タグ push・実 publish の動作確認はできないため、以下は user が実施する。

1. npmjs.com で `@folio-agent/handler` と `@folio-agent/widget` それぞれのパッケージ設定を開き、Trusted Publisher に GitHub Actions・リポジトリ `yktsnet/folio-agent`・ワークフローファイル `release.yml` を登録する（初回のみ）。
2. このPRをmainにマージ後、`npm version <x.y.z> -w @folio-agent/handler -w @folio-agent/widget --no-git-tag-version` でバージョンを揃えてコミット・push する。
3. `git tag v<x.y.z>` を push し、GitHub Actions の `Release` ワークフローが起動して typecheck / test / build / publish（provenance 付き）まで成功することを確認する。
4. npmjs.com 上で両パッケージの新バージョンが公開され、provenance（Attestations）が付いていることを確認する。
5. わざと `package.json` と異なるバージョンのタグを push し、ジョブ冒頭の検証で fail することも確認できると安心（任意）。
