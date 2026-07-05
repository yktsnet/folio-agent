## システムプロンプト共通前文の再設計とウィジェットのテーマ変数受け口
id: 01
branch-slug: prompt-preamble-and-theming
github_issue:
status: open
type: feat
対象: packages/handler/src/chat/gemini.ts / packages/handler/test/chat/gemini.test.ts (新規) / packages/widget/src/styles.ts / packages/widget/test/styles.test.ts (新規)
内容: 実機検証で見つかった回答品質の問題（無回答原則が thoughts 経路にしか効いていない・Markdown 記法が生で表示される・口調がオフィスライク）をシステムプロンプト共通前文の再設計で解消する。あわせて、ウィジェットのハードコード配色を CSS カスタムプロパティ経由に変え、利用側サイトがテーマを注入できる受け口を作る。
確認: npm run typecheck / npm run test

---

## 背景

dogfooding 検証で確認された実害:

1. works 経路の回答が「CAG（Chat with Augmented Generation）」という誤った展開語を創作した。`buildSystemPrompt`（packages/handler/src/chat/gemini.ts:4-13）で「書かれていないことは推測しない」が `thoughts` の経路別指示にしか無いことが原因。無回答原則は PLAN §3・JUDGE §1 の設計の核であり、全経路に効かなければならない。
2. 回答に `**...**` などの Markdown 記法がそのまま表示される。ウィジェット（widget-element.ts の `#appendMessage`）は `textContent` によるプレーンテキスト描画であり、これは軽さの要件として変えない。プロンプト側で記法を禁止する。
3. 「お問い合わせいただきありがとうございます」等の定型敬語で始まる長文になり、ポートフォリオの文脈に合わない。

## 要件A: システムプロンプト（gemini.ts）

`buildSystemPrompt` を再構成する。

- **共通前文**（全経路）に以下を含める:
  - ペルソナ: ポートフォリオサイト作者の代理として応対する受付エージェント。丁寧だが簡潔で自然な口語。定型の前置き挨拶（「お問い合わせいただきありがとうございます」等）をしない。回答は原則3〜4文以内。
  - 無回答原則: 知識に書かれていることだけから答える。書かれていないことは推測・創作せず、「その点はサイトに記載がない」と伝えて Contact ページを案内する。用語の正式名称・展開形も知識に無ければ創作しない。
  - 出力形式: Markdown 記法（`**`・`#`・`-` のリスト等)を使わず、プレーンテキストで答える。
- **経路別指示**は差分のみに縮小する（thoughts: 考え方への言及 / works: 作品解説と Zenn リンク案内 / inquiry: Contact への誘導）。現在 thoughts にある無回答文言は共通前文へ移す。
- 既存の公開 API（`buildSystemPrompt(knowledge, route)` のシグネチャ）は変えない。

新規テスト `packages/handler/test/chat/gemini.test.ts`: 全経路のプロンプトに無回答原則とプレーンテキスト指示が含まれること、経路別指示が経路ごとに切り替わることを `buildSystemPrompt` の出力文字列で検証する。

## 要件B: テーマ変数（styles.ts）

`WIDGET_STYLES` 内のハードコード色・フォントを CSS カスタムプロパティ経由にする。フォールバック値は現行値を維持する（テーマ未設定の利用者には見た目が変わらない）。

- トークンは6個: `--folio-agent-surface`（パネル背景）/ `--folio-agent-text`（本文）/ `--folio-agent-muted`（開示文などの補助テキスト）/ `--folio-agent-accent`（トグルボタン・ユーザー吹き出し・送信ボタン）/ `--folio-agent-accent-contrast`（accent 上の文字色）/ `--folio-agent-font`（フォントファミリ）
- 記法例: `background: var(--folio-agent-surface, #fff);`
- assistant 吹き出しの背景・境界線色は surface/text から派生させるか muted を使い、トークンを増やさない。
- Shadow DOM はカスタムプロパティを host から継承するため、利用側はグローバル CSS で `folio-agent-widget { --folio-agent-accent: ...; }` を書くだけでテーマが効く。この使い方を styles.ts 冒頭のコメントに1〜2行で記す。

新規テスト `packages/widget/test/styles.test.ts`: `WIDGET_STYLES` に6トークンすべての `var(--folio-agent-*` 参照が含まれ、フォールバック無しの生色参照が残っていないことを検証する。

## 制約

- ウィジェットに Markdown レンダラを追加しない（プレーンテキスト描画のまま）。
- ルーティング方式（キーワード分類）はこの Issue では触らない。
- portfolio-astro 側の変数定義（poi パレットの注入）は別リポの作業であり、この Issue に含めない。
