# Guarantee Ledger

## Guarantees

### 1. `packages/handler/test/chat/gemini.test.ts` — packages/handler/src/chat/gemini.ts (buildSystemPrompt)

- 各route（thoughts/works/inquiry）で無捏造原則（サイト未記載の明示を含む）を含む文言を生成する
- 各routeでMarkdown禁止・プレーンテキスト出力の指示を含む
- 各routeで段落分け（2〜4文ごとに空行）の指示を含む
- 渡されたknowledge文字列をプロンプトに埋め込む
- route別に異なる指示文を出す
- inquiry routeでcontactUrl指定時はプロンプトに埋め込み、未指定時は既定の問い合わせ案内文言を使う
- thoughts/worksrouteではcontactUrlを無視する
- language="en"指定時、上記の各保証が英語で提供され、日本語語彙が混入しない

| 保証（要約） | 対応テスト |
|---|---|
| 無捏造原則を含む | `includes the no-fabrication principle for %s` |
| プレーンテキスト出力の指示 | `includes the plain-text output instruction for %s` |
| 段落分けの指示 | `includes the paragraph-break instruction for %s` |
| knowledgeの埋め込み | `embeds the knowledge for %s` |
| route別の指示切替 | `switches route-specific instructions per route` |
| inquiryのcontactUrl扱い（指定時／未指定時） | `embeds contactUrl into the inquiry instruction when provided` / `keeps the existing inquiry wording when contactUrl is not provided` |
| thoughts/worksでのcontactUrl無視 | `ignores contactUrl for thoughts and works routes` |
| 英語版での上記保証・日本語語彙の非混入 | `describe("language: en")` 配下の全テスト |

### 2. `packages/handler/test/chat/graph.test.ts` — packages/handler/src/chat/graph.ts (buildChatGraph)

- レート制限内ならroute分類→生成→ログ記録まで一気通貫で実行する
- 生成失敗時は生の例外を出さず、固定のフォールバック文言を返しログに残す
- レート制限超過時は生成をスキップし、route="rate_limited"・固定の上限文言でログに残す
- language="en"で英語メッセージの分類・生成・フォールバック・上限文言が英語になる

| 保証（要約） | 対応テスト |
|---|---|
| 正常系の一気通貫実行 | `routes, generates, and logs when under the rate limit` |
| 生成失敗時のフォールバック | `falls back to a canned answer (never a raw error) when generation fails` |
| レート制限超過時のスキップ | `short-circuits to a canned answer and skips generation when rate-limited` |
| 英語版の分類・生成・フォールバック・上限文言 | `describe("language: en")` 配下の全テスト |

### 3. `packages/handler/test/chat/handler.test.ts` — packages/handler/src/chat/handler.ts (createChatHandler)

- 正常メッセージに200と`{answer, route}`を返す
- 空白のみのメッセージは400を返す
- 非JSONボディは400を返す
- 同一IPからの連続リクエストにレート制限を適用し、超過時は200のままroute="rate_limited"を返す
- `message`が1000字を超える場合、400を返す
- `CF-Connecting-IP`ヘッダが無いリクエストでも例外を投げず処理を継続する（IPは`"unknown"`として扱われる）

| 保証（要約） | 対応テスト |
|---|---|
| 正常応答 | `returns a generated answer for a valid message` |
| 空メッセージの拒否 | `rejects an empty message with 400` |
| 非JSONボディの拒否 | `rejects a non-JSON body with 400` |
| レート制限の適用 | `enforces the rate limit across requests from the same IP` |
| 1000字超のメッセージの拒否 | `rejects a message over 1000 characters with 400` |
| CF-Connecting-IP無しでも継続 | `treats a request without CF-Connecting-IP as ip "unknown" without throwing` |

### 4. `packages/handler/test/chat/rate-limit.test.ts` — packages/handler/src/chat/rate-limit.ts (checkRateLimit / DEFAULT_RATE_LIMIT_CONFIG)

- 短期・長期いずれの制限内でも許可する
- 短期ウィンドウ上限到達で`short_window`理由により拒否する
- 短期ウィンドウ外でも長期ウィンドウ上限到達で`long_window`理由により拒否する
- レート制限超過としてログされた記録はカウント対象外
- IPごとに独立してカウントする
- `DEFAULT_RATE_LIMIT_CONFIG`の実値は`{ shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 }`である

| 保証（要約） | 対応テスト |
|---|---|
| 制限内での許可 | `allows requests under both limits` |
| 短期上限到達での拒否 | `blocks once the short window max is reached` |
| 長期上限到達での拒否 | `blocks once the long window max is reached even if outside the short window` |
| 超過ログのカウント除外 | `does not count logged rate-limited attempts towards the limit` |
| IP単位の独立カウント | `tracks each IP independently` |
| DEFAULT_RATE_LIMIT_CONFIGの実値 | `describe("DEFAULT_RATE_LIMIT_CONFIG")` > `has the current declared rate limit values` |

### 5. `packages/handler/test/chat/route.test.ts` — packages/handler/src/chat/route.ts (classifyRoute)

- 依頼・見積もり文言はinquiryに分類する
- Works関連文言はworksに分類する
- 該当なしはthoughtsにデフォルト分類する
- language="en"でも同様に分類する

| 保証（要約） | 対応テスト |
|---|---|
| inquiry分類 | `routes inquiry-shaped messages to inquiry` |
| works分類 | `routes works-shaped messages to works` |
| デフォルトthoughts分類 | `defaults to thoughts` |
| 英語版でも同様の分類 | `describe("language: en")` 配下の全テスト |

### 6. `packages/handler/test/ingest/generate.test.ts` — packages/handler/src/ingest/generate.ts (generateKnowledge)

- distDir配下をinclude/exclude globでフィルタし、含まれるページのみ知識化する
- knowledge/配下のMarkdownを追加コンテキストとして結合する
- 見積もりトークン数を算出し、閾値超過時にwarningsへ記録する
- zenn設定時、公開済みZenn記事を知識に含める
- articlesDir不在かつzennSnapshotPath設定時はスナップショットにフォールバックする
- articlesDir不在かつスナップショット未設定時はzenn取り込みをスキップしwarningsに記録する

| 保証（要約） | 対応テスト |
|---|---|
| include/excludeフィルタ | `combines included dist pages and knowledge/ markdown, skipping excluded/unmatched pages` |
| knowledge/の結合 | `combines included dist pages and knowledge/ markdown, skipping excluded/unmatched pages` |
| トークン閾値超過時の警告 | `warns when estimated tokens exceed the threshold` |
| Zenn記事の取り込み | `includes published Zenn articles when zenn config is set` |
| スナップショットへのフォールバック | `falls back to zennSnapshotPath when articlesDir does not exist` |
| スナップショット未設定時のスキップ+警告 | `warns and skips zenn ingest when articlesDir does not exist and no snapshot is configured` |

### 7. `packages/handler/test/ingest/glob.test.ts` — packages/handler/src/ingest/glob.ts (createUrlMatcher)

- includeにマッチするパスのみ真を返す
- excludeが優先され、includeにマッチしていても除外される

| 保証（要約） | 対応テスト |
|---|---|
| includeマッチング | `includes matching paths` |
| exclude優先 | `excludes paths even if included` |

### 8. `packages/handler/test/ingest/cli.test.ts` — packages/handler/src/ingest/cli.ts (folio-agent-ingest CLI, main)

- `<config.json> <output.json>`を受け取り、config.jsonを読んでknowledgeを生成し、output.jsonにJSONとして書き出す
- 引数が欠けている場合、`process.exitCode = 1`を設定し標準エラーに使い方を出力する

| 保証（要約） | 対応テスト |
|---|---|
| config読み込み→knowledge生成→書き出し | `reads config.json, generates knowledge, and writes it to output.json` |
| 引数欠如時のexitCode | `sets process.exitCode to 1 and does not write output.json when arguments are missing` |

### 9. `packages/handler/test/ingest/html-to-text.test.ts` — packages/handler/src/ingest/html-to-text.ts (htmlToText)

- titleと可視テキストを抽出し、script/styleの内容は含めない

| 保証（要約） | 対応テスト |
|---|---|
| title・可視テキスト抽出 | `extracts the title and visible text, dropping scripts and styles` |

### 10. `packages/handler/test/sync/cli.test.ts` — packages/handler/src/sync/cli.ts (syncZennSnapshot / folio-agent-sync-zenn CLI)

- config.zennから公開済みZenn記事のみをKnowledgePage[]としてJSON出力する
- config.zenn未設定時は例外を投げる

| 保証（要約） | 対応テスト |
|---|---|
| 公開済み記事のみをJSON出力 | `writes only published articles to the output JSON as KnowledgePage[]` |
| zenn未設定時の例外 | `throws when config.zenn is not set` |

### 11. `packages/handler/test/init/cli.test.ts` — packages/handler/src/init/cli.ts (folio-agent-init CLI, main)

- ウィザードの回答一式から、config json・テーマCSS・APIルート雛形・`.dev.vars`・`.gitignore`が実際にファイルシステム上へ整合した内容で生成される
- 既存configがある場合、ウィザードが尋ねないフィールドは維持され、APIルート雛形の回答が空なら`.dev.vars`ともどもファイルを生成しない

| 保証（要約） | 対応テスト |
|---|---|
| フレッシュセットアップの生成物一式 | `writes config json, theme css, API route scaffold, .dev.vars and .gitignore for a fresh setup` |
| 既存config保持・未回答時のスキップ | `preserves fields the wizard doesn't ask about from an existing config, and skips the API route scaffold when unanswered` |

### 12. `packages/widget/test/styles.test.ts` — packages/widget/src/styles.ts (WIDGET_STYLES)

- 各テーマトークン(`--folio-agent-surface`/`text`/`muted`/`accent`/`accent-contrast`/`font`)がvar()＋フォールバック値で参照される
- メッセージ吹き出しは改行を保持する
- `:host`はホストのcolor/color-schemeを継承する
- パネル/テキストの既定値はCSSシステムカラー(Canvas/CanvasText)から導出される
- 吹き出しの背景/枠線はcolor-mix導出で、テーマトークンがmutedより優先される
- mutedトークンは補助テキストのみに限定される

| 保証（要約） | 対応テスト |
|---|---|
| テーマトークンのvar()参照 | `references %s via var() with a fallback` / `no longer hardcodes the themed colors without a var() fallback` |
| 改行の保持 | `preserves newlines in message bubbles` |
| :hostの継承 | `makes :host adopt the host's color and color-scheme so system colors adapt` |
| システムカラーからの既定値導出 | `derives panel and text defaults from CSS system colors instead of fixed hex` |
| color-mix導出とmuted優先順位 | `derives bubble background/border via color-mix, prioritizing the theme tokens over the muted token` |
| mutedの補助テキスト限定 | `keeps muted scoped to supplementary text only, not bubble backgrounds` |

### 13. `packages/widget/test/widget-element.test.ts` — packages/widget/src/widget-element.ts (FolioAgentWidgetElement / defineFolioAgentWidget)

- 初期状態はトグルボタンのみ描画し、クリックまでネットワーク呼び出しをしない
- 初回オープン時のみpolicy-hrefリンク付き開示文言を表示し、複数回開閉しても複製されない
- 送信でendpoint属性のURLへPOSTし、ユーザー発言とAI回答を吹き出しとして描画する
- ネットワークエラー時は通信エラー文言を表示する
- endpoint属性が無い場合は設定エラー文言を表示しfetchを呼ばない
- lang="en"でプレースホルダ・送信ラベル・開示文言・エラー文言が英語になる
- 未知のlang属性値は日本語にフォールバックする

| 保証（要約） | 対応テスト |
|---|---|
| 初期状態でネットワーク呼び出しなし | `renders only a closed toggle button and makes no network call until clicked` |
| 開示文言の初回表示・非複製 | `shows the disclosure line with a policy link only on first open` |
| 送信・応答描画 | `sends a message to the configured endpoint and renders the answer` |
| 通信エラー時の表示 | `renders a friendly message when the network request fails` |
| endpoint未設定時の設定エラー | `shows a config error and does not call fetch when endpoint is missing` |
| 英語ロケール対応 | `describe("lang=en")` 配下の該当テスト（プレースホルダ・送信ラベル・開示文言・エラー文言） |
| 未知langの日本語フォールバック | `falls back to ja for an unrecognized lang attribute` |

## About

対象は`packages/handler`・`packages/widget`の`src/index.ts`（および各パッケージの`bin`エントリポイント）で公開される契約面のみ。対象外はそこで再公開されていない内部関数（`fileToUrlPath`・`estimateTokens`・`scanZennArticles`、`folio-agent-init`/`folio-agent-ingest` CLI内部のビルディングブロック関数群など）。**ここに載っていない振る舞いは約束ではなく、予告なく変わりうる。** 位置づけは[docs/design-decisions.md](design-decisions.md)と同格の正であり、実装がこれと食い違う場合は指摘する。
