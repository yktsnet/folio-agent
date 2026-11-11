# cli-ingest

| 保証 | 対応テスト |
|---|---|
| `folio-agent-ingest <config.json> <output.json>` は config.json を読んで知識を生成し、output.json に JSON で書き出す | `reads config.json, generates knowledge, and writes it to output.json` |
| `folio-agent-ingest` は引数が欠けていれば `process.exitCode = 1` にし、output.json を書かない | `sets process.exitCode to 1 and does not write output.json when arguments are missing` |
| `folio-agent-ingest` は引数が欠けていれば、標準エラーに使い方を出す | `prints the usage to stderr when arguments are missing` |
| `folio-agent-ingest` は npm が `node_modules/.bin/` に張るシンボリックリンクから実行されても `main()` を実行し、知識を書き出す | `folio-agent-ingest CLI (bin symlink execution) > runs main() and writes the output file when invoked via a bin-style symlink` |
