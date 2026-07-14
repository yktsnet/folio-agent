## 保証台帳の欠落埋め（レート制限周りの小粒欠落 + ingest/init CLIのE2E）
id: 18
branch-slug: guarantees-gap-tests
github_issue:
status: open
type: feat
対象:
- packages/handler/test/chat/handler.test.ts（欠落テスト2件追加）
- packages/handler/test/chat/rate-limit.test.ts（欠落テスト1件追加）
- packages/handler/src/ingest/cli.ts（`main`をexportする）
- packages/handler/test/ingest/cli.test.ts（新規）
- packages/handler/src/init/cli.ts（`main`をexportする）
- packages/handler/test/init/cli.test.ts（E2Eケースを追加）
- docs/guarantees.md（該当項目の「欠落」マーカーを外す）
確認: npm run typecheck / npm run test

---

### 背景

`/guarantee-audit`による保証棚卸しで `docs/guarantees.md`（本Issueに先立ちuserの裁可を経て着地済み）を敷設した際、実装は既にあるがテストで固定されていない欠落を5件発見した。台帳内では各項目に「欠落（テスト未着地、本Issueで追加予定）」と記載している。

なお棚卸しの過程で、`DEFAULT_RATE_LIMIT_CONFIG`の実値（`packages/handler/src/chat/types.ts:16`、`shortWindowMax: 6 / longWindowHours: 12 / longWindowMax: 12`）と、ユーザーのグローバル指示に含まれる記述（「10分3問・日次10問」）が食い違っていることに気づいた。実装が正であり、本Issueのスコープ外（実値の変更は行わない。テストで現在の実値を固定するのみ）。

### 保証
- 新たに宣言する保証:
  - `createChatHandler`は`message`が1000字を超える場合、400を返す
  - `createChatHandler`は`CF-Connecting-IP`ヘッダが無いリクエストでも例外を投げず処理を継続する（IPは`"unknown"`として扱われる）
  - `DEFAULT_RATE_LIMIT_CONFIG`の実値は`{ shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 }`である
  - `folio-agent-ingest`は`<config.json> <output.json>`を受け取り、config.jsonを読んでknowledgeを生成し、output.jsonにJSONとして書き出す
  - `folio-agent-ingest`は引数が欠けている場合、`process.exitCode = 1`を設定し標準エラーに使い方を出力する
  - `folio-agent-init`のウィザードを一連の入力で駆動したとき、config json・テーマCSS・APIルート雛形・`.dev.vars`・`.gitignore`が実際にファイルシステム上へ整合した内容で生成される
- 維持する保証: `docs/guarantees.md`に列挙済みの全項目（本Issueでは変更しない）

内容: `docs/guarantees.md`に「欠落」として記載した5件のテストを追加し、台帳の該当行から欠落マーカーを外す。

### 詳細

**1. `packages/handler/test/chat/handler.test.ts`**

- `message`が1001字（または`MAX_INPUT_LENGTH`超過分）のケースで400が返ることを確認するテストを追加する
- `CF-Connecting-IP`ヘッダを付けずにリクエストしても200が返り、例外にならないことを確認するテストを追加する（`handler.ts`の`ip = request.headers.get("CF-Connecting-IP") ?? "unknown"`のフォールバック）

**2. `packages/handler/test/chat/rate-limit.test.ts`**

- `DEFAULT_RATE_LIMIT_CONFIG`（`chat/types.ts`からexport）が`{ shortWindowMinutes: 10, shortWindowMax: 6, longWindowHours: 12, longWindowMax: 12 }`と一致することを確認するテストを追加する

**3. `packages/handler/src/ingest/cli.ts`**

`main()`（1-25行目）は現状exportされておらず、モジュール読み込み時に即実行される（27-30行目）。`packages/handler/src/sync/cli.ts`の`syncZennSnapshot`が既に採用しているパターン（ロジック本体をexportされた関数に切り出し、CLIエントリポイントはそれを呼ぶだけにする）に倣い、`main`をexportする。既存のトップレベル実行（`main().catch(...)`）はそのまま残してよい。

テスト（`test/ingest/cli.test.ts`、`test/ingest/generate.test.ts`のtmpdirパターンを踏襲）:
- 一時ディレクトリにdist/とconfig.jsonを用意し、`main`相当の関数を実行して、`output.json`に期待通りのKnowledgeDocumentが書き出されることを確認する
- 引数が欠けているケースで`process.exitCode`が1になることを確認する

**4. `packages/handler/src/init/cli.ts`**

`main()`（167行目〜）も同様に現状exportされていない。ウィザードは`@clack/prompts`で対話入力を受けるため、E2Eテストでは`@clack/prompts`を`vi.mock`でスタブし、一連の回答を注入した上で`main`を呼び出す。

テスト（`test/init/cli.test.ts`に追加）:
- 一時ディレクトリで実行し、想定される回答一式を注入したとき、config json・テーマCSS・APIルート雛形・`.dev.vars`・`.gitignore`が実際に生成され、その内容が`test/init/writers.test.ts`で個別に検証済みの各関数の出力と整合することを確認する
- 既存configがあるケース（`buildConfigJson`のプレビュー保持ロジックが効くケース）を最低1つ含める

E2Eの網羅性より「CLIとして実際に動く」ことの確認が主目的のため、ケース数は実行者の判断で絞ってよい（自由度を残す）。

**5. `docs/guarantees.md`**

上記5件のテストが着地したら、該当行の「— 欠落（テスト未着地、本Issueで追加予定）」を実際のテストファイル・出典に置き換える。

### スコープ外
- `init/`配下の個別関数群（`isValidHexColor`・`parseIncludeList`・`buildConfigJson`・`buildThemeCss`等）は`folio-agent-init` CLIの内部ビルディングブロックであり、`src/index.ts`で再公開されていないため`docs/guarantees.md`には載せない
- `DEFAULT_RATE_LIMIT_CONFIG`の実値そのものの変更（CLAUDE.mdの記述との食い違いの解消）は本Issueのスコープ外
