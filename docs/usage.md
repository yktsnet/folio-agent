# Usage / API

`folio-agent-init` を使わず手で設定する場合と、各パッケージの API 詳細。導入の全体像は [README](../README.md) を参照。

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

`IngestConfig`（`distDir` / `include` / `exclude` / `knowledgeDir` / `zenn` / `tokenWarningThreshold`）は `@folio-agent/handler` から型で公開されている。`language` と `theme` は `folio-agent-init` がウィザードの回答を保持するためのフィールドで、ingest 自体は読まない。`knowledgeDir` に置いた Markdown は URL パスをミラーした構造で、include/exclude の対象外（明示配置したものだけが入る）。

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

D1 スキーマは `packages/handler/migrations/0001_init.sql` を `wrangler d1 migrations apply` で適用する。`chat_logs` テーブル1つがログとレート制限カウンタ（10分3問・日次10回、`rateLimitConfig` で変更可）を兼ねる。

## 3. Widget (frontend)

```html
<folio-agent-widget endpoint="/api/chat" policy-href="/data-policy"></folio-agent-widget>
<script type="module">
  import { defineFolioAgentWidget } from "@folio-agent/widget";
  defineFolioAgentWidget();
</script>
```

- `lang="en"` を付けると UI 文言（プレースホルダ・送信ボタン・開示文・エラー文）が英語になる。未指定は日本語。
- `policy-href` の指し先ページには、①IPベースのレート制限（10分3問・日次10回）を行っていること、②入力内容と応答を D1 にログとして記録していること、③生成に使う Gemini API の無料枠は入力が学習に利用され得ることの3点を書く。ページ自体は導入サイト側の責務（folio-agent はテンプレートを同梱しない）。
- 配色・フォントは CSS カスタムプロパティ6トークン（`--folio-agent-surface` / `text` / `muted` / `accent` / `accent-contrast` / `font`）で上書きできる。**未指定でもホストの配色（`color` / `color-scheme` 継承とCSSシステムカラー）から既定値を導出するため、サイトのライト/ダークどちらにも自然に馴染む**。変えたい場合のみ、上記トークンを上書きする。
