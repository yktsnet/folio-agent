# cli-sync-zenn

| 保証 | 対応テスト |
|---|---|
| `folio-agent-sync-zenn` は `config.zenn` から公開済みの Zenn 記事だけを `KnowledgePage[]` として JSON に書き出す | `writes only published articles to the output JSON as KnowledgePage[]` |
| `folio-agent-sync-zenn` は `config.zenn` が未設定なら例外を投げる | `throws when config.zenn is not set` |
| `folio-agent-sync-zenn` は npm が `node_modules/.bin/` に張るシンボリックリンクから実行されても `main()` を実行し、スナップショットを書き出す | `folio-agent-sync-zenn CLI (bin symlink execution) > runs main() and writes the output file when invoked via a bin-style symlink` |
