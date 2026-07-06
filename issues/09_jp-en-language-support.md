## handler / widget の JP・EN 言語対応
id: 09
branch-slug: feat/jp-en-language-support
github_issue:
status: open
type: feat
対象: packages/handler/src/chat/gemini.ts, packages/handler/src/chat/route.ts, packages/handler/src/chat/graph.ts, packages/handler/src/chat/handler.ts, packages/handler/src/chat/types.ts, packages/widget/src/widget-element.ts, context/conventions.md, 対応するテストファイル
内容: handler のシステムプロンプト・ルーティングキーワード・定型メッセージ、および widget の UI 文言を `ja` / `en` で切り替えられるようにする。既定は `ja`（既存挙動と完全互換）。
確認: npm run typecheck / npm run test

---

### 背景と目的

現在、利用者向けの文言・プロンプトはすべて日本語ハードコードであり、英語圏の利用者がパッケージを導入できない。後続の init ウィザード（Issue 10）が最初の質問で JP/EN を聞く前提となるため、その受け皿として handler / widget の両方に言語オプションを通す。

### 仕様詳細

#### 1. handler 側: `language` オプションの追加

- `createChatHandler` の設定（`packages/handler/src/chat/handler.ts` / `types.ts`）に `language?: "ja" | "en"` を追加する。省略時は `"ja"`。
- 既存の日本語ハードコード箇所を言語別テーブルに置き換える:
  - `gemini.ts:4-20` — `COMMON_PREAMBLE` と `ROUTE_INSTRUCTIONS`。EN 版は JP 版と同じ制約（知識にないことは答えない・Markdown 禁止・3〜4文・Contact 誘導）を英語で表現する。
  - `gemini.ts:22-27` — `buildInquiryInstruction`（contactUrl 埋め込みの文も言語別）。
  - `graph.ts:6` および `graph.ts:24` — レート制限・不具合時の定型応答文。
- `buildSystemPrompt` のシグネチャに言語を通す。呼び出し元（`createGeminiGenerator` 経由）まで一貫して流すこと。

#### 2. handler 側: ルーティングキーワードの言語対応

- `route.ts:3-4` の `INQUIRY_KEYWORDS` / `WORKS_KEYWORDS` を言語別に持つ。`classifyRoute(input, language)` に変更する。
- EN の inquiry キーワード例: `hire` / `quote` / `estimate` / `commission` / `inquiry` / `work with you` / `project request`。works キーワード例: `works` / `portfolio` / `article` / `zenn` / `project`。厳密な語彙は実行者が JP 版との対称性を見て決めてよいが、**EN モードで inquiry ルートに到達できること**をテストで担保すること（ここが本 Issue の実質的な本丸）。
- JP キーワードは大文字小文字の概念がないため現行ロジックを維持。EN は `toLowerCase` 済み入力に対して照合する。

#### 3. widget 側: `lang` 属性の追加

- `<folio-agent-widget lang="en">` を追加する（省略時 `ja`）。切り替え対象:
  - `widget-element.ts:42` 入力プレースホルダ「メッセージを入力」
  - `widget-element.ts:46` 送信ボタン「送信」
  - `widget-element.ts:4` `DISCLOSURE_TEXT`（ログ記録の告知文）
  - `widget-element.ts:105` endpoint 未設定エラー、`:118` 回答取得失敗、`:123` 通信エラーの各文言
- 文言テーブルは1箇所（オブジェクトリテラル）に集約し、属性値が不正な場合は `ja` にフォールバックする。

#### 4. 規約の更新

`context/conventions.md` の「文言」節（「訪問者向けメッセージは日本語でコード内に定数として持つ」）を本 Issue の設計に合わせて改訂する（例:「訪問者向けメッセージは言語別テーブルとしてコード内に定数で持つ。既定は日本語」）。

#### 5. 互換性の制約

- `language` / `lang` 未指定時の出力（プロンプト文字列・UI 文言）は現行と一字一句同じであること。既存テストが無修正で通ることをその証拠とする。
- knowledge（`knowledge.json`）自体は利用者サイトの言語がそのまま入るため、本 Issue では触らない。

### テスト方針

- `buildSystemPrompt` の ja/en 両出力のスナップショット的検証（要点文言の包含チェックで可）。
- `classifyRoute` の EN 入力（例: "I'd like to hire you" → inquiry、"tell me about your works" → works、その他 → thoughts）。
- widget の文言切り替えは既存のテスト構成に倣う（DOM テストが無い場合は文言テーブルの単体テストで可）。
