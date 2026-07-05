## PR記録: feat: widgetの可読性改善と適応型デフォルトテーマ
issue: 05 (05_widget-readability-and-adaptive-theme.md)
PR: https://github.com/yktsnet/folio-agent/pull/8
Merged: 0e43b78e700fac678f3c71708cc6f9b9e684da57

## 変更内容

利用者第1号（portfolio-astro）の実地フィードバック3点を反映した。

1. **改行の反映**: `.message` に `white-space: pre-wrap` を追加し、応答中の `
` が潰れず表示されるようにした。あわせて `gemini.ts` の共通前文に「回答が長くなる場合は2〜4文ごとに空行を挟んで段落を分ける」指示を追加(プレーンテキスト・Markdown禁止の既存方針は維持)。
2. **余白**: 吹き出し padding を `6px 10px` → `10px 14px`、パネル padding を `12px` → `16px`、メッセージ間 gap を `8px` → `10px`、`line-height` を `1.5` → `1.6` に調整した。
3. **適応型デフォルトテーマ**: `--folio-agent-muted` がアシスタント吹き出し背景と補足テキスト文字色の二役を担っていた問題(利用側が中間色を入れると吹き出し背景が濃色になり本文が読めなくなる)を解消。トークンを増やさず、未指定時の既定をホスト配色からの導出に変更した。
   - `:host` に `color: inherit` / `color-scheme: inherit` を追加し、文字色・フォント(`--folio-agent-font` の既定)はホスト継承にした。
   - パネル面は `Canvas`、基本文字色は `CanvasText`(CSSシステムカラー。`color-scheme` に追従してダークサイトでは自動で暗い面になる)を既定にした。
   - 吹き出し(訪問者・アシスタント双方)の背景・境界線は `color-mix(in srgb, CanvasText N%, Canvas)`(混合比を変えて区別)による導出色にし、`muted` トークンは使わなくした。`muted` の役割は「補足テキストの文字色」(disclosure)に一本化。
   - トグルボタン・送信ボタンの `accent` / `accent-contrast` の既定値も `CanvasText` / `Canvas` の導出値にした。6トークンはすべて `var(--folio-agent-*, <導出既定>)` の形で明示上書きの手段として残る。
   - `form` の区切り線・`input` の文字色/背景もパネルの配色に合わせて調整した。
   - README の Usage §3 を「未指定でもホスト配色から自然に馴染む」という説明に更新した。

## 静的確認結果

- `npm run typecheck`: 成功
- `npm run test`: 63 tests / 13 files すべて成功(新規追加分含む)
- `git diff --name-only HEAD~1`:
  ```
  README.md
  packages/handler/src/chat/gemini.ts
  packages/handler/test/chat/gemini.test.ts
  packages/widget/src/styles.ts
  packages/widget/test/styles.test.ts
  ```
- caller/import整合性: `styles.ts` の公開シェイプ(`WIDGET_STYLES` という1つの文字列定数のエクスポート)は変更していないため `widget-element.ts` 側の呼び出しに影響なし。`gemini.ts` の `buildSystemPrompt` / `createGeminiGenerator` のシグネチャも変更なし。

### Issue記載との差分について

Issue本文の③には「既定値の変更なのでバージョンは0.2.0に上げる」とあるが、`packages/widget/package.json` はIssueの`対象`フィールドに含まれていないため、本PRでは変更していない。バージョン更新は user 判断で別途対応をお願いしたい。

## 検証手順

dev ハーネスでの見た目確認(Agent側では実行していない。user 側で実施):

```bash
cd packages/handler/dev
npx wrangler dev --config "$(pwd)/wrangler.jsonc" --port 8799
```

以下の4通りを確認:
1. ライトモード(サイトのホスト側が light color-scheme)でトークン未指定 → パネル・吹き出しが明るい配色に自動で馴染むこと、本文の改行・段落が反映されること
2. ダークモード(サイトのホスト側が dark color-scheme、もしくは `folio-agent-widget { color-scheme: dark; }` 等で疑似的に切り替え)でトークン未指定 → パネル・吹き出しが暗い配色に自動で馴染み、以前のように吹き出し背景が濃色で本文が読めなくなる不具合が再現しないこと
3. ライトモードで6トークンのいずれか(例: `--folio-agent-accent`)を明示指定 → 指定値が従来どおり反映されること
4. ダークモードで同様にトークンを明示指定 → 指定値が優先され、導出既定に引っ張られないこと
