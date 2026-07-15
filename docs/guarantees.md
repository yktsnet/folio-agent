# Guarantees

folio-agent が公開面（公開API・CLI・外部から観測可能な振る舞い）について宣言する保証の一覧。位置づけは [docs/design-decisions.md](design-decisions.md) と同格の正であり、実装がこれと食い違う場合は指摘する。

対象は契約面のみ。内部実装の詳細（`fileToUrlPath`・`estimateTokens`・`scanZennArticles`、および `folio-agent-init` CLI内部のビルディングブロック関数群など、`src/index.ts` で再公開されていないもの）はここには載せない。

保証の追加・変更・廃止はIssueの保証節でuserの裁可を経てから、この台帳を更新する。

## chat（`packages/handler`）

### `buildSystemPrompt`

- 各route(thoughts/works/inquiry)で無捏造原則（サイト未記載の明示を含む）を含む文言を生成する — `test/chat/gemini.test.ts`
- 各routeでMarkdown禁止・プレーンテキスト出力の指示を含む — `test/chat/gemini.test.ts`
- 各routeで段落分け（数文ごとに空行）の指示を含む — `test/chat/gemini.test.ts`
- 渡されたknowledge文字列をプロンプトに埋め込む — `test/chat/gemini.test.ts`
- route別に異なる指示文を出す — `test/chat/gemini.test.ts`
- inquiry routeでcontactUrl指定時はプロンプトに埋め込み、未指定時は既定の問い合わせ案内文言を使う — `test/chat/gemini.test.ts`
- thoughts/worksrouteではcontactUrlを無視する — `test/chat/gemini.test.ts`
- language="en"指定時、上記の各保証が英語で提供され、日本語語彙が混入しない — `test/chat/gemini.test.ts`（`describe("language: en")`）

### `buildChatGraph`

- レート制限内ならroute分類→生成→ログ記録まで一気通貫で実行する — `test/chat/graph.test.ts`
- 生成失敗時は生の例外を出さず、固定のフォールバック文言を返しログに残す — `test/chat/graph.test.ts`
- レート制限超過時は生成をスキップし、route="rate_limited"・固定の上限文言でログに残す — `test/chat/graph.test.ts`
- language="en"で英語メッセージの分類・生成・フォールバック・上限文言が英語になる — `test/chat/graph.test.ts`（`describe("language: en")`）

### `createChatHandler`

- 正常メッセージに200と`{answer, route}`を返す — `test/chat/handler.test.ts`
- 空白のみのメッセージは400を返す — `test/chat/handler.test.ts`
- 非JSONボディは400を返す — `test/chat/handler.test.ts`
- 同一IPからの連続リクエストにレート制限を適用し、超過時は200のままroute="rate_limited"を返す — `test/chat/handler.test.ts`
- `message`が1000字を超える場合、400を返す — `test/chat/handler.test.ts`
- `CF-Connecting-IP`ヘッダが無いリクエストでも例外を投げず処理を継続する — `test/chat/handler.test.ts`

### `checkRateLimit` / `DEFAULT_RATE_LIMIT_CONFIG`

- 短期・長期いずれの制限内でも許可する — `test/chat/rate-limit.test.ts`
- 短期ウィンドウ上限到達で`short_window`理由により拒否する — `test/chat/rate-limit.test.ts`
- 短期ウィンドウ外でも長期ウィンドウ上限到達で`long_window`理由により拒否する — `test/chat/rate-limit.test.ts`
- レート制限超過としてログされた記録はカウント対象外 — `test/chat/rate-limit.test.ts`
- IPごとに独立してカウントする — `test/chat/rate-limit.test.ts`
- `DEFAULT_RATE_LIMIT_CONFIG`の実値は`{ shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 }`である — `test/chat/rate-limit.test.ts`

### `classifyRoute`

- 依頼・見積もり文言はinquiryに分類する — `test/chat/route.test.ts`
- Works関連文言はworksに分類する — `test/chat/route.test.ts`
- 該当なしはthoughtsにデフォルト分類する — `test/chat/route.test.ts`
- language="en"でも同様に分類する — `test/chat/route.test.ts`

## ingest（`packages/handler`）

### `generateKnowledge`

- distDir配下をinclude/exclude globでフィルタし、含まれるページのみ知識化する — `test/ingest/generate.test.ts`
- knowledge/配下のMarkdownを追加コンテキストとして結合する — `test/ingest/generate.test.ts`
- 見積もりトークン数を算出し、閾値超過時にwarningsへ記録する — `test/ingest/generate.test.ts`
- zenn設定時、公開済みZenn記事を知識に含める — `test/ingest/generate.test.ts`
- articlesDir不在かつzennSnapshotPath設定時はスナップショットにフォールバックする — `test/ingest/generate.test.ts`
- articlesDir不在かつスナップショット未設定時はzenn取り込みをスキップしwarningsに記録する — `test/ingest/generate.test.ts`

### `createUrlMatcher`

- includeにマッチするパスのみ真を返す — `test/ingest/glob.test.ts`
- excludeが優先され、includeにマッチしていても除外される — `test/ingest/glob.test.ts`

### `htmlToText`

- titleと可視テキストを抽出し、script/styleの内容は含めない — `test/ingest/html-to-text.test.ts`

### `folio-agent-ingest` CLI

- `<config.json> <output.json>`を受け取り、config.jsonを読んでknowledgeを生成し、output.jsonにJSONとして書き出す — `test/ingest/cli.test.ts`
- 引数が欠けている場合、`process.exitCode = 1`を設定し標準エラーに使い方を出力する — `test/ingest/cli.test.ts`

## sync（`packages/handler`）

### `syncZennSnapshot`（`folio-agent-sync-zenn` CLI）

- config.zennから公開済みZenn記事のみをKnowledgePage[]としてJSON出力する — `test/sync/cli.test.ts`
- config.zenn未設定時は例外を投げる — `test/sync/cli.test.ts`

## init（`packages/handler`）

### `folio-agent-init` CLI

- ウィザードの回答一式から、config json・テーマCSS・APIルート雛形・`.dev.vars`・`.gitignore`が実際にファイルシステム上へ整合した内容で生成される — `test/init/cli.test.ts`（`describe("folio-agent-init main (E2E)")`。個々の生成ロジック関数は`test/init/questions.test.ts`・`test/init/writers.test.ts`・`test/init/cli.test.ts`でユニットレベルにもカバー済み）

## widget（`packages/widget`）

### `WIDGET_STYLES`（テーマCSS変数の契約）

- 各テーマトークン(`--folio-agent-surface`/`text`/`muted`/`accent`/`accent-contrast`/`font`)がvar()＋フォールバック値で参照される — `test/styles.test.ts`
- メッセージ吹き出しは改行を保持する — `test/styles.test.ts`
- `:host`はホストのcolor/color-schemeを継承する — `test/styles.test.ts`
- パネル/テキストの既定値はCSSシステムカラー(Canvas/CanvasText)から導出される — `test/styles.test.ts`
- 吹き出しの背景/枠線はcolor-mix導出で、テーマトークンがmutedより優先される — `test/styles.test.ts`
- mutedトークンは補助テキストのみに限定される — `test/styles.test.ts`

### `FolioAgentWidgetElement` / `defineFolioAgentWidget`

- 初期状態はトグルボタンのみ描画し、クリックまでネットワーク呼び出しをしない — `test/widget-element.test.ts`
- 初回オープン時のみpolicy-hrefリンク付き開示文言を表示し、複数回開閉しても複製されない — `test/widget-element.test.ts`
- 送信でendpoint属性のURLへPOSTし、ユーザー発言とAI回答を吹き出しとして描画する — `test/widget-element.test.ts`
- ネットワークエラー時は通信エラー文言を表示する — `test/widget-element.test.ts`
- endpoint属性が無い場合は設定エラー文言を表示しfetchを呼ばない — `test/widget-element.test.ts`
- lang="en"でプレースホルダ・送信ラベル・開示文言・エラー文言が英語になる — `test/widget-element.test.ts`（`describe("lang=en")`）
- 未知のlang属性値は日本語にフォールバックする — `test/widget-element.test.ts`（`describe("lang=en")`）
