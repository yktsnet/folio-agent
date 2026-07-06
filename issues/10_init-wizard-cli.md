## 対話式セットアップ CLI（folio-agent-init）の追加
id: 10
branch-slug: feat/init-wizard-cli
github_issue:
status: open
type: feat
対象: packages/handler/package.json, packages/handler/src/init/cli.ts (新規), packages/handler/src/init/questions.ts (新規), packages/handler/src/init/writers.ts (新規), packages/handler/src/ingest/types.ts, 対応するテストファイル (新規)
内容: `npx folio-agent-init` で対話ウィザードを起動し、config・テーマCSS・APIルート雛形・build スクリプト・.dev.vars を自動生成する。利用者の手作業はレイアウトへの5行スニペット貼り付け（初回のみ）に圧縮する。Issue 08（プレイグラウンド）を supersede する。
確認: npm run typecheck / npm run test

---

### 背景と目的

現在の導入は「config を手書き → ingest をビルドに組み込み → API ルートを配線 → widget タグと CSS 変数を埋め込む」と多段で、テーマ確認用プレイグラウンド（Issue 08）を作っても解決範囲がカラー選びに限られる。代わりに Powerlevel10k 型の対話 CLI を提供し、質問に答えるだけで自分のサイトの dev サーバー上に Bot が現れる状態まで持っていく。テーマの微調整は利用者自身のローカルホスト（HMR）で行うため、プレイグラウンドは不要になる。

前提: Issue 09（JP/EN 言語対応）が先にマージされていること。ウィザード最初の質問が言語選択であり、その値を config と widget スニペットに反映するため。

### 仕様詳細

#### 1. bin の追加

- `packages/handler/package.json` の `bin` に `folio-agent-init: dist/init/cli.js` を追加する（`folio-agent-ingest` と同居。新パッケージは作らない）。
- 対話 UI には `@clack/prompts` を使う。`dependencies` に追加してよい（Workers バンドルには import されない限り入らない）。

#### 2. 質問フロー（1本道・全問にデフォルトあり）

クイック/詳細のモード分岐は作らない。全問にデフォルトを持たせ、Enter 連打が実質クイックモードになる設計とする。

1. 言語 JP / EN（widget の `lang` と handler の `language`、および以降のウィザード表示言語に反映）
2. `distDir`（デフォルト `dist`）
3. `include` グロブ（デフォルト `/**`、カンマ区切り複数可）
4. Zenn 連携の有無（デフォルト無し。有りなら `articlesDir` と `baseUrl` を続けて質問）
5. Contact URL（任意。空 Enter でスキップ）
6. カラーコード3つ: accent / surface / text（各デフォルトあり。`#` 付き hex を受け付け、簡易バリデーションする。カラーピッカーは作らない — 追い込みは利用者のローカルホストで行う旨を完了メッセージで案内する）
7. Gemini API キー（任意。入力されたら `.dev.vars` に書く。スキップ時は取得先 URL を案内）
8. API ルート雛形の出力先（デフォルト `functions/api/chat.ts`）

#### 3. 生成・修正するファイル（ウィザードが所有するもの）

- `folio-agent.config.json` — 既存の `IngestConfig` 項目に加え、ウィザードの回答を保持する `language` と `theme`（3色）を追加する。`packages/handler/src/ingest/types.ts` の型を拡張し、ingest 側が新フィールドを無害に無視することを確認する。
- `folio-agent.theme.css` — 回答した3色を `folio-agent-widget { --folio-agent-accent: ...; }` 形式で書き出す。**再実行時はこのファイルの書き換えだけで dev サーバーの HMR に反映される**ことが設計の核。
- API ルート雛形 — `createChatHandler` を組んだ最小ファイル。既存ファイルがある場合は上書きせずスキップして通知する。
- `package.json` の `build` スクリプト — `folio-agent-ingest folio-agent.config.json dist/knowledge.json` が含まれていなければ末尾に `&&` で追記する。含まれていれば触らない。
- `.dev.vars` — `GEMINI_API_KEY` を追記（キーが既にあれば値を更新）。

#### 4. ウィザードが書かないもの（完了メッセージで案内する）

- レイアウトへの埋め込みスニペット（widget タグ + `defineFolioAgentWidget()` の script、`folio-agent.theme.css` の import）。利用者のレイアウトファイルを自動編集するのは壊しやすいため、完了時に**回答値を埋めた完成形スニペット**を表示して貼ってもらう。初回1回のみで、再実行では不要である旨を明示する。
- D1 のセットアップ。未設定でも「widget の表示とテーマ確認はローカルで動く。チャット応答には D1 と API キーが必要」と段階を正直に表示する。

#### 5. 再実行の挙動

- 起動時に `folio-agent.config.json` があれば読み、全質問のデフォルトを現在値にして**毎回全問聞き直す**（差分編集モードは作らない）。
- 書き込み前に、生成・変更するファイル一覧と各ファイルの新旧要約を表示して最終確認を取る。

#### 6. Issue 08 の扱い

本 Issue が 08（widget プレイグラウンド）を supersede する。08 は closed 済み。

### テスト方針

対話部分（`@clack/prompts` 呼び出し）と純粋ロジックを分離し、後者をユニットテストする:

- 回答オブジェクト → config JSON / theme CSS / API ルート雛形 の生成関数
- `build` スクリプトへの追記判定（既に含む場合は不変）
- `.dev.vars` の追記・更新
- hex カラーコードのバリデーション

対話フロー自体の確認は手動とし、手順を PR の `## 検証手順` に記載する。
