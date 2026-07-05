# structure

## ディレクトリ構成

```
folio-agent/
├── packages/
│   ├── handler/              # @folio-agent/handler
│   │   ├── src/
│   │   │   ├── index.ts      # 公開 API（再エクスポートの唯一の入口）
│   │   │   ├── ingest/       # 知識取り込み（ビルド時・Node で実行）
│   │   │   │   ├── cli.ts            # bin: folio-agent-ingest <config.json> <output.json>
│   │   │   │   ├── generate.ts       # dist走査 + knowledge/ 結合 → KnowledgeDocument 生成
│   │   │   │   ├── glob.ts           # URL パスの include/exclude マッチャ（picomatch）
│   │   │   │   ├── file-to-url.ts    # dist のファイルパス → URL パス変換
│   │   │   │   ├── html-to-text.ts   # HTML → テキスト抽出（node-html-parser）
│   │   │   │   ├── token-count.ts    # トークン量の概算・上限警告
│   │   │   │   └── types.ts          # IngestConfig / KnowledgeDocument など
│   │   │   └── chat/         # チャットハンドラ（実行時・Workers で動く）
│   │   │       ├── handler.ts        # createChatHandler: Request→Response（入力検証・IP取得）
│   │   │       ├── graph.ts          # LangGraph StateGraph（input_guard → route → generate → log）
│   │   │       ├── route.ts          # キーワードによる経路分類（thoughts / works / inquiry）
│   │   │       ├── gemini.ts         # システムプロンプト組み立て + Gemini 呼び出し
│   │   │       ├── rate-limit.ts     # chat_logs の COUNT による 10分/日次 制限
│   │   │       ├── log.ts            # chat_logs への INSERT
│   │   │       └── types.ts
│   │   ├── migrations/       # D1 スキーマ（chat_logs）
│   │   ├── dev/              # 手動検証ハーネス（npm 配布外）。wrangler dev + D1 local
│   │   └── test/             # src/ をミラー。fake-d1.ts で D1 を偽装
│   └── widget/               # @folio-agent/widget
│       ├── src/
│       │   ├── widget-element.ts  # <folio-agent-widget> Web Component（Shadow DOM）
│       │   ├── styles.ts          # ウィジェット CSS（文字列定数）
│       │   ├── index.ts           # defineFolioAgentWidget エクスポート
│       │   └── types.ts
│       └── test/
├── PLAN.md                   # 構想メモ（README の前身）
├── JUDGE.md                  # 技術選定と判断
└── issues/                   # ローカル Issue 管理
```

## データフロー

### ビルド時（知識生成）

```
利用者サイトの dist/ + knowledge/ディレクトリ
    ↓ folio-agent-ingest（glob選択 → html-to-text → token-count）
knowledge.json（KnowledgeDocument: pages[] + estimatedTokens + warnings[]）
```

### 実行時（チャット）

```
<folio-agent-widget endpoint="..." policy-href="...">
    ↓ POST {endpoint} { message }
createChatHandler（入力検証: 非空・1000字以内 / IP: CF-Connecting-IP）
    ↓ graph.invoke
input_guard（rate-limit: 10分3問・日次10問 = chat_logs の COUNT）
    ├─ 超過 → 上限メッセージ → log
    └─ OK → route_message（キーワード分類）→ generate（Gemini + 知識同梱プロンプト）→ log
    ↓
{ answer, route }
```

## 外部依存

| 依存 | 用途 | 注入点 |
|---|---|---|
| D1（`DB` バインディング） | chat_logs（ログ + レート制限カウンタ兼用） | `ChatHandlerConfig.db` |
| Gemini API（`GEMINI_API_KEY`） | 回答生成。既定モデル gemini-3.1-flash-lite | `createGeminiGenerator` |

## 検証ハーネス（packages/handler/dev/）

`wrangler dev --port 8799` + ローカル D1。`public/` に widget のビルド成果物を都度コピーして、v1 の同一デプロイ構成（JUDGE §9）を再現する。手順は `dev/README.md`。
