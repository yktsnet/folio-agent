[🇯🇵 日本語](release.md) | [🇬🇧 English](release.en.md)

# Release

npm publish は `v*` タグの push をトリガーに GitHub Actions（`.github/workflows/release.yml`）が実施する。認証は npm の Trusted Publishing（OIDC）で、secrets にトークンは置かない。

Claude Code では `/release` skill（`.claude/skills/release/`）がこの手順を順に進める。

1. ブランチで `npm version <x.y.z> -w @folio-agent/handler -w @folio-agent/widget --no-git-tag-version` を実行し、2パッケージのバージョンを揃えてコミットし、PR を出す（main へは直接 push しない）。
2. PR をマージしてから、main で `git tag v<x.y.z>` を push する。
3. CI が typecheck / test / build を通した上で `npm publish --provenance` を実行する（タグと package.json のバージョンが不一致だとジョブ冒頭で fail する）。

初回のみ、npmjs.com のパッケージ設定（`@folio-agent/handler` / `@folio-agent/widget` それぞれ）で Trusted Publisher に GitHub Actions・リポジトリ `yktsnet/folio-agent`・ワークフローファイル `release.yml` を登録しておく（Environment は空欄のまま）。登録がないと publish が `ENEEDAUTH` で落ちる。
