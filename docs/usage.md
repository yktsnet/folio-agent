[🇯🇵 日本語](usage.md) | [🇬🇧 English](usage.en.md)

# Usage / API

`folio-agent-init` の引数と、init を使わず手で設定する場合の各パッケージの API 詳細。導入の全体像は [README](../README.md) を参照。

## 0. Setup (`folio-agent-init`)

```bash
npx folio-agent-init [options]
```

対話は持たない。引数で渡した値だけを変え、渡さなかった値は既存の `folio-agent.config.json` のまま残す（初回は既定値）。`--dry-run` を付けると、書き込む内容を表示するだけで何も書かない。

| 引数 | 内容 | 既定 |
|---|---|---|
| `--lang <ja\|en>` | UI・プロンプトの言語 | `ja` |
| `--dist <dir>` | ビルド出力のディレクトリ | `dist` |
| `--include <globs>` | 知識に含める URL グロブ（カンマ区切り） | `/**` |
| `--zenn-dir <path>` / `--zenn-user <name\|url>` | Zenn 記事の取り込み。2つそろえて渡す。`--no-zenn` で外す | なし |
| `--contact-url <url>` | API ルート雛形に入れる Contact ページの URL | なし |
| `--theme <auto\|poimandres\|custom>` | 配色。`auto` はテーマ CSS を書かず、サイトの配色に合わせる | `auto` |
| `--accent` / `--surface` / `--text <hex>` | `--theme custom` の3色。どれかを渡すと `custom` になる | なし |
| `--api-route <path>` / `--no-api-route` | API ルート雛形の生成先。既存のファイルは上書きしない | 初回のみ `functions/api/chat.ts` |
| `--dry-run` | 書き込まずに内容を表示する | |

Gemini API キーは引数では受け取らない（シェルの履歴や会話ログに残るため）。環境変数 `GEMINI_API_KEY` が設定されていれば `.dev.vars` に書き、無ければ `.dev.vars` に手で書く。`.dev.vars` はキーの有無にかかわらず `.gitignore` に追加する。

`--theme auto` に戻すと、以前に書いた `folio-agent.theme.css` は削除する。

## 1. Knowledge Generation (build time)

```bash
npx folio-agent-ingest folio-agent.config.json knowledge.json
```

```jsonc
// folio-agent.config.json
{
  "distDir": "dist",
  "include": ["/", "/works/**", "/about"],
  "exclude": ["/works/draft-*"],
  "knowledgeDir": "knowledge"
}
```

`IngestConfig`（`distDir` / `include` / `exclude` / `knowledgeDir` / `zenn` / `tokenWarningThreshold`）は `@folio-agent/handler` から型で公開されている。`language` と `theme` は `folio-agent-init` が前回の値を保持するためのフィールドで、ingest 自体は読まない。init は、自分が扱わないフィールド（`exclude` / `knowledgeDir` / `zennSnapshotPath` など）を書き換えない。`knowledgeDir` に置いた Markdown は URL パスをミラーした構造で、include/exclude の対象外（明示配置したものだけが入る）。

Zenn 記事も知識に含める場合は `zenn` を指定する（省略すればスキップ）。zenn.dev への通信は行わず、Zenn CLI の `articles/` ディレクトリをローカルで読み、frontmatter が `published: true` の記事だけを取り込む:

```jsonc
// folio-agent.config.json（抜粋）
{
  "zenn": {
    "articlesDir": "../zenn-content/articles",
    "baseUrl": "https://zenn.dev/<username>/articles"
  }
}
```

CI 等で `articlesDir` に到達できない環境（private リポの記事を読めない等）向けに、`zenn` の兄弟キーとして `zennSnapshotPath` を指定できる。`articlesDir` が存在しない場合、ingest はこのパスの JSON にフォールバックする:

```jsonc
// folio-agent.config.json（抜粋）
{
  "zenn": {
    "articlesDir": "../zenn-content/articles",
    "baseUrl": "https://zenn.dev/<username>/articles"
  },
  "zennSnapshotPath": "zenn-snapshot.json"
}
```

スナップショットは `folio-agent-sync-zenn` で生成し、リポにコミットして使う:

```bash
npx folio-agent-sync-zenn folio-agent.config.json zenn-snapshot.json
```

**フォールバック時に警告は出ない。** `articlesDir` も `zennSnapshotPath` も無い場合のみ warning が出る仕様のため、スナップショットが古いまま放置されてもビルドは成功し続け、知識だけが古くなる。CI 等で定期的に `folio-agent-sync-zenn` を回すか、古さを検知する手段を利用者側で持つこと。

## 2. Chat Handler (Pages Function / Worker)

```ts
import { createChatHandler, createGeminiGenerator } from "@folio-agent/handler";
import knowledgeDoc from "../knowledge.json";

const knowledge = knowledgeDoc.pages.map((p) => `# ${p.url}\n\n${p.text}`).join("\n\n");

interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

export default {
  fetch: (request: Request, env: Env) =>
    createChatHandler({
      db: env.DB,
      generateAnswer: createGeminiGenerator({
        apiKey: env.GEMINI_API_KEY,
        knowledge,
        contactUrl: "https://example.com/contact",
      }),
    })(request),
};
```

`contactUrl` を渡すと、依頼・相談（inquiry）経路の回答が具体的な URL で Contact ページを案内する。省略した場合は URL なしで「Contactページ」とだけ案内する。

`language`（`"ja" | "en"`、既定 `ja`）は `createChatHandler`（上限通知の定型文・ルーティングキーワード）と `createGeminiGenerator`（システムプロンプト）の両方に渡す。片方だけ渡すと定型文とプロンプトの言語がずれる。

D1 スキーマは `packages/handler/migrations/0001_init.sql` を `wrangler d1 migrations apply` で適用する。`chat_logs` テーブル1つがログとレート制限カウンタ（既定は10分6問・12時間12問、`rateLimitConfig` で変更可）を兼ねる。

## 3. Widget (frontend)

```html
<folio-agent-widget endpoint="/api/chat" policy-href="/data-policy"></folio-agent-widget>
<script type="module">
  import { defineFolioAgentWidget } from "@folio-agent/widget";
  defineFolioAgentWidget();
</script>
```

- `lang="en"` を付けると UI 文言（ボタン・見出し・案内文・質問候補・プレースホルダ・開示文・エラー文）が英語になる。未指定は日本語。
- パネルの見出し・冒頭の案内文・質問候補は属性で差し替えられる。`heading="…"`、`greeting="…"`、`suggestions="質問1|質問2|質問3"`（`|` 区切り）。`greeting=""` / `suggestions=""` で非表示にできる。未指定なら言語ごとの既定文言を出す。
- `policy-href` の指し先ページには、①IPベースのレート制限（既定は10分6問・12時間12問）を行っていること、②入力内容と応答を D1 にログとして記録していること、③生成に使う Gemini API の無料枠は入力が学習に利用され得ることの3点を書く。ページ自体は導入サイト側の責務（folio-agent はテンプレートを同梱しない）。
- 配色・フォントは CSS カスタムプロパティ6トークン（`--folio-agent-surface` / `text` / `muted` / `accent` / `accent-contrast` / `font`）で上書きできる。**未指定でもホストの配色（`color` / `color-scheme` 継承とCSSシステムカラー）から既定値を導出するため、サイトのライト/ダークどちらにも自然に馴染む**。変えたい場合のみ、上記トークンを上書きする。
- 配色を変える場合も、決めるのは `surface` / `text` / `accent` の3色で足りる。境界線・吹き出し・入力欄・補助テキストはこの3色から導出する（`muted` / `accent-contrast` は導出値を変えたいときだけ指定する）。例として Poimandres 配色:

  ```css
  folio-agent-widget {
    --folio-agent-surface: #1b1e28;
    --folio-agent-text: #e4f0fb;
    --folio-agent-accent: #5de4c7;
  }
  ```

- 幅 640px 以下では全画面で開き、画面キーボードが出ても入力欄が隠れないよう表示領域（`visualViewport`）の高さに追従する。
