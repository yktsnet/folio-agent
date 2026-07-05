## ウィジェットの可読性改善と適応型デフォルトテーマ
id: 05
branch-slug: widget-readability-and-adaptive-theme
github_issue:
status: open
type: feat
対象: |
  packages/widget/src/styles.ts
  packages/widget/test/（styles/表示まわりの既存テストの追随）
  packages/handler/src/chat/gemini.ts（共通前文への段落指示の追加）
  packages/handler/test/chat/gemini.test.ts
  README.md（Usage §3 のテーマ説明の更新）
内容: |
  利用者第1号（portfolio-astro）の実地フィードバック3点を反映する。
  ①回答の改行が表示に反映されない ②パネル・吹き出しの余白が詰まっている
  ③テーマトークンの意味づけが曖昧で、利用側の自然なマッピングが破綻する
  （muted に文字色を入れたら吹き出し背景が濃色になった）。
確認: |
  npm run typecheck / npm test が通ること。dev ハーネスでの見た目確認は
  user が実施（PR の ## 検証手順 に、ライト/ダーク両方 + トークン未指定/
  指定ありの4通りを確認する手順を記載）。

---

### 1. 改行の反映

- 回答表示の要素に `white-space: pre-wrap` がなく、応答中の `\n` が潰れて長文が一塊になる。styles.ts で吹き出し内テキストに適用する。
- あわせて `gemini.ts` の共通前文に「2〜4文ごとに空行で段落を分ける」趣旨の指示を追加する（プレーンテキスト方針は維持。Markdown 禁止の既存指示と両立させる）。

### 2. 余白

- 現状はパネル padding 12px・吹き出し padding 6px 10px で詰まって見える。吹き出しは 10px 14px 程度、吹き出し間の間隔 8px 以上、`line-height` 1.6 前後を目安に調整する（最終値は見た目で実行者が判断してよい）。

### 3. 適応型デフォルトテーマ

現状の問題: `--folio-agent-muted` がアシスタント吹き出しの背景（styles.ts:55）と補足テキストの文字色（styles.ts:68）の二役を担っている。利用側が「muted = 控えめな文字色」と解釈して中間色を入れると、吹き出し背景が濃色になり本文が読めなくなる（portfolio-astro で実際に発生）。

方針: トークンを増やして役割分割するのではなく、**未指定時の既定をホスト配色からの導出に変える**。

- `:host` で `color: inherit`・`color-scheme: inherit` とし、文字色・フォントはホスト継承を既定にする。
- パネル面は `Canvas`、基本文字色は `CanvasText`（CSS システムカラー。`color-scheme` に追従するため、ダークサイトでは自動で暗い面になる）。
- 吹き出し背景・境界線は `color-mix(in srgb, CanvasText 8%, Canvas)` のような導出色にする（訪問者側・アシスタント側で混合比を変えて区別する）。
- 6トークン（surface / text / muted / accent / accent-contrast / font)は明示上書きの手段としてすべて残す。`var(--folio-agent-*, <導出既定>)` の形にし、指定があれば従来どおり効く。muted の役割は「補足テキストの文字色」に一本化し、吹き出し背景には使わない。
- README の Usage §3 を「未指定でもサイトのライト/ダークに馴染む。変えたい場合のみトークンを上書き」という説明に書き換える。
- 既定値の変更なのでバージョンは 0.2.0 に上げる（トークン指定済みの利用者には破壊にならないが、見た目の既定は変わる）。
