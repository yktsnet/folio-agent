# generate-knowledge

## dist と knowledge/ の取り込み

| 保証 | 対応テスト |
|---|---|
| `distDir` 配下のページを include・exclude の glob で選び、選ばれたページだけを知識にする | `combines included dist pages and knowledge/ markdown, skipping excluded/unmatched pages` |
| `knowledge/` 配下の Markdown を、追加の文脈として知識に加える | `combines included dist pages and knowledge/ markdown, skipping excluded/unmatched pages` |
| 見積もりのトークン数を出し、閾値を超えたら `warnings` に記録する | `warns when estimated tokens exceed the threshold` |

## Zenn 記事の取り込み

| 保証 | 対応テスト |
|---|---|
| `zenn` を設定すれば、公開済みの Zenn 記事を知識に含める | `includes published Zenn articles when zenn config is set` |
| `articlesDir` が無く `zennSnapshotPath` が設定されていれば、スナップショットの記事で代える | `falls back to zennSnapshotPath when articlesDir does not exist` |
| `articlesDir` が無くスナップショットも設定されていなければ、Zenn の取り込みを飛ばして `warnings` に記録する | `warns and skips zenn ingest when articlesDir does not exist and no snapshot is configured` |

## GitHub の README の取り込み

| 保証 | 対応テスト |
|---|---|
| `github` を設定すれば、include の対象のページ（exclude を除いたあと）のリンクから集めたリポの README を知識に含める | `github > collects repos only from included, non-excluded pages and adds their READMEs` |
| 知識に含める README のページは `url: https://github.com/<owner>/<repo>`・`source: "github"`・`title: <owner>/<repo>` を持つ | `github > collects repos only from included, non-excluded pages and adds their READMEs` |
| README の取得に失敗したリポは、`github.snapshotPath` の同じ URL のページで代える | `github > uses the snapshot page for a repo whose README fetch failed` |
| README の取得に失敗し、スナップショットにも無いリポは、飛ばして `warnings` に記録する | `github > skips and warns when the fetch failed and the snapshot has no page for the repo` |
| `snapshotPath` が未設定かファイルが無くても、ビルドを止めずにリポを飛ばして `warnings` に記録する | `github > skips and warns without stopping when snapshotPath is unset or its file does not exist` |
| README の本文も見積もりのトークン数に含める | `github > counts README text in the estimated tokens` |
| `github` を設定していなければ、GitHub へ通信しない | `github > never calls fetch when config.github is not set` |
