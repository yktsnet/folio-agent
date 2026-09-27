# Guarantee Ledger

## Guarantees

### 1. `packages/handler/test/chat/prompt/index.test.ts` — packages/handler/src/chat/prompt/index.ts (buildSystemPrompt)

- 各route（thoughts/works/inquiry）で無捏造原則（サイト未記載の明示を含む）を含む文言を生成する
- 各routeでMarkdown禁止・プレーンテキスト出力の指示を含む
- 各routeで段落分け（2〜4文ごとに空行）の指示を含む
- 各routeで、リンクは `[表示する文字](URL)` で書き、このサイト内のページはリンクにせず名前で案内する指示を含む
- 渡されたknowledge文字列をプロンプトに埋め込む
- route別に異なる指示文を出す
- inquiry routeでcontactUrl指定時はプロンプトに埋め込み、未指定時は既定の問い合わせ案内文言を使う
- contactUrl指定時は、どのrouteでもContactへのリンクの書き方の見本（`[Contactページ](URL)`）を含める
- language="en"指定時、上記の各保証が英語で提供され、日本語語彙が混入しない

| 保証（要約） | 対応テスト |
|---|---|
| 無捏造原則を含む | `includes the no-fabrication principle for %s` |
| プレーンテキスト出力の指示 | `includes the plain-text output instruction for %s` |
| 段落分けの指示 | `includes the paragraph-break instruction for %s` |
| リンクの書き方・サイト内ページの扱いの指示 | `asks for [text](URL) links and names this site's pages instead of linking them, for %s` |
| knowledgeの埋め込み | `embeds the knowledge for %s` |
| route別の指示切替 | `switches route-specific instructions per route` |
| inquiryのcontactUrl扱い（指定時／未指定時） | `embeds contactUrl into the inquiry instruction when provided` / `keeps the existing inquiry wording when contactUrl is not provided` |
| Contactリンクの見本（全route） | `gives the Contact link as an example to copy on every route when contactUrl is provided, for %s` / `gives the Contact link example in English` |
| 英語版での上記保証・日本語語彙の非混入 | `describe("language: en")` 配下の全テスト |

### 2. `packages/handler/test/chat/graph.test.ts` — packages/handler/src/chat/graph.ts (buildChatGraph)

- レート制限内ならroute分類→生成→ログ記録まで一気通貫で実行する
- 回答の形式に合う回答は、生成1回でそのまま返す
- 回答の形式に違反した回答は、違反の箇所を添えて1回だけ作り直させ、作り直した回答を返してログに残す。違反は `logAnswerViolation` に記録する
- 作り直しても違反した回答は、3回目を呼ばずに文字だけにして返す（返す回答は必ず回答の形式に合う）
- 違反の記録に失敗しても回答は返す
- 生成失敗時は生の例外を出さず、固定のフォールバック文言を返しログに残す
- レート制限超過時は生成をスキップし、route="rate_limited"・固定の上限文言でログに残す
- language="en"で英語メッセージの分類・生成・フォールバック・上限文言が英語になる

| 保証（要約） | 対応テスト |
|---|---|
| 正常系の一気通貫実行 | `routes, generates, and logs when under the rate limit` |
| 形式に合う回答はそのまま | `returns a compliant answer as is, generating only once` |
| 違反の指摘と1回の作り直し | `points out a format violation and has the model correct it once` |
| 作り直しても違反なら文字だけに | `falls back to plain text when the corrected answer still breaks the format, without asking a third time` |
| 記録の失敗で止めない | `still answers when recording a violation fails` |
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
- 回答の形式に違反した回答を D1 の `answer_violations` に記録し、訪問者の入力は記録しない

| 保証（要約） | 対応テスト |
|---|---|
| 正常応答 | `returns a generated answer for a valid message` |
| 空メッセージの拒否 | `rejects an empty message with 400` |
| 非JSONボディの拒否 | `rejects a non-JSON body with 400` |
| レート制限の適用 | `enforces the rate limit across requests from the same IP` |
| 1000字超のメッセージの拒否 | `rejects a message over 1000 characters with 400` |
| 違反の記録（訪問者の入力なし） | `records answers that broke the answer format in answer_violations, without the visitor's message` |
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
- npmがnode_modules/.bin/に張るシンボリックリンク経由で実行された場合もmain()を実行し、knowledge.jsonを書き出す

| 保証（要約） | 対応テスト |
|---|---|
| config読み込み→knowledge生成→書き出し | `reads config.json, generates knowledge, and writes it to output.json` |
| 引数欠如時のexitCode | `sets process.exitCode to 1 and does not write output.json when arguments are missing` |
| binシンボリックリンク経由でのmain()実行 | `describe("folio-agent-ingest CLI (bin symlink execution)")` > `runs main() and writes the output file when invoked via a bin-style symlink` |

### 9. `packages/handler/test/ingest/html-to-text.test.ts` — packages/handler/src/ingest/html-to-text.ts (htmlToText)

- titleと可視テキストを抽出し、script/styleの内容は含めない

| 保証（要約） | 対応テスト |
|---|---|
| title・可視テキスト抽出 | `extracts the title and visible text, dropping scripts and styles` |

### 10. `packages/handler/test/sync/cli.test.ts` — packages/handler/src/sync/cli.ts (syncZennSnapshot / folio-agent-sync-zenn CLI)

- config.zennから公開済みZenn記事のみをKnowledgePage[]としてJSON出力する
- config.zenn未設定時は例外を投げる
- npmがnode_modules/.bin/に張るシンボリックリンク経由で実行された場合もmain()を実行し、スナップショットを書き出す

| 保証（要約） | 対応テスト |
|---|---|
| 公開済み記事のみをJSON出力 | `writes only published articles to the output JSON as KnowledgePage[]` |
| zenn未設定時の例外 | `throws when config.zenn is not set` |
| binシンボリックリンク経由でのmain()実行 | `describe("folio-agent-sync-zenn CLI (bin symlink execution)")` > `runs main() and writes the output file when invoked via a bin-style symlink` |

### 11. `packages/handler/test/init/cli.test.ts` — packages/handler/src/init/cli.ts (folio-agent-init CLI, main)

- 対話を持たず、引数と環境変数だけで動く。初回は既定値で config json・APIルート雛形・`.dev.vars`（`GEMINI_API_KEY` がある場合）・`.gitignore`・build スクリプトを整合した内容で生成し、既定の `auto` ではテーマCSSを書かない
- `--theme` のプリセットでテーマCSSを書き、`--theme auto` に戻すと削除する
- 既存configがある場合、渡さなかった値と init が扱わないフィールドは維持し、APIルート雛形は生成しない
- build スクリプトへ追記する ingest の出力先は `<distDir>/knowledge.json` で、build スクリプトが既に `folio-agent-ingest` を含むなら（引数が違っても）追記しない
- `--dry-run` では何も書き込まない
- 不正な引数では何も書き込まず `process.exitCode = 1` を設定する
- npmがnode_modules/.bin/に張るシンボリックリンク経由で実行された場合もmain()を実行する

| 保証（要約） | 対応テスト |
|---|---|
| フレッシュセットアップの生成物一式 | `writes config json, API route scaffold, .dev.vars and .gitignore for a fresh setup, with no theme CSS by default` |
| テーマCSSの生成と auto での削除 | `writes the theme CSS for a theme preset, and removes it again with --theme auto` |
| 再実行での値の維持・雛形のスキップ | `keeps an existing config's values and unmanaged fields on a re-run, and skips the API route scaffold` |
| ingest の出力先と二重追記の防止 | `writes knowledge.json under distDir, and doesn't add a second ingest to a build script that already has one` |
| `--dry-run` で書き込みなし | `writes nothing with --dry-run` |
| 不正な引数での exitCode | `sets process.exitCode to 1 and writes nothing on invalid arguments` |
| binシンボリックリンク経由でのmain()実行 | `describe("folio-agent-init CLI (bin symlink execution)")` > `runs main() and prints usage when invoked via a bin-style symlink` |

### 12. `packages/widget/test/styles.test.ts` — packages/widget/src/styles.ts (WIDGET_STYLES)

- 各テーマトークン(`--folio-agent-surface`/`text`/`muted`/`accent`/`accent-contrast`/`font`)がvar()＋フォールバック値で参照される
- メッセージは改行を保持する
- `:host`はホストのcolor/color-schemeを継承する
- surface/textの既定値はCSSシステムカラー(Canvas/CanvasText)から、accentの既定値はtextから、accent-contrastの既定値はsurfaceから導出される
- ユーザー発言の吹き出しの背景/枠線はaccentとsurfaceのcolor-mixで導出され、AI回答は塗りを持たない
- mutedトークンは補助テキストのみに限定される
- 文字選択の背景色と入力欄のキャレット色はaccentから導出される（ブラウザ既定の色を使わない）
- 入力欄の文字サイズは16px（iOS Safariのフォーカス時拡大を起こさない）
- 幅640px以下では全画面で開き、高さと上端は表示領域（visualViewport）から流し込まれる値に従う

| 保証（要約） | 対応テスト |
|---|---|
| テーマトークンのvar()参照 | `references %s via var() with a fallback` / `no longer hardcodes the themed colors without a var() fallback` |
| 改行の保持 | `preserves newlines in message bubbles` |
| :hostの継承 | `makes :host adopt the host's color and color-scheme so system colors adapt` |
| 既定値の導出 | `derives surface and text defaults from CSS system colors, and accent from text` |
| 吹き出しのcolor-mix導出 | `derives the user bubble from accent and surface via color-mix, and gives assistant text no fill` |
| mutedの補助テキスト限定 | `keeps muted scoped to supplementary text only, not bubble backgrounds` |
| 選択色・キャレット色のaccent導出 | `derives the text selection color and the caret color from accent instead of the browser default` |
| 入力欄16px | `keeps the input at 16px so iOS Safari does not zoom on focus` |
| 狭い画面での全画面表示 | `goes full screen on narrow viewports, sized from the visual viewport` |

### 13. `packages/widget/test/widget-element.test.ts` — packages/widget/src/widget-element.ts (FolioAgentWidgetElement / defineFolioAgentWidget)

- 初期状態は閉じたトグルボタンのみ見え、クリックまでネットワーク呼び出しをしない
- トグルで開き、閉じるボタンとEscキーで閉じる。開閉状態は`aria-expanded`/`aria-hidden`に反映される
- パネル内にpolicy-hrefリンク付き開示文言を表示し、複数回開閉しても複製されない
- 既定の案内文と質問候補を表示し、`heading`/`greeting`/`suggestions`属性で差し替え・非表示にできる
- 質問候補のクリックでその文言を送信し、候補を消す
- 送信でendpoint属性のURLへPOSTし、ユーザー発言とAI回答を描画する
- AI回答の `[表示する文字](URL)` はその文字のリンクとして、そのまま書かれた `http(s)://` URL はURLのリンクとして描き、それ以外はテキストのまま扱う（HTMLを解釈しない）。ユーザー発言はリンクにしない
- 同じサイト内のリンクは同じタブで、外部のリンクは新しいタブ（`noopener noreferrer`）で開く
- ヘッダ2行目は既定文言を持ち、`slot="subheading"` の要素で差し替えられる
- 回答待ちの間は入力中表示を出し、送信ボタンを無効にする
- 「新しい会話」ボタンは発言があるときだけ表示され、押すと案内文と質問候補の状態に戻る。戻す前に送った質問の回答は描画しない
- ネットワークエラー時は通信エラー文言を表示する
- endpoint属性が無い場合は設定エラー文言を表示しfetchを呼ばない
- lang="en"でトグル・プレースホルダ・送信/閉じる/新しい会話のラベル・開示文言・エラー文言が英語になる
- 未知のlang属性値は日本語にフォールバックする

| 保証（要約） | 対応テスト |
|---|---|
| 初期状態でネットワーク呼び出しなし | `renders only a closed toggle button and makes no network call until clicked` |
| 開閉（閉じるボタン・Esc） | `opens with the toggle and closes with the close button or Escape` |
| 開示文言の表示・非複製 | `shows the disclosure line with a policy link exactly once in the panel` |
| 案内文・質問候補と属性での差し替え | `shows the default greeting and suggestions, and lets attributes override or remove them` |
| 質問候補の送信 | `sends a suggestion when clicked and removes the suggestions` |
| 送信・応答描画 | `sends a message to the configured endpoint and renders the answer` |
| 回答中のリンクの描画 | `renders [text](url) in answers as a link showing the text, not the URL` / `turns bare http(s) URLs in answers into links, leaving the rest as text` / `drops trailing ASCII punctuation from a linked URL` |
| リンクを開くタブ | `opens same-origin links in the current tab and external links in a new tab` |
| ヘッダ2行目の slot | `shows the default subheading and lets the site replace it through the subheading slot` |
| 回答待ちの表示と送信無効化 | `shows a typing indicator and disables sending until the answer arrives` |
| 新しい会話への切り替え | `shows the new-conversation button only after a message, and resets to the greeting and suggestions` / `drops an answer that arrives after the conversation was reset` |
| 通信エラー時の表示 | `renders a friendly message when the network request fails` |
| endpoint未設定時の設定エラー | `shows a config error and does not call fetch when endpoint is missing` |
| 英語ロケール対応 | `describe("lang=en")` 配下の該当テスト（トグル・プレースホルダ・送信/閉じるラベル・開示文言・エラー文言） |
| 未知langの日本語フォールバック | `falls back to ja for an unrecognized lang attribute` |

### 14. `packages/handler/test/ingest/format.test.ts` — packages/handler/src/ingest/format.ts (formatKnowledge)

- このサイトの外のページ（`http(s)://`）はタイトル・URL・本文で、このサイトのページは名前と本文だけ（URL なし・「このサイトのページ」の目印付き）で知識文字列にする
- このサイトのページのタイトルに共通するサイト名の接尾辞を外す（1ページにしかない接尾辞は外さない）
- language="en" では目印を英語にする

| 保証（要約） | 対応テスト |
|---|---|
| 外部ページとサイトのページの書き分け | `gives external pages their title and URL, and this site's pages only their name` |
| サイト名の接尾辞の除去 | `drops the site-name suffix shared by this site's page titles` / `keeps a suffix that appears on only one page, since it may be part of that title` |
| 英語の目印 | `labels this site's pages in English with language en` |

### 15. `packages/handler/test/chat/answer/links.test.ts` — packages/handler/src/chat/answer/links.ts (collectAnswerLinks)

- 知識のうち `http(s)://` で始まるページ（このサイトの外）と Contact を、回答に残してよいリンクとして集め、このサイト内のページは含めない
- Contact の表示名は言語に合わせ、contactUrl が無ければ Contact を含めない

| 保証（要約） | 対応テスト |
|---|---|
| 外部ページと Contact の収集 | `lists external pages from the knowledge and the Contact page, leaving this site's pages out` |
| Contact の表示名と省略 | `titles the Contact page in English with language en, and omits it without a contactUrl` |

### 16. `packages/handler/test/chat/gemini.test.ts` — packages/handler/src/chat/gemini.ts (createGeminiGenerator)

- 初回は訪問者の入力だけを送る
- 作り直しでは、元の質問・直前の回答・指摘を会話として送る

| 保証（要約） | 対応テスト |
|---|---|
| 初回の送信内容 | `sends the visitor's message alone on the first attempt` |
| 作り直しの会話 | `sends the question, the previous answer and the correction request as a conversation when correcting` |

## About

対象は`packages/handler`・`packages/widget`の`src/index.ts`（および各パッケージの`bin`エントリポイント）で公開される契約面のみ。対象外はそこで再公開されていない内部関数（`fileToUrlPath`・`estimateTokens`・`scanZennArticles`、`folio-agent-init`/`folio-agent-ingest` CLI内部のビルディングブロック関数群など）。**ここに載っていない振る舞いは約束ではなく、予告なく変わりうる。** 位置づけは[docs/design-decisions.md](design-decisions.md)と同格の正であり、実装がこれと食い違う場合は指摘する。
