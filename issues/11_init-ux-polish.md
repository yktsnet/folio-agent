## folio-agent-init の UX 改善（初回 dogfooding のフィードバック）
id: 11
branch-slug: fix/init-ux-polish
github_issue: 22
status: close
type: fix
対象: packages/handler/src/init/cli.ts, packages/handler/src/init/questions.ts, packages/handler/src/init/writers.ts, 対応するテストファイル
内容: 実サイトでの初回 dogfooding で見つかった6点を修正する。秘密情報の gitignore 保証、theme.css の配信されない生成先、スニペット案内の文言とコピー性、Zenn baseUrl のバリデーション、既存導入サイトでの不要な雛形生成。
確認: npm run typecheck / npm run test

---

### 背景

既に手動導入済みのサイトで `folio-agent-init` を通しで実行したところ、完走はするが以下の問題が出た。1・2 は実害（秘密情報のコミットリスク・404）、3〜6 は案内の言葉足らず。

### 仕様詳細

#### 1. `.dev.vars` の gitignore 保証

`GEMINI_API_KEY` を `.dev.vars` に書き込む際、利用者リポの `.gitignore` を確認し、`.dev.vars` が含まれていなければ追記する（`.gitignore` が無ければ作成する）。書き込みサマリと完了メッセージにも「.gitignore に追記した / 済みだった」を1行表示する。追記判定はコメント行や `*.vars` 等の広いパターンまで解釈しなくてよい（行頭一致で `.dev.vars` があるかだけ見る。誤って重複追記しても無害）。

#### 2. theme.css の生成先と読み込み案内

現状はカレントのルートに `folio-agent.theme.css` を生成し、スニペットで `<link rel="stylesheet" href="/folio-agent.theme.css">` を案内するが、Astro / Next 等ではルート直下のファイルは配信されず 404 になる。以下に変更する:

- カレントに `public/` ディレクトリが存在する場合: `public/folio-agent.theme.css` に生成し、`<link>` 案内を維持する。
- `public/` が無い場合: ルートに生成し、スニペットの `<link>` 行の代わりに「レイアウトで `import "./folio-agent.theme.css";`（バンドラがあるサイト向け。相対パスは配置に合わせて調整）」を案内する。
- 再実行時は前回の生成先（config に記録するか、両パスの存在確認）へ書き込み、HMR 反映の設計を維持する。

#### 3. スニペット案内の文言

「レイアウトに以下を1回だけ貼り付けてください」の「レイアウト」が伝わらない。「サイトの全ページで読み込まれる共通テンプレート（Astro なら `src/layouts/` のレイアウト、素の HTML なら `</body>` の直前）」のように具体化する。また、既に `<folio-agent-widget>` を導入済みのサイト（config が既存だった場合）には「widget 導入済みなら theme.css の読み込みだけ追加すればよい」旨を添える。

#### 4. スニペットのコピー性

スニペットを `clack.note` の枠内に表示すると、コピー時に罫線が混ざり、長い行は折り返しでタグが割れる。案内文は note のままでよいが、スニペット本体は枠の外にプレーンな stdout で出力する。

#### 5. Zenn baseUrl のバリデーション

現状は `yktsnet` のようなユーザー名だけの入力がそのまま config に入り、知識内の記事リンクが壊れる。入力が `http(s)://` で始まらない場合はユーザー名とみなして `https://zenn.dev/<入力値>/articles` に正規化し、確定値を確認表示する。URL 形式ならそのまま受ける。

#### 6. API ルート雛形の「生成しない」選択

既に別の経路（Astro エンドポイント等）で handler を配線済みのサイトでは、`functions/api/chat.ts` の雛形が不要ファイルになる（Cloudflare Pages では `functions/` の存在が既存配線と干渉し得る）。出力先の質問に「生成しない」を選べるようにし、config が既存だった再実行ではデフォルトを「生成しない」にする。新規（config 無し）でのデフォルトは従来どおり `functions/api/chat.ts`。

### テスト方針

対話部分と分離された純粋関数として追加・変更する:

- `.gitignore` 内容 → 追記要否の判定と追記結果
- `public/` 有無 → theme.css 生成先とスニペット内容の分岐
- baseUrl 入力（ユーザー名 / URL）→ 正規化結果
- config 既存/新規 → API ルート質問のデフォルト

文言変更は既存のスナップショット的テストがあれば追従する。
