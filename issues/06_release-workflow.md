## タグ連動の npm publish ワークフロー（Trusted Publishing）
id: 06
branch-slug: release-workflow
github_issue:
status: open
type: feat
対象: |
  .github/workflows/release.yml (新規)
  README.md（Development にリリース手順の1段落を追記）
  CLAUDE.md（npm publish の担い手の記述を「タグ push で CI が実施」に更新）
内容: |
  現状 npm publish はローカル手動（2FA 入力・古いチェックアウトから
  publish する事故リスクあり）。`v*` タグの push をトリガーに GitHub
  Actions が typecheck / test / build を通した上で両パッケージを
  publish するワークフローを追加する。認証は npm の Trusted
  Publishing（OIDC）を使い、トークンを secrets に置かない。
確認: |
  npm run typecheck / npm test が通ること。ワークフロー YAML は
  actionlint 相当の静的確認（実際のタグ push での動作確認は user が
  実施し、PR の ## 検証手順 に記載）。

---

### 要件

- トリガー: `v*` パターンのタグ push のみ。main への通常 push では動かない。
- ジョブ内容: `npm ci` → `npm run typecheck` → `npm test` → `npm run build` → `npm publish --provenance -w @folio-agent/handler -w @folio-agent/widget`。
- 認証: Trusted Publishing（OIDC）。ワークフローに `permissions: id-token: write` を付与し、`NPM_TOKEN` 等の secret は使わない。npm 側の Trusted Publisher 登録（パッケージ設定で リポ yktsnet/folio-agent + ワークフローファイル名を指定）は user が npmjs.com で実施し、手順を PR の ## 検証手順 に記載する。
- タグとバージョンの不一致（package.json が 0.2.0 なのに v0.3.0 を push 等）はジョブ冒頭で検知して fail させる。
- 2パッケージのバージョンは揃える運用（現状どおり）を前提としてよい。

### リリース手順（README に書く内容の骨子）

1. main で `npm version <x.y.z> -w @folio-agent/handler -w @folio-agent/widget --no-git-tag-version`
2. コミット後、`git tag v<x.y.z>` を push
3. CI が publish（provenance 付き）
