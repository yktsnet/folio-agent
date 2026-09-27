[🇯🇵 日本語](release.md) | [🇬🇧 English](release.en.md)

# Release

npm publish is run by GitHub Actions (`.github/workflows/release.yml`) when a `v*` tag is pushed. Authentication uses npm Trusted Publishing (OIDC); no token is stored in secrets.

In Claude Code, the `/release` skill (`.claude/skills/release/`) walks through these steps.

1. On a branch, run `npm version <x.y.z> -w @folio-agent/handler -w @folio-agent/widget --no-git-tag-version` to align both packages' versions, commit, and open a PR (do not push to main directly).
2. After the PR is merged, push `git tag v<x.y.z>` from main.
3. CI runs typecheck / test / build and then `npm publish --provenance` (the job fails early if the tag and the package.json versions differ).

The first time only, register a Trusted Publisher in npmjs.com's package settings (for both `@folio-agent/handler` and `@folio-agent/widget`): GitHub Actions, repository `yktsnet/folio-agent`, workflow file `release.yml` (leave Environment empty). Without it, publish fails with `ENEEDAUTH`.
