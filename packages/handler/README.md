# @folio-agent/handler

静的サイト向けポートフォリオ受付チャットボットのチャットハンドラ（Cloudflare Workers 上の LangGraph.js StateGraph）と、ビルド時に知識ファイルを生成する ingest CLI を提供する。知識源はビルド時にシステムプロンプトへ全量同梱する CAG 方式で、検索基盤を持たない。

`@folio-agent/widget` とセットで使う。詳細（アーキテクチャ・設計判断・利用手順全体）はリポジトリの [README](https://github.com/yktsnet/folio-agent#readme) を参照。

## Usage

```bash
npm install @folio-agent/handler

# 対話ウィザードで初期設定（config・テーマCSS・APIルート雛形などを生成）
npx folio-agent-init

# ビルド時: 知識ファイルの生成（ウィザードが build スクリプトに追記する）
npx folio-agent-ingest folio-agent.config.json knowledge.json
```

```ts
import { createChatHandler, createGeminiGenerator } from "@folio-agent/handler";
import knowledgeDoc from "../knowledge.json";

const knowledge = knowledgeDoc.pages.map((p) => `# ${p.url}\n\n${p.text}`).join("\n\n");

export default {
  fetch: (request: Request, env: { DB: D1Database; GEMINI_API_KEY: string }) =>
    createChatHandler({
      db: env.DB,
      generateAnswer: createGeminiGenerator({ apiKey: env.GEMINI_API_KEY, knowledge }),
    })(request),
};
```

`createChatHandler` / `createGeminiGenerator` の両方に `language: "en"` を渡すと、定型文・ルーティングキーワード・システムプロンプトが英語になる（既定は `ja`）。

D1 スキーマは `migrations/0001_init.sql` を `wrangler d1 migrations apply` で適用する。
