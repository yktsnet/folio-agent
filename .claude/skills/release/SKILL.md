---
name: release
description: folio-agent を npm へリリースする。前回タグからの変更でバージョンを決め、2パッケージのバージョンを上げる PR を出し、マージ後のタグ push を案内し、Release ワークフローと npm 公開を確認する。
disable-model-invocation: true
---

# release

npm publish は `v*` タグの push を契機に `.github/workflows/release.yml` が行う（`docs/release.md`）。
main への直 push は `.claude/settings.json` が拒否するので、バージョン上げは PR を経由する。
**マージとタグ push は user が行う。** Claude は PR を出すところと、公開の確認を受け持つ。

## 1. 変更を見てバージョンを決める

```bash
git fetch --tags -q
LAST=$(git describe --tags --abbrev=0 origin/main)
git log "$LAST"..origin/main --oneline --no-merges
```

- Dependabot の依存更新だけならリリースしない。user にそう伝えて止まる
- 0.x の間は、公開面（属性・トークン・`src/index.ts` の export・CLI 引数・config）が変わる、または見た目や挙動が大きく変わるなら minor、修正だけなら patch
- 利用側の書き換えが要る変更は、ここで一覧にしておく（PR 本文と 4 の案内に使う）

提案するバージョンと理由を示し、user の確認を得てから次へ進む。

## 2. バージョンを上げて PR を出す

```bash
git switch -c claude/release-v<x.y.z> origin/main
npm version <x.y.z> -w @folio-agent/handler -w @folio-agent/widget --no-git-tag-version
npm run typecheck && npm run build && npm run test
git add packages/handler/package.json packages/widget/package.json package-lock.json
```

コミットの件名は `chore(release): v<x.y.z>`。本文に次を書き、そのまま PR 本文にする。

- `## 変更内容`: 前回タグからの利用者に見える変更（依存更新は1行にまとめる）
- `## 利用側で必要な対応`: 属性・トークン・設定の書き換え。無ければ「なし」
- `## 検証手順`: マージ後に user が打つタグ push のコマンド（3 と同じもの）

push して `gh pr create` し、PR の URL を伝えて止まる。

## 3. マージ後: タグ push を案内する

user がマージしたら、次のコマンドを提示する。Claude は実行しない。

```bash
git switch main && git pull --ff-only
git tag v<x.y.z> && git push origin v<x.y.z>
```

## 4. 公開を確認する

```bash
gh run list --workflow release.yml --limit 1
gh run watch <run-id> --exit-status
npm view @folio-agent/handler version
npm view @folio-agent/widget version
```

両方が `<x.y.z>` になったら完了。1 で挙げた「利用側で必要な対応」を添えて、利用サイトの更新へ進めることを伝える。

## 失敗したとき

- `tag v… does not match package versions`: バージョン上げの PR がマージされる前にタグを打っている。
  user にタグの削除（`git push origin :refs/tags/v<x.y.z>` と `git tag -d v<x.y.z>`）を依頼し、マージ後に打ち直してもらう
- `ENEEDAUTH`: npmjs.com の Trusted Publisher 登録が無い（`docs/release.md` の初回手順）
- typecheck / test で落ちた: main 自体が壊れている。リリースを止め、修正の PR を先に出す
- 片方のパッケージだけ公開された: 同じバージョンは再公開できない。patch を上げて出し直す
