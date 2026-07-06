## init: .dev.vars の .gitignore 保護を Gemini キー入力の有無に依存させない
id: 13
branch-slug: init-gitignore-unconditional
github_issue: 24
status: close
type: fix
対象: packages/handler/src/init/cli.ts, packages/handler/test/init/cli.test.ts（無ければ既存の init 系テストファイルを確認）
内容: ウィザードで Gemini API キー入力をスキップした場合、`.gitignore` に `.dev.vars` が一切追記されない。案内通りに後から手動で `.dev.vars` にキーを書いても無防備なまま残るため、`.dev.vars` の gitignore 追記をキー入力の有無から切り離す。
確認: npm run typecheck / npm run test

---

### 経緯・実害

`packages/handler/src/init/cli.ts:174-178` で、`.gitignore` への `.dev.vars` 追記（`ensureGitignoreEntry` 呼び出し）は次の条件でのみ実行される。

```
const nextDevVars = answers.geminiApiKey
  ? upsertDevVar(...)
  : undefined;
const gitignoreResult =
  nextDevVars !== undefined ? ensureGitignoreEntry(...) : undefined;
```

`answers.geminiApiKey` はウィザードで「任意。空 Enter でスキップ」と案内される入力で（`packages/handler/src/init/questions.ts:99`, `225-226`）、スキップした場合のメッセージは「スキップしました。キーは https://aistudio.google.com/apikey から取得できます」と、**後から手動で `.dev.vars` に追記することを前提にした案内**になっている。

しかしウィザードでスキップした場合、`nextDevVars` は `undefined` のままなので `ensureGitignoreEntry` が一度も呼ばれず、`.gitignore` に `.dev.vars` は追記されない。案内に従って後から手動でキーを書き込んだユーザーは、`.dev.vars` が無防備な(gitignoreされていない)状態のまま気づかず `git add` してしまうリスクを常に抱える。

これは仮説ではなく実害が発生済み: portfolio-astro (`/Users/ykts/github-public/portfolio-astro`) でこの経路（ウィザードでスキップ→後から手動追記）を踏み、`.dev.vars` に Gemini API キーが平文でコミットされ、GitGuardian の検知により GitHub 上への公開漏洩が発覚した（2026-07-06, コミット `a8e98ec`）。当該リポ側は git-filter-repo による履歴除去・force-push・該当 Dependabot PR の削除で事後対応済みだが、根本原因は folio-agent の init 側にある。

### 修正方針

- `.dev.vars`（`DEV_VARS_PATH = ".dev.vars"`, `cli.ts:25`）は init CLI 自身が定義する既知のファイル名であり、ウィザードでキーを書き込むかどうかに関係なく、**常に `.gitignore` に含まれるようにする**。
  - 具体的には、`ensureGitignoreEntry(await readTextOrEmpty(GITIGNORE_PATH), DEV_VARS_PATH)` を `nextDevVars` の有無で条件分岐せず、`init` 実行時に毎回（他の書き込み処理と並べて）呼び出す形に変更する。
  - `ensureGitignoreEntry` 自体は既に「追記済みなら何もしない」（`changed: false` を返す）実装のはずなので、無条件に呼んでも既存動作に副作用は出ない想定。呼び出し側（summary 表示・note 表示のロジック、`cli.ts:178`以降の `summaryLines`/`gitignoreResult` まわり）が `nextDevVars` の有無を前提に分岐している箇所も、`gitignoreResult` を独立して常時計算する形に合わせて調整すること。
- 影響範囲の確認: `nextDevVars` は `.dev.vars` への書き込み要否の判定にのみ使うようにし、`.gitignore` の追記判定とは独立させる。

### テスト

- `packages/handler/test/init/cli.test.ts`（無ければ既存の init 系テストファイル名を確認して合わせる）: Gemini API キーをスキップして実行した場合でも、`.gitignore` に `.dev.vars` が追記されることを確認するケースを追加。
- 既存の「キーを入力した場合」のテストが引き続き通ることも確認。
