# cli-sync-github

| 保証 | 対応テスト |
|---|---|
| `folio-agent-sync-github` は ingest と同じ集め方・取り方で、README を取得できたリポだけを `KnowledgePage[]` として JSON に書き出す | `writes only repos whose README was fetched, and reports failures on stderr` |
| `folio-agent-sync-github` は README の取得に失敗したリポを標準エラーに出す | `writes only repos whose README was fetched, and reports failures on stderr` |
| `folio-agent-sync-github` は `config.github` が未設定なら例外を投げる | `throws when config.github is not set` |
| `folio-agent-sync-github` は npm が `node_modules/.bin/` に張るシンボリックリンクから実行されても `main()` を実行し、スナップショットを書き出す | `folio-agent-sync-github CLI (bin symlink execution) > runs main() and writes the output file when invoked via a bin-style symlink` |
