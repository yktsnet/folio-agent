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
│   │   │   │   ├── format.ts         # formatKnowledge（知識をタイトル・URL 付きでプロンプト用に整形）
│   │   │   │   └── types.ts          # IngestConfig / KnowledgeDocument など
│   │   │   ├── init/         # セットアップ CLI（Node で実行。引数のみで対話なし）
│   │   │   │   ├── cli.ts            # bin: folio-agent-init（計画の表示と書き込み）
│   │   │   │   ├── options.ts        # 引数の解釈・前回 config との合成・入力バリデーション・テーマプリセット
│   │   │   │   └── writers.ts        # 値 → config JSON / theme CSS / APIルート雛形 / build script / .dev.vars の生成
│   │   │   └── chat/         # チャットハンドラ（実行時・Workers で動く）
│   │   │       ├── handler.ts        # createChatHandler: Request→Response（入力検証・IP取得）
│   │   │       ├── graph.ts          # LangGraph StateGraph（input_guard → route → generate → normalize_answer → log）
│   │   │       ├── route.ts          # キーワードによる経路分類（thoughts / works / inquiry）
│   │   │       ├── gemini.ts         # Gemini 呼び出しだけ
│   │   │       ├── prompt/           # システムプロンプト（言語別の文面）。LLM に形式を「頼む」側
│   │   │       │   ├── index.ts          # buildSystemPrompt（下の部品を組み立てる）
│   │   │       │   ├── persona.ts        # 役割・口調・長さ
│   │   │       │   ├── grounding.ts      # 知識だけで答える・創作しない
│   │   │       │   ├── answer-format.ts  # 回答の形式の指示
│   │   │       │   └── routes.ts         # 経路ごとの指示
│   │   │       ├── answer/           # 回答の形式を「保証する」側（生成の後ろでコードが直す）
│   │   │       │   ├── normalize.ts      # normalizeAnswer（graph の normalize_answer ノードが呼ぶ）
│   │   │       │   └── links.ts          # AnswerLink / collectAnswerLinks（回答に残してよいリンク）
│   │   │       ├── rate-limit.ts     # chat_logs の COUNT による 10分/日次 制限
│   │   │       ├── log.ts            # chat_logs への INSERT
│   │   │       └── types.ts
│   │   ├── migrations/       # D1 スキーマ（chat_logs）
│   │   ├── dev/              # 手動検証ハーネス（npm 配布外）。wrangler dev + D1 local
│   │   └── test/             # src/ をミラー。fake-d1.ts で D1 を偽装
│   └── widget/               # @folio-agent/widget
│       ├── src/
│       │   ├── widget-element.ts  # <folio-agent-widget> Web Component（Shadow DOM）
│       │   ├── answer.ts          # 回答の形式を DOM に描く（リンクだけ <a> にする）
│       │   ├── styles.ts          # ウィジェット CSS（文字列定数）
│       │   ├── index.ts           # defineFolioAgentWidget エクスポート
│       │   └── types.ts
│       └── test/
├── README.md                 # 利用ドキュメント + 設計判断ダイジェスト
├── docs/
│   ├── design-decisions.md   # 設計判断の全文（正はこちら）
│   ├── usage.md              # 手動セットアップ手順と API 詳細
│   └── release.md            # リリース手順（タグ駆動 + Trusted Publishing）
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

`wrangler dev --port 8799` + ローカル D1。`public/` に widget のビルド成果物を都度コピーして、v1 の同一デプロイ構成（README の Design Decisions）を再現する。手順は `dev/README.md`。
