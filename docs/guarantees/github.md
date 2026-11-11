# github

| 保証 | 対応テスト |
|---|---|
| HTML の `<a href>` から、`https://github.com/<owner>/<repo>` の形のリポを重複なく集める | `collects repo links without duplicates, normalizing sub-paths to the repo` |
| `/tree/...` などの下位のパスへのリンクは、リポの単位にまとめる | `collects repo links without duplicates, normalizing sub-paths to the repo` |
| プロフィール（`github.com/<owner>`）・予約されたパス・github.com 以外へのリンクは集めない | `ignores profile links, reserved paths, and non-GitHub links` |
| README を `GET /repos/{owner}/{repo}/readme`（`Accept: application/vnd.github.raw`）で取る | `fetches the raw README and returns it as a github page` |
| 取った README を `source: "github"` のページとして返す | `fetches the raw README and returns it as a github page` |
| 環境変数 `GITHUB_TOKEN` があれば、README の取得に Authorization ヘッダを付ける | `sends an Authorization header when GITHUB_TOKEN is set` |
| README の取得に失敗したら例外を投げる | `throws when the README request fails` |
