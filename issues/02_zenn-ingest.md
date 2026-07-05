## Zenn記事のローカル取り込み
id: 02
branch-slug: zenn-ingest
github_issue:
status: open
type: feat
対象: packages/handler/src/ingest/types.ts / packages/handler/src/ingest/zenn.ts (新規) / packages/handler/src/ingest/generate.ts / packages/handler/src/index.ts / packages/handler/test/ingest/zenn.test.ts (新規) / packages/handler/test/ingest/generate.test.ts
内容: PLAN.md §4-3で「オプション」として未実装のまま残っていたZenn記事取り込みを実装する。ネットワーク経由でzenn.devから取得するのではなく、Zenn CLIのarticles/ディレクトリ（ローカルパス）を`dist/`・`knowledge/`と同じ要領で読み込む。
確認: npm run typecheck / npm run test

---

## 背景

`KnowledgeSource`型に`"zenn"`という値だけが存在し、実際に取り込む処理が無い（`packages/handler/src/ingest/types.ts:14`）。プロンプト側（`gemini.ts`のworks経路指示）は「対応するZenn記事へのリンクが知識中にあれば案内する」前提だが、知識にZenn記事の内容を入れる手段が無かった。

## 設計方針

- **ネットワークfetchはしない**。Zenn CLIの`articles/`ディレクトリはローカルの別リポにあるMarkdownファイル群であり、これをローカルパスとして読む。`distDir`が「サイトが先にビルドされている前提」であるのと同じ構造で、「指定ディレクトリが取り込み時点で存在すること」は呼び出し側（利用者のビルドパイプライン）の責務とし、folio-agent側はチェックアウト・同期の方法には関与しない。
- **Works記事との紐付けマッピングは持たない**。CAG（知識全量をコンテキストへ渡す方式）では、Zenn記事本文をそのまま知識として追加すれば、「どのWorksに関連するか」はLLM自身が本文から判断できる。RAGのような事前の対応表は不要であり、増やさない。
- 公開URLの組み立てにのみ`baseUrl`を使う（記事本文はローカルファイルから読むが、案内するリンクはzenn.devの公開URL）。

## IngestConfigの拡張（types.ts）

```ts
export interface ZennIngestConfig {
  /** Zenn CLI の articles/ ディレクトリへのローカルパス（絶対 or cwd相対）。 */
  articlesDir: string;
  /** 記事URLを組み立てる base（例: "https://zenn.dev/username/articles"）。末尾スラッシュ無し。 */
  baseUrl: string;
}
```

`IngestConfig`に`zenn?: ZennIngestConfig;`を追加する。

## 取り込み処理（zenn.ts 新規）

- `articlesDir`直下の`*.md`を列挙する（サブディレクトリは無い前提。既存`scan-dist.ts`の`walk`は再利用してよい）。
- 各ファイルの先頭にあるYAML frontmatter（`---`で挟まれたブロック）から`title`と`published`のみを抽出する。**フルYAMLパーサは追加しない**。以下の2つの正規表現で十分:
  - `title`: `/^title:\s*"?(.*?)"?\s*$/m`
  - `published`: `/^published:\s*(true|false)\s*$/m`
- `published`が明示的に`false`のファイルは除外する（下書き）。`published`フィールドが見つからない場合も除外する（Zenn CLIの生成物は必ずこのフィールドを持つため、無いものは想定外の入力として安全側に倒す）。
- 本文はfrontmatterブロックを取り除いた残り全体を`trim()`したもの。
- ファイル名（拡張子を除いた部分）がスラグ。`url`は `` `${baseUrl}/${slug}` ``。
- `KnowledgePage`として`{ url, source: "zenn", title, text }`を返す。`title`が抽出できない場合はスラグをtitleとして使う。

## generate.tsへの組み込み

`config.zenn`が指定されていれば、`knowledgeDir`と同様にpagesへ追加する（include/exclude グロブの対象外。knowledgeDirと同じく「明示配置したものだけ入る」）。

## 公開API（index.ts）

`ZennIngestConfig`を型エクスポートに追加する。

## テスト

- `zenn.test.ts`: 一時ディレクトリにpublished true/false/フィールド無しの3ファイルを用意し、published trueのみが取り込まれること、title抽出、published無しの除外、URL組み立てを検証する。
- `generate.test.ts`: 既存のfixtureパターンに倣い、`zenn`設定ありでKnowledgeDocumentにsource: "zenn"のページが混じることを1ケース追加する。

## 制約

- Works記事とZenn記事のマッピング機能は作らない（設計方針を参照）。
- portfolio-astro側でZenn記事のリポジトリをどう用意する（checkout/git submodule等）かはこのIssueに含めない。別リポの作業。
