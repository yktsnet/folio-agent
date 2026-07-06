# Release

npm publish は `v*` タグの push をトリガーに GitHub Actions（`.github/workflows/release.yml`）が実施する。認証は npm の Trusted Publishing（OIDC）で、secrets にトークンは置かない。

1. main で `npm version <x.y.z> -w @folio-agent/handler -w @folio-agent/widget --no-git-tag-version` を実行し、2パッケージのバージョンを揃えてコミットする。
2. `git tag v<x.y.z>` を push する。
3. CI が typecheck / test / build を通した上で `npm publish --provenance` を実行する（タグと package.json のバージョンが不一致だとジョブ冒頭で fail する）。

初回のみ、npmjs.com のパッケージ設定（`@folio-agent/handler` / `@folio-agent/widget` それぞれ）で Trusted Publisher に GitHub Actions・リポジトリ `yktsnet/folio-agent`・ワークフローファイル `release.yml` を登録しておく（Environment は空欄のまま）。登録がないと publish が `ENEEDAUTH` で落ちる。
