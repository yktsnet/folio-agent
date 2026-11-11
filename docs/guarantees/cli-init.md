# cli-init

## 初回のセットアップ

| 保証 | 対応テスト |
|---|---|
| `folio-agent-init` は対話せず、引数と環境変数だけで動く | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| `folio-agent-init` は初回は既定値で config json を書く | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| `folio-agent-init` は初回は API ルートの雛形を書く | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| `folio-agent-init` は `GEMINI_API_KEY` があれば `.dev.vars` に書く | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| `folio-agent-init` は `.gitignore` に `.dev.vars` を書く | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| `folio-agent-init` は既定の `auto` ではテーマ CSS を書かない | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |

## 再実行と設定の変更

| 保証 | 対応テスト |
|---|---|
| `folio-agent-init` は `--theme` のプリセットでテーマ CSS を書く | `writes the theme CSS for a theme preset, and removes it again with --theme auto` |
| `folio-agent-init` は `--theme auto` に戻すとテーマ CSS を消す | `writes the theme CSS for a theme preset, and removes it again with --theme auto` |
| `folio-agent-init` は既存の config があれば、渡さなかった値と init が扱わないフィールドを残す | `keeps an existing config's values and unmanaged fields on a re-run, and skips the API route scaffold` |
| `folio-agent-init` は既存の config があれば、API ルートの雛形を書かない | `keeps an existing config's values and unmanaged fields on a re-run, and skips the API route scaffold` |

## build スクリプトへの ingest の追加

| 保証 | 対応テスト |
|---|---|
| `folio-agent-init` は build スクリプトに ingest を足す | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| `folio-agent-init` が build スクリプトに足す ingest の出力先は `<distDir>/knowledge.json` である | `writes knowledge.json under distDir, and doesn't add a second ingest to a build script that already has one` |
| `folio-agent-init` は build スクリプトがすでに `folio-agent-ingest` を含めば、引数が違っても ingest を足さない | `writes knowledge.json under distDir, and doesn't add a second ingest to a build script that already has one` |

## 引数の扱いと起動

| 保証 | 対応テスト |
|---|---|
| `folio-agent-init` は `--dry-run` では何も書かない | `writes nothing with --dry-run` |
| `folio-agent-init` は不正な引数では何も書かず `process.exitCode = 1` にする | `sets process.exitCode to 1 and writes nothing on invalid arguments` |
| `folio-agent-init` は npm が `node_modules/.bin/` に張るシンボリックリンクから実行されても `main()` を実行する | `folio-agent-init CLI (bin symlink execution) > runs main() and prints usage when invoked via a bin-style symlink` |
